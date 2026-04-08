import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import { connectDB } from './config/db.js';
import Admin from './models/Admin.js';
import Classroom from './models/Classroom.js';
import Teacher from './models/Teacher.js';
import Student from './models/Student.js';

const app = express();
const PORT = 5000;

connectDB();

app.use(cors());
app.use(express.json());

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

async function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

function buildInitialAttendanceRecords() {
  const today = new Date();
  const records = [];

  for (let index = 6; index >= 0; index -= 1) {
    const recordDate = new Date(today);
    recordDate.setDate(today.getDate() - index);

    records.push({
      date: recordDate.toISOString().slice(0, 10),
      status: index === 2 || index === 5 ? 'Absent' : 'Present'
    });
  }

  return records;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

function normalizeProfilePayload(profile = {}) {
  return {
    phone: profile.phone?.trim?.() || '',
    address: profile.address?.trim?.() || '',
    dateOfBirth: profile.dateOfBirth?.trim?.() || '',
    gender: profile.gender?.trim?.() || '',
    bio: profile.bio?.trim?.() || '',
    profileImage: profile.profileImage?.trim?.() || ''
  };
}

function normalizeProtectedDetailsPayload(details = {}) {
  return {
    parentName: details.parentName?.trim?.() || '',
    parentPhone: details.parentPhone?.trim?.() || ''
  };
}

function getProfileResponse(user) {
  return {
    name: user.name,
    email: user.email,
    profile: normalizeProfilePayload(user.profile || {})
  };
}

function buildStudentDetailResponse(student) {
  const attendanceRecords = [...student.attendanceRecords].sort((first, second) =>
    first.date.localeCompare(second.date)
  );
  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter((record) => record.status === 'Present').length;
  const todayDate = getTodayDate();
  const todayAttendance =
    attendanceRecords.find((record) => record.date === todayDate)?.status || 'Not Marked';

  return {
    student: {
      name: student.name,
      email: student.email,
      createdByTeacher: student.createdByTeacher
    },
    profile: normalizeProfilePayload(student.profile || {}),
    protectedDetails: normalizeProtectedDetailsPayload(student.protectedDetails || {}),
    summary: {
      totalDays,
      presentDays,
      attendancePercentage: totalDays ? Math.round((presentDays / totalDays) * 100) : 0,
      todayAttendance
    },
    attendanceRecords,
    feeDetails: student.feeRecords,
    examDetails: student.examRecords,
    assignmentDetails: student.assignmentRecords
  };
}

function buildClassSchedules(students = []) {
  const examMap = new Map();
  const assignmentMap = new Map();

  students.forEach((student) => {
    (student.examRecords || []).forEach((exam) => {
      const key = [exam.subject, exam.date, exam.time, exam.room].join('||');

      if (!examMap.has(key)) {
        examMap.set(key, {
          subject: exam.subject,
          date: exam.date,
          time: exam.time,
          room: exam.room,
          maxMarks: Number(exam.maxMarks) || 100
        });
      }
    });

    (student.assignmentRecords || []).forEach((assignment) => {
      const key = [assignment.title, assignment.subject, assignment.dueDate, assignment.status].join('||');

      if (!assignmentMap.has(key)) {
        assignmentMap.set(key, {
          title: assignment.title,
          subject: assignment.subject,
          dueDate: assignment.dueDate,
          status: assignment.status
        });
      }
    });
  });

  const scheduledExams = [...examMap.values()].sort((first, second) => {
    const firstValue = `${first.date} ${first.time}`;
    const secondValue = `${second.date} ${second.time}`;

    return firstValue.localeCompare(secondValue);
  });

  const scheduledAssignments = [...assignmentMap.values()].sort((first, second) =>
    first.dueDate.localeCompare(second.dueDate)
  );

  return { scheduledExams, scheduledAssignments };
}

async function getAuthorizedClassroomAccess(classId, { teacherEmail = '', adminEmail = '' } = {}) {
  const normalizedTeacherEmail = normalizeEmail(teacherEmail);
  const normalizedAdminEmail = normalizeEmail(adminEmail);

  if (!normalizedTeacherEmail && !normalizedAdminEmail) {
    return { status: 400, message: 'Teacher email or admin email is required.' };
  }

  const classroom = await Classroom.findById(classId);

  if (!classroom) {
    return { status: 404, message: 'Class not found.' };
  }

  if (normalizedTeacherEmail) {
    const teacher = await Teacher.findOne({ email: normalizedTeacherEmail });

    if (!teacher) {
      return { status: 403, message: 'Only an existing teacher can manage classes.' };
    }

    if (classroom.teacherEmail !== normalizedTeacherEmail) {
      return { status: 403, message: 'You can only manage your own classes.' };
    }

    return {
      actorType: 'teacher',
      teacher,
      classroom,
      normalizedTeacherEmail,
      ownerTeacherEmail: classroom.teacherEmail
    };
  }

  const admin = await Admin.findOne({ email: normalizedAdminEmail });

  if (!admin) {
    return { status: 403, message: 'Only an existing admin can manage any class.' };
  }

  return {
    actorType: 'admin',
    admin,
    classroom,
    normalizedAdminEmail,
    ownerTeacherEmail: classroom.teacherEmail
  };
}

app.get('/', (req, res) => {
  res.json({ message: 'ERP backend is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'mongodb://127.0.0.1:27017/school_erp' });
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ email: normalizeEmail(email) });

    if (!admin || !(await verifyPassword(password, admin.password))) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    return res.json({
      message: 'Admin login successful.',
      user: { name: admin.name, email: admin.email }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to login as admin.' });
  }
});

app.post('/api/admins', async (req, res) => {
  try {
    const { adminEmail, name, email, password } = req.body;

    if (!adminEmail?.trim() || !name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Admin email, name, email, and password are required.' });
    }

    const existingAdminUser = await Admin.findOne({ email: normalizeEmail(adminEmail) });

    if (!existingAdminUser) {
      return res.status(403).json({ message: 'Only an existing admin can add another admin.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingAdmin = await Admin.findOne({ email: normalizedEmail });

    if (existingAdmin) {
      return res.status(409).json({ message: 'Admin already exists with this email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    return res.status(201).json({
      message: 'Admin added successfully.',
      user: { name: admin.name, email: admin.email }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add admin.' });
  }
});

app.post('/api/teacher/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const teacher = await Teacher.findOne({ email: normalizeEmail(email) });

    if (!teacher || !(await verifyPassword(password, teacher.password))) {
      return res.status(401).json({ message: 'Only teachers added by an admin can access this portal.' });
    }

    return res.json({
      message: 'Teacher login successful.',
      user: { name: teacher.name, email: teacher.email }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to login as teacher.' });
  }
});

app.post('/api/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const student = await Student.findOne({ email: normalizeEmail(email) });

    if (!student || !(await verifyPassword(password, student.password))) {
      return res.status(401).json({ message: 'Only students added by a teacher can access this portal.' });
    }

    return res.json({
      message: 'Student login successful.',
      user: { name: student.name, email: student.email }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to login as student.' });
  }
});

app.get('/api/admins/:email/profile', async (req, res) => {
  try {
    const admin = await Admin.findOne({ email: normalizeEmail(req.params.email) });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    return res.json(getProfileResponse(admin));
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch admin profile.' });
  }
});

app.put('/api/admins/:email/profile', async (req, res) => {
  try {
    const admin = await Admin.findOne({ email: normalizeEmail(req.params.email) });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    const { name, profile } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    admin.name = name.trim();
    admin.profile = normalizeProfilePayload(profile);
    await admin.save();

    return res.json({
      message: 'Admin profile updated successfully.',
      user: getProfileResponse(admin)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update admin profile.' });
  }
});

app.get('/api/teachers/:email/profile', async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ email: normalizeEmail(req.params.email) });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    return res.json(getProfileResponse(teacher));
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch teacher profile.' });
  }
});

app.put('/api/teachers/:email/profile', async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ email: normalizeEmail(req.params.email) });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    const { name, profile } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    teacher.name = name.trim();
    teacher.profile = normalizeProfilePayload(profile);
    await teacher.save();

    return res.json({
      message: 'Teacher profile updated successfully.',
      user: getProfileResponse(teacher)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update teacher profile.' });
  }
});

app.get('/api/students/:email/profile', async (req, res) => {
  try {
    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    return res.json(getProfileResponse(student));
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch student profile.' });
  }
});

app.put('/api/students/:email/profile', async (req, res) => {
  try {
    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const { name, profile } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    student.name = name.trim();
    student.profile = normalizeProfilePayload(profile);
    await student.save();

    return res.json({
      message: 'Student profile updated successfully.',
      user: getProfileResponse(student)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update student profile.' });
  }
});

app.get('/api/students/:email/attendance', async (req, res) => {
  try {
    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (!student.attendanceRecords.length) {
      student.attendanceRecords = buildInitialAttendanceRecords();
      await student.save();
    }

    const attendanceRecords = [...student.attendanceRecords].sort((first, second) =>
      first.date.localeCompare(second.date)
    );

    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((record) => record.status === 'Present').length;
    const todayDate = getTodayDate();
    const todayAttendance =
      attendanceRecords.find((record) => record.date === todayDate)?.status || 'Not Marked';

    return res.json({
      student: { name: student.name, email: student.email },
      profile: normalizeProfilePayload(student.profile || {}),
      summary: {
        totalDays,
        presentDays,
        attendancePercentage: totalDays ? Math.round((presentDays / totalDays) * 100) : 0,
        todayAttendance
      },
      dailyAttendance: attendanceRecords
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch attendance.' });
  }
});

app.get('/api/students/:email/dashboard', async (req, res) => {
  try {
    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (!student.attendanceRecords.length) {
      student.attendanceRecords = buildInitialAttendanceRecords();
      await student.save();
    }

    const attendanceRecords = [...student.attendanceRecords].sort((first, second) =>
      first.date.localeCompare(second.date)
    );
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((record) => record.status === 'Present').length;
    const todayDate = getTodayDate();
    const todayAttendance =
      attendanceRecords.find((record) => record.date === todayDate)?.status || 'Not Marked';
    const classrooms = await Classroom.find({ studentEmails: student.email })
      .select('className section subject teacherEmail announcements')
      .sort({ className: 1, section: 1 });
    const announcementDetails = classrooms.flatMap((classroom) =>
      classroom.announcements.map((announcement) => ({
        className: classroom.className,
        section: classroom.section,
        subject: classroom.subject,
        teacherEmail: classroom.teacherEmail,
        title: announcement.title,
        message: announcement.message,
        postedAt: announcement.postedAt
      }))
    )
    .sort((first, second) => second.postedAt.localeCompare(first.postedAt));

    return res.json({
      student: { name: student.name, email: student.email },
      profile: normalizeProfilePayload(student.profile || {}),
      summary: {
        totalDays,
        presentDays,
        attendancePercentage: totalDays ? Math.round((presentDays / totalDays) * 100) : 0,
        todayAttendance
      },
      dailyAttendance: attendanceRecords,
      feeDetails: student.feeRecords,
      examDetails: student.examRecords,
      assignmentDetails: student.assignmentRecords,
      announcementDetails
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch student dashboard.' });
  }
});

app.get('/api/students/:email/details', async (req, res) => {
  try {
    const normalizedStudentEmail = normalizeEmail(req.params.email);
    const normalizedAdminEmail = normalizeEmail(req.query.adminEmail || '');
    const normalizedTeacherEmail = normalizeEmail(req.query.teacherEmail || '');

    if (!normalizedAdminEmail && !normalizedTeacherEmail) {
      return res.status(400).json({ message: 'Admin email or teacher email is required.' });
    }

    if (normalizedAdminEmail) {
      const admin = await Admin.findOne({ email: normalizedAdminEmail });

      if (!admin) {
        return res.status(403).json({ message: 'Only an existing admin can view all student details.' });
      }
    }

    const student = await Student.findOne({ email: normalizedStudentEmail });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (normalizedTeacherEmail) {
      const teacher = await Teacher.findOne({ email: normalizedTeacherEmail });

      if (!teacher) {
        return res.status(403).json({ message: 'Only an existing teacher can view student details.' });
      }

      if (student.createdByTeacher !== normalizedTeacherEmail) {
        return res.status(403).json({ message: 'You can only view details of your own students.' });
      }
    }

    if (!student.attendanceRecords.length) {
      student.attendanceRecords = buildInitialAttendanceRecords();
      await student.save();
    }

    return res.json(buildStudentDetailResponse(student));
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch student details.' });
  }
});

app.put('/api/students/:email/protected-details', async (req, res) => {
  try {
    const normalizedStudentEmail = normalizeEmail(req.params.email);
    const normalizedTeacherEmail = normalizeEmail(req.body.teacherEmail || '');
    const normalizedAdminEmail = normalizeEmail(req.body.adminEmail || '');

    if (!normalizedTeacherEmail && !normalizedAdminEmail) {
      return res.status(400).json({ message: 'Teacher email or admin email is required.' });
    }

    const student = await Student.findOne({ email: normalizedStudentEmail });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (normalizedTeacherEmail) {
      const teacher = await Teacher.findOne({ email: normalizedTeacherEmail });

      if (!teacher) {
        return res.status(403).json({ message: 'Only an existing teacher can update protected student details.' });
      }

      if (student.createdByTeacher !== normalizedTeacherEmail) {
        return res.status(403).json({ message: 'You can only update details of your own students.' });
      }
    }

    if (normalizedAdminEmail) {
      const admin = await Admin.findOne({ email: normalizedAdminEmail });

      if (!admin) {
        return res.status(403).json({ message: 'Only an existing admin can update protected student details.' });
      }
    }

    student.protectedDetails = normalizeProtectedDetailsPayload(req.body.protectedDetails || {});
    await student.save();

    return res.json({
      message: 'Protected student details updated successfully.',
      protectedDetails: normalizeProtectedDetailsPayload(student.protectedDetails || {})
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update protected student details.' });
  }
});

app.get('/api/teachers/:email/students', async (req, res) => {
  try {
    const normalizedTeacherEmail = normalizeEmail(req.params.email);
    const teacher = await Teacher.findOne({ email: normalizedTeacherEmail });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    const students = await Student.find({ createdByTeacher: normalizedTeacherEmail })
      .select('name email attendanceRecords')
      .sort({ name: 1 });

    const todayDate = getTodayDate();

    return res.json({
      students: students.map((student) => {
        const todayRecord = student.attendanceRecords.find((record) => record.date === todayDate);

        return {
          name: student.name,
          email: student.email,
          todayAttendance: todayRecord?.status || 'Not Marked',
          totalDays: student.attendanceRecords.length,
          presentDays: student.attendanceRecords.filter((record) => record.status === 'Present').length
        };
      })
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch students.' });
  }
});

app.get('/api/admins/:email/classes', async (req, res) => {
  try {
    const normalizedAdminEmail = normalizeEmail(req.params.email);
    const admin = await Admin.findOne({ email: normalizedAdminEmail });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    const classrooms = await Classroom.find().sort({ className: 1, section: 1 });
    const teacherEmails = [...new Set(classrooms.map((classroom) => classroom.teacherEmail))];
    const studentEmails = [...new Set(classrooms.flatMap((classroom) => classroom.studentEmails))];

    const teachers = teacherEmails.length
      ? await Teacher.find({ email: { $in: teacherEmails } }).select('name email')
      : [];
    const students = studentEmails.length
      ? await Student.find({ email: { $in: studentEmails } }).select('name email')
      : [];

    const teacherMap = new Map(teachers.map((teacher) => [teacher.email, teacher]));
    const studentMap = new Map(students.map((student) => [student.email, student]));

    return res.json({
      classes: classrooms.map((classroom) => ({
        id: classroom._id,
        className: classroom.className,
        section: classroom.section,
        subject: classroom.subject,
        teacher: teacherMap.get(classroom.teacherEmail)
          ? {
              name: teacherMap.get(classroom.teacherEmail).name,
              email: teacherMap.get(classroom.teacherEmail).email
            }
          : { name: classroom.teacherEmail, email: classroom.teacherEmail },
        studentCount: classroom.studentEmails.length,
        students: classroom.studentEmails
          .map((studentEmail) => studentMap.get(studentEmail))
          .filter(Boolean)
          .map((student) => ({
            name: student.name,
            email: student.email
          }))
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch classes for admin.' });
  }
});

app.get('/api/admins/:email/teachers', async (req, res) => {
  try {
    const normalizedAdminEmail = normalizeEmail(req.params.email);
    const admin = await Admin.findOne({ email: normalizedAdminEmail });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    const teachers = await Teacher.find().select('name email').sort({ name: 1 });

    return res.json({
      teachers: teachers.map((teacher) => ({
        name: teacher.name,
        email: teacher.email
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch teachers for admin.' });
  }
});

app.get('/api/classes/:classId', async (req, res) => {
  try {
    const normalizedTeacherEmail = normalizeEmail(req.query.teacherEmail || '');
    const normalizedAdminEmail = normalizeEmail(req.query.adminEmail || '');

    if (!normalizedTeacherEmail && !normalizedAdminEmail) {
      return res.status(400).json({ message: 'Teacher email or admin email is required.' });
    }

    let classroom;

    if (normalizedTeacherEmail) {
      const authorizedClassroom = await getAuthorizedClassroomAccess(req.params.classId, {
        teacherEmail: normalizedTeacherEmail
      });

      if (authorizedClassroom.message) {
        return res.status(authorizedClassroom.status).json({ message: authorizedClassroom.message });
      }

      classroom = authorizedClassroom.classroom;
    } else {
      const admin = await Admin.findOne({ email: normalizedAdminEmail });

      if (!admin) {
        return res.status(403).json({ message: 'Only an existing admin can open any class.' });
      }

      classroom = await Classroom.findById(req.params.classId);

      if (!classroom) {
        return res.status(404).json({ message: 'Class not found.' });
      }
    }

    const students = classroom.studentEmails.length
      ? await Student.find({ email: { $in: classroom.studentEmails } })
          .select('name email attendanceRecords profile examRecords assignmentRecords')
          .sort({ name: 1 })
      : [];
    const teacher = await Teacher.findOne({ email: classroom.teacherEmail }).select('name email');
    const { scheduledExams, scheduledAssignments } = buildClassSchedules(students);

    const todayDate = getTodayDate();

    return res.json({
      class: {
        id: classroom._id,
        className: classroom.className,
        section: classroom.section,
        subject: classroom.subject,
        teacher: teacher
          ? { name: teacher.name, email: teacher.email }
          : { name: classroom.teacherEmail, email: classroom.teacherEmail },
        announcements: [...classroom.announcements].sort((first, second) =>
          second.postedAt.localeCompare(first.postedAt)
        ),
        scheduledExams,
        scheduledAssignments,
        students: students.map((student) => ({
          name: student.name,
          email: student.email,
          profileImage: student.profile?.profileImage || '',
          todayAttendance:
            student.attendanceRecords.find((record) => record.date === todayDate)?.status || 'Not Marked',
          presentDays: student.attendanceRecords.filter((record) => record.status === 'Present').length,
          totalDays: student.attendanceRecords.length
        }))
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch class details.' });
  }
});

app.get('/api/classes/:classId/exams/details', async (req, res) => {
  try {
    const { subject = '', date = '', time = '', room = '' } = req.query;
    const authorizedClassroom = await getAuthorizedClassroomAccess(req.params.classId, {
      teacherEmail: req.query.teacherEmail || '',
      adminEmail: req.query.adminEmail || ''
    });

    if (authorizedClassroom.message) {
      return res.status(authorizedClassroom.status).json({ message: authorizedClassroom.message });
    }

    if (!subject.trim() || !date.trim() || !time.trim() || !room.trim()) {
      return res.status(400).json({ message: 'Exam subject, date, time, and room are required.' });
    }

    const { classroom } = authorizedClassroom;
    const students = classroom.studentEmails.length
      ? await Student.find({ email: { $in: classroom.studentEmails } })
          .select('name email examRecords profile')
          .sort({ name: 1 })
      : [];

    const examIdentity = {
      subject: subject.trim(),
      date: date.trim(),
      time: time.trim(),
      room: room.trim()
    };

    const examStudents = students
      .map((student) => {
        const matchingExam = (student.examRecords || []).find(
          (exam) =>
            exam.subject === examIdentity.subject &&
            exam.date === examIdentity.date &&
            exam.time === examIdentity.time &&
            exam.room === examIdentity.room
        );

        if (!matchingExam) {
          return null;
        }

        return {
          name: student.name,
          email: student.email,
          profileImage: student.profile?.profileImage || '',
          marksObtained: matchingExam.marksObtained || '',
          maxMarks: Number(matchingExam.maxMarks) || 100,
          attendanceStatus: matchingExam.attendanceStatus || 'Pending'
        };
      })
      .filter(Boolean);

    return res.json({
      exam: {
        ...examIdentity,
        maxMarks: examStudents[0]?.maxMarks || 100
      },
      class: {
        id: classroom._id,
        className: classroom.className,
        section: classroom.section,
        subject: classroom.subject
      },
      students: examStudents
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch exam details.' });
  }
});

app.get('/api/teachers/:email/classes', async (req, res) => {
  try {
    const normalizedTeacherEmail = normalizeEmail(req.params.email);
    const teacher = await Teacher.findOne({ email: normalizedTeacherEmail });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    const classrooms = await Classroom.find({ teacherEmail: normalizedTeacherEmail }).sort({
      className: 1,
      section: 1
    });

    const uniqueStudentEmails = [
      ...new Set(classrooms.flatMap((classroom) => classroom.studentEmails))
    ];
    const students = uniqueStudentEmails.length
      ? await Student.find({ email: { $in: uniqueStudentEmails } }).select('name email')
      : [];
    const studentMap = new Map(students.map((student) => [student.email, student]));

    return res.json({
      classes: classrooms.map((classroom) => ({
        id: classroom._id,
        className: classroom.className,
        section: classroom.section,
        subject: classroom.subject,
        studentCount: classroom.studentEmails.length,
        students: classroom.studentEmails
          .map((studentEmail) => studentMap.get(studentEmail))
          .filter(Boolean)
          .map((student) => ({
            name: student.name,
            email: student.email
          }))
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch classes.' });
  }
});

app.post('/api/classes', async (req, res) => {
  try {
    return res.status(403).json({
      message: 'Only an admin can create and assign classes. Teachers can access only classes assigned to them.'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create class.' });
  }
});

app.post('/api/admin/classes', async (req, res) => {
  try {
    const { adminEmail, teacherEmail, className, section, subject } = req.body;

    if (!adminEmail?.trim() || !teacherEmail?.trim() || !className?.trim() || !section?.trim() || !subject?.trim()) {
      return res.status(400).json({ message: 'Admin email, teacher email, class name, section, and subject are required.' });
    }

    const admin = await Admin.findOne({ email: normalizeEmail(adminEmail) });

    if (!admin) {
      return res.status(403).json({ message: 'Only an existing admin can create classes with assigned teachers.' });
    }

    const normalizedTeacherEmail = normalizeEmail(teacherEmail);
    const teacher = await Teacher.findOne({ email: normalizedTeacherEmail });

    if (!teacher) {
      return res.status(404).json({ message: 'Assigned teacher not found.' });
    }

    const existingClass = await Classroom.findOne({
      teacherEmail: normalizedTeacherEmail,
      className: className.trim(),
      section: section.trim()
    });

    if (existingClass) {
      return res.status(409).json({ message: 'This teacher already has a class with this name and section.' });
    }

    const classroom = await Classroom.create({
      teacherEmail: normalizedTeacherEmail,
      className: className.trim(),
      section: section.trim(),
      subject: subject.trim()
    });

    return res.status(201).json({
      message: `${classroom.className} - ${classroom.section} created and assigned to ${teacher.name}.`,
      class: {
        id: classroom._id,
        className: classroom.className,
        section: classroom.section,
        subject: classroom.subject,
        teacher: {
          name: teacher.name,
          email: teacher.email
        },
        studentCount: 0,
        students: []
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create admin-managed class.' });
  }
});

app.post('/api/classes/:classId/students', async (req, res) => {
  try {
    const { teacherEmail, studentEmail } = req.body;

    if (!teacherEmail?.trim() || !studentEmail?.trim()) {
      return res.status(400).json({ message: 'Teacher email and student email are required.' });
    }

    const normalizedTeacherEmail = normalizeEmail(teacherEmail);
    const normalizedStudentEmail = normalizeEmail(studentEmail);

    const teacher = await Teacher.findOne({ email: normalizedTeacherEmail });

    if (!teacher) {
      return res.status(403).json({ message: 'Only an existing teacher can update a class.' });
    }

    const classroom = await Classroom.findById(req.params.classId);

    if (!classroom) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    if (classroom.teacherEmail !== normalizedTeacherEmail) {
      return res.status(403).json({ message: 'You can only manage your own classes.' });
    }

    const student = await Student.findOne({ email: normalizedStudentEmail });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (student.createdByTeacher !== normalizedTeacherEmail) {
      return res.status(403).json({ message: 'You can only add your own students to a class.' });
    }

    if (classroom.studentEmails.includes(normalizedStudentEmail)) {
      return res.status(409).json({ message: `${student.name} is already in this class.` });
    }

    classroom.studentEmails.push(normalizedStudentEmail);
    await classroom.save();

    return res.status(201).json({
      message: `${student.name} added to ${classroom.className} - ${classroom.section}.`
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add student to class.' });
  }
});

app.post('/api/classes/:classId/students/create', async (req, res) => {
  try {
    const { teacherEmail, name, email, password } = req.body;

    if (!teacherEmail?.trim() || !name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Teacher email, student name, email, and password are required.' });
    }

    const normalizedTeacherEmail = normalizeEmail(teacherEmail);
    const normalizedStudentEmail = normalizeEmail(email);

    const teacher = await Teacher.findOne({ email: normalizedTeacherEmail });

    if (!teacher) {
      return res.status(403).json({ message: 'Only an existing teacher can add a student.' });
    }

    const classroom = await Classroom.findById(req.params.classId);

    if (!classroom) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    if (classroom.teacherEmail !== normalizedTeacherEmail) {
      return res.status(403).json({ message: 'You can only add students into your own classes.' });
    }

    const existingStudent = await Student.findOne({ email: normalizedStudentEmail });

    if (existingStudent) {
      return res.status(409).json({ message: 'Student already exists with this email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const student = await Student.create({
      name: name.trim(),
      email: normalizedStudentEmail,
      password: hashedPassword,
      createdByTeacher: normalizedTeacherEmail,
      attendanceRecords: buildInitialAttendanceRecords()
    });

    classroom.studentEmails.push(normalizedStudentEmail);
    await classroom.save();

    return res.status(201).json({
      message: `${student.name} was added directly into ${classroom.className} - ${classroom.section}.`,
      user: { name: student.name, email: student.email }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create student inside this class.' });
  }
});

app.post('/api/admin/classes/:classId/students/create', async (req, res) => {
  try {
    const { adminEmail, name, email, password } = req.body;

    if (!adminEmail?.trim() || !name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Admin email, student name, email, and password are required.' });
    }

    const admin = await Admin.findOne({ email: normalizeEmail(adminEmail) });

    if (!admin) {
      return res.status(403).json({ message: 'Only an existing admin can add students into a class.' });
    }

    const classroom = await Classroom.findById(req.params.classId);

    if (!classroom) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const normalizedStudentEmail = normalizeEmail(email);
    const existingStudent = await Student.findOne({ email: normalizedStudentEmail });

    if (existingStudent) {
      return res.status(409).json({ message: 'Student already exists with this email.' });
    }

    const teacher = await Teacher.findOne({ email: classroom.teacherEmail });

    if (!teacher) {
      return res.status(404).json({ message: 'Assigned teacher for this class was not found.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const student = await Student.create({
      name: name.trim(),
      email: normalizedStudentEmail,
      password: hashedPassword,
      createdByTeacher: classroom.teacherEmail,
      attendanceRecords: buildInitialAttendanceRecords()
    });

    classroom.studentEmails.push(normalizedStudentEmail);
    await classroom.save();

    return res.status(201).json({
      message: `${student.name} was added to ${classroom.className} - ${classroom.section} under ${teacher.name}.`,
      user: { name: student.name, email: student.email }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create student inside this class.' });
  }
});

app.post('/api/classes/:classId/attendance', async (req, res) => {
  try {
      const { teacherEmail, adminEmail, studentEmail, status } = req.body;

    if ((!teacherEmail?.trim() && !adminEmail?.trim()) || !studentEmail?.trim() || !status?.trim()) {
      return res.status(400).json({ message: 'Teacher email or admin email, student email, and status are required.' });
    }

    if (!['Present', 'Absent'].includes(status)) {
      return res.status(400).json({ message: 'Attendance status must be Present or Absent.' });
    }

    const authorizedClassroom = await getAuthorizedClassroomAccess(req.params.classId, {
      teacherEmail,
      adminEmail
    });

    if (authorizedClassroom.message) {
      return res.status(authorizedClassroom.status).json({ message: authorizedClassroom.message });
    }

    const { classroom } = authorizedClassroom;
    const normalizedStudentEmail = normalizeEmail(studentEmail);

    if (!classroom.studentEmails.includes(normalizedStudentEmail)) {
      return res.status(403).json({ message: 'This student does not belong to the selected class.' });
    }

    const student = await Student.findOne({ email: normalizedStudentEmail });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const todayDate = getTodayDate();
    const existingRecord = student.attendanceRecords.find((record) => record.date === todayDate);

    if (existingRecord) {
      existingRecord.status = status;
    } else {
      student.attendanceRecords.push({ date: todayDate, status });
    }

    await student.save();

    return res.json({ message: `Attendance marked as ${status} for ${student.name}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to mark class attendance.' });
  }
});

app.post('/api/classes/:classId/exams', async (req, res) => {
  try {
    const { teacherEmail, adminEmail, subject, date, time, room, maxMarks } = req.body;

    if ((!teacherEmail?.trim() && !adminEmail?.trim()) || !subject?.trim() || !date?.trim() || !time?.trim() || !room?.trim()) {
      return res.status(400).json({ message: 'Teacher email or admin email, subject, date, time, and room are required.' });
    }

    const authorizedClassroom = await getAuthorizedClassroomAccess(req.params.classId, {
      teacherEmail,
      adminEmail
    });

    if (authorizedClassroom.message) {
      return res.status(authorizedClassroom.status).json({ message: authorizedClassroom.message });
    }

    const { classroom, ownerTeacherEmail } = authorizedClassroom;

    if (!classroom.studentEmails.length) {
      return res.status(400).json({ message: 'Add students to the class before scheduling an exam.' });
    }

    await Student.updateMany(
      {
        email: { $in: classroom.studentEmails },
        createdByTeacher: ownerTeacherEmail
      },
      {
        $push: {
          examRecords: {
            subject: subject.trim(),
            date: date.trim(),
            time: time.trim(),
            room: room.trim(),
            maxMarks: Number(maxMarks) || 100,
            marksObtained: '',
            attendanceStatus: 'Pending'
          }
        }
      }
    );

    return res.status(201).json({ message: `Exam scheduled for ${classroom.className} - ${classroom.section}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to schedule class exam.' });
  }
});

app.post('/api/classes/:classId/exams/marks', async (req, res) => {
  try {
    const {
      teacherEmail,
      adminEmail,
      studentEmail,
      subject,
      date,
      time,
      room,
      marksObtained,
      attendanceStatus
    } = req.body;

    if (
      (!teacherEmail?.trim() && !adminEmail?.trim()) ||
      !studentEmail?.trim() ||
      !subject?.trim() ||
      !date?.trim() ||
      !time?.trim() ||
      !room?.trim() ||
      !attendanceStatus?.trim()
    ) {
      return res.status(400).json({ message: 'Teacher or admin, student, exam details, and attendance status are required.' });
    }

    if (!['Present', 'Absent'].includes(attendanceStatus.trim())) {
      return res.status(400).json({ message: 'Attendance status must be Present or Absent.' });
    }

    const authorizedClassroom = await getAuthorizedClassroomAccess(req.params.classId, {
      teacherEmail,
      adminEmail
    });

    if (authorizedClassroom.message) {
      return res.status(authorizedClassroom.status).json({ message: authorizedClassroom.message });
    }

    const { classroom, ownerTeacherEmail } = authorizedClassroom;
    const normalizedStudentEmail = normalizeEmail(studentEmail);

    if (!classroom.studentEmails.includes(normalizedStudentEmail)) {
      return res.status(403).json({ message: 'This student does not belong to the selected class.' });
    }

    const student = await Student.findOne({
      email: normalizedStudentEmail,
      createdByTeacher: ownerTeacherEmail
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const matchingExam = student.examRecords.find(
      (exam) =>
        exam.subject === subject.trim() &&
        exam.date === date.trim() &&
        exam.time === time.trim() &&
        exam.room === room.trim()
    );

    if (!matchingExam) {
      return res.status(404).json({ message: 'Exam record not found for this student.' });
    }

    matchingExam.attendanceStatus = attendanceStatus.trim();
    matchingExam.marksObtained = attendanceStatus.trim() === 'Absent' ? 'Absent' : String(marksObtained ?? '').trim();

    await student.save();

    return res.json({ message: `Exam result updated for ${student.name}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update exam marks.' });
  }
});

app.post('/api/classes/:classId/assignments', async (req, res) => {
  try {
    const { teacherEmail, adminEmail, title, subject, dueDate, status } = req.body;

    if ((!teacherEmail?.trim() && !adminEmail?.trim()) || !title?.trim() || !subject?.trim() || !dueDate?.trim()) {
      return res.status(400).json({ message: 'Teacher email or admin email, title, subject, and due date are required.' });
    }

    const authorizedClassroom = await getAuthorizedClassroomAccess(req.params.classId, {
      teacherEmail,
      adminEmail
    });

    if (authorizedClassroom.message) {
      return res.status(authorizedClassroom.status).json({ message: authorizedClassroom.message });
    }

    const { classroom, ownerTeacherEmail } = authorizedClassroom;

    if (!classroom.studentEmails.length) {
      return res.status(400).json({ message: 'Add students to the class before scheduling an assignment.' });
    }

    await Student.updateMany(
      {
        email: { $in: classroom.studentEmails },
        createdByTeacher: ownerTeacherEmail
      },
      {
        $push: {
          assignmentRecords: {
            title: title.trim(),
            subject: subject.trim(),
            dueDate: dueDate.trim(),
            status: status === 'Submitted' ? 'Submitted' : 'Pending'
          }
        }
      }
    );

    return res.status(201).json({ message: `Assignment scheduled for ${classroom.className} - ${classroom.section}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to schedule class assignment.' });
  }
});

app.post('/api/classes/:classId/announcements', async (req, res) => {
  try {
    const { teacherEmail, adminEmail, title, message } = req.body;

    if ((!teacherEmail?.trim() && !adminEmail?.trim()) || !title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'Teacher email or admin email, title, and announcement message are required.' });
    }

    const authorizedClassroom = await getAuthorizedClassroomAccess(req.params.classId, {
      teacherEmail,
      adminEmail
    });

    if (authorizedClassroom.message) {
      return res.status(authorizedClassroom.status).json({ message: authorizedClassroom.message });
    }

    const { classroom, ownerTeacherEmail } = authorizedClassroom;

    classroom.announcements.unshift({
      title: title.trim(),
      message: message.trim(),
      postedAt: getCurrentTimestamp(),
      createdByTeacher: ownerTeacherEmail
    });
    await classroom.save();

    return res.status(201).json({ message: `Announcement posted in ${classroom.className} - ${classroom.section}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to post class announcement.' });
  }
});

app.post('/api/students/:email/attendance', async (req, res) => {
  try {
    const { teacherEmail, status } = req.body;

    if (!teacherEmail?.trim() || !status?.trim()) {
      return res.status(400).json({ message: 'Teacher email and attendance status are required.' });
    }

    if (!['Present', 'Absent'].includes(status)) {
      return res.status(400).json({ message: 'Attendance status must be Present or Absent.' });
    }

    const normalizedTeacherEmail = normalizeEmail(teacherEmail);
    const teacher = await Teacher.findOne({ email: normalizedTeacherEmail });

    if (!teacher) {
      return res.status(403).json({ message: 'Only an existing teacher can mark attendance.' });
    }

    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (student.createdByTeacher !== normalizedTeacherEmail) {
      return res.status(403).json({ message: 'You can only mark attendance for your own students.' });
    }

    const todayDate = getTodayDate();
    const existingRecord = student.attendanceRecords.find((record) => record.date === todayDate);

    if (existingRecord) {
      existingRecord.status = status;
    } else {
      student.attendanceRecords.push({ date: todayDate, status });
    }

    await student.save();

    return res.json({
      message: `Attendance marked as ${status} for ${student.name}.`,
      student: {
        name: student.name,
        email: student.email,
        todayAttendance: status
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to mark attendance.' });
  }
});

app.post('/api/students/:email/fees', async (req, res) => {
  try {
    const { adminEmail, title, amount, dueDate, status } = req.body;

    if (!adminEmail?.trim() || !title?.trim() || !amount?.trim() || !dueDate?.trim()) {
      return res.status(400).json({ message: 'Admin email, title, amount, and due date are required.' });
    }

    const admin = await Admin.findOne({ email: normalizeEmail(adminEmail) });

    if (!admin) {
      return res.status(403).json({ message: 'Only an existing admin can add fee details.' });
    }

    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    student.feeRecords.push({
      title: title.trim(),
      amount: amount.trim(),
      dueDate: dueDate.trim(),
      status: status === 'Paid' ? 'Paid' : 'Pending'
    });

    await student.save();

    return res.status(201).json({ message: `Fee added successfully for ${student.name}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add fee details.' });
  }
});

app.post('/api/students/:email/exams', async (req, res) => {
  try {
    const { teacherEmail, subject, date, time, room } = req.body;

    if (!teacherEmail?.trim() || !subject?.trim() || !date?.trim() || !time?.trim() || !room?.trim()) {
      return res.status(400).json({ message: 'Teacher email, subject, date, time, and room are required.' });
    }

    const normalizedTeacherEmail = normalizeEmail(teacherEmail);
    const teacher = await Teacher.findOne({ email: normalizedTeacherEmail });

    if (!teacher) {
      return res.status(403).json({ message: 'Only an existing teacher can add exam details.' });
    }

    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (student.createdByTeacher !== normalizedTeacherEmail) {
      return res.status(403).json({ message: 'You can only add exams for your own students.' });
    }

    student.examRecords.push({
      subject: subject.trim(),
      date: date.trim(),
      time: time.trim(),
      room: room.trim()
    });

    await student.save();

    return res.status(201).json({ message: `Exam added successfully for ${student.name}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add exam details.' });
  }
});

app.post('/api/students/:email/assignments', async (req, res) => {
  try {
    const { teacherEmail, title, subject, dueDate, status } = req.body;

    if (!teacherEmail?.trim() || !title?.trim() || !subject?.trim() || !dueDate?.trim()) {
      return res.status(400).json({ message: 'Teacher email, title, subject, and due date are required.' });
    }

    const normalizedTeacherEmail = normalizeEmail(teacherEmail);
    const teacher = await Teacher.findOne({ email: normalizedTeacherEmail });

    if (!teacher) {
      return res.status(403).json({ message: 'Only an existing teacher can add assignment details.' });
    }

    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (student.createdByTeacher !== normalizedTeacherEmail) {
      return res.status(403).json({ message: 'You can only add assignments for your own students.' });
    }

    student.assignmentRecords.push({
      title: title.trim(),
      subject: subject.trim(),
      dueDate: dueDate.trim(),
      status: status === 'Submitted' ? 'Submitted' : 'Pending'
    });

    await student.save();

    return res.status(201).json({ message: `Assignment added successfully for ${student.name}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add assignment details.' });
  }
});

app.post('/api/teachers', async (req, res) => {
  try {
    const { adminEmail, name, email, password } = req.body;

    if (!adminEmail?.trim() || !name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Admin email, name, email, and password are required.' });
    }

    const admin = await Admin.findOne({ email: normalizeEmail(adminEmail) });

    if (!admin) {
      return res.status(403).json({ message: 'Only an existing admin can add a teacher.' });
    }

    const normalizedTeacherEmail = normalizeEmail(email);
    const existingTeacher = await Teacher.findOne({ email: normalizedTeacherEmail });

    if (existingTeacher) {
      return res.status(409).json({ message: 'Teacher already exists with this email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const teacher = await Teacher.create({
      name: name.trim(),
      email: normalizedTeacherEmail,
      password: hashedPassword,
      createdByAdmin: normalizeEmail(adminEmail)
    });

    return res.status(201).json({
      message: 'Teacher added successfully.',
      user: { name: teacher.name, email: teacher.email }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add teacher.' });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const { teacherEmail, name, email, password } = req.body;

    if (!teacherEmail?.trim() || !name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Teacher email, name, email, and password are required.' });
    }

    const teacher = await Teacher.findOne({ email: normalizeEmail(teacherEmail) });

    if (!teacher) {
      return res.status(403).json({ message: 'Only an existing teacher can add a student.' });
    }

    const normalizedStudentEmail = normalizeEmail(email);
    const existingStudent = await Student.findOne({ email: normalizedStudentEmail });

    if (existingStudent) {
      return res.status(409).json({ message: 'Student already exists with this email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const student = await Student.create({
      name: name.trim(),
      email: normalizedStudentEmail,
      password: hashedPassword,
      createdByTeacher: normalizeEmail(teacherEmail),
      attendanceRecords: buildInitialAttendanceRecords()
    });

    return res.status(201).json({
      message: 'Student added successfully.',
      user: { name: student.name, email: student.email }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add student.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
