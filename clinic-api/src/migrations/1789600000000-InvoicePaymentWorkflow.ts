import { MigrationInterface, QueryRunner, TableCheck, TableForeignKey } from 'typeorm';

export class InvoicePaymentWorkflow1789600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE invoices_payment_method_enum ADD VALUE IF NOT EXISTS 'POS_CARD'`,
    );
    await queryRunner.query(`ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'PHARMACIST'`);
    await queryRunner.query(`ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS transaction_code varchar(40),
      ADD COLUMN IF NOT EXISTS payment_reference varchar(100),
      ADD COLUMN IF NOT EXISTS prepaid_amount numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discharged_at timestamp,
      ADD COLUMN IF NOT EXISTS discharged_by_user_id uuid`);
    await queryRunner.query(
      `ALTER TABLE invoices ALTER COLUMN paid_by_user_id TYPE uuid USING NULLIF(paid_by_user_id::text, '')::uuid`,
    );
    await queryRunner.query(`UPDATE invoices SET transaction_code = 'OLD-' || replace(id::text, '-', '')
      WHERE status = 'PAID' AND transaction_code IS NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_transaction_code ON invoices(transaction_code)`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoice_examination_id`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_invoice_examination_id ON invoices(examination_id)`,
    );

    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE prescriptions_payment_status_enum AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE prescriptions_dispensing_status_enum AS ENUM
        ('WAITING_PAYMENT', 'READY_TO_PREPARE', 'PREPARING', 'READY_TO_DISPENSE', 'DISPENSED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`ALTER TABLE prescriptions
      ADD COLUMN IF NOT EXISTS payment_status prescriptions_payment_status_enum NOT NULL DEFAULT 'PENDING_PAYMENT',
      ADD COLUMN IF NOT EXISTS dispensing_status prescriptions_dispensing_status_enum NOT NULL DEFAULT 'WAITING_PAYMENT',
      ADD COLUMN IF NOT EXISTS paid_invoice_id uuid,
      ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamp,
      ADD COLUMN IF NOT EXISTS pharmacy_notified_at timestamp,
      ADD COLUMN IF NOT EXISTS dispensed_at timestamp,
      ADD COLUMN IF NOT EXISTS dispensed_by_user_id uuid`);
    for (const [index, column] of [
      ['idx_rx_payment_status', 'payment_status'],
      ['idx_rx_dispensing_status', 'dispensing_status'],
      ['idx_rx_paid_invoice_id', 'paid_invoice_id'],
    ]) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "${index}" ON prescriptions("${column}")`,
      );
    }

    const checks: Record<string, Record<string, string>> = {
      invoices: {
        chk_invoice_amounts_non_negative:
          '"consultation_fee" >= 0 AND "service_fee" >= 0 AND "medicine_fee" >= 0 AND "insurance_covered" >= 0 AND "discount_amount" >= 0 AND "total_amount" >= 0',
        chk_invoice_deductions_not_exceed_subtotal:
          '"insurance_covered" + "discount_amount" <= "consultation_fee" + "service_fee" + "medicine_fee"',
        chk_invoice_total_matches_components:
          '"total_amount" = "consultation_fee" + "service_fee" + "medicine_fee" - "insurance_covered" - "discount_amount"',
        chk_invoice_prepaid_amount: '"prepaid_amount" >= 0 AND "prepaid_amount" <= "total_amount"',
        chk_invoice_paid_requires_payment_metadata: `"status" <> 'PAID' OR ("payment_method" IS NOT NULL AND "paid_at" IS NOT NULL AND "paid_by_user_id" IS NOT NULL AND "transaction_code" IS NOT NULL)`,
        chk_invoice_discharge_requires_payment: `"discharged_at" IS NULL OR ("status" = 'PAID' AND "discharged_by_user_id" IS NOT NULL)`,
      },
      prescriptions: {
        chk_rx_paid_metadata: `"payment_status" <> 'PAID' OR ("paid_invoice_id" IS NOT NULL AND "payment_confirmed_at" IS NOT NULL AND "pharmacy_notified_at" IS NOT NULL)`,
        chk_rx_dispensing_requires_payment: `"dispensing_status" IN ('WAITING_PAYMENT', 'CANCELLED') OR "payment_status" = 'PAID'`,
        chk_rx_dispensed_metadata: `"dispensing_status" <> 'DISPENSED' OR ("dispensed_at" IS NOT NULL AND "dispensed_by_user_id" IS NOT NULL)`,
      },
    };
    for (const [tableName, constraints] of Object.entries(checks)) {
      const table = await queryRunner.getTable(tableName);
      for (const [name, expression] of Object.entries(constraints)) {
        if (!table?.checks.some((check) => check.name === name)) {
          await queryRunner.createCheckConstraint(tableName, new TableCheck({ name, expression }));
        }
      }
    }
    for (const [tableName, column, target] of [
      ['invoices', 'paid_by_user_id', 'users'],
      ['invoices', 'discharged_by_user_id', 'users'],
      ['prescriptions', 'paid_invoice_id', 'invoices'],
      ['prescriptions', 'dispensed_by_user_id', 'users'],
    ]) {
      const table = await queryRunner.getTable(tableName);
      if (!table?.foreignKeys.some((key) => key.columnNames.includes(column))) {
        await queryRunner.createForeignKey(
          tableName,
          new TableForeignKey({
            columnNames: [column],
            referencedTableName: target,
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
        );
      }
    }
  }

  async down(): Promise<void> {
    throw new Error(
      'Payment audit data must be retained. Restore a reviewed backup to roll back this migration.',
    );
  }
}
