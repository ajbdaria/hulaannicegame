# Hulaan! — Multiplayer Number Guessing Game

Real-time cross-device multiplayer game built with Vercel + Vercel KV (Redis).

---

## Deploy to Vercel (5 minutes)

### Step 1 — Push to GitHub
1. Create a new repo on GitHub
2. Upload all these files into it (drag & drop the whole folder)

### Step 2 — Deploy on Vercel
1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repo
3. Click **Deploy** (no build settings needed)

### Step 3 — Add Vercel KV (Free Redis storage)
1. In your Vercel project dashboard → **Storage** tab
2. Click **Create Database** → choose **KV (Redis)**
3. Name it anything → click **Create**
4. Click **Connect to Project** → select your project → **Connect**
5. Vercel auto-adds the environment variables (`KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, etc.)

### Step 4 — Redeploy
1. Go to **Deployments** tab → click the 3-dot menu on latest → **Redeploy**
2. Done! Your game is live at `your-project.vercel.app`

---

## How to Play
1. Open the game URL on your phone/PC
2. One person clicks **Create Lobby** — share the 6-letter code
3. Everyone else enters the code and clicks **Join Lobby**
4. Host clicks **Start Game**
5. Each player picks a secret number (1–99)
6. Take turns guessing each other's numbers
7. Get guessed correctly = **eliminated**
8. Last player standing **wins**!

---

## Project Structure
```
hulaan/
├── api/
│   ├── create.js    POST - create lobby
│   ├── join.js      POST - join lobby
│   ├── lobby.js     GET  - get lobby state (polling)
│   ├── start.js     POST - host starts game
│   ├── pick.js      POST - player picks secret number
│   ├── guess.js     POST - player submits a guess
│   ├── leave.js     POST - player leaves lobby
│   └── again.js     POST - reset for new round
├── public/
│   └── index.html   Frontend (single file)
├── package.json
├── vercel.json
└── README.md
```
