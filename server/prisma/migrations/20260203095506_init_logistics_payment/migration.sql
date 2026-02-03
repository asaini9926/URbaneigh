-- AlterTable
ALTER TABLE `orders` ADD COLUMN `fulfillmentStatus` ENUM('UNFULFILLED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'RETURNED') NOT NULL DEFAULT 'UNFULFILLED',
    MODIFY `status` ENUM('CREATED', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'PAID', 'READY_TO_PACK', 'PACKED', 'READY_TO_PICK', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED') NOT NULL DEFAULT 'CREATED';

-- AlterTable
ALTER TABLE `payments` ADD COLUMN `paytm_bank_txn_id` VARCHAR(191) NULL,
    ADD COLUMN `paytm_payment_mode` VARCHAR(191) NULL,
    ADD COLUMN `paytm_txn_token` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `socialMediaDescription` TEXT NULL;

-- AlterTable
ALTER TABLE `refunds` ADD COLUMN `bank_account_no` VARCHAR(191) NULL,
    ADD COLUMN `beneficiary_name` VARCHAR(191) NULL,
    ADD COLUMN `ifsc_code` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `returns` ADD COLUMN `proof_images` JSON NULL,
    ADD COLUMN `shiprocket_return_order_id` INTEGER NULL,
    ADD COLUMN `shiprocket_return_shipment_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `shipments` ADD COLUMN `awb_code` VARCHAR(191) NULL,
    ADD COLUMN `courier_name` VARCHAR(191) NULL,
    ADD COLUMN `label_url` VARCHAR(191) NULL,
    ADD COLUMN `pickup_scheduled_date` DATETIME(3) NULL,
    ADD COLUMN `shiprocket_order_id` INTEGER NULL,
    ADD COLUMN `shiprocket_shipment_id` INTEGER NULL,
    MODIFY `waybill` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `shoppable_videos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `videoUrl` VARCHAR(191) NOT NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `socialMediaDescription` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_videos` (
    `videoId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,

    PRIMARY KEY (`videoId`, `productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscribers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `subscribers_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_videos` ADD CONSTRAINT `product_videos_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `shoppable_videos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_videos` ADD CONSTRAINT `product_videos_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
