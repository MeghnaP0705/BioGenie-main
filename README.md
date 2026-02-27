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

## 🚀 Ready to Host?
I have added two **"Deploy"** buttons to your GitHub README. 

![Deployment Progress](/C:/Users/pmegh/.gemini/antigravity/brain/2902310d-0969-4e3d-8a76-e013a45426ef/check_deployment_platforms_1772167673281.webp)

1. **Backend:** Click **"Deploy to Render"**.
   - If prompted to verify email, do so, then click the button again.
   - Enter your `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GROQ_API_KEY` in the fields provided.
   - Click **"Apply"**.
2. **Frontend:** Once Render finishes deploying, click **"Deploy to Vercel"**.
   - Enter your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   - For `VITE_API_BASE`, enter the "Onrender.com" URL of your newly deployed backend.
3. Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE` (URL of your deployed backend)

---

Developed for MeghnaP0705.
