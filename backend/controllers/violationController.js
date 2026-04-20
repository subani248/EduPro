const Violation = require('../models/Violation');

const logViolation = async (req, res) => {
  const { examId, violationType } = req.body;
  try {
    const violation = await Violation.create({
      studentId: req.user._id,
      examId,
      violationType,
      timestamp: new Date()
    });
    res.status(201).json(violation);
  } catch (error) {
    console.error('Error logging violation:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getViolations = async (req, res) => {
  try {
    // Both Teachers and Admin can view violations
    // If it's a student, they shouldn't be calling this normally, but we can restrict just in case.
    if (req.user.role === 'Student') {
       return res.status(403).json({ message: 'Unauthorized' });
    }

    const { examId } = req.query;
    const query = examId ? { examId } : {};

    const violations = await Violation.find(query)
      .populate('studentId', 'name email roll_number')
      .populate('examId', 'title subject')
      .sort({ timestamp: -1 });

    res.json(violations);
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { logViolation, getViolations };
