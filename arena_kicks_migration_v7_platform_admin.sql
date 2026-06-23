-- ============================================================
-- Arena Kicks — Migração v7: Administrador da Plataforma
-- Data: 2026-06-22
--
-- PRÉ-REQUISITO OBRIGATÓRIO:
-- Execute e confirme primeiro, em uma consulta separada:
--   arena_kicks_migration_v7_step_0_enum.sql
--
-- Hierarquia:
--   platform_admin  Administrador técnico Andeti
--   owner           Proprietário da Arena Kicks
--   partner         Sócio
--   area_manager    Responsável de área
-- ============================================================

begin;

-- ────────────────────────────────────────────────────────────
-- 1. AMPLIAR OS PAPÉIS PERMITIDOS
-- ────────────────────────────────────────────────────────────
alter table public.user_roles
  drop constraint if exists user_roles_role_check;

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('platform_admin', 'owner', 'partner', 'area_manager'));

alter table public.invites
  drop constraint if exists invites_role_check;

alter table public.invites
  add constraint invites_role_check
  check (role in ('owner', 'partner', 'area_manager'));

-- A conta real da Andeti passa a ser o administrador da plataforma.
update public.user_roles ur
set role = 'platform_admin',
    cost_center_id = null
from auth.users au
where ur.user_id = au.id
  and lower(au.email) = 'contato@andeti.com.br';

-- Falha de forma explícita se a conta esperada não estiver vinculada.
do $$
begin
  if not exists (
    select 1
    from auth.users au
    join public.user_roles ur on ur.user_id = au.id
    where lower(au.email) = 'contato@andeti.com.br'
      and ur.role = 'platform_admin'
  ) then
    raise exception 'contato@andeti.com.br não foi encontrado em user_roles.';
  end if;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 2. POLÍTICAS: PLATFORM ADMIN HERDA O ACESSO OPERACIONAL
-- ────────────────────────────────────────────────────────────
drop policy if exists "cc_write" on public.cost_centers;
create policy "cc_write" on public.cost_centers for all
using (public.my_role() in ('platform_admin', 'owner', 'partner'))
with check (public.my_role() in ('platform_admin', 'owner', 'partner'));

drop policy if exists "sub_write" on public.sub_areas;
create policy "sub_write" on public.sub_areas for all
using (public.my_role() in ('platform_admin', 'owner', 'partner'))
with check (public.my_role() in ('platform_admin', 'owner', 'partner'));

drop policy if exists "ecat_write" on public.expense_categories;
create policy "ecat_write" on public.expense_categories for all
using (public.my_role() in ('platform_admin', 'owner', 'partner'))
with check (public.my_role() in ('platform_admin', 'owner', 'partner'));

drop policy if exists "dr_read_all" on public.daily_reports;
create policy "dr_read_all" on public.daily_reports for select
using (public.my_role() in ('platform_admin', 'owner', 'partner'));

drop policy if exists "dr_write" on public.daily_reports;
create policy "dr_write" on public.daily_reports for all
using (
  public.my_role() in ('platform_admin', 'owner', 'partner')
  or (public.my_role() = 'area_manager' and cost_center_id = public.my_cc())
)
with check (
  public.my_role() in ('platform_admin', 'owner', 'partner')
  or (public.my_role() = 'area_manager' and cost_center_id = public.my_cc())
);

drop policy if exists "exp_read_all" on public.expenses;
create policy "exp_read_all" on public.expenses for select
using (public.my_role() in ('platform_admin', 'owner', 'partner'));

drop policy if exists "exp_write" on public.expenses;
create policy "exp_write" on public.expenses for all
using (
  public.my_role() in ('platform_admin', 'owner', 'partner')
  or (public.my_role() = 'area_manager' and cost_center_id = public.my_cc())
)
with check (
  public.my_role() in ('platform_admin', 'owner', 'partner')
  or (public.my_role() = 'area_manager' and cost_center_id = public.my_cc())
);

drop policy if exists "alloc_read" on public.expense_allocations;
create policy "alloc_read" on public.expense_allocations for select
using (public.my_role() in ('platform_admin', 'owner', 'partner'));

drop policy if exists "alloc_write" on public.expense_allocations;
create policy "alloc_write" on public.expense_allocations for all
using (public.my_role() in ('platform_admin', 'owner', 'partner'))
with check (public.my_role() in ('platform_admin', 'owner', 'partner'));

drop policy if exists "spon_read" on public.sponsors;
create policy "spon_read" on public.sponsors for select
using (public.my_role() in ('platform_admin', 'owner', 'partner'));

drop policy if exists "spon_write" on public.sponsors;
create policy "spon_write" on public.sponsors for all
using (public.my_role() in ('platform_admin', 'owner'))
with check (public.my_role() in ('platform_admin', 'owner'));

drop policy if exists "spay_read" on public.sponsor_payments;
create policy "spay_read" on public.sponsor_payments for select
using (public.my_role() in ('platform_admin', 'owner', 'partner'));

drop policy if exists "spay_write" on public.sponsor_payments;
create policy "spay_write" on public.sponsor_payments for all
using (public.my_role() in ('platform_admin', 'owner', 'partner'))
with check (public.my_role() in ('platform_admin', 'owner', 'partner'));

-- O módulo Escolinha ainda não está ativo neste banco.
-- As políticas de modalities, students, enrollments e monthly_fees
-- serão aplicadas junto da migração específica desse módulo.

-- Papéis só podem ser alterados pela RPC protegida ou por funções com service role.
-- Remover a escrita direta evita que um owner fabrique platform_admin via API.
drop policy if exists "ur_write" on public.user_roles;

drop policy if exists "inv_read" on public.invites;
create policy "inv_read" on public.invites for select
using (public.my_role() in ('platform_admin', 'owner', 'partner'));

-- Convites são criados pela Edge Function e aceitos pela RPC security definer.
-- Pelo cliente, administradores podem apenas revogar (delete).
drop policy if exists "inv_write" on public.invites;
drop policy if exists "inv_delete" on public.invites;
create policy "inv_delete" on public.invites for delete
using (public.my_role() in ('platform_admin', 'owner'));

-- ────────────────────────────────────────────────────────────
-- 3. RPC DE DESPESAS: INCLUIR PLATFORM ADMIN
-- ────────────────────────────────────────────────────────────
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
  v_cc_id      uuid    := nullif(p_expense->>'cost_center_id', '')::uuid;
  v_amount     numeric := (p_expense->>'amount')::numeric;
  v_alloc_pct  numeric;
  v_alloc_sum  numeric;
  v_expense_id uuid;
  v_alloc      jsonb;
begin
  if v_uid is null then raise exception 'Não autenticado.'; end if;

  select role, cost_center_id into v_role, v_cc
  from public.user_roles where user_id = v_uid limit 1;

  if v_role is null or v_role not in ('platform_admin', 'owner', 'partner', 'area_manager') then
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
    select coalesce(sum((item->>'percentage')::numeric), 0),
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
    nullif(p_expense->>'sub_area_id', '')::uuid,
    nullif(p_expense->>'category_id', '')::uuid,
    p_expense->>'description', v_amount, p_expense->>'payment_method',
    v_is_general, p_expense->>'supplier_name', p_expense->>'proof_note', v_uid
  ) returning id into v_expense_id;

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

-- ────────────────────────────────────────────────────────────
-- 4. RPC DE USUÁRIOS COM HIERARQUIA SEGURA
-- ────────────────────────────────────────────────────────────
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
  v_target_role text;
begin
  select role into v_caller_role
  from public.user_roles where user_id = auth.uid() limit 1;

  if v_caller_role not in ('platform_admin', 'owner') then
    raise exception 'Sem permissão para alterar perfis de usuário.';
  end if;
  if p_role not in ('owner', 'partner', 'area_manager') then
    raise exception 'Perfil de destino inválido.';
  end if;

  select role into v_target_role
  from public.user_roles where user_id = p_user_id limit 1;
  if not found then raise exception 'Usuário não encontrado.'; end if;

  if v_target_role = 'platform_admin' or p_role = 'platform_admin' then
    raise exception 'O Administrador Andeti não pode ser alterado por esta operação.';
  end if;

  if v_caller_role = 'owner' and (v_target_role = 'owner' or p_role = 'owner') then
    raise exception 'Somente o Administrador Andeti pode gerenciar o perfil de dono.';
  end if;

  if p_role = 'area_manager' and p_cost_center_id is null then
    raise exception 'Responsável de área precisa de um centro de custo.';
  end if;
  if p_cost_center_id is not null and not exists (
    select 1 from public.cost_centers where id = p_cost_center_id
  ) then
    raise exception 'Centro de custo não encontrado.';
  end if;

  update auth.users
  set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', p_full_name)
  where id = p_user_id;

  update public.profiles set full_name = p_full_name where id = p_user_id;
  update public.user_roles
  set role = p_role,
      cost_center_id = case when p_role = 'area_manager' then p_cost_center_id else null end
  where user_id = p_user_id;
end;
$$;

-- Permissões das RPCs.
revoke execute on function public.update_user_profile(uuid, text, text, uuid) from public;
revoke execute on function public.insert_expense_with_allocations(jsonb, jsonb) from public;

grant execute on function public.update_user_profile(uuid, text, text, uuid) to authenticated;
grant execute on function public.insert_expense_with_allocations(jsonb, jsonb) to authenticated;

commit;

-- Verificação esperada:
-- select au.email, ur.role
-- from auth.users au join public.user_roles ur on ur.user_id = au.id
-- where lower(au.email) = 'contato@andeti.com.br';
