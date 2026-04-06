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
    if (!lobby) return res.status(200).json({ ok: true }); // already gone, no error

    // Filter out the leaving player from order
    const updatedOrder = lobby.order.filter((p) => p !== playerId);

    if (updatedOrder.length === 0) {
      // No players left — delete the lobby
      await lobbies.deleteOne({ code });
    } else {
      // Determine new host if host is leaving
      const updatedPlayers = { ...lobby.players };
      delete updatedPlayers[playerId];

      // If the leaver was the host, assign host to next player in order
      if (lobby.host === playerId) {
        const newHostId = updatedOrder[0];
        updatedPlayers[newHostId] = {
          ...updatedPlayers[newHostId],
          host: true,
        };
      }

      await lobbies.updateOne(
        { code },
        {
          $set: {
            players: updatedPlayers,
            order: updatedOrder,
            host: lobby.host === playerId ? updatedOrder[0] : lobby.host,
            updatedAt: new Date(),
            expireAt: new Date(Date.now() + 3600 * 1000), // reset TTL
          },
        }
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("leave error:", err);
    res.status(500).json({ error: "Failed to leave lobby" });
  }
}