import clientPromise from "./db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { code } = req.body;

  try {
    const client = await clientPromise;
    const db = client.db("hulaan");
    const lobbies = db.collection("lobbies");

    // Find the lobby
    const lobby = await lobbies.findOne({ code });
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });

    // Reset each player
    const updatedPlayers = {};
    Object.values(lobby.players).forEach((p) => {
      updatedPlayers[p.id] = {
        ...p,
        number: null,
        eliminated: false,
        ready: false,
      };
    });

    const updatedFields = {
      players: updatedPlayers,
      gameState: "lobby",
      currentTurn: null,
      round: 1,
      log: [],
      winner: null,
      updatedAt: new Date(),
      expireAt: new Date(Date.now() + 3600 * 1000), // reset TTL
    };

    // Update in MongoDB
    await lobbies.updateOne(
      { code },
      { $set: updatedFields }
    );

    res.json({ lobby: { ...lobby, ...updatedFields } });
  } catch (err) {
    console.error("again error:", err);
    res.status(500).json({ error: "Failed to reset lobby" });
  }
}