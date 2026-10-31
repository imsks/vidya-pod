-- AlterTable
ALTER TABLE "learners" ADD COLUMN "sponsorship_ends_at" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "learners_sponsor_id_sponsorship_ends_at_idx" ON "learners"("sponsor_id", "sponsorship_ends_at");
