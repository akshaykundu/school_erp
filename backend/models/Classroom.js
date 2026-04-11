import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    postedAt: { type: String, required: true },
    createdByTeacher: { type: String, required: true, trim: true, lowercase: true }
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    attachments: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, required: true, trim: true },
            type: { type: String, default: '', trim: true },
            size: { type: Number, default: 0 },
            dataUrl: { type: String, required: true }
          },
          { _id: false }
        )
      ],
      default: []
    },
    postedAt: { type: String, required: true },
    createdByTeacher: { type: String, required: true, trim: true, lowercase: true }
  },
  { _id: false }
);

const classroomSchema = new mongoose.Schema(
  {
    className: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    teacherEmail: { type: String, required: true, trim: true, lowercase: true },
    studentEmails: { type: [String], default: [] },
    announcements: { type: [announcementSchema], default: [] },
    notes: { type: [noteSchema], default: [] }
  },
  { timestamps: true }
);

classroomSchema.index(
  { teacherEmail: 1, className: 1 },
  { unique: true }
);

export default mongoose.model('Classroom', classroomSchema);
