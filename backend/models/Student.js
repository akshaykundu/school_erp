import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    status: {
      type: String,
      enum: ['Present', 'Absent'],
      required: true
    }
  },
  { _id: false }
);

const feeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: String, required: true, trim: true },
    dueDate: { type: String, required: true },
    allowedPaymentMethods: {
      type: [String],
      default: ['UPI', 'Card', 'Bank Transfer']
    },
    paymentMethod: { type: String, default: '', trim: true },
    transactionId: { type: String, default: '', trim: true },
    paidAt: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Paid'],
      default: 'Pending'
    }
  },
  { _id: false }
);

const paymentRequestSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, trim: true },
    qrCodeId: { type: String, default: '', trim: true },
    qrCodeImageUrl: { type: String, default: '', trim: true },
    qrCodeShortUrl: { type: String, default: '', trim: true },
    qrCodeImageContent: { type: String, default: '', trim: true },
    feeItems: {
      type: [
        new mongoose.Schema(
          {
            title: { type: String, required: true, trim: true },
            dueDate: { type: String, required: true, trim: true }
          },
          { _id: false }
        )
      ],
      default: []
    },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: 'INR', trim: true },
    paymentMethod: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed'],
      default: 'created'
    },
    paymentId: { type: String, default: '', trim: true },
    paidAt: { type: String, default: '' }
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true, trim: true },
    room: { type: String, required: true, trim: true },
    maxMarks: { type: Number, default: 100 },
    marksObtained: { type: String, default: '' },
    attendanceStatus: {
      type: String,
      enum: ['Pending', 'Present', 'Absent'],
      default: 'Pending'
    }
  },
  { _id: false }
);

const fileAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, default: '', trim: true },
    size: { type: Number, default: 0 },
    dataUrl: { type: String, required: true }
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    dueDate: { type: String, required: true },
    attachments: {
      type: [fileAttachmentSchema],
      default: []
    },
    status: {
      type: String,
      enum: ['Pending', 'Submitted'],
      default: 'Pending'
    },
    submissionNote: { type: String, default: '', trim: true },
    submittedAttachments: {
      type: [fileAttachmentSchema],
      default: []
    },
    submittedAt: { type: String, default: '' }
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    dateOfBirth: { type: String, default: '' },
    gender: { type: String, default: '', trim: true },
    bio: { type: String, default: '', trim: true },
    profileImage: { type: String, default: '' }
  },
  { _id: false }
);

const protectedDetailsSchema = new mongoose.Schema(
  {
    parentName: { type: String, default: '', trim: true },
    parentPhone: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const parentAlertSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['attendance_absent', 'fee_overdue'],
      required: true
    },
    channel: {
      type: String,
      enum: ['sms', 'whatsapp'],
      required: true
    },
    recipient: { type: String, required: true, trim: true },
    sentAt: { type: String, required: true },
    deliveryStatus: {
      type: String,
      enum: ['sent', 'skipped', 'failed'],
      default: 'sent'
    }
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    createdByTeacher: { type: String, required: true, trim: true, lowercase: true },
    feePlanMonths: { type: Number, default: 12 },
    attendanceRecords: { type: [attendanceSchema], default: [] },
    feeRecords: { type: [feeSchema], default: [] },
    examRecords: { type: [examSchema], default: [] },
    assignmentRecords: { type: [assignmentSchema], default: [] },
    paymentRequests: { type: [paymentRequestSchema], default: [] },
    profile: { type: profileSchema, default: () => ({}) },
    protectedDetails: { type: protectedDetailsSchema, default: () => ({}) },
    parentAlerts: { type: [parentAlertSchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model('Student', studentSchema);
