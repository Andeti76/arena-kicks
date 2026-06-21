-- ============================================================
-- ARENA KICKS — MIGRAÇÃO INCREMENTAL v5 (SEGURANÇA)
-- Aplicar no SQL Editor do Supabase em um banco existente.
-- Esta migração NÃO apaga tabelas nem dados.
-- ============================================================

-- Perfil automático com search_path seguro
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Usuário'));
  return new;
end;
$$;

-- Helpers usados pelas políticas RLS
create or replace function public.my_role()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select role
  from public.user_roles
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.my_cc()
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select cost_center_id
  from public.user_roles
  where user_id = auth.uid()
  limit 1;
$$;

-- Mensalidades: somente owner/partner
create or replace function public.generate_monthly_fees(p_month date)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment  record;
  v_due_date    date;
  v_count       int := 0;
  v_month_start date := date_trunc('month', p_month)::date;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if not exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('owner', 'partner')
  ) then
    raise exception 'Sem permissão para gerar mensalidades.';
  end if;

  for v_enrollment in
    select e.id, e.monthly_amount, e.due_day
    from public.enrollments e
    where e.status = 'active'
  loop
    v_due_date := make_date(
      extract(year from v_month_start)::int,
      extract(month from v_month_start)::int,
      v_enrollment.due_day
    );

    insert into public.monthly_fees (
      enrollment_id, reference_month, amount, due_date
    )
    values (
      v_enrollment.id, v_month_start, v_enrollment.monthly_amount, v_due_date
    )
    on conflict (enrollment_id, reference_month) do nothing;

    if found then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

create or replace function public.update_overdue_fees()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if not exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('owner', 'partner')
  ) then
    raise exception 'Sem permissão para atualizar mensalidades.';
  end if;

  update public.monthly_fees
  set status = 'overdue'
  where status = 'pending'
    and due_date < current_date;
end;
$$;

-- Despesas: autenticação, papel, centro de custo e rateio validados no servidor
drop function if exists public.insert_expense_with_allocations(jsonb, jsonb);
create function public.insert_expense_with_allocations(
  p_expense jsonb,
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

  select role, cost_center_id
  into v_role, v_cc
  from public.user_roles
  where user_id = v_uid
  limit 1;

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

  if not v_is_general
     and jsonb_array_length(coalesce(p_allocations, '[]'::jsonb)) > 0 then
    raise exception 'Despesa não geral não pode possuir rateio.';
  end if;

  if v_is_general then
    select
      coalesce(sum((item->>'percentage')::numeric), 0),
      coalesce(sum((item->>'amount')::numeric), 0)
    into v_alloc_pct, v_alloc_sum
    from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) item;

    if abs(v_alloc_pct - 100) > 0.01 then
      raise exception 'O rateio da despesa geral deve totalizar 100%%.';
    end if;

    if abs(v_alloc_sum - v_amount) > 0.01 then
      raise exception 'A soma dos valores rateados deve corresponder ao valor da despesa.';
    end if;
  end if;

  insert into public.expenses (
    expense_date, cost_center_id, sub_area_id, category_id,
    description, amount, payment_method, is_general,
    supplier_name, proof_note, created_by
  )
  values (
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

  for v_alloc in
    select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb))
  loop
    insert into public.expense_allocations (
      expense_id, cost_center_id, percentage, amount
    )
    values (
      v_expense_id,
      (v_alloc->>'cost_center_id')::uuid,
      (v_alloc->>'percentage')::numeric,
      (v_alloc->>'amount')::numeric
    );
  end loop;
end;
$$;

-- Consulta pública por token (token é text hex de 64 chars, não uuid)
drop function if exists public.get_invite_by_token(uuid);
create or replace function public.get_invite_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite record;
begin
  select
    i.id, i.email, i.role, i.cost_center_id, i.expires_at, i.accepted_at,
    cc.name as cost_center_name
  into v_invite
  from public.invites i
  left join public.cost_centers cc on cc.id = i.cost_center_id
  where i.token = p_token;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  return jsonb_build_object(
    'id', v_invite.id,
    'email', v_invite.email,
    'role', v_invite.role,
    'cost_center_id', v_invite.cost_center_id,
    'expires_at', v_invite.expires_at,
    'accepted_at', v_invite.accepted_at,
    'cost_center_name', v_invite.cost_center_name
  );
end;
$$;

-- Remove assinaturas antigas (uuid ou uuid,uuid)
drop function if exists public.accept_invite(uuid, uuid);
drop function if exists public.accept_invite(uuid);

create or replace function public.accept_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text := lower(coalesce(auth.jwt()->>'email', ''));
  v_invite  record;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'Não autenticado.');
  end if;

  select *
  into v_invite
  from public.invites
  where token = p_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    return jsonb_build_object('error', 'Convite inválido ou expirado.');
  end if;

  if v_email = '' or v_email <> lower(v_invite.email) then
    return jsonb_build_object(
      'error', 'O convite pertence a outro endereço de e-mail.'
    );
  end if;

  if exists (
    select 1 from public.user_roles where user_id = v_user_id
  ) then
    return jsonb_build_object(
      'error', 'Este usuário já possui um perfil de acesso.'
    );
  end if;

  insert into public.user_roles (user_id, role, cost_center_id)
  values (v_user_id, v_invite.role, v_invite.cost_center_id);

  update public.invites
  set accepted_at = now()
  where id = v_invite.id;

  return jsonb_build_object('ok', true);
end;
$$;

-- Recria as políticas de escrita com isolamento por centro de custo
drop policy if exists "dr_write" on public.daily_reports;
create policy "dr_write" on public.daily_reports
for all
using (
  public.my_role() in ('owner', 'partner')
  or (
    public.my_role() = 'area_manager'
    and cost_center_id = public.my_cc()
  )
)
with check (
  public.my_role() in ('owner', 'partner')
  or (
    public.my_role() = 'area_manager'
    and cost_center_id = public.my_cc()
  )
);

drop policy if exists "exp_write" on public.expenses;
create policy "exp_write" on public.expenses
for all
using (
  public.my_role() in ('owner', 'partner')
  or (
    public.my_role() = 'area_manager'
    and cost_center_id = public.my_cc()
  )
)
with check (
  public.my_role() in ('owner', 'partner')
  or (
    public.my_role() = 'area_manager'
    and cost_center_id = public.my_cc()
  )
);

-- Permissões explícitas
revoke execute on function public.insert_expense_with_allocations(jsonb, jsonb) from public;
revoke execute on function public.get_invite_by_token(text) from public;
revoke execute on function public.accept_invite(text) from public;
revoke execute on function public.generate_monthly_fees(date) from public;
revoke execute on function public.update_overdue_fees() from public;
revoke execute on function public.my_role() from public;
revoke execute on function public.my_cc() from public;

grant execute on function public.insert_expense_with_allocations(jsonb, jsonb) to authenticated;
grant execute on function public.get_invite_by_token(text) to anon, authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.generate_monthly_fees(date) to authenticated;
grant execute on function public.update_overdue_fees() to authenticated;
grant execute on function public.my_role() to authenticated;
grant execute on function public.my_cc() to authenticated;
