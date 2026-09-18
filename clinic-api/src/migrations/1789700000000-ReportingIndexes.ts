import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportingIndexes1789700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'MANAGER'`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON invoices (paid_at) WHERE status = 'PAID'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_examinations_completed_at ON examinations (completed_at, doctor_id) WHERE status = 'COMPLETED'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_prescriptions_dispensed_at ON prescriptions (dispensed_at) WHERE dispensing_status = 'DISPENSED' AND payment_status = 'PAID'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_service_orders_status_created ON service_orders (status, created_at)`,
    );
    for (const [name, expression] of [
      [
        'chk_schedule_capacity',
        'booked_patients >= 0 AND max_patients > 0 AND slot_duration_minutes > 0',
      ],
      ['chk_schedule_time', 'start_time < end_time'],
    ]) {
      const existing = await queryRunner.query(
        'SELECT 1 FROM pg_constraint WHERE conname = $1 AND conrelid = $2::regclass',
        [name, 'doctor_schedules'],
      );
      if (!existing.length)
        await queryRunner.query(
          `ALTER TABLE doctor_schedules ADD CONSTRAINT "${name}" CHECK (${expression})`,
        );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const name of [
      'idx_invoices_paid_at',
      'idx_examinations_completed_at',
      'idx_prescriptions_dispensed_at',
      'idx_service_orders_status_created',
    ]) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${name}"`);
    }
    await queryRunner.query(
      'ALTER TABLE doctor_schedules DROP CONSTRAINT IF EXISTS chk_schedule_capacity, DROP CONSTRAINT IF EXISTS chk_schedule_time',
    );
    // PostgreSQL enum labels are retained so existing manager accounts remain valid.
  }
}
