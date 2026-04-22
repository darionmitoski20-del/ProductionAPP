-- Add hero title and subtitle to design settings (safe: keep existing data, safe defaults)
ALTER TABLE public.app_design_settings
ADD COLUMN IF NOT EXISTS hero_title text NOT NULL DEFAULT 'РЕСТОРАН МЕНИ',
ADD COLUMN IF NOT EXISTS hero_subtitle text NOT NULL DEFAULT 'Порачај го твоето јадење од нашето мени';
