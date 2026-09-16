# MediCare Clinic API

Backend RESTful API cho **Hệ thống Quản lý Đặt lịch và Quy trình Khám bệnh**.

## Tech Stack

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| Node.js | v20 LTS | Runtime |
| Express | v4 | HTTP Framework |
| TypeScript | v5 | Type Safety |
| TypeORM | v0.3 | ORM cho PostgreSQL |
| PostgreSQL | v16 | Database |
| JWT + bcrypt | - | Authentication |
| Zod | v3 | Input Validation |
| Winston | v3 | Logging |
| Swagger UI | v5 | API Documentation |

## Cấu trúc dự án

```
src/
├── config/          # Cấu hình: DB, Env, Swagger
├── modules/         # Modules theo tính năng
│   ├── auth/        # Đăng nhập, đăng ký, JWT
│   ├── patients/    # Quản lý hồ sơ bệnh nhân
│   ├── doctors/     # Quản lý bác sĩ
│   ├── appointments/# Đặt lịch, QR check-in
│   ├── examinations/# Kết quả khám (EMR)
│   └── billing/     # Hóa đơn thanh toán
├── models/          # TypeORM Entities
├── middlewares/     # JWT Auth, Role Guard, Logger, Validate
├── utils/           # ApiResponse, Logger, Pagination
├── exceptions/      # AppError, GlobalErrorHandler
└── app.ts           # Entry point
```

## Hướng dẫn chạy

### 1. Yêu cầu
- Node.js v20+
- Docker Desktop

### 2. Cài đặt dependencies
```bash
cd clinic-api
npm install
```

### 3. Khởi động Database
```bash
docker-compose up -d
```

### 4. Cấu hình môi trường
```bash
cp .env.example .env
# File .env đã được cấu hình sẵn, không cần chỉnh
```

### 5. Chạy server (development)
```bash
npm run dev
```

Server khởi động tại: http://localhost:3000  
Swagger Docs: http://localhost:3000/api-docs  
Health Check: http://localhost:3000/health

## API Endpoints

### Auth
| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | /api/v1/auth/register | Đăng ký | Public |
| POST | /api/v1/auth/login | Đăng nhập | Public |
| POST | /api/v1/auth/refresh | Làm mới token | Public |
| POST | /api/v1/auth/logout | Đăng xuất | Bearer |
| GET | /api/v1/auth/profile | Thông tin tài khoản | Bearer |

### Appointments
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | /api/v1/appointments | Danh sách lịch hẹn | All |
| POST | /api/v1/appointments | Đặt lịch | Patient, Receptionist |
| GET | /api/v1/appointments/:id | Chi tiết | All |
| PATCH | /api/v1/appointments/:id/status | Cập nhật trạng thái | Doctor, Receptionist |
| POST | /api/v1/appointments/checkin/:code | QR Check-in | Receptionist |

### Doctors
| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | /api/v1/doctors | Danh sách bác sĩ | Public |
| GET | /api/v1/doctors/:id | Chi tiết | Public |
| GET | /api/v1/doctors/:id/schedule | Lịch làm việc | Public |

### Examinations (EMR)
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | /api/v1/examinations | Nhập kết quả khám | Doctor |
| GET | /api/v1/examinations/:id | Chi tiết | All |

### Billing
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | /api/v1/billing | Tạo hóa đơn | Receptionist |
| GET | /api/v1/billing/:id | Chi tiết hóa đơn | All |
| PATCH | /api/v1/billing/:id/pay | Xác nhận thanh toán | Receptionist |

## Phân quyền (Roles)

```
PATIENT      → Đặt lịch, xem lịch của mình, xem hồ sơ bản thân
DOCTOR       → Xem lịch của mình, nhập kết quả khám
RECEPTIONIST → Quản lý lịch hẹn, check-in QR, tạo hóa đơn
ADMIN        → Toàn quyền
```

## Scripts

```bash
npm run dev       # Chạy development với hot-reload
npm run build     # Build TypeScript → JavaScript
npm run start     # Chạy production build
npm run lint      # Kiểm tra lỗi ESLint
npm run lint:fix  # Tự sửa lỗi ESLint
npm run format    # Format code với Prettier
```
