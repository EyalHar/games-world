const express = require('express');
const { CATEGORIES, OPTIONS, DEFAULT_SETTINGS, HARD_LETTERS, MAX_ANSWERS_PER_CATEGORY, MIN_CATEGORIES } = require('../eretz-ir/constants');
const { isCheckerAvailable } = require('../eretz-ir/checker');
const { lanAddresses } = require('../shared/network');

const router = express.Router();

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
