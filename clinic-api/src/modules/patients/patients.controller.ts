/**
 * @file src/modules/patients/patients.controller.ts
 * @description HTTP Controller cho Patients module
 */

import { Request, Response } from 'express';
import { PatientsService } from './patients.service';
import { ApiResponse } from '../../utils/ApiResponse';
import type {
  CreatePatientDto,
  UpdatePatientDto,
  PatientQueryDto,
  QuickLookupQueryDto,
} from './patients.dto';

const patientsService = new PatientsService();

/**
 * @swagger
 * tags:
 *   name: Patients
 *   description: Quản lý hồ sơ bệnh nhân
 */
export class PatientsController {
  /**
   * @swagger
   * /patients/lookup:
   *   get:
   *     summary: Tra cứu nhanh hồ sơ bệnh nhân theo SĐT, Mã BN hoặc CCCD
   *     tags: [Patients]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: phone
   *         schema:
   *           type: string
   *         description: Số điện thoại bệnh nhân
   *       - in: query
   *         name: code
   *         schema:
   *           type: string
   *         description: Mã định danh bệnh nhân (VD BN-202412-0001)
   *       - in: query
   *         name: idCard
   *         schema:
   *           type: string
   *         description: Số CCCD hoặc CMND
   *     responses:
   *       200:
   *         description: Tìm thấy hồ sơ bệnh nhân
   *       404:
   *         description: Không tìm thấy hồ sơ phù hợp
   */
  async quickLookup(req: Request, res: Response): Promise<void> {
    const patient = await patientsService.quickLookup(req.query as unknown as QuickLookupQueryDto);
    ApiResponse.success(res, patient, 'Tra cứu thông tin bệnh nhân thành công');
  }

  /**
   * @swagger
   * /patients/me:
   *   get:
   *     summary: Lấy hồ sơ của bệnh nhân đang đăng nhập
   *     tags: [Patients]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Thành công
   *       404:
   *         description: Không tìm thấy hồ sơ
   */
  async findMe(req: Request, res: Response): Promise<void> {
    const patient = await patientsService.findMe(req.user!);
    ApiResponse.success(res, patient, 'Lấy hồ sơ bệnh nhân thành công');
  }

  /**
   * @swagger
   * /patients:
   *   get:
   *     summary: Lấy danh sách bệnh nhân (có phân trang & lọc)
   *     tags: [Patients]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Danh sách bệnh nhân
   */
  async findAll(req: Request, res: Response): Promise<void> {
    const result = await patientsService.findAll(req.query as unknown as PatientQueryDto);
    ApiResponse.success(res, result.data, 'Lấy danh sách bệnh nhân thành công', 200, result.meta);
  }

  /**
   * @swagger
   * /patients/{id}:
   *   get:
   *     summary: Lấy chi tiết hồ sơ bệnh nhân theo ID
   *     tags: [Patients]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Thành công
   *       404:
   *         description: Không tìm thấy
   */
  async findById(req: Request, res: Response): Promise<void> {
    const patient = await patientsService.findById(req.params.id, req.user);
    ApiResponse.success(res, patient, 'Lấy chi tiết hồ sơ bệnh nhân thành công');
  }

  /**
   * @swagger
   * /patients:
   *   post:
   *     summary: Tạo mới hồ sơ bệnh nhân (Dành cho Tiếp tân / Admin tại quầy)
   *     tags: [Patients]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreatePatientDto'
   *     responses:
   *       201:
   *         description: Tạo hồ sơ thành công
   *       409:
   *         description: Trùng số điện thoại hoặc CCCD/CMND
   */
  async create(req: Request, res: Response): Promise<void> {
    const patient = await patientsService.create(req.body as CreatePatientDto, req.user);
    ApiResponse.created(res, patient, 'Tạo hồ sơ bệnh nhân thành công');
  }

  /**
   * @swagger
   * /patients/{id}:
   *   patch:
   *     summary: Cập nhật hồ sơ bệnh nhân
   *     tags: [Patients]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdatePatientDto'
   *     responses:
   *       200:
   *         description: Cập nhật thành công
   *       409:
   *         description: Trùng số điện thoại hoặc CCCD/CMND
   */
  async update(req: Request, res: Response): Promise<void> {
    const updated = await patientsService.update(
      req.params.id,
      req.body as UpdatePatientDto,
      req.user,
    );
    ApiResponse.success(res, updated, 'Cập nhật hồ sơ bệnh nhân thành công');
  }

  /**
   * @swagger
   * /patients/{id}:
   *   delete:
   *     summary: Vô hiệu hóa hồ sơ bệnh nhân (Admin)
   *     tags: [Patients]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Xóa thành công
   */
  async delete(req: Request, res: Response): Promise<void> {
    await patientsService.delete(req.params.id);
    ApiResponse.success(res, null, 'Vô hiệu hóa hồ sơ bệnh nhân thành công');
  }
}
