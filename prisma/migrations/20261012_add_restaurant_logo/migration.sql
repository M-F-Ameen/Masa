-- Add optional restaurant branding logo used by the admin shell.
ALTER TABLE `restaurant_settings`
  ADD COLUMN `logo_url` VARCHAR(191) NULL;
