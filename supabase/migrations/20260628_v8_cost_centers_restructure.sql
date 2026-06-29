-- ============================================================
-- Migração v8 — Reestruturação de Centros de Custo
-- Data: 2026-06-28
-- ============================================================
-- Problema: "Quadras de Areia" e "Churrasqueira" estavam
-- incorretamente como sub-áreas de "Society" (SOC).
--
-- Estrutura ANTERIOR:
--   SOC (Society) → sub-áreas: Churrasqueira, Quadras de Areia, Quadras Society
--   EST (Estacionamento/Churrasqueira) → sem sub-áreas
--
-- Estrutura FINAL:
--   BAR (Bar)                          → sem sub-áreas
--   ESC (Escolinha)                    → sem sub-áreas
--   ARE (Quadras de Areia) [NOVO]      → sem sub-áreas
--   SOC (Society)                      → sem sub-áreas
--   EST (Estacionamento/Churrasqueira) → Churrasqueira, Estacionamento, Eventos
-- ============================================================

-- 1. Criar cost center "Quadras de Areia" (antes era sub-área de Society)
INSERT INTO public.cost_centers (name, code, is_active, sort_order)
VALUES ('Quadras de Areia', 'ARE', true, 3);

-- 2. Ajustar sort_order para acomodar o novo cost center
UPDATE public.cost_centers SET sort_order = 4 WHERE code = 'SOC';
UPDATE public.cost_centers SET sort_order = 5 WHERE code = 'EST';

-- 3. Migrar 8 despesas vinculadas à sub-área Quadras de Areia
--    para o novo cost center ARE e limpar sub_area_id
UPDATE public.expenses
SET cost_center_id = (SELECT id FROM public.cost_centers WHERE code = 'ARE'),
    sub_area_id    = NULL
WHERE sub_area_id = 'c2e63352-e9f1-4e6e-9d14-7dda9ce01423';

-- 4. Migrar daily_reports (Conciliação) da mesma sub-área
UPDATE public.daily_reports
SET cost_center_id = (SELECT id FROM public.cost_centers WHERE code = 'ARE'),
    sub_area_id    = NULL
WHERE sub_area_id = 'c2e63352-e9f1-4e6e-9d14-7dda9ce01423';

-- 5. Mover sub-área Churrasqueira de SOC → EST
UPDATE public.sub_areas
SET cost_center_id = (SELECT id FROM public.cost_centers WHERE code = 'EST')
WHERE id = 'b47513e7-bb3e-4232-ae40-ca71b77e6501'; -- Churrasqueira

-- 6. Deletar sub-área "Quadras de Areia" (agora é cost center próprio)
DELETE FROM public.sub_areas
WHERE id = 'c2e63352-e9f1-4e6e-9d14-7dda9ce01423';

-- 7. Migrar 3 conciliações da sub-área "Quadras Society" (redundante com cost center SOC)
UPDATE public.daily_reports
SET sub_area_id = NULL
WHERE sub_area_id = '3c7f600d-7125-4348-977c-c91ab889c337';

-- 8. Deletar sub-área "Quadras Society" (redundante — o próprio cost center SOC já representa isso)
DELETE FROM public.sub_areas
WHERE id = '3c7f600d-7125-4348-977c-c91ab889c337';

-- 9. Adicionar sub-áreas corretas em Estacionamento/Churrasqueira
INSERT INTO public.sub_areas (name, cost_center_id)
SELECT name, (SELECT id FROM public.cost_centers WHERE code = 'EST')
FROM (VALUES ('Estacionamento'), ('Eventos')) AS t(name);

-- ============================================================
-- Resultado final verificado em 2026-06-28:
--   ARE criado · 8 despesas migradas · daily_reports migrados
--   Churrasqueira movida para EST · sub-áreas redundantes removidas
--   Estacionamento e Eventos criados em EST
-- ============================================================
