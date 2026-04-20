const csv = require('csv-parser');
const { Readable } = require('stream');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Question = require('../models/Question');

const uploadStudents = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please upload a CSV file' });
  
  const results = [];
  const errors = [];
  const bufferStream = new Readable();
  bufferStream.push(req.file.buffer);
  bufferStream.push(null);

  bufferStream.pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      let added = 0;
      for (const row of results) {
        try {
          const { name, email, roll_number, password } = row;
          if (!name || !email || !roll_number || !password) continue;
          
          const existing = await User.findOne({ email });
          if (existing) continue;

          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          
          await User.create({
            name,
            email,
            roll_number,
            password: hashedPassword,
            role: 'Student'
          });
          added++;
        } catch (e) {
          errors.push(e.message);
        }
      }
      res.json({ message: `Successfully added ${added} students.`, errors });
    });
};

const uploadQuestions = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please upload a CSV file' });
  const { examId } = req.body;
  if (!examId) return res.status(400).json({ message: 'Exam ID is required' });

  const results = [];
  const bufferStream = new Readable();
  bufferStream.push(req.file.buffer);
  bufferStream.push(null);

  bufferStream.pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      let added = 0;
      for (const row of results) {
        try {
          const { question, type, option1, option2, option3, option4, correct_answer } = row;
          if (!question || !type || !correct_answer) continue;

          let options = [];
          if (type === 'mcq') {
            options = [option1, option2, option3, option4].filter(Boolean);
            if (options.length !== 4) continue;
          }

          await Question.create({
            examId,
            question,
            type,
            options,
            correctAnswer: correct_answer
          });
          added++;
        } catch (e) {
          console.error(e);
        }
      }
      res.json({ message: `Successfully added ${added} questions.` });
    });
};

module.exports = { uploadStudents, uploadQuestions };
