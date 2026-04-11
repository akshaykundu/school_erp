import express from 'express';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import { generateToken } from '../utils/auth.js';

const router = express.Router();

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

async function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ email: normalizeEmail(email) });

    if (!admin || !(await verifyPassword(password, admin.password))) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    const token = generateToken({ id: admin._id, email: admin.email, role: 'admin' });

    return res.json({
      message: 'Admin login successful.',
      user: { name: admin.name, email: admin.email },
      token
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to login as admin.' });
  }
});

// Teacher Login
router.post('/teacher/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const teacher = await Teacher.findOne({ email: normalizeEmail(email) });

    if (!teacher || !(await verifyPassword(password, teacher.password))) {
      return res.status(401).json({ message: 'Only teachers added by an admin can access this portal.' });
    }

    const token = generateToken({ id: teacher._id, email: teacher.email, role: 'teacher' });

    return res.json({
      message: 'Teacher login successful.',
      user: { name: teacher.name, email: teacher.email },
      token
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to login as teacher.' });
  }
});

// Student Login
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const student = await Student.findOne({ email: normalizeEmail(email) });

    if (!student || !(await verifyPassword(password, student.password))) {
      return res.status(401).json({ message: 'Only students added by a teacher can access this portal.' });
    }

    const token = generateToken({ id: student._id, email: student.email, role: 'student' });

    return res.json({
      message: 'Student login successful.',
      user: { name: student.name, email: student.email },
      token
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to login as student.' });
  }
});

export default router;
