# Notevoro AI

> Your AI Study Partner — chat, quizzes, flashcards, smart notes, mock tests, and more. Built for students.

## ✨ Features

- 🌙 Dark, polished UI (Next.js + Tailwind + shadcn/ui)
- 💬 ChatGPT-style streaming AI chat with markdown rendering
- 🧠 Quizzes with auto-grading + explanations
- 📇 Flashcards with flip animation
- 📝 AI Notes generator + shareable public note links (`/n/<slug>`)
- 📅 Smart 7-day Study Plan (Pro+)
- ⏱️ Timed Mock Tests (Premium)
- 📁 PDF + image analysis (Premium)
- 💳 Credit system (Free 50 / Pro 500 / Premium 2000) with Razorpay billing
- 🏆 Levels (Beginner → Master), XP, daily streaks
- 🔐 JWT email/password + Google OAuth login

## 🛠 Tech stack

- **Next.js 14** (App Router, JavaScript) — frontend + API routes
- **Supabase (PostgreSQL)** — primary data store
- **AICredits.in** (OpenAI-compatible) — AI inference
- **Razorpay** — payments
- **Google Identity Services** — OAuth
- **Tailwind CSS** + **shadcn/ui** — styling
- **Recharts** — charts

## 🚀 Deploy to Vercel

### 1. Prepare a Supabase database

Create a Supabase project at [supabase.com](https://supabase.com).  
Then open **SQL Editor** and run `supabase/schema.sql` from this repo to create all tables.

### 2. Get API keys

| Service | Where | What you need |
|---|---|---|
| **AICredits** | [aicredits.in/login](https://aicredits.in/login) | API key (top up wallet via UPI) |
| **Razorpay** | [dashboard.razorpay.com](https://dashboard.razorpay.com) | Key ID + Secret |
| **Google OAuth** *(optional)* | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) | Web Client ID |

### 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 4. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → import your repo.
2. Framework auto-detected as **Next.js**.
3. Add environment variables:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

OPENAI_API_KEY=sk-...                            (your AICredits key)
OPENAI_BASE_URL=https://api.aicredits.in/v1
OPENAI_MODEL_FREE=gpt-4o-mini
OPENAI_MODEL_PRO=gpt-4o-mini
OPENAI_MODEL_PREMIUM=gpt-4o-mini

RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=...                   (same as KEY_ID)
RAZORPAY_WEBHOOK_SECRET=...
RAZORPAY_PLAN_ID_PRO=...
RAZORPAY_PLAN_ID_PREMIUM=...
CRON_SECRET=<long random string>

RESEND_API_KEY=...
RESEND_FROM="Notevoro AI <noreply@yourdomain.com>"
```

4. Click **Deploy**.

### 5. Post-deploy

- For **Google OAuth**: in Google Cloud Console → Credentials → your OAuth client → add `https://your-app.vercel.app` as both **Authorized JavaScript origin** and **Authorized redirect URI**.
- For **Razorpay**: configure your business in the dashboard before going live with real keys.
- Update `NEXT_PUBLIC_BASE_URL` after first deploy to your real domain.

## 💻 Local development

```bash
npm install
# create .env.local and fill in the keys below
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL_FREE, OPENAI_MODEL_PRO, OPENAI_MODEL_PREMIUM
# RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, NEXT_PUBLIC_RAZORPAY_KEY_ID
# RAZORPAY_WEBHOOK_SECRET, RAZORPAY_PLAN_ID_PRO, RAZORPAY_PLAN_ID_PREMIUM, CRON_SECRET
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## 📦 Project structure

```
app/
├── api/[[...path]]/route.js   # All backend API routes
├── dashboard/page.js          # Main app (chat, quiz, flashcards, notes, plan, mock, files, stats)
├── n/[slug]/page.js           # Public note viewer
├── layout.js                  # Root layout
└── page.js                    # Landing page
lib/
├── auth.js                    # JWT + bcrypt helpers
├── mongo.js                   # Supabase adapter (kept same import path)
└── plans.js                   # Plan / credit / tier config
```

## 💰 Credit costs

| Action | Cost |
|---|---|
| Chat message | 1 |
| Study plan | 2 |
| Notes | 3 |
| Flashcards | 4 |
| Quiz | 5 |
| File analysis | 8 |
| Mock test | 10 |

Credits reset every 30 days.

## 🧪 Tier matrix

| Feature | Free | Pro | Premium |
|---|:-:|:-:|:-:|
| AI Chat | ✅ | ✅ | ✅ |
| Public notes view | ✅ | ✅ | ✅ |
| Quizzes | — | ✅ | ✅ |
| Flashcards | — | ✅ | ✅ |
| AI Notes | — | ✅ | ✅ |
| Smart Study Plan | — | ✅ | ✅ |
| Contextual chat memory | — | ✅ | ✅ |
| Advanced analytics | — | ✅ | ✅ |
| Mock Tests | — | — | ✅ |
| File analysis (PDF/image) | — | — | ✅ |

## 📜 License

© 2025 Notevoro AI. All rights reserved.
