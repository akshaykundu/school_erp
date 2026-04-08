import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import Admin from '../models/Admin.js';

const DEFAULT_ADMIN = {
  name: 'Akshay kundu',
  email: 'Akgame99977@gmail.com',
  password: 'Akshay@1234'
};

async function seedAdmin() {
  await connectDB();

  const existingAdmin = await Admin.findOne({ email: DEFAULT_ADMIN.email.toLowerCase() });

  if (existingAdmin) {
    console.log('Seed skipped: admin already exists.');
    console.log(`Email: ${existingAdmin.email}`);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);

  await Admin.create({
    name: DEFAULT_ADMIN.name,
    email: DEFAULT_ADMIN.email.toLowerCase(),
    password: hashedPassword
  });

  console.log('Default admin created successfully.');
  console.log(`Email: ${DEFAULT_ADMIN.email}`);
  console.log(`Password: ${DEFAULT_ADMIN.password}`);
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error('Failed to seed admin:', error.message);
  process.exit(1);
});
