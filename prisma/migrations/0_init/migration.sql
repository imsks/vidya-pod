-- Vidya Pod Database Schema Migration
-- This migration creates all core entity tables for the Vidya Pod application

-- CreateEnum
CREATE TYPE "SponsorOrderStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "SponsorPlanType" AS ENUM ('monthly', 'yearly');

-- CreateTable: sponsors - Individuals or organizations sponsoring learners
CREATE TABLE "sponsors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "organization" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable: learners - Students/learners using the platform
CREATE TABLE "learners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "image_url" TEXT,
    "sponsor_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learners_pkey" PRIMARY KEY ("id")
);

-- CreateTable: teachers - Instructors teaching learners
CREATE TABLE "teachers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: proctors - Proctors overseeing learner activities
CREATE TABLE "proctors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sponsor_orders - Orders/records of sponsorship transactions
CREATE TABLE "sponsor_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "plan" "SponsorPlanType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "SponsorOrderStatus" NOT NULL DEFAULT 'PENDING',
    "payment_session_id" TEXT,
    "sponsor_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsor_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: students - Legacy table (use learners for new development)
CREATE TABLE "students" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Performance indexes for learners
CREATE INDEX "learners_sponsor_id_idx" ON "learners"("sponsor_id");

-- CreateIndex: Unique constraint on sponsor_orders.order_id
CREATE UNIQUE INDEX "sponsor_orders_order_id_key" ON "sponsor_orders"("order_id");

-- CreateIndex: Performance indexes for sponsor_orders
CREATE INDEX "sponsor_orders_sponsor_id_idx" ON "sponsor_orders"("sponsor_id");
CREATE INDEX "sponsor_orders_status_idx" ON "sponsor_orders"("status");

-- AddForeignKey: learners.sponsor_id references sponsors.id
ALTER TABLE "learners" ADD CONSTRAINT "learners_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: sponsor_orders.sponsor_id references sponsors.id
ALTER TABLE "sponsor_orders" ADD CONSTRAINT "sponsor_orders_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
