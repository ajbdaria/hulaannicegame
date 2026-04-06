import clientPromise from "./db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { code, playerId } = req.body;

  try {
    const client = await clientPromise;
    const db = client.db("hulaan");
    const lobbies = db.collection("lobbies");

    // Find the lobby
    const lobby = await lobbies.findOne({ code });
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });
    if (lobby.host !== playerId)
      return res.status(403).json({ error: "Not host" });
    if (Object.keys(lobby.players).length < 2)
      return res.status(400).json({ error: "Need at least 2 players" });

    const updatedFields = {
      gameState: "picking",
      updatedAt: new Date(),
      expireAt: new Date(Date.now() + 3600 * 1000), // reset TTL
    };

    await lobbies.updateOne({ code }, { $set: updatedFields });

    res.json({ lobby: { ...lobby, ...updatedFields } });
  } catch (err) {
    console.error("start error:", err);
    res.status(500).json({ error: "Failed to start game" });
  }
}