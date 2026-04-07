import clientPromise from "./db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { code, playerId, targetId, guess, isJump } = req.body;
  if (!code || !playerId || !targetId || guess == null)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const client = await clientPromise;
    const db = client.db("hulaan");
    const lobbies = db.collection("lobbies");

    const lobby = await lobbies.findOne({ code });
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });

    const guesser = lobby.players[playerId];
    const target = lobby.players[targetId];
    if (!target) return res.status(400).json({ error: "Target not found" });
    if (target.eliminated) return res.status(400).json({ error: "Target already eliminated" });

    if (!lobby.recentGuesses) lobby.recentGuesses = [];

    const guessNum = parseInt(guess);
    const correct = target.number === guessNum;
    // Unified hint key used by both normal and jump guesses
    const hintKey = correct ? "correct" : guessNum < target.number ? "low" : "high";

    // --- JUMP GUESS ---
    if (isJump) {
      if (lobby.gameState !== "playing")
        return res.status(400).json({ error: "Game not active" });
      if (playerId === targetId)
        return res.status(400).json({ error: "Cannot jump-guess yourself" });
      if (lobby.players[playerId]?.eliminated)
        return res.status(400).json({ error: "Eliminated players cannot guess" });

      const hint = correct ? "YES ✅" : "NO ❌";
      const logEntry = `[JUMP] ${guesser.name} → ${target.name}: ${guess} — ${hint}`;
      lobby.log.push(logEntry);

      lobby.recentGuesses.push({
        guesser: guesser.name,
        target: target.name,
        num: guessNum,
        correct,
        hint: hintKey, // "correct" | "low" | "high" — same as normal so arrow shows correctly
        isJump: true,
        ts: Date.now(),
      });
      if (lobby.recentGuesses.length > 5) lobby.recentGuesses.shift();

      if (correct) {
        lobby.players[targetId].eliminated = true;

        const alive = lobby.order.filter(
          (pid) => lobby.players[pid] && !lobby.players[pid].eliminated
        );

        if (alive.length <= 1) {
          const winnerId = alive[0] || playerId;
          lobby.log.push((lobby.players[winnerId]?.name || "?") + " wins! 🏆");
          lobby.gameState = "over";
          lobby.winner = winnerId;
          lobby.currentTurn = null;
        }
      }

    } else {
      // --- NORMAL GUESS ---
      if (lobby.currentTurn !== playerId)
        return res.status(400).json({ error: "Not your turn" });

      const hintText = correct
        ? "CORRECT! " + target.name + " eliminated!"
        : guessNum < target.number
        ? "Too low! 🔼"
        : "Too high! 🔽";

      const logEntry = `${guesser.name} → ${target.name}: ${guess} — ${hintText}`;
      lobby.log.push(logEntry);

      lobby.recentGuesses.push({
        guesser: guesser.name,
        target: target.name,
        num: guessNum,
        correct,
        hint: hintKey, // "correct" | "low" | "high"
        isJump: false,
        ts: Date.now(),
      });
      if (lobby.recentGuesses.length > 5) lobby.recentGuesses.shift();

      if (correct) lobby.players[targetId].eliminated = true;

      const alive = lobby.order.filter(
        (pid) => lobby.players[pid] && !lobby.players[pid].eliminated
      );

      if (alive.length <= 1) {
        const winnerId = alive[0] || playerId;
        lobby.log.push((lobby.players[winnerId]?.name || "?") + " wins! 🏆");
        lobby.gameState = "over";
        lobby.winner = winnerId;
        lobby.currentTurn = null;
      } else {
        let idx = alive.indexOf(playerId);
        if (idx === -1) idx = 0;
        lobby.currentTurn = alive[(idx + 1) % alive.length];
        lobby.round =
          Math.floor(
            lobby.log.filter((l) => l.includes("→") && !l.startsWith("[JUMP]")).length /
              alive.length
          ) + 1;
      }
    }

    lobby.updatedAt = new Date();
    lobby.expireAt = new Date(Date.now() + 3600 * 1000);

    await lobbies.updateOne(
      { code },
      {
        $set: {
          players: lobby.players,
          log: lobby.log,
          recentGuesses: lobby.recentGuesses,
          gameState: lobby.gameState,
          winner: lobby.winner,
          currentTurn: lobby.currentTurn,
          round: lobby.round,
          updatedAt: lobby.updatedAt,
          expireAt: lobby.expireAt,
        },
      }
    );

    res.json({
      lobby,
      correct,
      hint: isJump
        ? (correct ? "YES ✅" : "NO ❌")
        : (correct
            ? "CORRECT! " + target.name + " eliminated!"
            : guessNum < target.number
            ? "Too low! 🔼"
            : "Too high! 🔽"),
    });

  } catch (err) {
    console.error("guess error:", err);
    res.status(500).json({ error: "Failed to process guess" });
  }
}