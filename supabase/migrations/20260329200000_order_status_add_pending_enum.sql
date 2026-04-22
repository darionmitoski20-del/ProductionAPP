-- PostgreSQL 55P04: a new enum label cannot be used in the same transaction as ADD VALUE.
-- This file ONLY adds the label. The next migration sets DEFAULT and RPCs.

DO $enum$ BEGIN
  ALTER TYPE public.order_status ADD VALUE 'PENDING' BEFORE 'ACCEPTED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $enum$;
