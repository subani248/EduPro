const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  question: { type: String, required: true },
  type: { type: String, enum: ['mcq', 'fill_blank'], required: true },
  options: [{ type: String }], // Array of 4 options for mcq
  correctAnswer: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
