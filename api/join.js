import clientPromise from "./db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { code, playerId, playerName } = req.body;
  if (!code || !playerId || !playerName)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const client = await clientPromise;
    const db = client.db("hulaan");
    const lobbies = db.collection("lobbies");

    // Find the lobby
    const lobby = await lobbies.findOne({ code });
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });
    if (lobby.gameState !== "lobby")
      return res.status(400).json({ error: "Game already started" });

    // Add new player
    const newPlayer = {
      id: playerId,
      name: playerName,
      host: false,
      number: null,
      eliminated: false,
      ready: false,
    };

    // Build updated order (avoid duplicates)
    const updatedOrder = lobby.order.includes(playerId)
      ? lobby.order
      : [...lobby.order, playerId];

    await lobbies.updateOne(
      { code },
      {
        $set: {
          [`players.${playerId}`]: newPlayer,  // only adds/updates this player
          order: updatedOrder,
          updatedAt: new Date(),
          expireAt: new Date(Date.now() + 3600 * 1000), // reset TTL
        },
      }
    );

    // Return updated lobby
    const updatedLobby = {
      ...lobby,
      players: { ...lobby.players, [playerId]: newPlayer },
      order: updatedOrder,
      updatedAt: new Date(),
    };

    res.json({ lobby: updatedLobby });
  } catch (err) {
    console.error("join error:", err);
    res.status(500).json({ error: "Failed to join lobby" });
  }
}