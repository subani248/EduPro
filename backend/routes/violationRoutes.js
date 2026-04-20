const express = require('express');
const router = express.Router();
const { logViolation, getViolations } = require('../controllers/violationController');
const { protect } = require('../middleware/auth');

router.post('/', protect, logViolation);
router.get('/', protect, getViolations);

module.exports = router;
