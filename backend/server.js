import bcrypt from 'bcryptjs';
import cors from 'cors';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { connectDB } from './config/db.js';
import Admin from './models/Admin.js';
import Classroom from './models/Classroom.js';
import Teacher from './models/Teacher.js';
import Student from './models/Student.js';
import { generateToken } from './utils/auth.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
const PORT = 5000;
const ONLINE_PAYMENT_METHODS = ['UPI', 'Card', 'Bank Transfer'];
const RAZORPAY_PAYMENT_METHODS = ['UPI', 'Card', 'Bank Transfer'];
const MONTHLY_FEE_RECORD_COUNT = 12;
const DEFAULT_FEE_TITLE = 'Monthly Fee';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dns.setDefaultResultOrder('ipv4first');

function loadLocalEnvFile() {
  const envFilePath = path.join(__dirname, '.env');

  if (!fs.existsSync(envFilePath)) {
    return;
  }

  const envFileContent = fs.readFileSync(envFilePath, 'utf8');

  envFileContent.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const normalizedValue = rawValue.replace(/^['"]|['"]$/g, '');

    if (key && !process.env[key]) {
      process.env[key] = normalizedValue;
    }
  });
}

loadLocalEnvFile();

connectDB();

app.use(cors());
app.use(express.json({ limit: '25mb' }));

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

function parseFeeDate(dateValue) {
  if (!dateValue?.trim?.()) {
    return null;
  }

  const parsedDate = new Date(`${dateValue}T00:00:00.000Z`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function formatFeeDate(date) {
  return date.toISOString().slice(0, 10);
}

function getMonthKey(dateValue) {
  const parsedDate = parseFeeDate(dateValue);

  if (!parsedDate) {
    return '';
  }

  return `${parsedDate.getUTCFullYear()}-${String(parsedDate.getUTCMonth() + 1).padStart(2, '0')}`;
}

function addMonthsPreservingDay(date, monthsToAdd) {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth() + monthsToAdd;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const originalDay = date.getUTCDate();
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(originalDay, lastDayOfTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, targetDay));
}

function normalizeAllowedPaymentMethods(methods = []) {
  const normalizedMethods = [...new Set(
    (Array.isArray(methods) ? methods : [])
      .map((method) => String(method || '').trim())
      .filter((method) => ONLINE_PAYMENT_METHODS.includes(method))
  )];

  return normalizedMethods.length ? normalizedMethods : ONLINE_PAYMENT_METHODS;
}

function normalizePhoneNumber(phoneValue = '') {
  const trimmedPhone = String(phoneValue || '').trim();

  if (!trimmedPhone) {
    return '';
  }

  if (trimmedPhone.startsWith('+')) {
    return `+${trimmedPhone.slice(1).replace(/\D/g, '')}`;
  }

  return trimmedPhone.replace(/\D/g, '');
}

function normalizeFeeAmountToPaise(amountValue = '') {
  const normalizedAmount = String(amountValue || '').replace(/[^0-9.]/g, '');
  const parsedAmount = Number(normalizedAmount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return 0;
  }

  return Math.round(parsedAmount * 100);
}

function isRazorpaySupportedMethod(paymentMethod = '') {
  return RAZORPAY_PAYMENT_METHODS.includes(String(paymentMethod || '').trim());
}

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const isPlaceholderValue =
    !keyId ||
    !keySecret ||
    keyId.includes('your_key_id') ||
    keySecret.includes('your_test_key_secret');

  return {
    keyId,
    keySecret,
    isConfigured: !isPlaceholderValue
  };
}

function buildRazorpayReceipt(student, feeItems) {
  const dueDateSeed = feeItems[0]?.dueDate?.replace(/-/g, '') || Date.now();
  const emailSeed = String(student.email || 'student').replace(/[^a-z0-9]/gi, '').slice(0, 10).toLowerCase();
  return `fee_${emailSeed}_${dueDateSeed}`.slice(0, 40);
}

async function createRazorpayOrder({ amountPaise, receipt, notes = {} }) {
  const { keyId, keySecret } = getRazorpayConfig();

  if (!keyId || !keySecret) {
    throw new Error('Razorpay test keys are not configured on the backend.');
  }

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes
    })
  });

  const responseText = await response.text();
  let payload = {};

  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    payload = { error: { description: responseText || 'Razorpay order creation failed.' } };
  }

  if (!response.ok) {
    throw new Error(payload?.error?.description || 'Unable to create Razorpay order.');
  }

  return payload;
}

async function createRazorpayQrCode({ amountPaise, referenceId, description = '', customer = {}, notes = {} }) {
  const { keyId, keySecret } = getRazorpayConfig();

  if (!keyId || !keySecret) {
    throw new Error('Razorpay test keys are not configured on the backend.');
  }

  const response = await fetch('https://api.razorpay.com/v1/payments/qr_codes', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'upi_qr',
      usage: 'single_use',
      fixed_amount: true,
      payment_amount: amountPaise,
      description,
      customer_id: customer.id || undefined,
      close_by: Math.floor(Date.now() / 1000) + 15 * 60,
      notes,
      name: 'School ERP',
      reference_id: referenceId
    })
  });

  const responseText = await response.text();
  let payload = {};

  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    payload = { error: { description: responseText || 'Razorpay QR creation failed.' } };
  }

  if (!response.ok) {
    throw new Error(payload?.error?.description || 'Unable to create Razorpay QR code.');
  }

  return payload;
}

async function fetchRazorpayQrPayments(qrCodeId) {
  const { keyId, keySecret } = getRazorpayConfig();

  if (!keyId || !keySecret) {
    throw new Error('Razorpay test keys are not configured on the backend.');
  }

  const response = await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${qrCodeId}/payments`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
    }
  });

  const responseText = await response.text();
  let payload = {};

  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    payload = { error: { description: responseText || 'Razorpay QR payment fetch failed.' } };
  }

  if (!response.ok) {
    throw new Error(payload?.error?.description || 'Unable to fetch Razorpay QR payment status.');
  }

  return Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
}

function buildRazorpayQrReference(student, feeItems) {
  return `qr_${buildRazorpayReceipt(student, feeItems)}`.slice(0, 40);
}

function applyPaidFeeRequest(student, paymentRequest, paymentId) {
  const paidAt = getCurrentTimestamp();
  const updatedFees = [];

  for (const requestedFee of paymentRequest.feeItems) {
    const feeRecord = student.feeRecords.find(
      (fee) => fee.title === requestedFee.title && fee.dueDate === requestedFee.dueDate
    );

    if (!feeRecord) {
      throw new Error(`Fee record not found for ${requestedFee.title}.`);
    }

    if (feeRecord.status === 'Paid') {
      throw new Error(`${requestedFee.title} is already marked as paid.`);
    }

    feeRecord.status = 'Paid';
    feeRecord.paymentMethod = `Razorpay ${paymentRequest.paymentMethod}`;
    feeRecord.transactionId = String(paymentId || '').trim();
    feeRecord.paidAt = paidAt;
    updatedFees.push(feeRecord);
  }

  paymentRequest.status = 'paid';
  paymentRequest.paymentId = String(paymentId || '').trim();
  paymentRequest.paidAt = paidAt;

  return { paidAt, updatedFees };
}

function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const { keySecret } = getRazorpayConfig();

  if (!keySecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
}

function isFeeOverdue(feeRecord) {
  return feeRecord?.status === 'Pending' && feeRecord?.dueDate && feeRecord.dueDate < getTodayDate();
}

function getOverdueFeeRecords(student) {
  return (student?.feeRecords || []).filter((feeRecord) => isFeeOverdue(feeRecord));
}

function hasSentParentAlert(student, alertKey, channel) {
  return (student?.parentAlerts || []).some(
    (alert) => alert.key === alertKey && alert.channel === channel && alert.deliveryStatus === 'sent'
  );
}

async function sendTwilioMessage({ accountSid, authToken, from, to, body }) {
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      From: from,
      To: to,
      Body: body
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Twilio request failed.');
  }
}

async function sendParentAlert(student, { alertKey, alertType, message }) {
  const parentPhone = normalizePhoneNumber(student?.protectedDetails?.parentPhone || '');

  if (!parentPhone) {
    return false;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const smsFrom = process.env.TWILIO_SMS_FROM_NUMBER || '';
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM_NUMBER || '';
  const alertChannels = [
    { channel: 'sms', from: smsFrom, to: parentPhone },
    { channel: 'whatsapp', from: whatsappFrom, to: `whatsapp:${parentPhone}` }
  ];

  if (!accountSid || !authToken) {
    console.log(`[parent-alert skipped] Missing Twilio credentials for ${student.email}: ${alertType}`);
    return { changed: false, sent: false };
  }

  let changed = false;
  let sentAnyAlert = false;

  for (const alertChannel of alertChannels) {
    if (!alertChannel.from || hasSentParentAlert(student, alertKey, alertChannel.channel)) {
      continue;
    }

    try {
      await sendTwilioMessage({
        accountSid,
        authToken,
        from: alertChannel.from,
        to: alertChannel.to,
        body: message
      });

      student.parentAlerts.push({
        key: alertKey,
        type: alertType,
        channel: alertChannel.channel,
        recipient: alertChannel.to,
        sentAt: getCurrentTimestamp(),
        deliveryStatus: 'sent'
      });
      changed = true;
      sentAnyAlert = true;
    } catch (error) {
      console.error(`[parent-alert failed] ${student.email} ${alertChannel.channel}:`, error.message);
      student.parentAlerts.push({
        key: alertKey,
        type: alertType,
        channel: alertChannel.channel,
        recipient: alertChannel.to,
        sentAt: getCurrentTimestamp(),
        deliveryStatus: 'failed'
      });
      changed = true;
    }
  }

  return { changed, sent: sentAnyAlert };
}

function buildAbsentAttendanceAlertMessage(student, attendanceDate) {
  const parentName = student?.protectedDetails?.parentName || 'Parent';
  return `Hello ${parentName}, ${student.name} was marked absent on ${attendanceDate}. Please contact the school if this needs clarification.`;
}

function buildFeeOverdueAlertMessage(student, overdueFees) {
  const parentName = student?.protectedDetails?.parentName || 'Parent';
  const overdueMonths = overdueFees.map((feeRecord) => getMonthKey(feeRecord.dueDate)).filter(Boolean);
  const overdueMonthSummary = [...new Set(overdueMonths)].join(', ') || 'current months';

  return `Hello ${parentName}, ${student.name} has overdue fee for ${overdueMonthSummary}. Please clear the pending fee at the earliest.`;
}

async function maybeSendAbsentAttendanceAlert(student, attendanceDate) {
  const alertKey = `attendance_absent:${attendanceDate}`;
  const message = buildAbsentAttendanceAlertMessage(student, attendanceDate);

  return sendParentAlert(student, {
    alertKey,
    alertType: 'attendance_absent',
    message
  });
}

async function maybeSendOverdueFeeAlert(student) {
  const overdueFees = getOverdueFeeRecords(student);

  if (!overdueFees.length) {
    return { changed: false, sent: false };
  }

  const todayDate = getTodayDate();
  const monthKeys = [...new Set(overdueFees.map((feeRecord) => getMonthKey(feeRecord.dueDate)).filter(Boolean))];
  const alertKey = `fee_overdue:${todayDate}:${monthKeys.join('|')}`;
  const message = buildFeeOverdueAlertMessage(student, overdueFees);

  return sendParentAlert(student, {
    alertKey,
    alertType: 'fee_overdue',
    message
  });
}

function ensureMonthlyFeeRecords(student) {
  if (!student?.feeRecords?.length) {
    return false;
  }

  const sortedExistingFees = [...student.feeRecords].sort((first, second) =>
    first.dueDate.localeCompare(second.dueDate)
  );
  const templateFee = sortedExistingFees[0];
  const templateDate = parseFeeDate(templateFee.dueDate);

  if (!templateDate) {
    return false;
  }

  const templateAllowedPaymentMethods = normalizeAllowedPaymentMethods(templateFee.allowedPaymentMethods);
  const existingMonthKeys = new Set(
    student.feeRecords
      .map((feeRecord) => getMonthKey(feeRecord.dueDate))
      .filter(Boolean)
  );

  let changed = false;

  student.feeRecords = student.feeRecords.map((feeRecord) => {
    const normalizedMethods = normalizeAllowedPaymentMethods(feeRecord.allowedPaymentMethods);

    if (
      feeRecord.title !== (templateFee.title || DEFAULT_FEE_TITLE) ||
      feeRecord.amount !== templateFee.amount ||
      normalizedMethods.join('|') !== templateAllowedPaymentMethods.join('|')
    ) {
      changed = true;
    }

    return {
      title: templateFee.title || DEFAULT_FEE_TITLE,
      amount: templateFee.amount,
      dueDate: feeRecord.dueDate,
      allowedPaymentMethods: templateAllowedPaymentMethods,
      paymentMethod: feeRecord.paymentMethod || '',
      transactionId: feeRecord.transactionId || '',
      paidAt: feeRecord.paidAt || '',
      status: feeRecord.status || 'Pending'
    };
  });

  const feePlanMonths = Math.max(1, Number(student.feePlanMonths) || MONTHLY_FEE_RECORD_COUNT);

  for (let index = 0; index < feePlanMonths; index += 1) {
    const nextDueDate = addMonthsPreservingDay(templateDate, index);
    const monthKey = getMonthKey(formatFeeDate(nextDueDate));

    if (existingMonthKeys.has(monthKey)) {
      continue;
    }

    student.feeRecords.push({
      title: templateFee.title || DEFAULT_FEE_TITLE,
      amount: templateFee.amount,
      dueDate: formatFeeDate(nextDueDate),
      allowedPaymentMethods: templateAllowedPaymentMethods,
      paymentMethod: '',
      transactionId: '',
      paidAt: '',
      status: 'Pending'
    });
    existingMonthKeys.add(monthKey);
    changed = true;
  }

  if (changed) {
    student.feeRecords = [...student.feeRecords].sort((first, second) =>
      first.dueDate.localeCompare(second.dueDate)
    );
  }

  return changed;
}

function normalizeFeeItemsPayload(feeItems = []) {
  return (Array.isArray(feeItems) ? feeItems : [])
    .map((item) => ({
      title: String(item?.title || '').trim(),
      dueDate: String(item?.dueDate || '').trim()
    }))
    .filter((item) => item.title && item.dueDate);
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

function normalizeNoteAttachments(attachments = []) {
  return (Array.isArray(attachments) ? attachments : [])
    .map((attachment) => ({
      name: String(attachment?.name || '').trim(),
      type: String(attachment?.type || '').trim(),
      size: Number(attachment?.size) || 0,
      dataUrl: String(attachment?.dataUrl || '').trim()
    }))
    .filter((attachment) => attachment.name && attachment.dataUrl);
}

function normalizeAssignmentAttachments(attachments = []) {
  return normalizeNoteAttachments(attachments);
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
    assignmentDetails: student.assignmentRecords,
    parentAlerts: [...(student.parentAlerts || [])].sort((first, second) =>
      second.sentAt.localeCompare(first.sentAt)
    )
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
      const key = [assignment.title, assignment.subject, assignment.dueDate].join('||');

      if (!assignmentMap.has(key)) {
        assignmentMap.set(key, {
          title: assignment.title,
          subject: assignment.subject,
          dueDate: assignment.dueDate,
          attachments: assignment.attachments || [],
          totalCount: 0,
          submittedCount: 0
        });
      }

      const currentAssignment = assignmentMap.get(key);
      currentAssignment.totalCount += 1;

      if (assignment.status === 'Submitted') {
        currentAssignment.submittedCount += 1;
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
  ).map((assignment) => ({
    ...assignment,
    pendingCount: Math.max(assignment.totalCount - assignment.submittedCount, 0)
  }));

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
/* Moved to authRoutes.js: /api/admin/login */

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
/* Moved to authRoutes.js: /api/teacher/login */

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

    const attendanceInitialized = !student.attendanceRecords.length;

    if (attendanceInitialized) {
      student.attendanceRecords = buildInitialAttendanceRecords();
    }
    const feeRecordsChanged = ensureMonthlyFeeRecords(student);
    if (attendanceInitialized || feeRecordsChanged) {
      await student.save();
    }

    const feeAlertResult = await maybeSendOverdueFeeAlert(student);

    if (feeAlertResult.changed) {
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
      .select('className section subject teacherEmail announcements notes')
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
    const noteDetails = classrooms.flatMap((classroom) =>
      (classroom.notes || []).map((note) => ({
        className: classroom.className,
        section: classroom.section,
        subject: classroom.subject,
        teacherEmail: classroom.teacherEmail,
        title: note.title,
        content: note.content,
        attachments: note.attachments || [],
        postedAt: note.postedAt
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
      announcementDetails,
      noteDetails
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

    const attendanceInitialized = !student.attendanceRecords.length;

    if (attendanceInitialized) {
      student.attendanceRecords = buildInitialAttendanceRecords();
    }
    const feeRecordsChanged = ensureMonthlyFeeRecords(student);
    if (attendanceInitialized || feeRecordsChanged) {
      await student.save();
    }

    const feeAlertResult = await maybeSendOverdueFeeAlert(student);

    if (feeAlertResult.changed) {
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

app.get('/api/admins/:email/payment-logs', async (req, res) => {
  try {
    const normalizedAdminEmail = normalizeEmail(req.params.email);
    const admin = await Admin.findOne({ email: normalizedAdminEmail });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    const students = await Student.find()
      .select('name email paymentRequests feeRecords')
      .sort({ name: 1 });

    const paymentLogs = students.flatMap((student) =>
      (student.paymentRequests || [])
        .filter((paymentRequest) => paymentRequest.status === 'paid')
        .slice()
        .sort((first, second) => {
          const firstTime = first.paidAt || '';
          const secondTime = second.paidAt || '';
          return secondTime.localeCompare(firstTime);
        })
        .map((paymentRequest) => ({
          studentName: student.name,
          studentEmail: student.email,
          orderId: paymentRequest.orderId,
          amountPaise: paymentRequest.amountPaise,
          currency: paymentRequest.currency || 'INR',
          paymentMethod: paymentRequest.paymentMethod,
          status: paymentRequest.status,
          paymentId: paymentRequest.paymentId || '',
          paidAt: paymentRequest.paidAt || '',
          feeItems: paymentRequest.feeItems || []
        }))
    )
    .sort((first, second) => {
      const firstSortValue = first.paidAt || first.orderId;
      const secondSortValue = second.paidAt || second.orderId;
      return secondSortValue.localeCompare(firstSortValue);
    });

    const razorpayConfig = getRazorpayConfig();

    return res.json({
      paymentLogs,
      razorpayConfigured: razorpayConfig.isConfigured
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch payment logs.' });
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
        notes: [...(classroom.notes || [])].sort((first, second) =>
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

app.get('/api/classes/:classId/assignments/details', async (req, res) => {
  try {
    const { title = '', subject = '', dueDate = '' } = req.query;
    const authorizedClassroom = await getAuthorizedClassroomAccess(req.params.classId, {
      teacherEmail: req.query.teacherEmail || '',
      adminEmail: req.query.adminEmail || ''
    });

    if (authorizedClassroom.message) {
      return res.status(authorizedClassroom.status).json({ message: authorizedClassroom.message });
    }

    if (!title.trim() || !subject.trim() || !dueDate.trim()) {
      return res.status(400).json({ message: 'Assignment title, subject, and due date are required.' });
    }

    const { classroom } = authorizedClassroom;
    const students = classroom.studentEmails.length
      ? await Student.find({ email: { $in: classroom.studentEmails } })
          .select('name email assignmentRecords profile')
          .sort({ name: 1 })
      : [];

    const assignmentIdentity = {
      title: title.trim(),
      subject: subject.trim(),
      dueDate: dueDate.trim()
    };

    const assignmentStudents = students.map((student) => {
      const matchingAssignment = (student.assignmentRecords || []).find(
        (assignment) =>
          assignment.title === assignmentIdentity.title &&
          assignment.subject === assignmentIdentity.subject &&
          assignment.dueDate === assignmentIdentity.dueDate
      );

      return {
        name: student.name,
        email: student.email,
        profileImage: student.profile?.profileImage || '',
        status: matchingAssignment?.status || 'Pending',
        submissionNote: matchingAssignment?.submissionNote || '',
        submittedAt: matchingAssignment?.submittedAt || '',
        submittedAttachments: matchingAssignment?.submittedAttachments || []
      };
    });

    const referenceAssignment = assignmentStudents.length
      ? students
          .flatMap((student) => student.assignmentRecords || [])
          .find(
            (assignment) =>
              assignment.title === assignmentIdentity.title &&
              assignment.subject === assignmentIdentity.subject &&
              assignment.dueDate === assignmentIdentity.dueDate
          )
      : null;

    return res.json({
      assignment: {
        ...assignmentIdentity,
        attachments: referenceAssignment?.attachments || []
      },
      class: {
        id: classroom._id,
        className: classroom.className,
        section: classroom.section,
        subject: classroom.subject
      },
      summary: {
        totalStudents: assignmentStudents.length,
        submittedCount: assignmentStudents.filter((student) => student.status === 'Submitted').length
      },
      students: assignmentStudents
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch assignment details.' });
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
    const { adminEmail, teacherEmail, className, subject } = req.body;

    if (!adminEmail?.trim() || !teacherEmail?.trim() || !className?.trim() || !subject?.trim()) {
      return res.status(400).json({ message: 'Admin email, teacher email, class name, and subject are required.' });
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
      className: className.trim()
    });

    if (existingClass) {
      return res.status(409).json({ message: 'This teacher already has a class with this name.' });
    }

    const classroom = await Classroom.create({
      teacherEmail: normalizedTeacherEmail,
      className: className.trim(),
      subject: subject.trim()
    });

    return res.status(201).json({
      message: `${classroom.className} created and assigned to ${teacher.name}.`,
      class: {
        id: classroom._id,
        className: classroom.className,
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

app.delete('/api/admin/classes/:classId', async (req, res) => {
  try {
    const normalizedAdminEmail = normalizeEmail(req.query.adminEmail || '');

    if (!normalizedAdminEmail) {
      return res.status(400).json({ message: 'Admin email is required.' });
    }

    const admin = await Admin.findOne({ email: normalizedAdminEmail });

    if (!admin) {
      return res.status(403).json({ message: 'Only an existing admin can delete a class.' });
    }

    const classroom = await Classroom.findById(req.params.classId);

    if (!classroom) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    await Classroom.findByIdAndDelete(req.params.classId);

    return res.json({ message: `${classroom.className} deleted successfully.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete class.' });
  }
});

app.delete('/api/admin/classes/:classId/students/:studentEmail', async (req, res) => {
  try {
    const normalizedAdminEmail = normalizeEmail(req.query.adminEmail || '');

    if (!normalizedAdminEmail) {
      return res.status(400).json({ message: 'Admin email is required.' });
    }

    const admin = await Admin.findOne({ email: normalizedAdminEmail });

    if (!admin) {
      return res.status(403).json({ message: 'Only an existing admin can remove a student from a class.' });
    }

    const classroom = await Classroom.findById(req.params.classId);

    if (!classroom) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const normalizedStudentEmail = normalizeEmail(req.params.studentEmail || '');

    if (!normalizedStudentEmail) {
      return res.status(400).json({ message: 'Student email is required.' });
    }

    if (!classroom.studentEmails.includes(normalizedStudentEmail)) {
      return res.status(404).json({ message: 'Student is not part of this class.' });
    }

    classroom.studentEmails = classroom.studentEmails.filter((email) => email !== normalizedStudentEmail);
    await classroom.save();

    return res.json({ message: 'Student removed from class successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to remove student from class.' });
  }
});

app.delete('/api/classes/:classId/students/:studentEmail', async (req, res) => {
  try {
    const normalizedTeacherEmail = normalizeEmail(req.query.teacherEmail || '');

    if (!normalizedTeacherEmail) {
      return res.status(400).json({ message: 'Teacher email is required.' });
    }

    const teacher = await Teacher.findOne({ email: normalizedTeacherEmail });

    if (!teacher) {
      return res.status(403).json({ message: 'Only an existing teacher can remove a student from a class.' });
    }

    const classroom = await Classroom.findById(req.params.classId);

    if (!classroom) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    if (classroom.teacherEmail !== normalizedTeacherEmail) {
      return res.status(403).json({ message: 'You can only manage your own classes.' });
    }

    const normalizedStudentEmail = normalizeEmail(req.params.studentEmail || '');

    if (!normalizedStudentEmail) {
      return res.status(400).json({ message: 'Student email is required.' });
    }

    if (!classroom.studentEmails.includes(normalizedStudentEmail)) {
      return res.status(404).json({ message: 'Student is not part of this class.' });
    }

    classroom.studentEmails = classroom.studentEmails.filter((email) => email !== normalizedStudentEmail);
    await classroom.save();

    return res.json({ message: 'Student removed from class successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to remove student from class.' });
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
      message: `${student.name} added to ${classroom.className}.`
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add student to class.' });
  }
});

app.post('/api/classes/:classId/students/create', async (req, res) => {
  try {
    const { teacherEmail, name, email, password, feeAmount, feeDueDate, feeMonths, allowedPaymentMethods } = req.body;

    if (
      !teacherEmail?.trim() ||
      !name?.trim() ||
      !email?.trim() ||
      !password?.trim() ||
      !feeAmount?.trim() ||
      !feeDueDate?.trim() ||
      !String(feeMonths || '').trim()
    ) {
      return res.status(400).json({ message: 'Teacher email, student details, and fee details are required.' });
    }

    const normalizedTeacherEmail = normalizeEmail(teacherEmail);
    const normalizedStudentEmail = normalizeEmail(email);
    const normalizedFeeMonths = Number(feeMonths);
    const normalizedAllowedPaymentMethods = [...new Set(
      (Array.isArray(allowedPaymentMethods) ? allowedPaymentMethods : [])
        .map((method) => String(method || '').trim())
        .filter((method) => ONLINE_PAYMENT_METHODS.includes(method))
    )];

    const teacher = await Teacher.findOne({ email: normalizedTeacherEmail });

    if (!teacher) {
      return res.status(403).json({ message: 'Only an existing teacher can add a student.' });
    }

    if (!normalizedAllowedPaymentMethods.length) {
      return res.status(400).json({ message: 'Select at least one valid payment method: UPI, Card, or Bank Transfer.' });
    }

    if (!Number.isInteger(normalizedFeeMonths) || normalizedFeeMonths <= 0) {
      return res.status(400).json({ message: 'Number of fee months must be a positive whole number.' });
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
      feePlanMonths: normalizedFeeMonths,
      attendanceRecords: buildInitialAttendanceRecords(),
      feeRecords: [{
        title: DEFAULT_FEE_TITLE,
        amount: feeAmount.trim(),
        dueDate: feeDueDate.trim(),
        allowedPaymentMethods: normalizedAllowedPaymentMethods,
        paymentMethod: '',
        status: 'Pending'
      }]
    });
    ensureMonthlyFeeRecords(student);
    await student.save();

    classroom.studentEmails.push(normalizedStudentEmail);
    await classroom.save();

    return res.status(201).json({
      message: `${student.name} was added directly into ${classroom.className}.`,
      user: { name: student.name, email: student.email }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create student inside this class.' });
  }
});

app.post('/api/admin/classes/:classId/students/create', async (req, res) => {
  try {
    const { adminEmail, name, email, password, feeAmount, feeDueDate, feeMonths, allowedPaymentMethods } = req.body;

    if (
      !adminEmail?.trim() ||
      !name?.trim() ||
      !email?.trim() ||
      !password?.trim() ||
      !feeAmount?.trim() ||
      !feeDueDate?.trim() ||
      !String(feeMonths || '').trim()
    ) {
      return res.status(400).json({ message: 'Admin email, student details, and fee details are required.' });
    }

    const admin = await Admin.findOne({ email: normalizeEmail(adminEmail) });
    const normalizedFeeMonths = Number(feeMonths);

    if (!admin) {
      return res.status(403).json({ message: 'Only an existing admin can add students into a class.' });
    }

    const normalizedAllowedPaymentMethods = normalizeAllowedPaymentMethods(allowedPaymentMethods);

    if (!normalizedAllowedPaymentMethods.length) {
      return res.status(400).json({ message: 'Select at least one valid payment method: UPI, Card, or Bank Transfer.' });
    }

    if (!Number.isInteger(normalizedFeeMonths) || normalizedFeeMonths <= 0) {
      return res.status(400).json({ message: 'Number of fee months must be a positive whole number.' });
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
      feePlanMonths: normalizedFeeMonths,
      attendanceRecords: buildInitialAttendanceRecords(),
      feeRecords: [{
        title: DEFAULT_FEE_TITLE,
        amount: feeAmount.trim(),
        dueDate: feeDueDate.trim(),
        allowedPaymentMethods: normalizedAllowedPaymentMethods,
        paymentMethod: '',
        status: 'Pending'
      }]
    });
    ensureMonthlyFeeRecords(student);
    await student.save();

    classroom.studentEmails.push(normalizedStudentEmail);
    await classroom.save();

    return res.status(201).json({
      message: `${student.name} was added to ${classroom.className} under ${teacher.name}.`,
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

    if (status === 'Absent') {
      await maybeSendAbsentAttendanceAlert(student, todayDate);
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

    return res.status(201).json({ message: `Exam scheduled for ${classroom.className}.` });
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
    const { teacherEmail, adminEmail, title, subject, dueDate, status, attachments } = req.body;

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
    const normalizedAttachments = normalizeAssignmentAttachments(attachments);

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
            attachments: normalizedAttachments,
            status: status === 'Submitted' ? 'Submitted' : 'Pending',
            submissionNote: '',
            submittedAttachments: [],
            submittedAt: ''
          }
        }
      }
    );

    return res.status(201).json({ message: `Assignment scheduled for ${classroom.className}.` });
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

    return res.status(201).json({ message: `Announcement posted in ${classroom.className}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to post class announcement.' });
  }
});

app.post('/api/classes/:classId/notes', async (req, res) => {
  try {
    const { teacherEmail, adminEmail, title, content, attachments } = req.body;

    if ((!teacherEmail?.trim() && !adminEmail?.trim()) || !title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: 'Teacher email or admin email, title, and note content are required.' });
    }

    const authorizedClassroom = await getAuthorizedClassroomAccess(req.params.classId, {
      teacherEmail,
      adminEmail
    });

    if (authorizedClassroom.message) {
      return res.status(authorizedClassroom.status).json({ message: authorizedClassroom.message });
    }

    const { classroom, ownerTeacherEmail } = authorizedClassroom;
    const normalizedAttachments = normalizeNoteAttachments(attachments);

    classroom.notes.unshift({
      title: title.trim(),
      content: content.trim(),
      attachments: normalizedAttachments,
      postedAt: getCurrentTimestamp(),
      createdByTeacher: ownerTeacherEmail
    });
    await classroom.save();

    return res.status(201).json({ message: `Note added in ${classroom.className}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add class note.' });
  }
});

app.use((error, req, res, next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({
      message: 'The note attachment is too large. Please upload a smaller file.'
    });
  }

  return next(error);
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

    if (status === 'Absent') {
      await maybeSendAbsentAttendanceAlert(student, todayDate);
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
    const { adminEmail, title, amount, dueDate, allowedPaymentMethods } = req.body;

    if (!adminEmail?.trim() || !title?.trim() || !amount?.trim() || !dueDate?.trim()) {
      return res.status(400).json({ message: 'Admin email, title, amount, and due date are required.' });
    }

    const admin = await Admin.findOne({ email: normalizeEmail(adminEmail) });

    if (!admin) {
      return res.status(403).json({ message: 'Only an existing admin can add fee details.' });
    }

    const normalizedAllowedPaymentMethods = [...new Set(
      (Array.isArray(allowedPaymentMethods) ? allowedPaymentMethods : [])
        .map((method) => String(method || '').trim())
        .filter((method) => ONLINE_PAYMENT_METHODS.includes(method))
    )];

    if (!normalizedAllowedPaymentMethods.length) {
      return res.status(400).json({ message: 'Select at least one valid payment method: UPI, Card, or Bank Transfer.' });
    }

    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (student.feeRecords.length) {
      return res.status(409).json({ message: 'Fee has already been added for this student.' });
    }

    student.feeRecords.push({
      title: title.trim(),
      amount: amount.trim(),
      dueDate: dueDate.trim(),
      allowedPaymentMethods: normalizedAllowedPaymentMethods,
      paymentMethod: '',
      status: 'Pending'
    });
    ensureMonthlyFeeRecords(student);

    await student.save();

    return res.status(201).json({ message: `Fee added successfully for ${student.name}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add fee details.' });
  }
});

app.post('/api/students/:email/fees/create-razorpay-order', async (req, res) => {
  try {
    const { feeItems, paymentMethod } = req.body;

    if (!Array.isArray(feeItems) || !feeItems.length || !paymentMethod?.trim()) {
      return res.status(400).json({ message: 'Fee items and payment method are required.' });
    }

    const normalizedPaymentMethod = paymentMethod.trim();

    if (!isRazorpaySupportedMethod(normalizedPaymentMethod)) {
      return res.status(400).json({ message: 'Razorpay test checkout supports only UPI, Card, and Bank Transfer.' });
    }

    const normalizedFeeItems = normalizeFeeItemsPayload(feeItems);

    if (!normalizedFeeItems.length) {
      return res.status(400).json({ message: 'Select at least one valid fee.' });
    }

    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const requestedFeeRecords = [];

    for (const requestedFee of normalizedFeeItems) {
      const feeRecord = student.feeRecords.find(
        (fee) => fee.title === requestedFee.title && fee.dueDate === requestedFee.dueDate
      );

      if (!feeRecord) {
        return res.status(404).json({ message: `Fee record not found for ${requestedFee.title}.` });
      }

      if (feeRecord.status === 'Paid') {
        return res.status(409).json({ message: `${requestedFee.title} is already marked as paid.` });
      }

      const allowedPaymentMethods = feeRecord.allowedPaymentMethods?.length
        ? feeRecord.allowedPaymentMethods
        : ONLINE_PAYMENT_METHODS;

      if (!allowedPaymentMethods.includes(normalizedPaymentMethod)) {
        return res.status(400).json({ message: `${requestedFee.title} does not allow ${normalizedPaymentMethod}.` });
      }

      requestedFeeRecords.push(feeRecord);
    }

    const amountPaise = requestedFeeRecords.reduce(
      (totalAmount, feeRecord) => totalAmount + normalizeFeeAmountToPaise(feeRecord.amount),
      0
    );

    if (!amountPaise) {
      return res.status(400).json({ message: 'Unable to calculate a valid payment amount for the selected fees.' });
    }

    const order = await createRazorpayOrder({
      amountPaise,
      receipt: buildRazorpayReceipt(student, normalizedFeeItems),
      notes: {
        studentEmail: student.email,
        paymentMethod: normalizedPaymentMethod,
        feeCount: String(normalizedFeeItems.length)
      }
    });

    student.paymentRequests = (student.paymentRequests || []).filter(
      (paymentRequest) => paymentRequest.status === 'paid' || paymentRequest.orderId !== order.id
    );
    student.paymentRequests.push({
      orderId: order.id,
      feeItems: normalizedFeeItems,
      amountPaise,
      currency: order.currency || 'INR',
      paymentMethod: normalizedPaymentMethod,
      status: 'created',
      paymentId: '',
      paidAt: ''
    });
    await student.save();

    return res.json({
      message: 'Razorpay test order created successfully.',
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency || 'INR'
      },
      razorpayKeyId: getRazorpayConfig().keyId,
      student: {
        name: student.name,
        email: student.email,
        phone: normalizePhoneNumber(student.profile?.phone || student.protectedDetails?.parentPhone || '')
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to create Razorpay order.' });
  }
});

app.post('/api/students/:email/fees/create-upi-qr', async (req, res) => {
  try {
    const { feeItems } = req.body;

    if (!Array.isArray(feeItems) || !feeItems.length) {
      return res.status(400).json({ message: 'Fee items are required.' });
    }

    const normalizedFeeItems = normalizeFeeItemsPayload(feeItems);

    if (!normalizedFeeItems.length) {
      return res.status(400).json({ message: 'Select at least one valid fee.' });
    }

    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const requestedFeeRecords = [];

    for (const requestedFee of normalizedFeeItems) {
      const feeRecord = student.feeRecords.find(
        (fee) => fee.title === requestedFee.title && fee.dueDate === requestedFee.dueDate
      );

      if (!feeRecord) {
        return res.status(404).json({ message: `Fee record not found for ${requestedFee.title}.` });
      }

      if (feeRecord.status === 'Paid') {
        return res.status(409).json({ message: `${requestedFee.title} is already marked as paid.` });
      }

      const allowedPaymentMethods = feeRecord.allowedPaymentMethods?.length
        ? feeRecord.allowedPaymentMethods
        : ONLINE_PAYMENT_METHODS;

      if (!allowedPaymentMethods.includes('UPI')) {
        return res.status(400).json({ message: `${requestedFee.title} does not allow UPI.` });
      }

      requestedFeeRecords.push(feeRecord);
    }

    const amountPaise = requestedFeeRecords.reduce(
      (totalAmount, feeRecord) => totalAmount + normalizeFeeAmountToPaise(feeRecord.amount),
      0
    );

    if (!amountPaise) {
      return res.status(400).json({ message: 'Unable to calculate a valid payment amount for the selected fees.' });
    }

    const qrCode = await createRazorpayQrCode({
      amountPaise,
      referenceId: buildRazorpayQrReference(student, normalizedFeeItems),
      description: normalizedFeeItems.length > 1 ? `School ERP fee payment for ${normalizedFeeItems.length} months` : 'School ERP monthly fee payment',
      notes: {
        studentEmail: student.email,
        paymentMethod: 'UPI',
        feeCount: String(normalizedFeeItems.length)
      }
    });

    console.log('[UPI_QR_CREATE]', JSON.stringify({
      studentEmail: student.email,
      qrId: qrCode.id || '',
      hasImageUrl: Boolean(qrCode.image_url),
      hasImageContent: Boolean(qrCode.image_content),
      hasShortUrl: Boolean(qrCode.short_url),
      closeReason: qrCode.close_reason || '',
      status: qrCode.status || '',
      type: qrCode.type || '',
      usage: qrCode.usage || ''
    }));

    student.paymentRequests = (student.paymentRequests || []).filter(
      (paymentRequest) => paymentRequest.status === 'paid' || paymentRequest.qrCodeId !== qrCode.id
    );
    student.paymentRequests.push({
      orderId: `qr_${qrCode.id}`,
      qrCodeId: qrCode.id,
      qrCodeImageUrl: qrCode.image_url || '',
      qrCodeShortUrl: qrCode.close_reason === 'on_demand_not_enabled' ? '' : (qrCode.short_url || ''),
      qrCodeImageContent: qrCode.image_content || '',
      feeItems: normalizedFeeItems,
      amountPaise,
      currency: qrCode.payment_amount_currency || 'INR',
      paymentMethod: 'UPI',
      status: 'created',
      paymentId: '',
      paidAt: ''
    });
    await student.save();

    return res.json({
      message: 'Razorpay UPI QR code created successfully.',
      qrCode: {
        id: qrCode.id,
        imageUrl: qrCode.image_url || '',
        imageContent: qrCode.image_content || '',
        shortUrl: qrCode.image_content || qrCode.image_url ? '' : (qrCode.short_url || ''),
        amount: qrCode.payment_amount || amountPaise,
        currency: qrCode.payment_amount_currency || 'INR',
        closeBy: qrCode.close_by || null,
        hasRenderableQr: Boolean(qrCode.image_content || qrCode.image_url)
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to create Razorpay UPI QR code.' });
  }
});

app.get('/api/students/:email/fees/upi-qr-status/:qrCodeId', async (req, res) => {
  try {
    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const paymentRequest = (student.paymentRequests || []).find(
      (request) => request.qrCodeId === req.params.qrCodeId.trim()
    );

    if (!paymentRequest) {
      return res.status(404).json({ message: 'Matching Razorpay QR code was not found.' });
    }

    if (paymentRequest.status === 'paid') {
      return res.json({
        status: 'paid',
        message: 'This UPI QR payment has already been verified.'
      });
    }

    const qrPayments = await fetchRazorpayQrPayments(req.params.qrCodeId.trim());
    const successfulPayment = qrPayments.find((payment) =>
      ['captured', 'authorized', 'paid'].includes(String(payment?.status || '').toLowerCase())
    );

    if (!successfulPayment) {
      return res.json({
        status: 'pending',
        message: 'Waiting for payment on the UPI QR code.'
      });
    }

    const { updatedFees } = applyPaidFeeRequest(student, paymentRequest, successfulPayment.id || '');
    await student.save();

    return res.json({
      status: 'paid',
      message: `${updatedFees.length} fee record${updatedFees.length > 1 ? 's were' : ' was'} paid successfully for ${student.name} through Razorpay UPI QR.`,
      fees: updatedFees
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to verify Razorpay UPI QR payment.' });
  }
});

app.post('/api/students/:email/fees/verify-razorpay-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id?.trim() || !razorpay_payment_id?.trim() || !razorpay_signature?.trim()) {
      return res.status(400).json({ message: 'Razorpay payment verification details are required.' });
    }

    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const paymentRequest = (student.paymentRequests || []).find(
      (request) => request.orderId === razorpay_order_id.trim()
    );

    if (!paymentRequest) {
      return res.status(404).json({ message: 'Matching Razorpay order was not found.' });
    }

    if (paymentRequest.status === 'paid') {
      return res.status(409).json({ message: 'This Razorpay payment has already been verified.' });
    }

    const isSignatureValid = verifyRazorpaySignature({
      orderId: razorpay_order_id.trim(),
      paymentId: razorpay_payment_id.trim(),
      signature: razorpay_signature.trim()
    });

    if (!isSignatureValid) {
      paymentRequest.status = 'failed';
      await student.save();
      return res.status(400).json({ message: 'Razorpay payment signature verification failed.' });
    }

    const { updatedFees } = applyPaidFeeRequest(student, paymentRequest, razorpay_payment_id.trim());

    await student.save();

    return res.json({
      message: `${updatedFees.length} fee record${updatedFees.length > 1 ? 's were' : ' was'} paid successfully for ${student.name} through Razorpay test checkout.`,
      fees: updatedFees
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to verify Razorpay payment.' });
  }
});

app.put('/api/students/:email/fees/pay', async (req, res) => {
  try {
    const { title, dueDate, paymentMethod, transactionId, adminEmail } = req.body;

    if (!title?.trim() || !dueDate?.trim() || !paymentMethod?.trim()) {
      return res.status(400).json({ message: 'Fee title, due date, and payment method are required.' });
    }

    const normalizedPaymentMethod = paymentMethod.trim();
    const normalizedAdminEmail = normalizeEmail(adminEmail || '');

    if (normalizedAdminEmail) {
      const admin = await Admin.findOne({ email: normalizedAdminEmail });

      if (!admin) {
        return res.status(403).json({ message: 'Only an existing admin can mark cash fee payments.' });
      }

      if (normalizedPaymentMethod !== 'Cash') {
        return res.status(400).json({ message: 'Admin can only mark fee payment as Cash from student details.' });
      }
    } else if (!ONLINE_PAYMENT_METHODS.includes(normalizedPaymentMethod)) {
      return res.status(400).json({ message: 'Please select a valid online payment method.' });
    }

    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const feeRecord = student.feeRecords.find(
      (fee) => fee.title === title.trim() && fee.dueDate === dueDate.trim()
    );

    if (!feeRecord) {
      return res.status(404).json({ message: 'Fee record not found.' });
    }

    if (feeRecord.status === 'Paid') {
      return res.status(409).json({ message: 'This fee is already marked as paid.' });
    }

    if (!normalizedAdminEmail) {
      const allowedPaymentMethods = feeRecord.allowedPaymentMethods?.length
        ? feeRecord.allowedPaymentMethods
        : ONLINE_PAYMENT_METHODS;

      if (!allowedPaymentMethods.includes(normalizedPaymentMethod)) {
        return res.status(400).json({ message: 'This payment method is not allowed for this fee.' });
      }
    }

    feeRecord.status = 'Paid';
    feeRecord.paymentMethod = normalizedPaymentMethod;
    feeRecord.transactionId = normalizedAdminEmail
      ? transactionId?.trim?.() || `CASH-${Date.now()}`
      : transactionId?.trim?.() || `TXN-${Date.now()}`;
    feeRecord.paidAt = getCurrentTimestamp();

    await student.save();

    return res.json({
      message: normalizedAdminEmail
        ? `Fee marked as paid in cash for ${student.name}.`
        : `Fee paid successfully for ${student.name}.`,
      fee: feeRecord
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to process fee payment.' });
  }
});

app.put('/api/students/:email/fees/pay-multiple', async (req, res) => {
  try {
    const { feeItems, paymentMethod } = req.body;

    if (!Array.isArray(feeItems) || !feeItems.length || !paymentMethod?.trim()) {
      return res.status(400).json({ message: 'Fee items and payment method are required.' });
    }

    const normalizedPaymentMethod = paymentMethod.trim();

    if (!ONLINE_PAYMENT_METHODS.includes(normalizedPaymentMethod)) {
      return res.status(400).json({ message: 'Please select a valid online payment method.' });
    }

    const normalizedFeeItems = feeItems
      .map((item) => ({
        title: String(item?.title || '').trim(),
        dueDate: String(item?.dueDate || '').trim()
      }))
      .filter((item) => item.title && item.dueDate);

    if (!normalizedFeeItems.length) {
      return res.status(400).json({ message: 'Select at least one valid fee.' });
    }

    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const batchTransactionId = `BATCH-${Date.now()}`;
    const paidAt = getCurrentTimestamp();
    const updatedFees = [];

    for (const requestedFee of normalizedFeeItems) {
      const feeRecord = student.feeRecords.find(
        (fee) => fee.title === requestedFee.title && fee.dueDate === requestedFee.dueDate
      );

      if (!feeRecord) {
        return res.status(404).json({ message: `Fee record not found for ${requestedFee.title}.` });
      }

      if (feeRecord.status === 'Paid') {
        return res.status(409).json({ message: `${requestedFee.title} is already marked as paid.` });
      }

      const allowedPaymentMethods = feeRecord.allowedPaymentMethods?.length
        ? feeRecord.allowedPaymentMethods
        : ONLINE_PAYMENT_METHODS;

      if (!allowedPaymentMethods.includes(normalizedPaymentMethod)) {
        return res.status(400).json({ message: `${requestedFee.title} does not allow ${normalizedPaymentMethod}.` });
      }

      feeRecord.status = 'Paid';
      feeRecord.paymentMethod = normalizedPaymentMethod;
      feeRecord.transactionId = batchTransactionId;
      feeRecord.paidAt = paidAt;
      updatedFees.push(feeRecord);
    }

    await student.save();

    return res.json({
      message: `${updatedFees.length} fee record${updatedFees.length > 1 ? 's were' : ' was'} paid successfully for ${student.name}.`,
      fees: updatedFees
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to process fee payment.' });
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
    const { teacherEmail, title, subject, dueDate, status, attachments } = req.body;

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

    const normalizedAttachments = normalizeAssignmentAttachments(attachments);

    student.assignmentRecords.push({
      title: title.trim(),
      subject: subject.trim(),
      dueDate: dueDate.trim(),
      attachments: normalizedAttachments,
      status: status === 'Submitted' ? 'Submitted' : 'Pending',
      submissionNote: '',
      submittedAttachments: [],
      submittedAt: ''
    });

    await student.save();

    return res.status(201).json({ message: `Assignment added successfully for ${student.name}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add assignment details.' });
  }
});

app.put('/api/students/:email/assignments/submit', async (req, res) => {
  try {
    const { title, subject, dueDate, submissionNote, submittedAttachments } = req.body;

    if (!title?.trim() || !subject?.trim() || !dueDate?.trim()) {
      return res.status(400).json({ message: 'Assignment title, subject, and due date are required.' });
    }

    const student = await Student.findOne({ email: normalizeEmail(req.params.email) });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const matchingAssignment = (student.assignmentRecords || []).find(
      (assignment) =>
        assignment.title === title.trim() &&
        assignment.subject === subject.trim() &&
        assignment.dueDate === dueDate.trim()
    );

    if (!matchingAssignment) {
      return res.status(404).json({ message: 'Assignment record not found.' });
    }

    const normalizedSubmittedAttachments = normalizeAssignmentAttachments(submittedAttachments);

    if (!String(submissionNote || '').trim() && !normalizedSubmittedAttachments.length) {
      return res.status(400).json({ message: 'Add submission text or at least one file before submitting.' });
    }

    matchingAssignment.status = 'Submitted';
    matchingAssignment.submissionNote = String(submissionNote || '').trim();
    matchingAssignment.submittedAttachments = normalizedSubmittedAttachments;
    matchingAssignment.submittedAt = getCurrentTimestamp();

    await student.save();

    return res.json({ message: `Assignment submitted successfully for ${student.name}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to submit assignment.' });
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
