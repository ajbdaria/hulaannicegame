import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { code, playerId, playerName } = req.body;
  if (!code || !playerId || !playerName) return res.status(400).json({ error: "Missing fields" });

  const lobby = await kv.get(`lobby:${code}`);
  if (!lobby) return res.status(404).json({ error: "Lobby not found" });
  if (lobby.gameState !== "lobby") return res.status(400).json({ error: "Game already started" });

  lobby.players[playerId] = { id: playerId, name: playerName, host: false, number: null, eliminated: false, ready: false };
  if (!lobby.order.includes(playerId)) lobby.order.push(playerId);
  lobby.updatedAt = Date.now();

  await kv.set(`lobby:${code}`, lobby, { ex: 3600 });
  res.json({ lobby });
}
