-- ============================================================
-- Migração v9 — Estrutura Final de Centros de Custo
-- Data: 2026-06-29
-- ============================================================
-- Contexto: Após a v8, a estrutura ainda tinha SOC (Society)
-- como centro de custo separado e ARE (Quadras de Areia) sem
-- sub-áreas. O cliente solicitou unificar as quadras em um
-- único centro de custo com sub-áreas diferenciadas.
--
-- Estrutura ANTERIOR (após v8):
--   BAR  — Bar
--   ESC  — Escolinha
--   ARE  — Quadras de Areia (sem sub-áreas)
--   SOC  — Society (sem sub-áreas, após remoção da sub-área redundante)
--   EST  — Estacionamento/Churrasqueira → Churrasqueira, Estacionamento, Eventos
--
-- Estrutura FINAL:
--   BAR  — Bar
--   ESC  — Escolinha
--   QUA  — Quadras → Areia, Society
--   EST  — Serviços & Eventos → Churrasqueira, Estacionamento, Eventos
-- ============================================================

DO $$
DECLARE
  quadras_id uuid;
  areia_id   uuid;
  society_id uuid;
  soc_id     uuid;
BEGIN
  SELECT id INTO quadras_id FROM public.cost_centers WHERE code = 'ARE';
  SELECT id INTO soc_id     FROM public.cost_centers WHERE code = 'SOC';

  -- 1. Renomear ARE → Quadras (QUA)
  UPDATE public.cost_centers
  SET name = 'Quadras', code = 'QUA', sort_order = 3
  WHERE id = quadras_id;

  -- 2. Criar sub-áreas Areia e Society sob Quadras
  INSERT INTO public.sub_areas (name, cost_center_id)
  VALUES ('Areia', quadras_id)
  RETURNING id INTO areia_id;

  INSERT INTO public.sub_areas (name, cost_center_id)
  VALUES ('Society', quadras_id)
  RETURNING id INTO society_id;

  -- 3. Despesas do antigo ARE → sub-área Areia
  UPDATE public.expenses
  SET sub_area_id = areia_id
  WHERE cost_center_id = quadras_id AND sub_area_id IS NULL;

  -- 4. Despesas do SOC → Quadras + sub-área Society
  UPDATE public.expenses
  SET cost_center_id = quadras_id, sub_area_id = society_id
  WHERE cost_center_id = soc_id;

  -- 5. Alocações (expense_allocations) do SOC → Quadras
  UPDATE public.expense_allocations
  SET cost_center_id = quadras_id
  WHERE cost_center_id = soc_id;

  -- 6. Remover duplicatas de daily_reports em SOC (havia 2 por data com sub_area_id NULL)
  DELETE FROM public.daily_reports
  WHERE cost_center_id = soc_id
  AND ctid NOT IN (
    SELECT MIN(ctid)
    FROM public.daily_reports
    WHERE cost_center_id = soc_id
    GROUP BY report_date
  );

  -- 7. Conciliações do SOC → Quadras + sub-área Society
  UPDATE public.daily_reports
  SET cost_center_id = quadras_id, sub_area_id = society_id
  WHERE cost_center_id = soc_id;

  -- 8. Usuários com área SOC → Quadras
  UPDATE public.user_roles
  SET cost_center_id = quadras_id
  WHERE cost_center_id = soc_id;

  -- 9. Deletar centro de custo SOC
  DELETE FROM public.cost_centers WHERE id = soc_id;

  -- 10. Renomear EST → Serviços & Eventos
  UPDATE public.cost_centers
  SET name = 'Serviços & Eventos'
  WHERE code = 'EST';

  RAISE NOTICE 'v9 aplicada. Quadras: %, Areia: %, Society: %', quadras_id, areia_id, society_id;
END $$;

-- ============================================================
-- Resultado verificado em 2026-06-29:
--   QUA (Quadras) — sub-áreas: Areia (8 despesas), Society (3 despesas, 3 conciliações)
--   EST (Serviços & Eventos) — sub-áreas: Churrasqueira, Estacionamento, Eventos
--   SOC removido · duplicatas de daily_reports eliminadas
-- ============================================================
