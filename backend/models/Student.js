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
    status: {
      type: String,
      enum: ['Pending', 'Paid'],
      default: 'Pending'
    }
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

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    dueDate: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Submitted'],
      default: 'Pending'
    }
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

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    createdByTeacher: { type: String, required: true, trim: true, lowercase: true },
    attendanceRecords: { type: [attendanceSchema], default: [] },
    feeRecords: { type: [feeSchema], default: [] },
    examRecords: { type: [examSchema], default: [] },
    assignmentRecords: { type: [assignmentSchema], default: [] },
    profile: { type: profileSchema, default: () => ({}) },
    protectedDetails: { type: protectedDetailsSchema, default: () => ({}) }
  },
  { timestamps: true }
);

export default mongoose.model('Student', studentSchema);
