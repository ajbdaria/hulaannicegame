import clientPromise from "./db.js";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hulaan");

    // Auto-delete lobbies after expireAt date
    await db.collection("lobbies").createIndex(
      { expireAt: 1 },
      { expireAfterSeconds: 0 }
    );

    res.json({ success: true, message: "TTL index created on lobbies ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}