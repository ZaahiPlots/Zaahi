-- Add PROJECT_MANAGER to UserRole enum.
-- Position: between BROKER and DEVELOPER per founder spec 2026-05-23.
-- Additive — no data migration needed; existing rows unaffected.
-- Postgres requires ALTER TYPE ... ADD VALUE outside transactions, so
-- this single statement must run on its own.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PROJECT_MANAGER' BEFORE 'DEVELOPER';
