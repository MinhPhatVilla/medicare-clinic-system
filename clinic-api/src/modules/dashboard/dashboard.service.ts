import { DataSource, EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { DashboardQueryDto, dashboardRange } from './dashboard.dto';
import { dashboardQueries } from './dashboard.queries';

type AggregateRow = Record<string, string>;
type Series = { key: string; label: string; data: number[] };
type Chart = { labels: string[]; series: Series[]; totals: Record<string, number> };
const revenueLabels = {
  consultation: 'Tiền khám',
  services: 'Tiền xét nghiệm / CLS',
  medicine: 'Tiền thuốc',
  insurance: 'BHYT',
  discount: 'Giảm giá',
  net: 'Doanh thu sau giảm trừ',
  prepaid: 'Đã thu trước',
  invoices: 'Hóa đơn',
};
const visitLabels = {
  completed: 'Đã khám',
  cancelled: 'Hủy khám',
  waiting: 'Đang chờ',
  inProgress: 'Đang khám',
  noShow: 'Không đến',
};

function chart(rows: AggregateRow[], fields: Record<string, string>): Chart {
  return {
    labels: rows.map((row) => row.label),
    series: Object.entries(fields).map(([key, label]) => ({
      key,
      label,
      data: rows.map((row) => Number(row[key])),
    })),
    totals: Object.fromEntries(
      Object.keys(fields).map((key) => [
        key,
        Math.round(rows.reduce((sum, row) => sum + Number(row[key]), 0) * 100) / 100,
      ]),
    ),
  };
}

export class DashboardService {
  constructor(private dataSource: DataSource = AppDataSource) {}

  private parameters(query: DashboardQueryDto): unknown[] {
    const { from, to } = dashboardRange(query);
    return [from, to, query.period, query.doctorId || null];
  }

  private metadata(query: DashboardQueryDto) {
    return {
      ...dashboardRange(query),
      period: query.period,
      doctorId: query.doctorId || null,
      currency: 'VND',
      timeZone: 'Asia/Ho_Chi_Minh',
      revenueBasis: 'PAID_AT',
      visitsBasis: 'APPOINTMENT_DATE',
      clinicalBasis: 'COMPLETED_AT',
      medicinesBasis: 'DISPENSED_AT',
    };
  }

  async revenue(query: DashboardQueryDto, manager = this.dataSource.manager) {
    const rows: AggregateRow[] = await manager.query(
      dashboardQueries.revenue,
      this.parameters(query),
    );
    const result = chart(rows, revenueLabels);
    result.totals.gross =
      result.totals.consultation + result.totals.services + result.totals.medicine;
    result.totals.settlementCash = result.totals.net - result.totals.prepaid;
    return { meta: this.metadata(query), ...result };
  }

  async visits(query: DashboardQueryDto, manager = this.dataSource.manager) {
    const rows: AggregateRow[] = await manager.query(
      dashboardQueries.visits,
      this.parameters(query),
    );
    const result = chart(rows, visitLabels);
    result.totals.total = Object.values(result.totals).reduce((sum, count) => sum + count, 0);
    return { meta: this.metadata(query), ...result };
  }

  async doctors(query: DashboardQueryDto, manager = this.dataSource.manager) {
    const [result] = await manager.query(dashboardQueries.doctors, [
      ...this.parameters(query),
      query.limit,
      (query.page - 1) * query.limit,
    ]);
    return {
      meta: this.metadata(query),
      items: result.items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
      },
    };
  }

  async diagnoses(query: DashboardQueryDto, manager = this.dataSource.manager) {
    const items = await manager.query(dashboardQueries.diagnoses, this.parameters(query));
    return { meta: this.metadata(query), items, totalDiagnosed: items[0]?.totalDiagnosed || 0 };
  }

  async medicines(query: DashboardQueryDto, manager = this.dataSource.manager) {
    const rows: Array<Record<string, string | number>> = await manager.query(
      dashboardQueries.medicines,
      [...this.parameters(query), query.medicineLimit],
    );
    return {
      meta: this.metadata(query),
      items: rows.map((row) => ({
        ...row,
        quantity: Number(row.quantity),
        grossAmount: Number(row.grossAmount),
      })),
    };
  }

  async overview(query: DashboardQueryDto) {
    return this.dataSource.transaction('REPEATABLE READ', async (manager: EntityManager) => {
      await manager.query('SET TRANSACTION READ ONLY');
      const revenue = await this.revenue(query, manager);
      const visits = await this.visits(query, manager);
      const doctors = await this.doctors(query, manager);
      const diagnoses = await this.diagnoses(query, manager);
      const medicines = await this.medicines(query, manager);
      return { meta: this.metadata(query), revenue, visits, doctors, diagnoses, medicines };
    });
  }
}
