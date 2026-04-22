-- Add max_product_quantity to app_design_settings (admin-configurable limit for product quantity in cart).
-- Run this in the Supabase SQL editor if the column does not exist yet.

ALTER TABLE app_design_settings
ADD COLUMN IF NOT EXISTS max_product_quantity integer DEFAULT 5;

COMMENT ON COLUMN app_design_settings.max_product_quantity IS 'Max quantity per product in cart (1-99). Default 5.';
