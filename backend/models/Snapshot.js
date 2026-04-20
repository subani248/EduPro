const mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  triggerReason: { type: String }, // e.g., 'PERIODIC', 'TAB_SWITCH', 'NO_FACE', 'MULTIPLE_FACES'
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Snapshot', snapshotSchema);
