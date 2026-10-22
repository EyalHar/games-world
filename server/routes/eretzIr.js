const express = require('express');
const os = require('os');
const { CATEGORIES, OPTIONS, DEFAULT_SETTINGS, HARD_LETTERS, MAX_ANSWERS_PER_CATEGORY, MIN_CATEGORIES } = require('../eretz-ir/constants');
const { isCheckerAvailable } = require('../eretz-ir/checker');

const router = express.Router();

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i.address);
}

router.get('/config', (req, res) => {
  res.json({
    categories: CATEGORIES.map(({ id, label, emoji, isDefault }) => ({ id, label, emoji, isDefault })),
    options: OPTIONS,
    defaults: DEFAULT_SETTINGS,
    hardLetters: HARD_LETTERS,
    maxAnswersPerCategory: MAX_ANSWERS_PER_CATEGORY,
    minCategories: MIN_CATEGORIES,
    lanAddresses: lanAddresses(),
    checkerAvailable: isCheckerAvailable(),
  });
});

module.exports = router;
