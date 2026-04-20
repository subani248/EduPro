const express = require('express');
const router = express.Router();
const { runCode } = require('../controllers/playgroundController');
const { protect } = require('../middleware/auth');


router.post('/run', protect, runCode);

module.exports = router;
