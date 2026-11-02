ALTER TABLE "sponsor_orders" ADD COLUMN "payment_order_id" TEXT;

UPDATE "sponsor_orders" SET "payment_order_id" = "order_id";

ALTER TABLE "sponsor_orders" ALTER COLUMN "payment_order_id" SET NOT NULL;

CREATE INDEX "sponsor_orders_payment_order_id_idx" ON "sponsor_orders"("payment_order_id");
