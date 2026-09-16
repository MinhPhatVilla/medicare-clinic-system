/**
 * @file src/seeds/seed.ts
 * @description Seed dữ liệu mẫu cho development/testing
 *
 * Chạy: npx ts-node src/seeds/seed.ts
 *
 * Tạo sẵn các tài khoản test:
 * - admin@medicare.vn / Admin@123
 * - doctor@medicare.vn / Doctor@123
 * - receptionist@medicare.vn / Recept@123
 * - patient@medicare.vn / Patient@123
 */

import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.entity';
import { Doctor, Specialty } from '../models/Doctor.entity';
import { Patient } from '../models/Patient.entity';

const seedUsers = [
  {
    email: 'admin@medicare.vn',
    password: 'Admin@123',
    fullName: 'Quản trị viên',
    phone: '0901000001',
    role: UserRole.ADMIN,
  },
  {
    email: 'doctor.nguyen@medicare.vn',
    password: 'Doctor@123',
    fullName: 'BS. Nguyễn Văn Minh',
    phone: '0901000002',
    role: UserRole.DOCTOR,
  },
  {
    email: 'doctor.le@medicare.vn',
    password: 'Doctor@123',
    fullName: 'BS. Lê Thị Hương',
    phone: '0901000003',
    role: UserRole.DOCTOR,
  },
  {
    email: 'receptionist@medicare.vn',
    password: 'Recept@123',
    fullName: 'Tiếp Tân Trần Thu',
    phone: '0901000004',
    role: UserRole.RECEPTIONIST,
  },
  {
    email: 'patient@medicare.vn',
    password: 'Patient@123',
    fullName: 'Bệnh Nhân Phạm Tuấn',
    phone: '0901000005',
    role: UserRole.PATIENT,
  },
];

const doctorProfiles = [
  {
    email: 'doctor.nguyen@medicare.vn',
    specialty: Specialty.GENERAL,
    qualification: 'Thạc sĩ Y khoa',
    bio: 'Bác sĩ đa khoa với hơn 10 năm kinh nghiệm',
    consultationFee: 300000,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    rating: 4.8,
  },
  {
    email: 'doctor.le@medicare.vn',
    specialty: Specialty.CARDIOLOGY,
    qualification: 'Tiến sĩ Tim mạch',
    bio: 'Chuyên gia tim mạch tại Bệnh viện Bạch Mai',
    consultationFee: 500000,
    workingDays: ['Monday', 'Wednesday', 'Friday'],
    workingHoursStart: '09:00',
    workingHoursEnd: '16:00',
    rating: 4.9,
  },
];

async function seed(): Promise<void> {
  console.log('🌱 Bắt đầu seed dữ liệu...');

  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);
  const doctorRepo = AppDataSource.getRepository(Doctor);
  const patientRepo = AppDataSource.getRepository(Patient);

  for (const userData of seedUsers) {
    const existing = await userRepo.findOne({ where: { email: userData.email } });
    if (existing) {
      console.log(`⏭️  Bỏ qua (đã tồn tại): ${userData.email}`);
      continue;
    }

    const hashed = await bcrypt.hash(userData.password, 12);
    const user = userRepo.create({ ...userData, password: hashed });
    await userRepo.save(user);
    console.log(`✅ Tạo user: ${userData.email} (${userData.role})`);

    // Tạo profile
    if (userData.role === UserRole.PATIENT) {
      const patient = patientRepo.create({ userId: user.id });
      await patientRepo.save(patient);
    }
  }

  // Tạo doctor profiles
  for (const profile of doctorProfiles) {
    const user = await userRepo.findOne({ where: { email: profile.email } });
    if (!user) continue;

    const existing = await doctorRepo.findOne({ where: { userId: user.id } });
    if (existing) continue;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email: _email, ...doctorData } = profile;
    const doctor = doctorRepo.create({ ...doctorData, userId: user.id });
    await doctorRepo.save(doctor);
    console.log(`🩺 Tạo hồ sơ bác sĩ: ${profile.email}`);
  }

  console.log('\n✨ Seed hoàn thành!');
  console.log('\n📋 Tài khoản test:');
  seedUsers.forEach((u) => console.log(`  ${u.role.padEnd(14)} | ${u.email} | ${u.password}`));

  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Seed thất bại:', error);
  process.exit(1);
});
