CREATE TYPE "ExpenseCategory" AS ENUM (
    'TEACHER_FEE',
    'STUDENT_FEES',
    'STATIONERY',
    'PROCTOR_FEE',
    'OTHER'
);

ALTER TABLE "sponsors"
ADD COLUMN "show_publicly" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "sponsor_orders"
ADD COLUMN "public_acknowledgement_opt_in" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" "ExpenseCategory" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "incurred_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "expenses_incurred_at_idx" ON "expenses"("incurred_at");
