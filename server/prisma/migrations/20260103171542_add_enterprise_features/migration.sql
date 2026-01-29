/*
  Warnings:

  - You are about to alter the column `status` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `Enum(EnumId(1))`.
  - The values [QR_UPI] on the enum `payments_method` will be removed. If these variants are still used in the database, this will fail.
  - The values [QR_UPI] on the enum `payments_method` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paytm_txn_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idempotencyKey` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `inventory` ADD COLUMN `reserved_qty` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `idempotencyKey` VARCHAR(191) NOT NULL,
    MODIFY `status` ENUM('CREATED', 'PAYMENT_PENDING', 'PAID', 'PAYMENT_FAILED', 'READY_TO_PICK', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURN_IN_TRANSIT', 'RETURNED') NOT NULL DEFAULT 'CREATED',
    MODIFY `paymentMethod` ENUM('COD', 'PAYTM') NOT NULL;

-- AlterTable
ALTER TABLE `payments` ADD COLUMN `cod_attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `cod_otp` VARCHAR(191) NULL,
    ADD COLUMN `cod_verified_at` DATETIME(3) NULL,
    ADD COLUMN `gateway_response` JSON NULL,
    ADD COLUMN `is_remitted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `paytm_status` VARCHAR(191) NULL,
    ADD COLUMN `paytm_txn_id` VARCHAR(191) NULL,
    ADD COLUMN `refund_amount` DECIMAL(10, 2) NULL,
    ADD COLUMN `refund_txn_id` VARCHAR(191) NULL,
    ADD COLUMN `refunded_at` DATETIME(3) NULL,
    ADD COLUMN `remit_reference` VARCHAR(191) NULL,
    ADD COLUMN `remitted_at` DATETIME(3) NULL,
    MODIFY `method` ENUM('COD', 'PAYTM') NOT NULL;

-- CreateTable
CREATE TABLE `reservations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `variantId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'RELEASED', 'FINALIZED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `courier_provider` VARCHAR(191) NOT NULL,
    `waybill` VARCHAR(191) NOT NULL,
    `status` ENUM('CREATED', 'MANIFESTED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURN_INITIATED') NOT NULL DEFAULT 'CREATED',
    `delhivery_waybill` VARCHAR(191) NULL,
    `delhivery_manifest_id` VARCHAR(191) NULL,
    `delhivery_pickup_id` VARCHAR(191) NULL,
    `delhivery_last_status_update` JSON NULL,
    `cod_amount` DECIMAL(10, 2) NULL,
    `warehouseId` VARCHAR(191) NULL,
    `pickedUpAt` DATETIME(3) NULL,
    `manifestedAt` DATETIME(3) NULL,
    `last_tracking_update` DATETIME(3) NULL,
    `estimated_delivery` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shipments_waybill_key`(`waybill`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cod_remittances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `remittanceDate` DATETIME(3) NOT NULL,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `settlementDate` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'SETTLED', 'VERIFIED') NOT NULL DEFAULT 'PENDING',
    `reference_number` VARCHAR(191) NOT NULL,
    `bankTransactionId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cod_remittances_reference_number_key`(`reference_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `orders_idempotencyKey_key` ON `orders`(`idempotencyKey`);

-- CreateIndex
CREATE UNIQUE INDEX `payments_paytm_txn_id_key` ON `payments`(`paytm_txn_id`);

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `inventory`(`variantId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
