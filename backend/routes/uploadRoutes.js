const express = require('express');
const { protect, teacherOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadStudents, uploadQuestions } = require('../controllers/uploadController');

const router = express.Router();

router.post('/students', protect, teacherOnly, upload.single('file'), uploadStudents);
router.post('/questions', protect, teacherOnly, upload.single('file'), uploadQuestions);

module.exports = router;
