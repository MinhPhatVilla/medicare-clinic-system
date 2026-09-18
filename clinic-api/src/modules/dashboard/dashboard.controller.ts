import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { DashboardQueryDto } from './dashboard.dto';
import { DashboardService } from './dashboard.service';

export class DashboardController {
  constructor(private service = new DashboardService()) {}

  report =
    (name: 'overview' | 'revenue' | 'visits' | 'doctors' | 'diagnoses' | 'medicines') =>
    async (req: Request, res: Response): Promise<Response> => {
      const data = await this.service[name](req.query as unknown as DashboardQueryDto);
      res.setHeader('Cache-Control', 'no-store');
      return ApiResponse.success(res, data, 'Thống kê Dashboard');
    };
}
