-- ============================================================
-- Arena Kicks — Migração v6
-- Data: 2026-06-21
-- Mudanças:
--   1. Adiciona função update_user_profile (estava só no Supabase)
--   2. Padroniza token de invites como text (consistente com v5)
--   3. Adiciona função insert_expense_with_allocations se não existir
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PADRONIZAR TOKEN DE INVITES COMO TEXT
--    (v4 criava como uuid; v5 e o frontend usam text)
-- ────────────────────────────────────────────────────────────
alter table public.invites
  alter column token type text using token::text;

alter table public.invites
  alter column token set default encode(gen_random_bytes(32), 'hex');

-- ────────────────────────────────────────────────────────────
-- 2. update_user_profile
--    Atualiza nome, role e cost_center_id de um usuário.
--    Apenas owner pode chamar (verificado dentro da função).
-- ────────────────────────────────────────────────────────────
drop function if exists public.update_user_profile(uuid, text, text, uuid);

create or replace function public.update_user_profile(
  p_user_id        uuid,
  p_full_name      text,
  p_role           text,
  p_cost_center_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role text;
begin
  select role into v_caller_role
  from public.user_roles
  where user_id = auth.uid()
  limit 1;

  if v_caller_role <> 'owner' then
    raise exception 'Apenas o dono pode alterar perfis de usuário.';
  end if;

  -- Atualiza o nome no metadata do auth (best-effort)
  update auth.users
  set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', p_full_name)
  where id = p_user_id;

  -- Atualiza role e CC
  update public.user_roles
  set
    role           = p_role,
    cost_center_id = case when p_role = 'area_manager' then p_cost_center_id else null end
  where user_id = p_user_id;

  -- Atualiza nome em profiles (se a tabela existir)
  update public.profiles
  set full_name = p_full_name
  where id = p_user_id;
end;
$$;

revoke execute on function public.update_user_profile(uuid, text, text, uuid) from public;
grant  execute on function public.update_user_profile(uuid, text, text, uuid) to authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. insert_expense_with_allocations (idempotente)
--    Cria se não existir — já está no schema_v4, mas
--    aplicando aqui garante que instalações parciais não quebrem
-- ────────────────────────────────────────────────────────────
drop function if exists public.insert_expense_with_allocations(jsonb, jsonb);

create or replace function public.insert_expense_with_allocations(
  p_expense     jsonb,
  p_allocations jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid    := auth.uid();
  v_role       text;
  v_is_general boolean := (p_expense->>'is_general')::boolean;
  v_cc_id      uuid    := (p_expense->>'cost_center_id')::uuid;
  v_amount     numeric := (p_expense->>'amount')::numeric;
  v_alloc_sum  numeric;
  v_expense_id uuid;
  v_alloc      jsonb;
begin
  if v_uid is null then
    raise exception 'Não autenticado.';
  end if;

  select role into v_role
  from public.user_roles where user_id = v_uid limit 1;

  if v_role is null then
    raise exception 'Usuário sem perfil de acesso.';
  end if;

  -- Valida rateio quando despesa geral
  if v_is_general then
    select coalesce(sum((a->>'percentage')::numeric), 0)
    into v_alloc_sum
    from jsonb_array_elements(p_allocations) a;

    if abs(v_alloc_sum - 100) > 0.01 then
      raise exception 'Rateio deve totalizar 100%% (atual: %%)', v_alloc_sum;
    end if;
  end if;

  -- Insere despesa
  insert into public.expenses (
    cost_center_id, category_id, description, amount,
    expense_date, payment_method, is_general,
    supplier_name, proof_note, created_by
  )
  values (
    v_cc_id,
    (p_expense->>'category_id')::uuid,
    p_expense->>'description',
    v_amount,
    (p_expense->>'expense_date')::date,
    p_expense->>'payment_method',
    v_is_general,
    p_expense->>'supplier_name',
    p_expense->>'proof_note',
    v_uid
  )
  returning id into v_expense_id;

  -- Insere alocações se houver
  if v_is_general and jsonb_array_length(p_allocations) > 0 then
    for v_alloc in select * from jsonb_array_elements(p_allocations)
    loop
      insert into public.expense_allocations (
        expense_id, cost_center_id, percentage, amount
      ) values (
        v_expense_id,
        (v_alloc->>'cost_center_id')::uuid,
        (v_alloc->>'percentage')::numeric,
        (v_alloc->>'amount')::numeric
      );
    end loop;
  end if;
end;
$$;

revoke execute on function public.insert_expense_with_allocations(jsonb, jsonb) from public;
grant  execute on function public.insert_expense_with_allocations(jsonb, jsonb) to authenticated;

-- ────────────────────────────────────────────────────────────
-- FIM DA MIGRAÇÃO v6
-- ────────────────────────────────────────────────────────────
