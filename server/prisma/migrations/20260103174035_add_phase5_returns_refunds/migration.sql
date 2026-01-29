-- CreateTable
CREATE TABLE `returns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `status` ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'RECEIVED', 'RETURNED') NOT NULL DEFAULT 'REQUESTED',
    `reason` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `items` JSON NOT NULL,
    `estimatedRefundAmount` DECIMAL(10, 2) NOT NULL,
    `approvedRefundAmount` DECIMAL(10, 2) NULL,
    `pickupScheduledAt` DATETIME(3) NULL,
    `pickupCompletedAt` DATETIME(3) NULL,
    `returnWaybill` VARCHAR(191) NULL,
    `returnStatus` VARCHAR(191) NULL,
    `conditionAssessment` TEXT NULL,
    `conditionScore` INTEGER NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `returns_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refunds` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `returnId` INTEGER NULL,
    `paymentId` INTEGER NULL,
    `originalAmount` DECIMAL(10, 2) NOT NULL,
    `refundAmount` DECIMAL(10, 2) NOT NULL,
    `method` ENUM('GATEWAY', 'BANK_TRANSFER') NOT NULL DEFAULT 'GATEWAY',
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `paytm_refund_id` VARCHAR(191) NULL,
    `paytm_status` VARCHAR(191) NULL,
    `paytm_response` JSON NULL,
    `bank_account` JSON NULL,
    `settlement_date` DATETIME(3) NULL,
    `settlement_reference` VARCHAR(191) NULL,
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `last_retry_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `initiatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `refunds_orderId_key`(`orderId`),
    UNIQUE INDEX `refunds_returnId_key`(`returnId`),
    UNIQUE INDEX `refunds_paytm_refund_id_key`(`paytm_refund_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reconciliation_alerts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `alert_type` VARCHAR(191) NOT NULL,
    `expected_amount` DECIMAL(10, 2) NOT NULL,
    `actual_amount` DECIMAL(10, 2) NULL,
    `difference` DECIMAL(10, 2) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `reference_id` VARCHAR(191) NULL,
    `resolution` VARCHAR(191) NULL,
    `resolved_amount` DECIMAL(10, 2) NULL,
    `resolved_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `returns` ADD CONSTRAINT `returns_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returns` ADD CONSTRAINT `returns_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `returns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reconciliation_alerts` ADD CONSTRAINT `reconciliation_alerts_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
