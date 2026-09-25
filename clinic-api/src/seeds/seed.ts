/**
 * @file src/seeds/seed.ts
 * @description Seed dữ liệu mẫu cho development/testing
 *
 * Chạy: npm run seed
 *
 * Tạo sẵn các tài khoản test với đầy đủ vai trò chính:
 * - admin@medicare.vn / Admin@123           (ADMIN)
 * - doctor.nguyen@medicare.vn / Doctor@123  (DOCTOR)
 * - doctor.le@medicare.vn / Doctor@123      (DOCTOR)
 * - receptionist@medicare.vn / Recept@123   (RECEPTIONIST)
 * - cashier@medicare.vn / Cashier@123       (CASHIER)
 * - pharmacist@medicare.vn / Pharma@123     (PHARMACIST)
 * - patient@medicare.vn / Patient@123       (PATIENT)
 */

import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.entity';
import { Doctor, Specialty } from '../models/Doctor.entity';
import { Patient, Gender, BloodType } from '../models/Patient.entity';
import { DoctorSchedule, DayOfWeek } from '../models/DoctorSchedule.entity';
import { MedicalService } from '../models/MedicalService.entity';
import { Medicine } from '../models/Medicine.entity';
import { ServiceType } from '../models/ServiceOrder.entity';

const seedUsers = [
  {
    email: 'manager@medicare.vn',
    password: 'Manager@123',
    fullName: 'Quan ly',
    phone: '0901000008',
    role: UserRole.MANAGER,
  },
  {
    email: 'technician@medicare.vn',
    password: 'Tech@123',
    fullName: 'Ky thuat vien',
    phone: '0901000009',
    role: UserRole.TECHNICIAN,
  },
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
    email: 'pharmacist@medicare.vn',
    password: 'Pharma@123',
    fullName: 'Dược sĩ Nguyễn Mai',
    phone: '0901000007',
    role: UserRole.PHARMACIST,
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
  if (env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production');
  logger.info('🌱 Bắt đầu seed dữ liệu MediCare...');

  await AppDataSource.initialize();
  await AppDataSource.transaction(async (manager) => {
    // Serialize seed runs so concurrent executions cannot create duplicate fixtures.
    await manager.query('SELECT pg_advisory_xact_lock($1)', [20260920]);
    const userRepo = manager.getRepository(User);
    const doctorRepo = manager.getRepository(Doctor);
    const patientRepo = manager.getRepository(Patient);
    const scheduleRepo = manager.getRepository(DoctorSchedule);

    for (const userData of seedUsers) {
      const existing = await userRepo.findOne({ where: { email: userData.email } });
      if (existing) {
        if (existing.role !== userData.role) throw new Error('Seed account role conflict');
        logger.info(`⏭️  Bỏ qua (đã tồn tại): ${userData.email}`);
      }

      const user =
        existing ||
        (await userRepo.save(
          userRepo.create({
            ...userData,
            password: await bcrypt.hash(userData.password, env.BCRYPT_ROUNDS),
          }),
        ));

      // Tạo hồ sơ Patient mẫu
      if (
        userData.role === UserRole.PATIENT &&
        !(await patientRepo.findOne({ where: { userId: user.id } }))
      ) {
        const patient = patientRepo.create({
          patientCode: 'BN-202412-0001',
          userId: user.id,
          fullName: user.fullName,
          phone: user.phone,
          dateOfBirth: new Date('1992-05-15'),
          gender: Gender.MALE,
          address: 'Lã Xuân Oai, TP Thủ Đức (dữ liệu mẫu)',
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
        logger.info(`👤 Tạo hồ sơ bệnh nhân: ${userData.fullName}`);
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
        logger.info(`🩺 Tạo hồ sơ bác sĩ: ${profile.email}`);
      }

      // Tạo lịch làm việc mẫu cho 7 ngày tới
      const today = new Date();
      const daysOfWeek = [
        DayOfWeek.SUNDAY,
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
      ];

      for (let i = 1; i <= 5; i++) {
        const workDate = new Date(today);
        workDate.setDate(today.getDate() + i);
        const dateOnly = `${workDate.getFullYear()}-${String(workDate.getMonth() + 1).padStart(2, '0')}-${String(workDate.getDate()).padStart(2, '0')}`;

        const existingSchedule = await scheduleRepo.findOne({
          where: {
            doctorId: doctor.id,
            workDate: dateOnly as unknown as Date,
          },
        });

        if (!existingSchedule) {
          const schedule = scheduleRepo.create({
            doctorId: doctor.id,
            workDate: dateOnly as unknown as Date,
            dayOfWeek: daysOfWeek[workDate.getDay()],
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

    // Danh mục Dịch vụ Cận Lâm Sàng (Service Catalog) niêm yết
    const serviceRepo = manager.getRepository(MedicalService);
    const seedServices = [
      {
        code: 'XN_CBC',
        name: 'Tổng phân tích tế bào máu ngoại vi (CBC)',
        serviceType: ServiceType.LAB_TEST,
        price: 150000,
        unit: 'Lần',
        department: 'Phòng Xét nghiệm Huyết học',
        description:
          'Đánh giá số lượng hồng cầu, bạch cầu, tiểu cầu. Phát hiện thiếu máu, nhiễm trùng.',
      },
      {
        code: 'XN_SHM',
        name: 'Sinh hóa máu cơ bản (Glucose, Ure, Creatinin, AST, ALT)',
        serviceType: ServiceType.LAB_TEST,
        price: 220000,
        unit: 'Lần',
        department: 'Phòng Xét nghiệm Sinh hóa',
        description: 'Đánh giá chức năng gan, thận, đường huyết. Cần nhịn ăn 8h trước khi lấy máu.',
      },
      {
        code: 'XN_LIPID',
        name: 'Bộ mỡ máu (Cholesterol, Triglycerid, HDL-C, LDL-C)',
        serviceType: ServiceType.LAB_TEST,
        price: 180000,
        unit: 'Lần',
        department: 'Phòng Xét nghiệm Sinh hóa',
        description: 'Tầm soát rối loạn mỡ máu và nguy cơ tim mạch xơ vữa.',
      },
      {
        code: 'XN_URI',
        name: 'Tổng phân tích nước tiểu 10 thông số',
        serviceType: ServiceType.LAB_TEST,
        price: 80000,
        unit: 'Lần',
        department: 'Phòng Xét nghiệm Vi sinh',
        description: 'Kiểm tra đường tiết niệu, đạm niệu, hồng cầu niệu.',
      },
      {
        code: 'SA_OB',
        name: 'Siêu âm ổ bụng tổng quát màu',
        serviceType: ServiceType.IMAGING,
        price: 250000,
        unit: 'Lần',
        department: 'Phòng Siêu âm 201',
        description:
          'Khảo sát gan, mật, tụy, lách, thận, bàng quang. Cần nhịn tiểu để bàng quang căng.',
      },
      {
        code: 'SA_TIM',
        name: 'Siêu âm tim Doppler màu qua thành ngực',
        serviceType: ServiceType.IMAGING,
        price: 450000,
        unit: 'Lần',
        department: 'Phòng Siêu âm Tim 202',
        description: 'Đánh giá hình thái, chức năng co bóp cơ tim và các van tim.',
      },
      {
        code: 'SA_GIAP',
        name: 'Siêu âm tuyến giáp Doppler màu',
        serviceType: ServiceType.IMAGING,
        price: 200000,
        unit: 'Lần',
        department: 'Phòng Siêu âm 201',
        description: 'Phát hiện nhân tuyến giáp, bướu giáp, viêm tuyến giáp.',
      },
      {
        code: 'XQ_NGUC',
        name: 'Chụp X-quang ngực thẳng kỹ thuật số (DR)',
        serviceType: ServiceType.IMAGING,
        price: 180000,
        unit: 'Lần',
        department: 'Khoa Chẩn đoán Hình ảnh - Phòng X-quang 105',
        description: 'Tầm soát bệnh lý tim phổi, tràn dịch màng phổi, viêm phổi.',
      },
      {
        code: 'XQ_CS',
        name: 'Chụp X-quang cột sống thắt lưng 2 tư thế (thẳng/nghiêng)',
        serviceType: ServiceType.IMAGING,
        price: 240000,
        unit: 'Lần',
        department: 'Khoa Chẩn đoán Hình ảnh - Phòng X-quang 105',
        description: 'Đánh giá thoái hóa cột sống, gai xương, trượt đốt sống.',
      },
      {
        code: 'ECG_12',
        name: 'Điện tim 12 chuyển đạo (ECG)',
        serviceType: ServiceType.ECG,
        price: 120000,
        unit: 'Lần',
        department: 'Phòng Thăm dò chức năng 104',
        description: 'Ghi nhận nhịp tim, thiếu máu cơ tim, rối loạn dẫn truyền.',
      },
      {
        code: 'NS_DD',
        name: 'Nội soi thực quản - dạ dày - tá tràng có gây mê',
        serviceType: ServiceType.ENDOSCOPY,
        price: 1200000,
        unit: 'Lần',
        department: 'Trung tâm Nội soi Tiêu hóa',
        description: 'Phát hiện viêm loét, polyp, vi khuẩn HP, tầm soát ung thư dạ dày.',
      },
      {
        code: 'NS_DT',
        name: 'Nội soi đại trực tràng toàn bộ có gây mê',
        serviceType: ServiceType.ENDOSCOPY,
        price: 1800000,
        unit: 'Lần',
        department: 'Trung tâm Nội soi Tiêu hóa',
        description: 'Tầm soát polyp, viêm loét đại tràng, xuất huyết tiêu hóa dưới.',
      },
    ];

    for (const svc of seedServices) {
      const existing = await serviceRepo.findOne({ where: { code: svc.code } });
      if (!existing) {
        const createdSvc = serviceRepo.create(svc);
        await serviceRepo.save(createdSvc);
        logger.info(
          `🔬 Thêm dịch vụ CLS: ${svc.code} - ${svc.name} (${svc.price.toLocaleString('vi-VN')} đ)`,
        );
      }
    }

    // Danh mục Thuốc (Drug Catalog)
    const medicineRepo = manager.getRepository(Medicine);
    const seedMedicines = [
      {
        code: 'TH_OMEP_20',
        name: 'Omeprazol 20mg',
        activeIngredient: 'Omeprazole',
        unit: 'Viên',
        unitPrice: 2500,
        dosageForm: 'Viên nang bao tan trong ruột',
        packaging: 'Hộp 3 vỉ x 10 viên',
        usageInstructions: 'Uống trước bữa ăn sáng 30 phút, nuốt nguyên viên',
        manufacturer: 'Dược Hậu Giang',
      },
      {
        code: 'TH_DOMP_10',
        name: 'Domperidon 10mg',
        activeIngredient: 'Domperidone',
        unit: 'Viên',
        unitPrice: 1500,
        dosageForm: 'Viên nén',
        packaging: 'Hộp 10 vỉ x 10 viên',
        usageInstructions: 'Uống trước bữa ăn 15 - 30 phút khi có cảm giác buồn nôn, ợ hơi',
        manufacturer: 'Dược phẩm Imexpharm',
      },
      {
        code: 'TH_PARA_500',
        name: 'Paracetamol 500mg',
        activeIngredient: 'Paracetamol',
        unit: 'Viên',
        unitPrice: 1000,
        dosageForm: 'Viên nén bao phim',
        packaging: 'Hộp 10 vỉ x 10 viên',
        usageInstructions: 'Uống sau ăn khi đau hoặc sốt trên 38.5°C, cách nhau 4-6 giờ',
        manufacturer: 'Traphaco',
      },
      {
        code: 'TH_AMOX_500',
        name: 'Amoxicillin 500mg',
        activeIngredient: 'Amoxicillin trihydrate',
        unit: 'Viên',
        unitPrice: 3000,
        dosageForm: 'Viên nang',
        packaging: 'Hộp 10 vỉ x 10 viên',
        usageInstructions: 'Uống sau bữa ăn, tuân thủ đủ liệu trình 7-10 ngày',
        manufacturer: 'Dược Hậu Giang',
      },
      {
        code: 'TH_LOSA_50',
        name: 'Losartan 50mg',
        activeIngredient: 'Losartan potassium',
        unit: 'Viên',
        unitPrice: 4000,
        dosageForm: 'Viên nén bao phim',
        packaging: 'Hộp 3 vỉ x 10 viên',
        usageInstructions: 'Uống 1 viên vào buổi sáng mỗi ngày, kiểm tra huyết áp định kỳ',
        manufacturer: 'Stada / Stella',
      },
      {
        code: 'TH_DICL_50',
        name: 'Diclofenac 50mg',
        activeIngredient: 'Diclofenac sodium',
        unit: 'Viên',
        unitPrice: 2000,
        dosageForm: 'Viên nén bao tan ở ruột',
        packaging: 'Hộp 5 vỉ x 10 viên',
        usageInstructions: 'Uống sau khi ăn no kèm nhiều nước để giảm kích ứng dạ dày',
        manufacturer: 'Dược phẩm Pymepharco',
      },
      {
        code: 'TH_CETI_10',
        name: 'Cetirizin 10mg',
        activeIngredient: 'Cetirizine hydrochloride',
        unit: 'Viên',
        unitPrice: 1800,
        dosageForm: 'Viên nén bao phim',
        packaging: 'Hộp 10 vỉ x 10 viên',
        usageInstructions: 'Uống 1 viên vào buổi tối trước khi đi ngủ khi có triệu chứng dị ứng',
        manufacturer: 'Dược Hậu Giang',
      },
      {
        code: 'TH_VITB_COMP',
        name: 'Vitamin B Complex',
        activeIngredient: 'Vitamin B1 + B6 + B12',
        unit: 'Viên',
        unitPrice: 1200,
        dosageForm: 'Viên bao đường',
        packaging: 'Lọ 100 viên',
        usageInstructions: 'Uống 1 - 2 viên mỗi ngày sau bữa ăn',
        manufacturer: 'Dược phẩm Nam Hà',
      },
    ];

    for (const med of seedMedicines) {
      const existing = await medicineRepo.findOne({ where: { code: med.code } });
      if (!existing) {
        const createdMed = medicineRepo.create(med);
        await medicineRepo.save(createdMed);
        logger.info(
          `💊 Thêm thuốc: ${med.code} - ${med.name} (${med.unitPrice.toLocaleString('vi-VN')} đ/${med.unit})`,
        );
      }
    }
  });
  logger.info('Seed committed: demo accounts, profiles, schedules, services and medicines.');
  await AppDataSource.destroy();
}

void seed().catch(async () => {
  logger.error('Seed failed; review database constraints and configuration');
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exitCode = 1;
});
