# AI‑Podcast 🎙️

A Next.js‑based AI‑powered podcast builder that generates podcast episodes from given prompts using Novita, Elevenlabs and Together APIs.

---

## 📂 Features

- **Generate podcast scripts** using AI prompts  
- **Convert scripts to audio** using Text‑to‑Speech  
- **Interactive web UI** with user input form and audio playback  
- **Built in Next.js + TypeScript**, easy to extend and customize

---

## 🧰 Tech Stack

- **Next.js** (TypeScript) – UI, page routing  
- **React** – form handling, audio player  
- **OpenAI API** – chat prompts & responses  
- **Any TTS provider** – to convert script to audio (customize in code)  
- **Tailwind CSS** – styling (if present)  
- **Vercel** for deployment

---

## 🚀 Quick Start

```bash
git clone https://github.com/Riddz04/ai-podcast.git
cd ai-podcast
```
# Install dependencies
```
npm install
# or
yarn
```

# Configure env variables
```
cp .env.example .env.local
```
# Add your keys:
NOVITA_API_KEY,
ELEVENLABS_API_KEY,
FIREBASE .env variables

# Run dev server
```
npm run dev
# or
yarn dev
```
# Access at http://localhost:3000
Usage
Visit the homepage, enter a topic or outline

Click "Generate Podcast"

Wait while AI creates the script and audio

Listen to your generated episode in-browser

🧩 Customize
Prompt templates – adjust system/user prompts in server-side endpoints

TTS provider integration – replace or customize audio providers

UI enhancements – add features like multi-voice support, episode chapters, theme colors

📦 Project Structure
ruby
```
/
├─ pages/
│  ├─ index.tsx          # Main form & player
│  └─ api/               # API routes for script & audio generation
│
├─ lib/                  # Helpers for OpenAI, TTS, formatting
├─ components/           # React components (player, form, loader)
├─ public/               # Static assets (images, icons)
├─ styles/               # Tailwind or CSS files
├─ next.config.ts        # Next.js configuration
├─ package.json
└─ tsconfig.json
```
