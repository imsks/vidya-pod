-- AlterTable
ALTER TABLE "sponsor_orders" ADD COLUMN "learner_id" UUID;

-- CreateIndex
CREATE INDEX "sponsor_orders_learner_id_idx" ON "sponsor_orders"("learner_id");

-- AddForeignKey
ALTER TABLE "sponsor_orders" ADD CONSTRAINT "sponsor_orders_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
