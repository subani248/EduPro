const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  violationType: {
    type: String,
    enum: ['EXIT_FULLSCREEN', 'TAB_SWITCH', 'WINDOW_BLUR', 'NO_FACE', 'MULTIPLE_FACES', 'CAMERA_OFF', 'SUSPICIOUS_GAZE', 'CELL_PHONE_DETECTED', 'BOOK_DETECTED'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Violation', violationSchema);
