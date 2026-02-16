/*
  Warnings:

  - You are about to drop the column `court_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `end_time` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `bookings` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_court_id_fkey";

-- DropIndex
DROP INDEX "bookings_court_id_start_time_end_time_idx";

-- DropIndex
DROP INDEX "bookings_court_id_start_time_key";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "court_id",
DROP COLUMN "end_time",
DROP COLUMN "start_time";

-- CreateTable
CREATE TABLE "booking_slots" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "court_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "price_in_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_slots_booking_id_idx" ON "booking_slots"("booking_id");

-- CreateIndex
CREATE INDEX "booking_slots_court_id_start_time_end_time_idx" ON "booking_slots"("court_id", "start_time", "end_time");

-- CreateIndex
CREATE UNIQUE INDEX "booking_slots_court_id_start_time_key" ON "booking_slots"("court_id", "start_time");

-- AddForeignKey
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
