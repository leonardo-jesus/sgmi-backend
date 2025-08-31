-- CreateEnum
CREATE TYPE "public"."ProductType" AS ENUM ('amanteigado', 'doce', 'floco');

-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "type" "public"."ProductType" NOT NULL DEFAULT 'amanteigado';
