import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { code, playerId } = req.body;

  const lobby = await kv.get(`lobby:${code}`);
  if (!lobby) return res.status(200).json({ ok: true });

  delete lobby.players[playerId];
  lobby.order = lobby.order.filter(p => p !== playerId);

  if (lobby.order.length === 0) {
    await kv.del(`lobby:${code}`);
  } else {
    lobby.updatedAt = Date.now();
    await kv.set(`lobby:${code}`, lobby, { ex: 3600 });
  }
  res.json({ ok: true });
}
