-- AlterTable
ALTER TABLE `orders` ADD COLUMN `delivered_at` DATETIME(3) NULL,
    ADD COLUMN `failed_delivery_attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `payments` ADD COLUMN `cod_otp_expires_at` DATETIME(3) NULL;
