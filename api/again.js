import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { code } = req.body;

  const lobby = await kv.get(`lobby:${code}`);
  if (!lobby) return res.status(404).json({ error: "Lobby not found" });

  Object.values(lobby.players).forEach(p => {
    p.number = null;
    p.eliminated = false;
    p.ready = false;
  });
  lobby.gameState = "lobby";
  lobby.currentTurn = null;
  lobby.round = 1;
  lobby.log = [];
  lobby.winner = null;
  lobby.updatedAt = Date.now();

  await kv.set(`lobby:${code}`, lobby, { ex: 3600 });
  res.json({ lobby });
}
