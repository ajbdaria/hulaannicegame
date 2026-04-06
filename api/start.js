import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { code, playerId } = req.body;

  const lobby = await kv.get(`lobby:${code}`);
  if (!lobby) return res.status(404).json({ error: "Lobby not found" });
  if (lobby.host !== playerId) return res.status(403).json({ error: "Not host" });
  if (Object.keys(lobby.players).length < 2) return res.status(400).json({ error: "Need at least 2 players" });

  lobby.gameState = "picking";
  lobby.updatedAt = Date.now();
  await kv.set(`lobby:${code}`, lobby, { ex: 3600 });
  res.json({ lobby });
}
