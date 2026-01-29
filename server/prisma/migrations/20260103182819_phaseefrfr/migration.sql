/*
  Warnings:

  - You are about to drop the column `delivered_at` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `failed_delivery_attempts` on the `orders` table. All the data in the column will be lost.
  - The values [READY_TO_PICK,PICKED_UP,IN_TRANSIT,OUT_FOR_DELIVERY,DELIVERED,RETURN_REQUESTED,RETURN_IN_TRANSIT,RETURNED] on the enum `orders_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `proofUrl` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `qrReference` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedAt` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedBy` on the `payments` table. All the data in the column will be lost.
  - The values [VERIFICATION_REQUIRED] on the enum `payments_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `orders` DROP COLUMN `delivered_at`,
    DROP COLUMN `failed_delivery_attempts`,
    MODIFY `status` ENUM('CREATED', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'PAID', 'READY_TO_PACK', 'PACKED', 'CANCELLED') NOT NULL DEFAULT 'CREATED';

-- AlterTable
ALTER TABLE `payments` DROP COLUMN `proofUrl`,
    DROP COLUMN `qrReference`,
    DROP COLUMN `verifiedAt`,
    DROP COLUMN `verifiedBy`,
    MODIFY `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `shipments` ADD COLUMN `delivered_at` DATETIME(3) NULL,
    ADD COLUMN `failed_delivery_attempts` INTEGER NOT NULL DEFAULT 0;
