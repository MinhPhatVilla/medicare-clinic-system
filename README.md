# 🏥 MediCare - Hệ Thống Quản Lý Đặt Lịch & Quy Trình Khám Bệnh

[![CI - MediCare Monorepo](https://github.com/ptit-team/medicare-system/actions/workflows/ci.yml/badge.svg)](https://github.com/ptit-team/medicare-system/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.x%20%7C%2020.x-339933?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose%20v2-2496ED?logo=docker)](https://www.docker.com/)

---

## 📌 1. Giới Thiệu Tổng Quan (Overview)

**MediCare** là giải pháp phần mềm toàn diện phục vụ quản lý quy trình khám chữa bệnh tại các phòng khám đa khoa và chuyên khoa tư nhân. Hệ thống được xây dựng nhằm giải quyết bài toán quá tải tiếp đón, tối ưu hóa điều phối lịch hẹn bác sĩ, số hóa bệnh án và minh bạch hóa quy trình thanh toán viện phí.

### 🌟 Tính Năng Cốt Lõi
- **Cổng Bệnh nhân (Patient Portal):** Tra cứu chuyên khoa, tìm kiếm bác sĩ theo khung giờ, đặt lịch khám trực tuyến, theo dõi trạng thái tiếp nhận và hồ sơ sức khỏe cá nhân.
- **Phân hệ Tiếp tân (Receptionist Desk):** Check-in tiếp đón bệnh nhân tại quầy, cấp số thứ tự tự động, phân luồng vào phòng khám, tạo phiếu khám và thu phí dịch vụ.
- **Bàn làm việc Bác sĩ (Doctor Station):** Xem danh sách hàng đợi khám theo thời gian thực, nhập thông tin chẩn đoán ICD, kê đơn thuốc và chỉ định cận lâm sàng.
- **Bảng điều khiển Quản trị (Admin Dashboard):** Quản lý danh mục chuyên khoa, lịch làm việc bác sĩ, dịch vụ khám, thống kê doanh thu và lưu lượng khám bệnh theo biểu đồ trực quan.

---

## 🏗️ 2. Sơ Đồ Cấu Trúc Monorepo (Repository Structure)

Dự án được tổ chức theo tiêu chuẩn **Monorepo & Microservices / Modular Architecture**, hỗ trợ quản lý tập trung mã nguồn, chia sẻ thư viện và triển khai linh hoạt:

```plaintext
medicare-clinic-system/
│
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI (tự động Lint & Build khi PR/push main)
│
├── apps/                          # [Monorepo Apps] Các ứng dụng Frontend & Mobile Client
│   ├── web/                       # (Dự kiến) Next.js Web Portal cho bệnh nhân & quản trị
│   └── mobile/                    # (Dự kiến) Flutter App đặt lịch khám trên iOS/Android
│
├── services/                      # [Microservices] Các backend service độc lập
│   ├── api-gateway/               # (Dự kiến) Entry point điều hướng routing, rate limiting
│   ├── auth-service/              # (Dự kiến) Xác thực & phân quyền JWT
│   └── appointment-service/       # (Dự kiến) Quản lý đặt lịch và phân bổ ca khám
│
├── packages/                      # [Shared Libraries] Thư viện và module dùng chung
│   ├── common/                    # Kiểu dữ liệu, constants, mã lỗi dùng chung
│   ├── types/                     # TypeScript Interfaces & DTOs
│   └── eslint-config/             # Cấu hình linter chuẩn toàn hệ thống
│
├── infrastructure/                # [Hạ tầng & Triển khai]
│   └── docker/
│       ├── docker-compose.infra.yml # Cấu hình container Database & Caching
│       └── init-scripts/          # Scripts SQL khởi tạo schema & UUID extension
│           └── init.sql
│
├── docs/                          # [Tài liệu dự án]
│   └── architecture.md            # Tài liệu đặc tả kiến trúc hệ thống
│
├── clinic-api/                    # [Backend Service Hiện Hành - Express + TS + TypeORM]
│   ├── src/
│   │   ├── config/                # Cấu hình DataSource, Environment, Logger
│   │   ├── database/
│   │   │   ├── entities/          # 6 TypeORM Entities (User, Patient, Doctor, Appointment, ...)
│   │   │   ├── migrations/        # TypeORM Migrations
│   │   │   └── seeds/             # Dữ liệu mẫu khởi tạo hệ thống
│   │   ├── exceptions/            # Bộ xử lý ngoại lệ tập trung (Global Exception Filter)
│   │   ├── middlewares/           # Auth, Error Handler, Logging, Request Validator
│   │   ├── modules/               # Modular Architecture (Auth, Patients, Doctors, Appointments, ...)
│   │   │   └── [feature]/
│   │   │       ├── controller.ts
│   │   │       ├── service.ts
│   │   │       └── routes.ts
│   │   └── utils/                 # ApiResponse, Token, Password helpers
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
├── clinic-web/                    # [Frontend Client Hiện Hành - SPA]
│   ├── css/                       # Hệ thống CSS Glassmorphism hiện đại
│   ├── js/                        # Luồng nghiệp vụ JavaScript SPA tương tác
│   ├── index.html                 # Giao diện đặt lịch và Dashboard 4 vai trò
│   └── Bao Cao Do An CNPM.docx    # Báo cáo đồ án phân tích thiết kế hệ thống
│
├── .editorconfig                  # Quy chuẩn format editor thống nhất (TS, JS, Dart, HTML, CSS)
├── .prettierrc                    # Cấu hình Prettier code formatting
├── .gitignore                     # Bỏ qua node_modules, build output, secret keys
├── docker-compose.yml             # Khởi chạy toàn bộ hạ tầng CSDL bằng 1 lệnh duy nhất
├── LICENSE                        # Giấy phép phần mềm MIT License
├── package.json                   # Root package.json quản lý workspaces
└── README.md                      # Tài liệu hướng dẫn dự án chuẩn
```

---

## ⚙️ 3. Yêu Cầu Môi Trường (Prerequisites)

Trước khi cài đặt và khởi chạy hệ thống, đảm bảo môi trường phát triển của bạn đã cài đặt các công cụ sau:

- **Node.js**: Phiên bản `18.x` hoặc `20.x LTS` ([Tải tại đây](https://nodejs.org/))
- **NPM**: Phiên bản `9.x` trở lên (đi kèm với Node.js)
- **Docker Desktop**: Hỗ trợ Docker Compose v2 ([Tải tại đây](https://www.docker.com/products/docker-desktop/))
- **Git**: Quản lý phiên bản mã nguồn ([Tải tại đây](https://git-scm.com/))
- *(Tùy chọn)* **Flutter SDK**: Phiên bản `>= 3.19` (nếu phát triển ứng dụng di động)

---

## 🚀 4. Hướng Dẫn Cài Đặt & Khởi Chạy Local (Quickstart Guide)

### Bước 1: Clone Repository
```bash
git clone https://github.com/ptit-team/medicare-system.git
cd medicare-system
```

### Bước 2: Khởi động Hạ tầng Cơ sở dữ liệu (PostgreSQL & pgAdmin)
Tại thư mục gốc dự án, chỉ cần chạy 1 lệnh duy nhất:
```bash
# Khởi chạy PostgreSQL 16 và pgAdmin 4 dưới nền
docker compose up -d
```

> **Thông tin kết nối mặc định:**
> - **PostgreSQL**: `localhost:5432` | DB: `medicare_db` | User: `medicare_user` | Password: `medicare_pass_2024`
> - **pgAdmin 4**: [http://localhost:5050](http://localhost:5050) | Email: `admin@medicare.local` | Password: `admin123`

### Bước 3: Cài đặt biến môi trường Backend
Di chuyển vào thư mục `clinic-api` và sao chép cấu hình từ file mẫu:
```bash
cd clinic-api
cp .env.example .env
```
*(Trên Windows PowerShell, bạn có thể dùng lệnh: `copy .env.example .env`)*

### Bước 4: Cài đặt thư viện phụ thuộc & Khởi chạy Backend
```bash
# Cài đặt dependencies
npm install

# Khởi chạy máy chủ API ở chế độ phát triển (Development Mode)
npm run dev
```

Máy chủ Backend sẽ tự động kết nối Database, đồng bộ bảng (auto-sync) và sẵn sàng tại:
- **API Base URL**: `http://localhost:5000`
- **Kiểm tra trạng thái (Healthcheck)**: `http://localhost:5000/api/v1/health`

### Bước 5: Nạp dữ liệu mẫu (Seed Data)
Để có sẵn dữ liệu quản trị viên, bác sĩ, bệnh nhân và lịch khám thử nghiệm:
```bash
npm run seed
```

### Bước 6: Khởi chạy Giao diện Frontend (clinic-web)
Mở file `clinic-web/index.html` trực tiếp trên trình duyệt hoặc sử dụng extension Live Server (VS Code):
- Hỗ trợ đầy đủ trải nghiệm 4 vai trò: Bệnh nhân, Tiếp tân, Bác sĩ và Quản trị viên.

---

## 📋 5. Bảng Phân Công Nhiệm Vụ Thành Viên (Team Assignment)

| STT | Thành Viên | Vai Trò | Nhiệm Vụ Đảm Nhận | Trạng Thái |
|:---:|:---|:---|:---|:---:|
| 1 | **Nguyễn Văn A (Trưởng nhóm)** | Fullstack Lead / Kiến trúc | Thiết kế kiến trúc hệ thống, cấu hình Monorepo, thiết lập CI/CD pipeline, phát triển Authentication & Authorization module. | Hoàn thành |
| 2 | **Trần Thị B** | Frontend Web Developer | Xây dựng giao diện Web SPA `clinic-web`, hệ thống Design System Glassmorphism, luồng đặt lịch khám cho bệnh nhân. | Hoàn thành |
| 3 | **Lê Văn C** | Backend Developer | Xây dựng RESTful API (`clinic-api`), thiết kế cơ sở dữ liệu PostgreSQL (TypeORM), xử lý logic ca khám, phân bổ bác sĩ & kê đơn. | Hoàn thành |
| 4 | **Phạm Minh D** | Mobile / UI-UX Developer | Thiết kế UI/UX trên Figma, phát triển nguyên mẫu ứng dụng di động Flutter (`apps/mobile`), kiểm thử giao diện người dùng. | Đang tiến hành |
| 5 | **Hoàng Thị E** | DevOps & QA / Tester | Cấu hình Docker hạ tầng, viết tài liệu kiểm thử (Test Cases), soạn thảo Báo cáo phân tích thiết kế hệ thống thông tin. | Hoàn thành |

---

## 🔒 6. Giấy Phép (License)

Dự án được phát hành theo giấy phép **[MIT License](LICENSE)**. Toàn quyền sử dụng, sửa đổi và phân phối phục vụ mục đích học tập và nghiên cứu.
