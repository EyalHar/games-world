const express = require('express');
const router = express.Router();
const { puzzles, FEMALE_NAMES, MALE_NAMES } = require('../data/gameData');

router.get('/puzzles', (req, res) => {
  const level = parseInt(req.query.level) || 1;
  const levelPuzzles = puzzles
    .filter(p => p.level === level)
    .sort(() => Math.random() - 0.5);
  res.json(levelPuzzles);
});

router.post('/check-gender', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const n = name.trim();
  if (FEMALE_NAMES.includes(n)) return res.json({ gender: 'female', certain: true });
  if (MALE_NAMES.includes(n))   return res.json({ gender: 'male',   certain: true });
  // שם לא מוכר → לא בטוחים, נשאל
  return res.json({ gender: 'unknown', certain: false });
});

module.exports = router;
