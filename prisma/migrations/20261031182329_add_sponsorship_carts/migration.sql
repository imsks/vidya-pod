-- CreateEnum
CREATE TYPE "SponsorshipCartStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAID', 'FAILED');

-- AlterTable
ALTER TABLE "sponsor_orders" ADD COLUMN     "cart_id" UUID,
ADD COLUMN     "payment_order_id" TEXT;

-- CreateTable
CREATE TABLE "sponsorship_carts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "status" "SponsorshipCartStatus" NOT NULL DEFAULT 'DRAFT',
    "plan" "SponsorPlanType" NOT NULL DEFAULT 'monthly',
    "order_id" TEXT,
    "checkout_key" TEXT,
    "amount" INTEGER,
    "payment_session_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsorship_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorship_cart_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cart_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsorship_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sponsorship_carts_order_id_key" ON "sponsorship_carts"("order_id");

-- CreateIndex
CREATE INDEX "sponsorship_carts_status_idx" ON "sponsorship_carts"("status");

-- CreateIndex
CREATE INDEX "sponsorship_cart_items_learner_id_idx" ON "sponsorship_cart_items"("learner_id");

-- CreateIndex
CREATE UNIQUE INDEX "sponsorship_cart_items_cart_id_learner_id_key" ON "sponsorship_cart_items"("cart_id", "learner_id");

-- CreateIndex
CREATE INDEX "sponsor_orders_payment_order_id_idx" ON "sponsor_orders"("payment_order_id");

-- CreateIndex
CREATE INDEX "sponsor_orders_cart_id_idx" ON "sponsor_orders"("cart_id");

-- AddForeignKey
ALTER TABLE "sponsor_orders" ADD CONSTRAINT "sponsor_orders_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "sponsorship_carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_cart_items" ADD CONSTRAINT "sponsorship_cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "sponsorship_carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_cart_items" ADD CONSTRAINT "sponsorship_cart_items_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
