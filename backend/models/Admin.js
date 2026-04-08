import mongoose from 'mongoose';

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

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    profile: { type: profileSchema, default: () => ({}) }
  },
  { timestamps: true }
);

export default mongoose.model('Admin', adminSchema);
