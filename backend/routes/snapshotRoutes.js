const express = require('express');
const router = express.Router();
const { saveSnapshot, getSnapshots } = require('../controllers/snapshotController');
const { protect, teacherOnly } = require('../middleware/auth');

router.post('/', protect, saveSnapshot);
router.get('/', protect, teacherOnly, getSnapshots);

module.exports = router;
