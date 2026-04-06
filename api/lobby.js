import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "Missing code" });

  const lobby = await kv.get(`lobby:${code}`);
  if (!lobby) return res.status(404).json({ error: "Lobby not found" });

  res.json({ lobby });
}
