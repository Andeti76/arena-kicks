-- ============================================================
-- Arena Kicks — Migração v6 (corrigida)
-- Data: 2026-06-21
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PADRONIZAR TOKEN DE INVITES COMO TEXT
-- ────────────────────────────────────────────────────────────
alter table public.invites
  alter column token type text using token::text;

alter table public.invites
  alter column token set default encode(gen_random_bytes(32), 'hex');

-- ────────────────────────────────────────────────────────────
-- 2. insert_expense_with_allocations — versão completa (v4)
--    Corrige a regressão da v6 anterior que removeu validações
-- ────────────────────────────────────────────────────────────
drop function if exists public.insert_expense_with_allocations(jsonb, jsonb);

create or replace function public.insert_expense_with_allocations(
  p_expense     jsonb,
  p_allocations jsonb
)
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid        uuid    := auth.uid();
  v_role       text;
  v_cc         uuid;
  v_is_general boolean := (p_expense->>'is_general')::boolean;
  v_cc_id      uuid    := (p_expense->>'cost_center_id')::uuid;
  v_amount     numeric := (p_expense->>'amount')::numeric;
  v_alloc_pct  numeric;
  v_alloc_sum  numeric;
  v_expense_id uuid;
  v_alloc      jsonb;
begin
  if v_uid is null then
    raise exception 'Não autenticado.';
  end if;

  select role, cost_center_id into v_role, v_cc
  from public.user_roles where user_id = v_uid limit 1;

  if v_role is null or v_role not in ('owner', 'partner', 'area_manager') then
    raise exception 'Sem permissão para lançar despesas.';
  end if;

  if v_role = 'area_manager' and v_is_general then
    raise exception 'Responsável de área não pode lançar despesas gerais.';
  end if;

  if v_role = 'area_manager' and v_cc_id is distinct from v_cc then
    raise exception 'Responsável de área só pode lançar despesas da sua própria área.';
  end if;

  if v_is_general and v_cc_id is not null then
    raise exception 'Despesa geral não pode ter centro de custo direto.';
  end if;

  if not v_is_general and v_cc_id is null then
    raise exception 'Centro de custo é obrigatório para despesa não geral.';
  end if;

  if not v_is_general and jsonb_array_length(coalesce(p_allocations, '[]'::jsonb)) > 0 then
    raise exception 'Despesa não geral não pode ter rateio.';
  end if;

  if v_is_general then
    select
      coalesce(sum((item->>'percentage')::numeric), 0),
      coalesce(sum((item->>'amount')::numeric), 0)
    into v_alloc_pct, v_alloc_sum
    from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) item;

    if abs(v_alloc_pct - 100) > 0.01 then
      raise exception 'O rateio deve totalizar 100%%.';
    end if;

    if abs(v_alloc_sum - v_amount) > 0.01 then
      raise exception 'A soma dos valores rateados deve corresponder ao valor da despesa.';
    end if;
  end if;

  insert into public.expenses (
    expense_date, cost_center_id, sub_area_id, category_id,
    description, amount, payment_method, is_general,
    supplier_name, proof_note, created_by
  ) values (
    (p_expense->>'expense_date')::date,
    v_cc_id,
    (p_expense->>'sub_area_id')::uuid,
    (p_expense->>'category_id')::uuid,
    p_expense->>'description',
    v_amount,
    p_expense->>'payment_method',
    v_is_general,
    p_expense->>'supplier_name',
    p_expense->>'proof_note',
    v_uid
  )
  returning id into v_expense_id;

  for v_alloc in select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb))
  loop
    insert into public.expense_allocations (expense_id, cost_center_id, percentage, amount)
    values (
      v_expense_id,
      (v_alloc->>'cost_center_id')::uuid,
      (v_alloc->>'percentage')::numeric,
      (v_alloc->>'amount')::numeric
    );
  end loop;
end;
$$;

revoke execute on function public.insert_expense_with_allocations(jsonb, jsonb) from public;
grant  execute on function public.insert_expense_with_allocations(jsonb, jsonb) to authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. update_user_profile
-- ────────────────────────────────────────────────────────────
drop function if exists public.update_user_profile(uuid, text, text, uuid);

create or replace function public.update_user_profile(
  p_user_id        uuid,
  p_full_name      text,
  p_role           text,
  p_cost_center_id uuid default null
)
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  v_caller_role text;
begin
  select role into v_caller_role
  from public.user_roles
  where user_id = auth.uid() limit 1;

  if v_caller_role <> 'owner' then
    raise exception 'Apenas o dono pode alterar perfis de usuário.';
  end if;

  update auth.users
  set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', p_full_name)
  where id = p_user_id;

  update public.user_roles
  set role           = p_role,
      cost_center_id = case when p_role = 'area_manager' then p_cost_center_id else null end
  where user_id = p_user_id;
end;
$$;

revoke execute on function public.update_user_profile(uuid, text, text, uuid) from public;
grant  execute on function public.update_user_profile(uuid, text, text, uuid) to authenticated;

-- ────────────────────────────────────────────────────────────
-- FIM DA MIGRAÇÃO v6 (corrigida)
-- ────────────────────────────────────────────────────────────
