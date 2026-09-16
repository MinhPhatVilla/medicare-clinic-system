# Kiến Trúc Hệ Thống MediCare (Architecture Overview)

## 1. Định hướng kiến trúc
Hệ thống **MediCare** được thiết kế theo mô hình **Monorepo / Modular Monolith tiến tới Microservices**:
- Hiện tại: Mô hình Modular Monolith hoàn chỉnh với backend tách module độc lập (`clinic-api`), frontend SPA (`clinic-web`), hạ tầng cơ sở dữ liệu (`infrastructure/`).
- Lộ trình: Dễ dàng bóc tách các module (Auth, Appointment, Patient, Billing, Examination) thành các microservices riêng lẻ dưới thư mục `services/` hoặc `apps/` mà không phải thay đổi cấu trúc cốt lõi.

## 2. Phân chia thư mục chuẩn
| Thư mục | Chức năng chính |
|---|---|
| `apps/` | Các ứng dụng Client (Web Portal, Admin Dashboard, Mobile App Flutter) |
| `services/` | Các Microservices chuyên biệt (Auth Service, Appointment Service, Billing Service, API Gateway) |
| `packages/` | Thư viện dùng chung giữa các services và apps (DTOs, Common Types, Logger, UI Components) |
| `infrastructure/` | Cấu hình hạ tầng phần cứng/mạng/database (Docker, Kubernetes, Nginx, Terraform, Init SQL scripts) |
| `docs/` | Báo cáo, sơ đồ thiết kế UML, tài liệu đặc tả API và hướng dẫn triển khai |
| `clinic-api/` | Backend RESTful API hiện hành (Express + TypeScript + TypeORM + PostgreSQL) |
| `clinic-web/` | Web Client giao diện người dùng hiện hành (HTML5, CSS3 Glassmorphism, JavaScript ES6) |
