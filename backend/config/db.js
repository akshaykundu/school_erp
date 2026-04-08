import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://127.0.0.1:27017/school_erp';

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`MongoDB connected: ${MONGO_URI}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}
