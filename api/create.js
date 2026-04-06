import clientPromise from "./db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { playerId, playerName } = req.body;
  if (!playerId || !playerName)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const client = await clientPromise;
    const db = client.db("hulaan");
    const lobbies = db.collection("lobbies");

    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const lobby = {
      code,
      host: playerId,
      gameState: "lobby",
      players: {
        [playerId]: {
          id: playerId,
          name: playerName,
          host: true,
          number: null,
          eliminated: false,
          ready: false,
        },
      },
      order: [playerId],
      round: 1,
      currentTurn: null,
      log: [],
      winner: null,
      updatedAt: new Date(),
      // TTL equivalent — MongoDB will auto-delete after 1 hour
      expireAt: new Date(Date.now() + 3600 * 1000),
    };

    await lobbies.insertOne(lobby);
    res.json({ code, lobby });
  } catch (err) {
    console.error("create error:", err);
    res.status(500).json({ error: "Failed to create lobby" });
  }
}