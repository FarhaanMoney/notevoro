import { Resend } from 'resend';

function emailClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendEmail({ to, subject, html }) {
  const from = process.env.RESEND_FROM;
  const cli = emailClient();
  if (!cli || !from) return { skipped: true };
  if (!to) return { skipped: true };

  const { data, error } = await cli.emails.send({
    from,
    to,
    subject,
    html,
  });
  if (error) throw new Error(error.message);
  return { ok: true, id: data?.id || null };
}

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export async function sendTrialWelcomeEmail(to, userName) {
  const subject = '🎉 Your 7-Day Free Trial Has Started!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
      <div style="text-align: center; padding: 30px 20px;">
        <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: bold;">Welcome to Notevoro AI! 🚀</h1>
        <p style="font-size: 18px; margin: 0 0 30px 0;">Hi ${userName || 'there'},</p>
        <p style="font-size: 16px; margin: 0 0 20px 0;">Your <strong>7-day free trial</strong> has started! You now have access to ALL premium features:</p>
        
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #ffd700;">✨ What You Get:</h3>
          <ul style="text-align: left; margin: 0; padding-left: 20px;">
            <li style="margin: 10px 0;">📚 Unlimited access to all study features</li>
            <li style="margin: 10px 0;">💬 AI Chat with advanced memory</li>
            <li style="margin: 10px 0;">📝 AI Notes & Flashcards</li>
            <li style="margin: 10px 0;">🧪 Mock Tests & File Analysis</li>
            <li style="margin: 10px 0;">⚡ Priority processing queue</li>
          </ul>
        </div>
        
        <p style="font-size: 16px; margin: 20px 0;">You get <strong>20 AI Energy per day</strong> that reset automatically. Use them wisely!</p>
        <p style="font-size: 14px; opacity: 0.8;">Your trial ends on ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}. Upgrade anytime to keep your progress!</p>
      </div>
    </div>
  `;
  
  return sendEmail({ to, subject, html });
}

export async function sendStreakEmail(to, userName, streak) {
  const subject = `🔥 ${streak}-Day Streak Achievement!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
      <div style="text-align: center; padding: 30px 20px;">
        <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: bold;">🔥 Amazing Streak! 🎯</h1>
        <p style="font-size: 18px; margin: 0 0 20px 0;">Hi ${userName || 'there'},</p>
        <p style="font-size: 16px; margin: 0 0 20px 0;">You've maintained a <strong>${streak}-day streak</strong>! Your consistency is impressive!</p>
        
        <div style="background: rgba(255,215,0,0.2); padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0;">🏆 Your Achievement:</h3>
          <p style="font-size: 16px; margin: 0;">${streak} consecutive days of learning! You're building habits that last.</p>
        </div>
        
        <p style="font-size: 14px; opacity: 0.8;">Keep it up! Every day brings you closer to your goals.</p>
      </div>
    </div>
  `;
  
  return sendEmail({ to, subject, html });
}

export async function sendInactivityEmail(to, userName) {
  const subject = '👋 We Miss You at Notevoro AI';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
      <div style="text-align: center; padding: 30px 20px;">
        <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: bold;">👋 We Miss You!</h1>
        <p style="font-size: 18px; margin: 0 0 20px 0;">Hi ${userName || 'there'},</p>
        <p style="font-size: 16px; margin: 0 0 20px 0;">It's been a while since you last studied. Your learning journey awaits!</p>
        
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0;">📚 Ready to Continue?</h3>
          <p style="font-size: 16px; margin: 0;">You have fresh daily AI Energy waiting for you!</p>
        </div>
        
        <p style="font-size: 14px; opacity: 0.8;">Come back and keep your learning momentum going!</p>
      </div>
    </div>
  `;
  
  return sendEmail({ to, subject, html });
}

