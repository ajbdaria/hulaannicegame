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

    // Find the lobby
    const lobby = await lobbies.findOne({ code });
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });

    const guesser = lobby.players[playerId];
    const target = lobby.players[targetId];
    if (!target) return res.status(400).json({ error: "Target not found" });
    if (target.eliminated) return res.status(400).json({ error: "Target already eliminated" });

    // Initialize recentGuesses array if it doesn't exist
    if (!lobby.recentGuesses) lobby.recentGuesses = [];

    // --- JUMP GUESS: anyone alive can jump-guess any other alive player ---
    if (isJump) {
      if (lobby.gameState !== "playing")
        return res.status(400).json({ error: "Game not active" });
      if (playerId === targetId)
        return res.status(400).json({ error: "Cannot jump-guess yourself" });
      if (lobby.players[playerId]?.eliminated)
        return res.status(400).json({ error: "Eliminated players cannot guess" });

      const guessNum = parseInt(guess);
      const correct = target.number === guessNum;

      const hint = correct ? "YES ✅" : "NO ❌";
      const logEntry = `[JUMP] ${guesser.name} → ${target.name}: ${guess} — ${hint}`;
      lobby.log.push(logEntry);

      // Track this guess for the ring center display
      lobby.recentGuesses.push({
        guesser: guesser.name,
        target: target.name,
        num: guessNum,
        correct,
        hint: correct ? "correct" : "jump-miss",
        isJump: true,
        ts: Date.now(),
      });
      // Keep only the last 5 guesses
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
      // --- NORMAL GUESS: must be your turn ---
      if (lobby.currentTurn !== playerId)
        return res.status(400).json({ error: "Not your turn" });

      const guessNum = parseInt(guess);
      const correct = target.number === guessNum;
      const hintText = correct
        ? "CORRECT! " + target.name + " eliminated!"
        : guessNum < target.number
        ? "Too low! 🔼"
        : "Too high! 🔽";

      const logEntry = `${guesser.name} → ${target.name}: ${guess} — ${hintText}`;
      lobby.log.push(logEntry);

      // Track this guess for the ring center display
      // hint field: "correct" | "low" | "high"
      const hintKey = correct ? "correct" : guessNum < target.number ? "low" : "high";
      lobby.recentGuesses.push({
        guesser: guesser.name,
        target: target.name,
        num: guessNum,
        correct,
        hint: hintKey,
        isJump: false,
        ts: Date.now(),
      });
      // Keep only the last 5 guesses
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

    const guessNum = parseInt(guess);
    res.json({
      lobby,
      correct: target.number === guessNum,
      hint: isJump
        ? (target.number === guessNum ? "YES ✅" : "NO ❌")
        : (target.number === guessNum
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