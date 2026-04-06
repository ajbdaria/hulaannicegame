import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { playerId, playerName } = req.body;
  if (!playerId || !playerName) return res.status(400).json({ error: "Missing fields" });

  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const lobby = {
    code,
    host: playerId,
    gameState: "lobby",
    players: {
      [playerId]: { id: playerId, name: playerName, host: true, number: null, eliminated: false, ready: false }
    },
    order: [playerId],
    round: 1,
    currentTurn: null,
    log: [],
    winner: null,
    updatedAt: Date.now()
  };

  await kv.set(`lobby:${code}`, lobby, { ex: 3600 }); // 1hr TTL
  res.json({ code, lobby });
}
