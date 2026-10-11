-- AlterTable
ALTER TABLE "sponsor_orders" ADD COLUMN "share_slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sponsor_orders_share_slug_key" ON "sponsor_orders"("share_slug");
