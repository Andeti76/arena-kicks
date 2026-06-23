-- ============================================================
-- Arena Kicks — Migração v7, ETAPA 0
-- Execute este arquivo sozinho e aguarde o sucesso antes da v7.
-- PostgreSQL exige que o novo valor do enum seja confirmado
-- antes de poder ser utilizado por updates, funções e políticas.
-- ============================================================

alter type public.app_role
  add value if not exists 'platform_admin' before 'owner';

