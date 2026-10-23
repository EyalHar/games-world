const express = require('express');
const { OPTIONS, DEFAULT_SETTINGS, BOARD_SIZE, SCORING, MAX_EXPLANATION_LENGTH } = require('../crossword/constants');
const { lanAddresses } = require('../shared/network');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    options: OPTIONS,
    defaults: DEFAULT_SETTINGS,
    boardSize: BOARD_SIZE,
    scoring: SCORING,
    maxExplanationLength: MAX_EXPLANATION_LENGTH,
    lanAddresses: lanAddresses(),
  });
});

module.exports = router;
