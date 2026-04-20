const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Teacher', 'Student'], required: true },
  roll_number: { type: String }, // For students
  profilePic: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' },
  activeToken: { type: String }, // For single session
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
