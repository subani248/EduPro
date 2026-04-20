const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Submission = require('../models/Submission');

const createExam = async (req, res) => {
  const { title, subject, duration, startTime, endTime } = req.body;
  try {
    const exam = await Exam.create({
      title, subject, duration, startTime, endTime, teacherId: req.user._id, isPublished: true
    });
    res.status(201).json(exam);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const getExams = async (req, res) => {
  try {
    const query = req.user.role === 'Teacher' ? { teacherId: req.user._id } : { isPublished: true };
    const exams = await Exam.find(query);
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const getExamDetails = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Only return questions if it's a student and the exam is published, or if it's the teacher
    if (req.user.role === 'Student' && !exam.isPublished) {
      return res.status(403).json({ message: 'Exam is not published yet' });
    }

    const questions = await Question.find({ examId: req.params.id }).select('-correctAnswer');
    res.json({ exam, questions });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const publishExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (exam.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    exam.isPublished = true;
    await exam.save();
    res.json({ message: 'Exam published successfully', exam });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Shuffle function for questions and options
const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const startExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam || !exam.isPublished) return res.status(404).json({ message: 'Exam not available' });

    // Check if ALREADY SUBMITTED
    const previousSubmission = await Submission.findOne({ examId: req.params.id, studentId: req.user._id });
    if (previousSubmission) {
      // Instead of error, return the submission status so frontend can show result for 10s
      return res.json({
        alreadySubmitted: true,
        submission: previousSubmission,
        exam
      });
    }

    const now = new Date();
    if (now < new Date(exam.startTime) || now > new Date(exam.endTime)) {
      return res.status(400).json({ message: 'Exam is not currently active' });
    }

    let questions = await Question.find({ examId: req.params.id }).select('-correctAnswer');
    // Randomize questions
    questions = shuffle(questions.map(q => q.toObject()));

    // Randomize options for MCQ
    questions.forEach(q => {
      if (q.type === 'mcq') {
        q.options = shuffle(q.options);
      }
    });

    res.json({ exam, questions });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const submitExam = async (req, res) => {
  const { answers, autoSubmitted } = req.body;

  try {
    const previousSubmission = await Submission.findOne({ examId: req.params.id, studentId: req.user._id });
    if (previousSubmission) {
      return res.status(400).json({ message: 'You have already submitted this exam.' });
    }

    let correctCount = 0;
    let incorrectCount = 0;

    const questions = await Question.find({ examId: req.params.id });

    // Evaluate answers
    answers.forEach(submitAnswer => {
      const question = questions.find(q => q._id.toString() === submitAnswer.questionId);
      if (question) {
        if (question.type === 'mcq') {
          if (question.correctAnswer === submitAnswer.answer) correctCount++;
          else incorrectCount++;
        } else if (question.type === 'fill_blank') {
          if (question.correctAnswer.toLowerCase().trim() === submitAnswer.answer?.toLowerCase().trim()) correctCount++;
          else incorrectCount++;
        }
      }
    });

    const score = correctCount; // Assuming 1 pt per question for simplicity

    const submission = await Submission.create({
      examId: req.params.id,
      studentId: req.user._id,
      answers,
      score,
      correctCount,
      incorrectCount,
      autoSubmitted: autoSubmitted || false
    });

    res.status(201).json({ message: 'Exam submitted', submission });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const getResults = async (req, res) => {
  try {
    if (req.user.role === 'Student') {
      const submissions = await Submission.find({ studentId: req.user._id }).populate('examId', 'title subject');
      res.json(submissions);
    } else {
      // Teacher views results for a specific exam
      const { examId } = req.query;
      if (!examId) return res.status(400).json({ message: 'Exam ID required for teachers' });
      const submissions = await Submission.find({ examId }).populate('studentId', 'name email roll_number');
      res.json(submissions);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { createExam, getExams, getExamDetails, publishExam, startExam, submitExam, getResults };
