-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('operator', 'manager', 'director');

-- CreateEnum
CREATE TYPE "public"."ProductUnit" AS ENUM ('kg', 'un');

-- CreateEnum
CREATE TYPE "public"."Shift" AS ENUM ('morning', 'afternoon', 'night');

-- CreateEnum
CREATE TYPE "public"."ProductionPlanStatus" AS ENUM ('pending', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "public"."BatchStatus" AS ENUM ('planned', 'in_progress', 'paused', 'completed', 'stopped');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "public"."ProductUnit" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."production_plans" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "planned_quantity" DECIMAL(14,3) NOT NULL,
    "shift" "public"."Shift" NOT NULL,
    "planned_date" DATE NOT NULL,
    "status" "public"."ProductionPlanStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batches" (
    "id" TEXT NOT NULL,
    "production_plan_id" TEXT NOT NULL,
    "batch_number" INTEGER NOT NULL,
    "status" "public"."BatchStatus" NOT NULL DEFAULT 'planned',
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "pause_duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "estimated_kg" DECIMAL(14,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."production_entries" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "shift" "public"."Shift" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "public"."refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "products_name_key" ON "public"."products"("name");

-- CreateIndex
CREATE INDEX "production_plans_planned_date_shift_idx" ON "public"."production_plans"("planned_date", "shift");

-- CreateIndex
CREATE INDEX "production_plans_product_id_idx" ON "public"."production_plans"("product_id");

-- CreateIndex
CREATE INDEX "production_plans_status_idx" ON "public"."production_plans"("status");

-- CreateIndex
CREATE INDEX "batches_production_plan_id_idx" ON "public"."batches"("production_plan_id");

-- CreateIndex
CREATE INDEX "batches_status_idx" ON "public"."batches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "batches_production_plan_id_batch_number_key" ON "public"."batches"("production_plan_id", "batch_number");

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."production_plans" ADD CONSTRAINT "production_plans_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batches" ADD CONSTRAINT "batches_production_plan_id_fkey" FOREIGN KEY ("production_plan_id") REFERENCES "public"."production_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."production_entries" ADD CONSTRAINT "production_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
