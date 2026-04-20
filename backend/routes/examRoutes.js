const express = require('express');
const { createExam, getExams, getExamDetails, publishExam, startExam, submitExam, getResults } = require('../controllers/examController');
const { protect, teacherOnly } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, teacherOnly, createExam);
router.get('/', protect, getExams);
router.get('/results', protect, getResults); // Student gets all theirs, Teacher queries by examId
router.get('/:id', protect, getExamDetails);
router.put('/:id/publish', protect, teacherOnly, publishExam);
router.get('/:id/start', protect, startExam);
router.post('/:id/submit', protect, submitExam);

module.exports = router;
