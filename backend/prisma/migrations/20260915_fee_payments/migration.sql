-- Fee billing: title + due date on fees, payment ledger per fee.
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT 'Fee';
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP(3);
CREATE TABLE IF NOT EXISTS "fee_payments" (
  "id" TEXT NOT NULL,
  "fee_id" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "received_by" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "fee_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "fee_payments_fee_id_idx" ON "fee_payments"("fee_id");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fee_payments_fee_id_fkey') THEN
    ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_fee_id_fkey"
      FOREIGN KEY ("fee_id") REFERENCES "fees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
