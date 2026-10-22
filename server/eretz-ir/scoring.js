const CLASSIC_POINTS = { onlyPlayer: 15, unique: 10, shared: 5 };

// Mutates each answer's `points` and `duplicate`; returns { [playerId]: roundTotal }.
function scoreRound({ byPlayer, categories, scoring, multiplier }) {
  const totals = {};
  Object.keys(byPlayer).forEach(pid => { totals[pid] = 0; });

  categories.forEach(catId => {
    const playersByLemma = new Map();
    const playersWithValid = new Set();

    Object.entries(byPlayer).forEach(([pid, cats]) => {
      const seen = new Set();
      (cats[catId] || []).forEach(answer => {
        answer.duplicate = false;
        if (!answer.valid) return;
        if (seen.has(answer.lemma)) {
          answer.duplicate = true;
          return;
        }
        seen.add(answer.lemma);
        playersWithValid.add(pid);
        if (!playersByLemma.has(answer.lemma)) playersByLemma.set(answer.lemma, new Set());
        playersByLemma.get(answer.lemma).add(pid);
      });
    });

    Object.entries(byPlayer).forEach(([pid, cats]) => {
      (cats[catId] || []).forEach(answer => {
        let points = 0;
        if (answer.valid && !answer.duplicate) {
          if (scoring === 'simple') points = 1;
          else if (playersWithValid.size === 1) points = CLASSIC_POINTS.onlyPlayer;
          else if (playersByLemma.get(answer.lemma).size > 1) points = CLASSIC_POINTS.shared;
          else points = CLASSIC_POINTS.unique;
        }
        answer.points = points * multiplier;
        totals[pid] += answer.points;
      });
    });
  });

  return totals;
}

module.exports = { scoreRound };
