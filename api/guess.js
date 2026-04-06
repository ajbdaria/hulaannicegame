import clientPromise from "./db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { code, playerId, targetId, guess } = req.body;
  if (!code || !playerId || !targetId || guess == null)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const client = await clientPromise;
    const db = client.db("hulaan");
    const lobbies = db.collection("lobbies");

    // Find the lobby
    const lobby = await lobbies.findOne({ code });
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });
    if (lobby.currentTurn !== playerId)
      return res.status(400).json({ error: "Not your turn" });

    const guesser = lobby.players[playerId];
    const target = lobby.players[targetId];
    if (!target) return res.status(400).json({ error: "Target not found" });

    // Check guess
    const correct = target.number === parseInt(guess);
    const logEntry = `${guesser.name} → ${target.name}: ${guess} — ${
      correct ? "CORRECT! " + target.name + " eliminated!" : "Wrong."
    }`;
    lobby.log.push(logEntry);

    if (correct) lobby.players[targetId].eliminated = true;

    // Check alive players
    const alive = lobby.order.filter(
      (pid) => lobby.players[pid] && !lobby.players[pid].eliminated
    );

    if (alive.length <= 1) {
      // Game over
      const winnerId = alive[0] || playerId;
      lobby.log.push((lobby.players[winnerId]?.name || "?") + " wins! 🏆");
      lobby.gameState = "over";
      lobby.winner = winnerId;
      lobby.currentTurn = null;
    } else {
      // Next turn
      let idx = alive.indexOf(playerId);
      if (idx === -1) idx = 0;
      lobby.currentTurn = alive[(idx + 1) % alive.length];
      lobby.round =
        Math.floor(lobby.log.filter((l) => l.includes("→")).length / alive.length) + 1;
    }

    lobby.updatedAt = new Date();
    lobby.expireAt = new Date(Date.now() + 3600 * 1000); // reset TTL

    // Update in MongoDB
    await lobbies.updateOne(
      { code },
      {
        $set: {
          players: lobby.players,
          log: lobby.log,
          gameState: lobby.gameState,
          winner: lobby.winner,
          currentTurn: lobby.currentTurn,
          round: lobby.round,
          updatedAt: lobby.updatedAt,
          expireAt: lobby.expireAt,
        },
      }
    );

    res.json({ lobby });
  } catch (err) {
    console.error("guess error:", err);
    res.status(500).json({ error: "Failed to process guess" });
  }
}