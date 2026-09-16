/**
 * @file src/seeds/seed.ts
 * @description Seed dữ liệu mẫu cho development/testing
 *
 * Chạy: npm run seed
 *
 * Tạo sẵn các tài khoản test với đầy đủ 5 Roles:
 * - admin@medicare.vn / Admin@123           (ADMIN)
 * - doctor.nguyen@medicare.vn / Doctor@123  (DOCTOR)
 * - doctor.le@medicare.vn / Doctor@123      (DOCTOR)
 * - receptionist@medicare.vn / Recept@123   (RECEPTIONIST)
 * - cashier@medicare.vn / Cashier@123       (CASHIER)
 * - patient@medicare.vn / Patient@123       (PATIENT)
 */

import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.entity';
import { Doctor, Specialty } from '../models/Doctor.entity';
import { Patient, Gender, BloodType } from '../models/Patient.entity';
import { DoctorSchedule, DayOfWeek } from '../models/DoctorSchedule.entity';

const seedUsers = [
  {
    email: 'admin@medicare.vn',
    password: 'Admin@123',
    fullName: 'Quản trị viên Hệ thống',
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
    email: 'cashier@medicare.vn',
    password: 'Cashier@123',
    fullName: 'Thu Ngân Hoàng Yến',
    phone: '0901000005',
    role: UserRole.CASHIER,
  },
  {
    email: 'patient@medicare.vn',
    password: 'Patient@123',
    fullName: 'Bệnh Nhân Phạm Tuấn',
    phone: '0901000006',
    role: UserRole.PATIENT,
  },
];

const doctorProfiles = [
  {
    email: 'doctor.nguyen@medicare.vn',
    specialty: Specialty.GENERAL,
    qualification: 'ThS.BS',
    roomNumber: 'Phòng 101',
    experienceYears: 10,
    license: 'CCHN-001234',
    bio: 'Bác sĩ đa khoa với hơn 10 năm kinh nghiệm khám và điều trị bệnh nội khoa',
    consultationFee: 300000,
    rating: 4.8,
    totalReviews: 120,
  },
  {
    email: 'doctor.le@medicare.vn',
    specialty: Specialty.CARDIOLOGY,
    qualification: 'TS.BS',
    roomNumber: 'Phòng 202',
    experienceYears: 15,
    license: 'CCHN-005678',
    bio: 'Chuyên gia tim mạch nhiều năm công tác tại bệnh viện tuyến trung ương',
    consultationFee: 500000,
    rating: 4.9,
    totalReviews: 85,
  },
];

async function seed(): Promise<void> {
  console.log('🌱 Bắt đầu seed dữ liệu MediCare...');

  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);
  const doctorRepo = AppDataSource.getRepository(Doctor);
  const patientRepo = AppDataSource.getRepository(Patient);
  const scheduleRepo = AppDataSource.getRepository(DoctorSchedule);

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

    // Tạo hồ sơ Patient mẫu
    if (userData.role === UserRole.PATIENT) {
      const patient = patientRepo.create({
        patientCode: 'BN-202412-0001',
        userId: user.id,
        fullName: user.fullName,
        phone: user.phone,
        dateOfBirth: new Date('1992-05-15'),
        gender: Gender.MALE,
        address: 'Số 45 Cầu Giấy, Hà Nội',
        bloodType: BloodType.O_POSITIVE,
        allergies: 'Không có tiền sử dị ứng',
        chronicDiseases: 'Không có',
        insuranceNumber: 'DN4791234567890',
        idCardNumber: '001092012345',
        emergencyContactName: 'Phạm Thị Mẹ',
        emergencyContactPhone: '0988776655',
        isActive: true,
      });
      await patientRepo.save(patient);
      console.log(`👤 Tạo hồ sơ bệnh nhân: ${userData.fullName}`);
    }
  }

  // Tạo hồ sơ Doctor & Lịch làm việc DoctorSchedule
  for (const profile of doctorProfiles) {
    const user = await userRepo.findOne({ where: { email: profile.email } });
    if (!user) continue;

    let doctor = await doctorRepo.findOne({ where: { userId: user.id } });
    if (!doctor) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { email: _email, ...doctorData } = profile;
      doctor = doctorRepo.create({ ...doctorData, userId: user.id });
      await doctorRepo.save(doctor);
      console.log(`🩺 Tạo hồ sơ bác sĩ: ${profile.email}`);
    }

    // Tạo lịch làm việc mẫu cho 7 ngày tới
    const today = new Date();
    const daysOfWeek = [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
    ];

    for (let i = 1; i <= 5; i++) {
      const workDate = new Date(today);
      workDate.setDate(today.getDate() + i);

      const existingSchedule = await scheduleRepo.findOne({
        where: {
          doctorId: doctor.id,
          workDate: workDate.toISOString().slice(0, 10) as unknown as Date,
        },
      });

      if (!existingSchedule) {
        const schedule = scheduleRepo.create({
          doctorId: doctor.id,
          workDate: workDate.toISOString().slice(0, 10) as unknown as Date,
          dayOfWeek: daysOfWeek[(workDate.getDay() + 6) % 7] || DayOfWeek.MONDAY,
          startTime: '08:00',
          endTime: '08:30',
          slotDurationMinutes: 30,
          maxPatients: 3,
          bookedPatients: 0,
          isAvailable: true,
          roomNumber: doctor.roomNumber || 'Phòng 101',
          notes: 'Khung giờ khám buổi sáng',
        });
        await scheduleRepo.save(schedule);
      }
    }
  }

  console.log('\n✨ Seed hoàn thành xuất sắc!');
  console.log('\n📋 Danh sách tài khoản test (5 Roles):');
  console.log('──────────────────────────────────────────────────────────────────');
  seedUsers.forEach((u) =>
    console.log(`  ${u.role.padEnd(14)} | ${u.email.padEnd(30)} | ${u.password}`),
  );
  console.log('──────────────────────────────────────────────────────────────────');

  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Seed thất bại:', error);
  process.exit(1);
});
