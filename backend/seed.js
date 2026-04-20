require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Exam = require('./models/Exam');
const Question = require('./models/Question');
const Submission = require('./models/Submission');
const Violation = require('./models/Violation');
const Snapshot = require('./models/Snapshot');

const seedDatabase = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/online-exam';
    console.log(`Connecting to MongoDB at: ${mongoURI}`);
    
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully!');

    // Clear existing data
    await User.deleteMany();
    await Exam.deleteMany();
    await Question.deleteMany();
    await Submission.deleteMany();
    await Violation.deleteMany();
    await Snapshot.deleteMany();
    console.log('Existing data cleared.');

    // 1. Create a Teacher
    const salt = await bcrypt.genSalt(10);
    const hashedTeacherPassword = await bcrypt.hash('teacher123', salt);
    const teacher = await User.create({
      name: 'John Professor',
      email: 'teacher@example.com',
      password: hashedTeacherPassword,
      role: 'Teacher',
      profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
    });
    console.log('Teacher created: teacher@example.com / teacher123');

    // 2. Create Multiple Students
    const hashedStudentPassword = await bcrypt.hash('student123', salt);
    const studentsData = [
      { name: 'Alice Smith', email: 'alice@example.com', roll_number: '1001', role: 'Student', password: hashedStudentPassword },
      { name: 'Bob Johnson', email: 'bob@example.com', roll_number: '1002', role: 'Student', password: hashedStudentPassword },
      { name: 'Charlie Davis', email: 'charlie@example.com', roll_number: '1003', role: 'Student', password: hashedStudentPassword },
      { name: 'Diana Miller', email: 'diana@example.com', roll_number: '1004', role: 'Student', password: hashedStudentPassword },
      { name: 'Ethan Hunt', email: 'ethan@example.com', roll_number: '1005', role: 'Student', password: hashedStudentPassword },
      { name: 'Student Account', email: 'student@example.com', roll_number: 'S123', role: 'Student', password: hashedStudentPassword }
    ];
    
    const students = await User.insertMany(studentsData.map(s => ({
      ...s,
      profilePic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name.split(' ')[0]}`
    })));
    console.log(`Created ${students.length} students (passwords: student123).`);

    // 3. Create Exams
    const now = new Date();
    
    // Exam 1: JavaScript
    const exam1 = await Exam.create({
      title: 'Advanced JavaScript Concepts',
      subject: 'Computer Science',
      duration: 60,
      startTime: new Date(now.getTime() - 1000 * 60 * 120), // Started 2 hours ago
      endTime: new Date(now.getTime() + 1000 * 60 * 60 * 48), // Ends in 2 days
      teacherId: teacher._id,
      isPublished: true
    });

    // Exam 2: Python
    const exam2 = await Exam.create({
      title: 'Python for Data Science',
      subject: 'Data Science',
      duration: 45,
      startTime: new Date(now.getTime() - 1000 * 60 * 30), // Started 30 mins ago
      endTime: new Date(now.getTime() + 1000 * 60 * 60 * 24),
      teacherId: teacher._id,
      isPublished: true
    });
    console.log('Exams created.');

    // 4. Create Questions for Exam 1
    const q1 = await Question.insertMany([
      {
        examId: exam1._id,
        question: 'Which of the following is not a primitive data type in JavaScript?',
        type: 'mcq',
        options: ['String', 'Number', 'Object', 'Boolean'],
        correctAnswer: 'Object'
      },
      {
        examId: exam1._id,
        question: 'What is the output of "console.log(typeof null)"?',
        type: 'mcq',
        options: ['"null"', '"undefined"', '"object"', '"boolean"'],
        correctAnswer: '"object"'
      },
      {
        examId: exam1._id,
        question: 'The _____ keyword is used to create a constant variable in ES6.',
        type: 'fill_blank',
        options: [],
        correctAnswer: 'const'
      }
    ]);

    // Create Questions for Exam 2
    const q2 = await Question.insertMany([
      {
        examId: exam2._id,
        question: 'Which library is primarily used for data manipulation and analysis in Python?',
        type: 'mcq',
        options: ['NumPy', 'Pandas', 'Matplotlib', 'Scikit-learn'],
        correctAnswer: 'Pandas'
      },
      {
        examId: exam2._id,
        question: 'What is the correct file extension for Python files?',
        type: 'mcq',
        options: ['.py', '.python', '.pyt', '.pt'],
        correctAnswer: '.py'
      }
    ]);
    console.log('Questions inserted for both exams.');

    // 5. Create Sample Violations
    const violationTypes = ['TAB_SWITCH', 'MULTIPLE_FACES', 'NO_FACE', 'SUSPICIOUS_GAZE', 'CELL_PHONE_DETECTED', 'BOOK_DETECTED'];
    const sampleViolations = [];
    
    // Distribute some violations among students
    for (let i = 0; i < 15; i++) {
        const randomStudent = students[Math.floor(Math.random() * students.length)];
        const randomExam = Math.random() > 0.5 ? exam1 : exam2;
        const randomType = violationTypes[Math.floor(Math.random() * violationTypes.length)];
        
        sampleViolations.push({
            studentId: randomStudent._id,
            examId: randomExam._id,
            violationType: randomType,
            timestamp: new Date(now.getTime() - Math.random() * 1000 * 60 * 60)
        });
    }
    await Violation.insertMany(sampleViolations);
    console.log('Sample violations inserted.');

    // 6. Create initial Snapshots
    const sampleSnapshots = [];
    const triggerReasons = ['PERIODIC', 'SUSPICIOUS_GAZE', 'CELL_PHONE_DETECTED', 'MULTIPLE_FACES'];
    
    for (let i = 0; i < 12; i++) {
        const randomStudent = students[Math.floor(Math.random() * students.length)];
        const randomExam = Math.random() > 0.5 ? exam1 : exam2;
        const randomReason = triggerReasons[Math.floor(Math.random() * triggerReasons.length)];
        
        sampleSnapshots.push({
            examId: randomExam._id,
            studentId: randomStudent._id,
            imageUrl: `/uploads/snapshots/dummy_${i}.png`,
            triggerReason: randomReason,
            timestamp: new Date(now.getTime() - Math.random() * 1000 * 60 * 30)
        });
    }
    await Snapshot.insertMany(sampleSnapshots);
    console.log('Sample snapshots inserted.');

    // 7. Create Sample Submissions (Results)
    const submissions = [
        {
            examId: exam1._id,
            studentId: students[0]._id, // Alice
            score: 100,
            correctCount: 3,
            incorrectCount: 0,
            autoSubmitted: false,
            submittedAt: new Date(now.getTime() - 1000 * 60 * 45),
            answers: [
                { questionId: q1[0]._id, answer: 'Object' },
                { questionId: q1[1]._id, answer: '"object"' },
                { questionId: q1[2]._id, answer: 'const' }
            ]
        },
        {
            examId: exam1._id,
            studentId: students[1]._id, // Bob
            score: 33.3,
            correctCount: 1,
            incorrectCount: 2,
            autoSubmitted: true,
            submittedAt: new Date(now.getTime() - 1000 * 60 * 10),
            answers: [
                { questionId: q1[0]._id, answer: 'Object' },
                { questionId: q1[1]._id, answer: '"null"' },
                { questionId: q1[2]._id, answer: 'var' }
            ]
        }
    ];
    await Submission.insertMany(submissions);
    console.log('Sample submissions inserted.');

    console.log('\x1b[32m%s\x1b[0m', 'DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'DATABASE SEEDING FAILED:');
    console.error(error);
    process.exit(1);
  }
};

seedDatabase();
