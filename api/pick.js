import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { code, playerId, number } = req.body;
  if (!code || !playerId || !number) return res.status(400).json({ error: "Missing fields" });

  const lobby = await kv.get(`lobby:${code}`);
  if (!lobby) return res.status(404).json({ error: "Lobby not found" });

  lobby.players[playerId].number = number;
  lobby.players[playerId].ready = true;

  const allReady = Object.values(lobby.players).every(p => p.ready);
  if (allReady) {
    const alive = lobby.order.filter(pid => lobby.players[pid] && !lobby.players[pid].eliminated);
    lobby.gameState = "playing";
    lobby.currentTurn = alive[0];
    lobby.round = 1;
    lobby.log = ["Game started! All players locked in their numbers."];
  }

  lobby.updatedAt = Date.now();
  await kv.set(`lobby:${code}`, lobby, { ex: 3600 });
  res.json({ lobby });
}
