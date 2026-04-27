import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { getDb } from '@/lib/mongo';
import { signToken, hashPassword, comparePassword, getUserFromRequest } from '@/lib/auth';
import { PLAN_CREDITS, FEATURE_COSTS, FEATURE_TIERS, getLevel } from '@/lib/plans';

export const dynamic = 'force-dynamic';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function openai() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('AI API key (OPENAI_API_KEY for AICredits) not configured. Add it to /app/.env');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.aicredits.in/v1',
  });
}

function razorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function json(data, init = {}) { return NextResponse.json(data, init); }
function err(message, status = 400, extra = {}) { return NextResponse.json({ error: message, ...extra }, { status }); }

async function requireUser(req) {
  const u = getUserFromRequest(req);
  if (!u) return null;
  const db = await getDb();
  const user = await db.collection('users').findOne({ id: u.id });
  if (!user) return null;
  // Auto-reset credits monthly
  const now = new Date();
  const reset = user.credits_reset_at ? new Date(user.credits_reset_at) : null;
  if (!reset || now - reset > 30 * 86400000) {
    const max = PLAN_CREDITS[user.plan || 'free'] || 50;
    await db.collection('users').updateOne(
      { id: user.id },
      { $set: { credits: max, credits_reset_at: now.toISOString() } }
    );
    user.credits = max;
    user.credits_reset_at = now.toISOString();
  }
  return user;
}

function publicUser(u) {
  if (!u) return null;
  const lvl = getLevel(u.xp || 0);
  return {
    id: u.id, name: u.name, email: u.email, avatar: u.avatar || null,
    xp: u.xp || 0, streak: u.streak || 0, plan: u.plan || 'free',
    credits: u.credits ?? PLAN_CREDITS[u.plan || 'free'],
    credits_max: PLAN_CREDITS[u.plan || 'free'],
    credits_reset_at: u.credits_reset_at || null,
    level: lvl,
    quizzes_taken: u.quizzes_taken || 0,
    correct_answers: u.correct_answers || 0,
    total_questions: u.total_questions || 0,
    last_active: u.last_active || null,
  };
}

async function updateStreak(db, user) {
  const today = new Date().toISOString().slice(0, 10);
  const last = user.last_active ? new Date(user.last_active).toISOString().slice(0, 10) : null;
  if (last === today) return user.streak || 0;
  let streak = user.streak || 0;
  if (last) {
    const diff = (new Date(today) - new Date(last)) / 86400000;
    streak = diff === 1 ? streak + 1 : 1;
  } else streak = 1;
  await db.collection('users').updateOne({ id: user.id }, { $set: { streak, last_active: new Date().toISOString() } });
  return streak;
}

function checkAccess(user, feature) {
  const plan = user.plan || 'free';
  const tiers = FEATURE_TIERS[feature];
  if (tiers && !tiers.includes(plan)) {
    return { ok: false, error: `${feature} is locked on the ${plan} plan. Upgrade to unlock.`, status: 403, upgrade: true };
  }
  const cost = FEATURE_COSTS[feature] || 0;
  if ((user.credits ?? 0) < cost) {
    return { ok: false, error: `Out of credits. You need ${cost} but have ${user.credits ?? 0}.`, status: 402, upgrade: true, cost };
  }
  return { ok: true, cost };
}

async function deductCredits(db, userId, cost) {
  if (!cost) return;
  await db.collection('users').updateOne({ id: userId }, { $inc: { credits: -cost } });
}

async function buildPersonalContext(db, user) {
  if (!FEATURE_TIERS.contextual_memory.includes(user.plan || 'free')) return '';
  const recentAttempts = await db.collection('quiz_attempts').find({ user_id: user.id }).sort({ created_at: -1 }).limit(5).toArray();
  const recentNotes = await db.collection('notes').find({ user_id: user.id }).sort({ created_at: -1 }).limit(3).toArray();
  const topics = recentAttempts.map((a) => `${a.topic} (${a.correct}/${a.total})`).join(', ') || 'none yet';
  const weak = recentAttempts.filter((a) => a.correct / Math.max(a.total, 1) < 0.6).map((a) => a.topic).join(', ') || 'none identified';
  const notesPreview = recentNotes.map((n) => `- ${n.title}`).join('\n') || 'no notes yet';
  return `\n\nUser context (use to personalize):\n- Recent quiz topics: ${topics}\n- Weak areas: ${weak}\n- Recent notes:\n${notesPreview}\n`;
}

// =========================================================
async function handler(req, { params }) {
  const path = (params?.path || []).join('/');
  const method = req.method;

  try {
    if (path === '' || path === 'health') return json({ ok: true, service: 'Notevoro AI', model: MODEL });

    /* ============ AUTH ============ */
    if (path === 'auth/signup' && method === 'POST') {
      const { name, email, password } = await req.json();
      if (!email || !password) return err('Email and password required');
      const db = await getDb();
      if (await db.collection('users').findOne({ email: email.toLowerCase() })) return err('User already exists', 409);
      const id = uuidv4();
      const user = {
        id, name: name || email.split('@')[0], email: email.toLowerCase(),
        password: await hashPassword(password),
        xp: 0, streak: 0, plan: 'free',
        credits: PLAN_CREDITS.free, credits_reset_at: new Date().toISOString(),
        quizzes_taken: 0, correct_answers: 0, total_questions: 0,
        last_active: new Date().toISOString(), created_at: new Date().toISOString(),
      };
      await db.collection('users').insertOne(user);
      return json({ token: signToken({ id, email: user.email }), user: publicUser(user) });
    }

    if (path === 'auth/google' && method === 'POST') {
      const { credential } = await req.json();
      if (!credential) return err('credential required');
      if (!process.env.GOOGLE_CLIENT_ID) return err('Google OAuth not configured. Add GOOGLE_CLIENT_ID to /app/.env', 500);
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload?.email) return err('Invalid Google token', 401);
      const db = await getDb();
      let user = await db.collection('users').findOne({ email: payload.email.toLowerCase() });
      if (!user) {
        const id = uuidv4();
        user = {
          id, name: payload.name || payload.email.split('@')[0], email: payload.email.toLowerCase(),
          avatar: payload.picture || null, google_id: payload.sub,
          xp: 0, streak: 0, plan: 'free',
          credits: PLAN_CREDITS.free, credits_reset_at: new Date().toISOString(),
          quizzes_taken: 0, correct_answers: 0, total_questions: 0,
          last_active: new Date().toISOString(), created_at: new Date().toISOString(),
        };
        await db.collection('users').insertOne(user);
      } else if (!user.google_id) {
        await db.collection('users').updateOne({ id: user.id }, { $set: { google_id: payload.sub, avatar: payload.picture || user.avatar } });
      }
      return json({ token: signToken({ id: user.id, email: user.email }), user: publicUser(user) });
    }

    if (path === 'auth/login' && method === 'POST') {
      const { email, password } = await req.json();
      if (!email || !password) return err('Email and password required');
      const db = await getDb();
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (!user || !(await comparePassword(password, user.password || ''))) return err('Invalid credentials', 401);
      return json({ token: signToken({ id: user.id, email: user.email }), user: publicUser(user) });
    }

    if (path === 'auth/me' && method === 'GET') {
      const user = await requireUser(req);
      if (!user) return err('Unauthorized', 401);
      return json({ user: publicUser(user) });
    }

    /* ============ CHATS ============ */
    if (path === 'chats' && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const db = await getDb();
      const url = new URL(req.url);
      const q = url.searchParams.get('q');
      const filter = { user_id: user.id };
      if (q) filter.title = { $regex: q, $options: 'i' };
      return json({ chats: await db.collection('chats').find(filter, { projection: { _id: 0 } }).sort({ updated_at: -1 }).toArray() });
    }

    if (path === 'chats' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const db = await getDb();
      const id = uuidv4();
      const chat = { id, user_id: user.id, title: 'New Chat', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      await db.collection('chats').insertOne(chat);
      return json({ chat: { id, title: chat.title, created_at: chat.created_at, updated_at: chat.updated_at } });
    }

    if (path.startsWith('chats/') && path.endsWith('/messages') && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const chatId = path.split('/')[1];
      const db = await getDb();
      const chat = await db.collection('chats').findOne({ id: chatId, user_id: user.id });
      if (!chat) return err('Chat not found', 404);
      return json({ messages: await db.collection('messages').find({ chat_id: chatId }, { projection: { _id: 0 } }).sort({ created_at: 1 }).toArray() });
    }

    if (path.match(/^chats\/[^/]+$/) && method === 'PATCH') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const { title } = await req.json();
      const db = await getDb();
      await db.collection('chats').updateOne({ id: path.split('/')[1], user_id: user.id }, { $set: { title, updated_at: new Date().toISOString() } });
      return json({ ok: true });
    }

    if (path.match(/^chats\/[^/]+$/) && method === 'DELETE') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const chatId = path.split('/')[1];
      const db = await getDb();
      await db.collection('chats').deleteOne({ id: chatId, user_id: user.id });
      await db.collection('messages').deleteMany({ chat_id: chatId });
      return json({ ok: true });
    }

    /* ============ CHAT (streaming with credits + memory) ============ */
    if (path === 'chat' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'chat');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const { chat_id, message } = await req.json();
      if (!chat_id || !message) return err('chat_id and message required');
      const db = await getDb();
      const chat = await db.collection('chats').findOne({ id: chat_id, user_id: user.id });
      if (!chat) return err('Chat not found', 404);

      await db.collection('messages').insertOne({
        id: uuidv4(), chat_id, role: 'user', content: message, created_at: new Date().toISOString(),
      });
      const history = await db.collection('messages').find({ chat_id }, { projection: { _id: 0, role: 1, content: 1 } }).sort({ created_at: 1 }).toArray();
      const isFirst = history.length === 1;
      if (isFirst) {
        const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
        await db.collection('chats').updateOne({ id: chat_id }, { $set: { title, updated_at: new Date().toISOString() } });
      } else {
        await db.collection('chats').updateOne({ id: chat_id }, { $set: { updated_at: new Date().toISOString() } });
      }

      const personalContext = await buildPersonalContext(db, user);
      const sys = `You are Notevoro AI, a friendly, concise AI study partner. Explain clearly with examples. Use markdown headings, bullet points, **bold**, and code blocks where helpful. Encourage the learner.${personalContext}`;

      const cli = openai();
      const stream = await cli.chat.completions.create({
        model: MODEL, stream: true,
        messages: [{ role: 'system', content: sys }, ...history.map((m) => ({ role: m.role, content: m.content }))],
      });

      const encoder = new TextEncoder();
      let fullText = '';
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const delta = chunk.choices?.[0]?.delta?.content || '';
              if (delta) { fullText += delta; controller.enqueue(encoder.encode(delta)); }
            }
            await db.collection('messages').insertOne({
              id: uuidv4(), chat_id, role: 'assistant', content: fullText, created_at: new Date().toISOString(),
            });
            await deductCredits(db, user.id, access.cost);
            await db.collection('users').updateOne({ id: user.id }, { $inc: { xp: 5 }, $set: { last_active: new Date().toISOString() } });
            const u2 = await db.collection('users').findOne({ id: user.id });
            await updateStreak(db, u2);
            controller.close();
          } catch (e) {
            controller.enqueue(encoder.encode('\n\n[Error: ' + (e.message || 'failed') + ']'));
            controller.close();
          }
        },
      });
      return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } });
    }

    /* ============ QUIZ ============ */
    if (path === 'quiz/generate' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'quiz');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const { topic, difficulty = 'medium', count = 5 } = await req.json();
      if (!topic) return err('topic required');
      const cli = openai();
      const resp = await cli.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You generate concise, accurate educational MCQs and return only valid JSON.' },
          { role: 'user', content: `Create a multiple-choice quiz of exactly ${count} questions about "${topic}" at ${difficulty} difficulty. Return ONLY valid JSON: {"questions":[{"id":"q1","question":"...","options":["A","B","C","D"],"answer_index":0,"explanation":"..."}]}` },
        ],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(resp.choices[0].message.content || '{}');
      const quizId = uuidv4();
      const db = await getDb();
      await db.collection('quizzes').insertOne({ id: quizId, user_id: user.id, topic, difficulty, questions: parsed.questions || [], created_at: new Date().toISOString() });
      await deductCredits(db, user.id, access.cost);
      return json({ id: quizId, topic, difficulty, questions: parsed.questions || [] });
    }

    if (path === 'quiz/submit' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const { quiz_id, answers } = await req.json();
      const db = await getDb();
      const quiz = await db.collection('quizzes').findOne({ id: quiz_id, user_id: user.id });
      if (!quiz) return err('Quiz not found', 404);
      let correct = 0;
      const results = quiz.questions.map((q, i) => {
        const userAns = answers?.[i];
        const isRight = userAns === q.answer_index;
        if (isRight) correct++;
        return { question: q.question, correct_index: q.answer_index, user_index: userAns, options: q.options, explanation: q.explanation, is_correct: isRight };
      });
      const total = quiz.questions.length;
      const xpGained = correct * 10;
      await db.collection('users').updateOne(
        { id: user.id },
        { $inc: { xp: xpGained, quizzes_taken: 1, correct_answers: correct, total_questions: total }, $set: { last_active: new Date().toISOString() } }
      );
      const u2 = await db.collection('users').findOne({ id: user.id });
      await updateStreak(db, u2);
      await db.collection('quiz_attempts').insertOne({
        id: uuidv4(), user_id: user.id, quiz_id, topic: quiz.topic, correct, total, xp_gained: xpGained, created_at: new Date().toISOString(),
      });
      return json({ correct, total, xp_gained: xpGained, results });
    }

    /* ============ FLASHCARDS ============ */
    if (path === 'flashcards/generate' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'flashcards');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const { topic, count = 8 } = await req.json();
      if (!topic) return err('topic required');
      const cli = openai();
      const resp = await cli.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You create concise, high-quality flashcards. Return only valid JSON.' },
          { role: 'user', content: `Create exactly ${count} flashcards about "${topic}". Return ONLY JSON: {"cards":[{"front":"...","back":"..."}]}.` },
        ],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(resp.choices[0].message.content || '{}');
      const deckId = uuidv4();
      const db = await getDb();
      const deck = {
        id: deckId, user_id: user.id, topic,
        cards: (parsed.cards || []).map((c, i) => ({ id: `c${i}`, front: c.front, back: c.back })),
        created_at: new Date().toISOString(),
      };
      await db.collection('flashcard_decks').insertOne(deck);
      await deductCredits(db, user.id, access.cost);
      await db.collection('users').updateOne({ id: user.id }, { $inc: { xp: 10 }, $set: { last_active: new Date().toISOString() } });
      const { _id, ...rest } = deck;
      return json(rest);
    }

    if (path === 'flashcards' && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const db = await getDb();
      return json({ decks: await db.collection('flashcard_decks').find({ user_id: user.id }, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray() });
    }

    if (path.match(/^flashcards\/[^/]+$/) && method === 'DELETE') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const db = await getDb();
      await db.collection('flashcard_decks').deleteOne({ id: path.split('/')[1], user_id: user.id });
      return json({ ok: true });
    }

    /* ============ NOTES ============ */
    if (path === 'notes/generate' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'notes');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const { source = '', title = '', topic = '', chat_id = null } = await req.json();
      const db = await getDb();
      let body = source;
      if (chat_id) {
        const msgs = await db.collection('messages').find({ chat_id }, { projection: { _id: 0, role: 1, content: 1 } }).sort({ created_at: 1 }).toArray();
        body = msgs.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      }
      if (!body && !topic) return err('Provide chat_id, source, or topic');
      const cli = openai();
      const prompt = topic
        ? `Create comprehensive, structured study notes on the topic "${topic}". Use markdown with #, ##, bullet points, **bold** terms, and short examples. Make it exam-ready.`
        : `Convert the following into well-structured study notes. Use markdown headings (#, ##), bullet points, **bold** key terms, and a "Key Takeaways" section at the end.\n\n${body.slice(0, 8000)}`;
      const resp = await cli.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You produce clear, exam-ready study notes in markdown.' },
          { role: 'user', content: prompt },
        ],
      });
      const content = resp.choices[0].message.content || '';
      const id = uuidv4();
      const finalTitle = title || topic || (content.split('\n').find((l) => l.trim().startsWith('#')) || 'Untitled').replace(/^#+\s*/, '').slice(0, 80) || 'Notes';
      const note = {
        id, user_id: user.id, title: finalTitle, content,
        topic: topic || null, source_chat_id: chat_id || null,
        public_slug: null, is_public: false,
        created_at: new Date().toISOString(),
      };
      await db.collection('notes').insertOne(note);
      await deductCredits(db, user.id, access.cost);
      await db.collection('users').updateOne({ id: user.id }, { $inc: { xp: 5 }, $set: { last_active: new Date().toISOString() } });
      const { _id, ...rest } = note;
      return json(rest);
    }

    if (path === 'notes' && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const db = await getDb();
      return json({ notes: await db.collection('notes').find({ user_id: user.id }, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray() });
    }

    if (path.match(/^notes\/[^/]+$/) && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const db = await getDb();
      const note = await db.collection('notes').findOne({ id: path.split('/')[1], user_id: user.id }, { projection: { _id: 0 } });
      if (!note) return err('Not found', 404);
      return json(note);
    }

    if (path.match(/^notes\/[^/]+\/share$/) && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const id = path.split('/')[1];
      const db = await getDb();
      const note = await db.collection('notes').findOne({ id, user_id: user.id });
      if (!note) return err('Not found', 404);
      const slug = note.public_slug || uuidv4().replace(/-/g, '').slice(0, 12);
      await db.collection('notes').updateOne({ id }, { $set: { public_slug: slug, is_public: true } });
      return json({ slug });
    }

    if (path.match(/^notes\/[^/]+\/unshare$/) && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const db = await getDb();
      await db.collection('notes').updateOne({ id: path.split('/')[1], user_id: user.id }, { $set: { is_public: false } });
      return json({ ok: true });
    }

    if (path.match(/^notes\/[^/]+$/) && method === 'DELETE') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const db = await getDb();
      await db.collection('notes').deleteOne({ id: path.split('/')[1], user_id: user.id });
      return json({ ok: true });
    }

    if (path.match(/^public\/notes\/[^/]+$/) && method === 'GET') {
      const slug = path.split('/')[2];
      const db = await getDb();
      const note = await db.collection('notes').findOne({ public_slug: slug, is_public: true }, { projection: { _id: 0, password: 0 } });
      if (!note) return err('Not found', 404);
      const author = await db.collection('users').findOne({ id: note.user_id }, { projection: { _id: 0, name: 1, avatar: 1 } });
      return json({ note: { id: note.id, title: note.title, content: note.content, created_at: note.created_at }, author: author || null });
    }

    /* ============ STUDY PLAN ============ */
    if (path === 'study-plan/generate' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'study_plan');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const { goal = 'general study' } = await req.json();
      const db = await getDb();
      const ctx = await buildPersonalContext(db, user);
      const cli = openai();
      const resp = await cli.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You build short, achievable daily study plans for students. Return JSON only.' },
          { role: 'user', content: `Build a 7-day study plan toward this goal: "${goal}". Each day must have 3 tasks (mix of: read/chat, quiz, flashcards). ${ctx}\n\nReturn ONLY JSON: {"goal":"...","days":[{"day":"Day 1","title":"...","tasks":[{"type":"chat|quiz|flashcards|notes","label":"...","topic":"..."}]}]}` },
        ],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(resp.choices[0].message.content || '{}');
      const id = uuidv4();
      const plan = { id, user_id: user.id, goal, ...parsed, created_at: new Date().toISOString() };
      await db.collection('study_plans').deleteMany({ user_id: user.id });
      await db.collection('study_plans').insertOne(plan);
      await deductCredits(db, user.id, access.cost);
      const { _id, ...rest } = plan;
      return json(rest);
    }

    if (path === 'study-plan' && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const db = await getDb();
      const plan = await db.collection('study_plans').findOne({ user_id: user.id }, { projection: { _id: 0 } });
      return json({ plan: plan || null });
    }

    /* ============ MOCK TEST (Premium) ============ */
    if (path === 'mock-test/generate' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'mock');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const { topic, count = 15, duration_minutes = 20 } = await req.json();
      if (!topic) return err('topic required');
      const cli = openai();
      const resp = await cli.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You generate full mock tests. Return JSON only.' },
          { role: 'user', content: `Create a mock test of ${count} mixed-difficulty MCQs on "${topic}". Return ONLY: {"questions":[{"question":"...","options":["A","B","C","D"],"answer_index":0,"explanation":"..."}]}` },
        ],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(resp.choices[0].message.content || '{}');
      const id = uuidv4();
      const db = await getDb();
      await db.collection('mock_tests').insertOne({ id, user_id: user.id, topic, duration_minutes, questions: parsed.questions || [], created_at: new Date().toISOString() });
      await deductCredits(db, user.id, access.cost);
      return json({ id, topic, duration_minutes, questions: parsed.questions || [] });
    }

    if (path === 'mock-test/submit' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const { test_id, answers, time_taken_seconds } = await req.json();
      const db = await getDb();
      const test = await db.collection('mock_tests').findOne({ id: test_id, user_id: user.id });
      if (!test) return err('Test not found', 404);
      let correct = 0;
      const results = test.questions.map((q, i) => {
        const userAns = answers?.[i];
        const ok = userAns === q.answer_index;
        if (ok) correct++;
        return { question: q.question, correct_index: q.answer_index, user_index: userAns, options: q.options, explanation: q.explanation, is_correct: ok };
      });
      const total = test.questions.length;
      const xpGained = correct * 15; // bigger reward
      await db.collection('users').updateOne(
        { id: user.id },
        { $inc: { xp: xpGained, quizzes_taken: 1, correct_answers: correct, total_questions: total }, $set: { last_active: new Date().toISOString() } }
      );
      const u2 = await db.collection('users').findOne({ id: user.id });
      await updateStreak(db, u2);
      await db.collection('mock_attempts').insertOne({
        id: uuidv4(), user_id: user.id, test_id, topic: test.topic, correct, total, xp_gained: xpGained,
        time_taken_seconds: time_taken_seconds || 0, created_at: new Date().toISOString(),
      });
      return json({ correct, total, xp_gained: xpGained, time_taken_seconds, results });
    }

    /* ============ FILE ANALYSIS (Premium) ============ */
    if (path === 'file-analyze' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'file');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const formData = await req.formData();
      const file = formData.get('file');
      const action = formData.get('action') || 'summarize';
      if (!file || typeof file === 'string') return err('file required');
      const arrayBuffer = await file.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      const cli = openai();
      let messages;
      const ftype = file.type || '';
      if (ftype.startsWith('image/')) {
        const dataUrl = `data:${ftype};base64,${buf.toString('base64')}`;
        const action_text = action === 'extract' ? 'Extract the key points from this image as a bullet list.' : action === 'explain' ? 'Explain what is shown in this image clearly to a student.' : 'Summarize this image content for studying.';
        messages = [
          { role: 'system', content: 'You are a study assistant. Use markdown formatting.' },
          { role: 'user', content: [
            { type: 'text', text: action_text },
            { type: 'image_url', image_url: { url: dataUrl } },
          ]},
        ];
      } else if (ftype === 'application/pdf' || (file.name || '').toLowerCase().endsWith('.pdf')) {
        const pdfMod = await import('pdf-parse');
        const pdfParse = pdfMod.default || pdfMod;
        let text = '';
        try {
          const data = await pdfParse(buf);
          text = (data.text || '').slice(0, 12000);
        } catch (e) {
          return err('Failed to read PDF: ' + e.message);
        }
        if (!text.trim()) return err('No text extracted from PDF');
        const action_text = action === 'extract' ? 'Extract the key points as a bullet list.' : action === 'explain' ? 'Explain this content clearly to a student.' : 'Summarize this content for studying.';
        messages = [
          { role: 'system', content: 'You are a study assistant. Use markdown formatting.' },
          { role: 'user', content: `${action_text}\n\n---\n${text}` },
        ];
      } else {
        return err('Only images and PDFs are supported', 400);
      }
      const resp = await cli.chat.completions.create({ model: MODEL, messages });
      const result = resp.choices[0].message.content || '';
      const db = await getDb();
      const id = uuidv4();
      await db.collection('file_analyses').insertOne({
        id, user_id: user.id, filename: file.name, type: ftype, action, result, created_at: new Date().toISOString(),
      });
      await deductCredits(db, user.id, access.cost);
      return json({ id, filename: file.name, action, result });
    }

    /* ============ DASHBOARD ============ */
    if (path === 'dashboard' && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const db = await getDb();
      const recentAttempts = await db.collection('quiz_attempts').find({ user_id: user.id }, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(20).toArray();
      const mockAttempts = await db.collection('mock_attempts').find({ user_id: user.id }, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(5).toArray();
      const recentChats = await db.collection('chats').find({ user_id: user.id }, { projection: { _id: 0 } }).sort({ updated_at: -1 }).limit(5).toArray();
      const accuracy = user.total_questions > 0 ? Math.round((user.correct_answers / user.total_questions) * 100) : 0;
      // Weak topics
      const topicMap = {};
      for (const a of recentAttempts) {
        if (!a.topic) continue;
        if (!topicMap[a.topic]) topicMap[a.topic] = { correct: 0, total: 0 };
        topicMap[a.topic].correct += a.correct;
        topicMap[a.topic].total += a.total;
      }
      const weakTopics = Object.entries(topicMap)
        .map(([topic, v]) => ({ topic, accuracy: Math.round((v.correct / Math.max(v.total, 1)) * 100), attempts: v.total }))
        .sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const xp = recentAttempts.filter((a) => a.created_at.slice(0, 10) === key).reduce((s, a) => s + (a.xp_gained || 0), 0);
        days.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), xp });
      }
      return json({
        user: publicUser(user), accuracy,
        recent_attempts: recentAttempts.slice(0, 10),
        mock_attempts: mockAttempts,
        recent_chats: recentChats,
        weak_topics: weakTopics,
        xp_series: days,
      });
    }

    /* ============ PAYMENTS ============ */
    if (path === 'create-order' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const { plan } = await req.json();
      const prices = { pro: 49900, premium: 99900 };
      if (!prices[plan]) return err('Invalid plan');
      const rp = razorpayClient();
      const order = await rp.orders.create({
        amount: prices[plan], currency: 'INR',
        receipt: `nv_${user.id.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
        notes: { user_id: user.id, plan },
      });
      const db = await getDb();
      await db.collection('orders').insertOne({
        id: order.id, user_id: user.id, plan, amount: prices[plan], status: 'created', created_at: new Date().toISOString(),
      });
      return json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID, plan });
    }

    if (path === 'verify-payment' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await req.json();
      const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
      if (expected !== razorpay_signature) return err('Invalid signature', 400);
      const db = await getDb();
      await db.collection('orders').updateOne(
        { id: razorpay_order_id },
        { $set: { status: 'paid', payment_id: razorpay_payment_id, paid_at: new Date().toISOString() } }
      );
      await db.collection('users').updateOne(
        { id: user.id },
        { $set: { plan, credits: PLAN_CREDITS[plan] || PLAN_CREDITS.free, credits_reset_at: new Date().toISOString() } }
      );
      const u = await db.collection('users').findOne({ id: user.id });
      return json({ ok: true, user: publicUser(u) });
    }

    /* ============ CONFIG ============ */
    if (path === 'config/plans' && method === 'GET') {
      return json({ credits: PLAN_CREDITS, costs: FEATURE_COSTS, tiers: FEATURE_TIERS });
    }

    return err('Not found: ' + path, 404);
  } catch (e) {
    console.error('API error', e);
    return err(e.message || 'Server error', 500);
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
export const PUT = handler;
