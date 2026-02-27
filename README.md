# BioGenie – AI Biotechnology Dashboard

BioGenie is an advanced AI-powered dashboard for Biotechnology education, featuring RAG-based notes generation, question paper creation, and more.

## 🚀 Quick Deployment

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/MeghnaP0705/BioGenie-main)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMeghnaP0705%2FBioGenie-main)

## 🛠️ Infrastructure

- **Frontend:** React + Vite (Tailwind CSS)
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PGVector for RAG)
- **AI Engine:** LangChain + Groq (LLaMA 3.3 70B)

## 📦 Setup & Hosting

### Backend (Render/Railway)
1. Set **Build Command:** `pip install -r backend/requirements.txt`
2. Set **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
3. Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`

### Frontend (Vercel/Netlify)
1. Set **Root Directory:** `frontend`
2. Set **Build Command:** `npm run build`
3. Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE` (URL of your deployed backend)

---

Developed for MeghnaP0705.
