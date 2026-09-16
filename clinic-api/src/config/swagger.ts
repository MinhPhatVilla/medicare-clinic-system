/**
 * @file src/config/swagger.ts
 * @description Cấu hình Swagger UI để tự động generate API documentation
 *
 * Kiến trúc: swagger-jsdoc đọc JSDoc comment trong các file controller
 * và tự động tạo tài liệu API chuẩn OpenAPI 3.0.
 * Truy cập tại: http://localhost:3000/api-docs
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { env } from './env';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MediCare Clinic API',
      version: '1.0.0',
      description: `
# Hệ thống Quản lý Đặt lịch và Quy trình Khám bệnh — MediCare

## Mô tả
API phục vụ hệ thống quản lý phòng khám, bao gồm:
- Đặt lịch khám trực tuyến
- Quản lý hồ sơ bệnh nhân
- Quy trình khám bệnh (EMR)
- Thanh toán và xuất hóa đơn

## Xác thực
Sử dụng Bearer JWT Token. Đăng nhập qua \`POST /api/v1/auth/login\`
để nhận token, sau đó nhập vào nút **Authorize** bên trên.

## Phân quyền (Roles)
- \`PATIENT\` — Bệnh nhân
- \`DOCTOR\` — Bác sĩ
- \`RECEPTIONIST\` — Tiếp tân/Thu ngân
- \`ADMIN\` — Quản trị viên
      `,
      contact: {
        name: 'Nhóm 5 — PTIT',
        email: 'group5@ptit.edu.vn',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        // JWT Bearer Token authentication
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  // Quét JSDoc comment trong tất cả file controller
  apis: ['./src/modules/**/*.controller.ts', './src/modules/**/*.dto.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Đăng ký Swagger UI vào Express app
 * @param app - Express application instance
 */
export const setupSwagger = (app: Express): void => {
  // Serve Swagger JSON spec tại /api-docs.json
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve Swagger UI tại /api-docs
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'MediCare API Docs',
      customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
    }),
  );

  console.info(`📚 Swagger UI: http://localhost:${env.PORT}/api-docs`);
};
