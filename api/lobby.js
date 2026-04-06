import clientPromise from "./db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    const client = await clientPromise;
    const db = client.db("hulaan");
    const lobbies = db.collection("lobbies");

    const lobby = await lobbies.findOne(
      { code },
      { projection: { _id: 0 } } // exclude MongoDB's _id from response
    );
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });

    res.json({ lobby });
  } catch (err) {
    console.error("lobby error:", err);
    res.status(500).json({ error: "Failed to fetch lobby" });
  }
}