import clientPromise from "./db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { code, playerId, number } = req.body;
  if (!code || !playerId || !number)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const client = await clientPromise;
    const db = client.db("hulaan");
    const lobbies = db.collection("lobbies");

    // Find the lobby
    const lobby = await lobbies.findOne({ code });
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });
    if (!lobby.players[playerId])
      return res.status(400).json({ error: "Player not found in lobby" });

    // Set player's number and mark ready
    lobby.players[playerId].number = number;
    lobby.players[playerId].ready = true;

    // Check if all players are ready
    const allReady = Object.values(lobby.players).every((p) => p.ready);

    const updatedFields = {
      [`players.${playerId}.number`]: number,   // dot notation — only update
      [`players.${playerId}.ready`]: true,       // this player's fields
      updatedAt: new Date(),
      expireAt: new Date(Date.now() + 3600 * 1000), // reset TTL
    };

    if (allReady) {
      const alive = lobby.order.filter(
        (pid) => lobby.players[pid] && !lobby.players[pid].eliminated
      );
      updatedFields.gameState = "playing";
      updatedFields.currentTurn = alive[0];
      updatedFields.round = 1;
      updatedFields.log = ["Game started! All players locked in their numbers."];
    }

    await lobbies.updateOne({ code }, { $set: updatedFields });

    // Build and return updated lobby
    const updatedLobby = {
      ...lobby,
      players: lobby.players,
      updatedAt: updatedFields.updatedAt,
      ...(allReady && {
        gameState: updatedFields.gameState,
        currentTurn: updatedFields.currentTurn,
        round: updatedFields.round,
        log: updatedFields.log,
      }),
    };

    res.json({ lobby: updatedLobby });
  } catch (err) {
    console.error("pick error:", err);
    res.status(500).json({ error: "Failed to pick number" });
  }
}