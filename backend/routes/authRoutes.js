const express = require('express');
const { login, registerTeacher } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
// A helper route to register an initial teacher
router.post('/register-teacher', registerTeacher);

module.exports = router;
