import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { code, playerId, targetId, guess } = req.body;
  if (!code || !playerId || !targetId || guess == null) return res.status(400).json({ error: "Missing fields" });

  const lobby = await kv.get(`lobby:${code}`);
  if (!lobby) return res.status(404).json({ error: "Lobby not found" });
  if (lobby.currentTurn !== playerId) return res.status(400).json({ error: "Not your turn" });

  const guesser = lobby.players[playerId];
  const target  = lobby.players[targetId];
  if (!target) return res.status(400).json({ error: "Target not found" });

  const correct = target.number === parseInt(guess);
  const logEntry = `${guesser.name} → ${target.name}: ${guess} — ${correct ? "CORRECT! " + target.name + " eliminated!" : "Wrong."}`;
  lobby.log.push(logEntry);

  if (correct) lobby.players[targetId].eliminated = true;

  const alive = lobby.order.filter(pid => lobby.players[pid] && !lobby.players[pid].eliminated);

  if (alive.length <= 1) {
    const winnerId = alive[0] || playerId;
    lobby.log.push((lobby.players[winnerId]?.name || "?") + " wins! 🏆");
    lobby.gameState = "over";
    lobby.winner = winnerId;
  } else {
    let idx = alive.indexOf(playerId);
    if (idx === -1) idx = 0;
    lobby.currentTurn = alive[(idx + 1) % alive.length];
    lobby.round = Math.floor(lobby.log.filter(l => l.includes("→")).length / alive.length) + 1;
  }

  lobby.updatedAt = Date.now();
  await kv.set(`lobby:${code}`, lobby, { ex: 3600 });
  res.json({ lobby });
}
