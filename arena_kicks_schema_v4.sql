-- ============================================================
-- ARENA KICKS JACAREÍ — SCHEMA v4
-- Gerado em 2026-06-20, reconstruído a partir do código-fonte
-- Reflete o estado real do banco em produção
--
-- ⚠️  ATENÇÃO — SCRIPT DESTRUTIVO PARA INSTALAÇÃO LIMPA
-- Este arquivo apaga e recria todas as tabelas (DROP CASCADE).
-- NÃO execute em produção com dados. Use migrações incrementais
-- para aplicar mudanças em um banco já existente.
--
-- Mudanças em relação ao v3:
--   + Tabelas: sponsors, sponsor_payments, modalities,
--              students, enrollments, monthly_fees
--   + Coluna:  expenses.supplier_name
--   + RPCs:    generate_monthly_fees, update_overdue_fees,
--              insert_expense_with_allocations,
--              get_invite_by_token, accept_invite
--   - Removido: events, event_transactions (não usados pelo frontend)
--   - Removido: expenses.event_id (referenciava events)
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- LIMPEZA PARA RECRIAÇÃO LIMPA
-- ============================================================
drop table if exists monthly_fees         cascade;
drop table if exists enrollments          cascade;
drop table if exists students             cascade;
drop table if exists modalities           cascade;
drop table if exists sponsor_payments     cascade;
drop table if exists sponsors             cascade;
drop table if exists event_transactions   cascade;
drop table if exists events               cascade;
drop table if exists expense_allocations  cascade;
drop table if exists expenses             cascade;
drop table if exists expense_categories   cascade;
drop table if exists daily_reports        cascade;
drop table if exists sub_areas            cascade;
drop table if exists invites              cascade;
drop table if exists user_roles           cascade;
drop table if exists profiles             cascade;
drop table if exists cost_centers         cascade;

-- ============================================================
-- TABELAS BASE
-- ============================================================

create table cost_centers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text not null unique,  -- BAR, ESC, SOC, EST
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text not null,
  created_at timestamptz not null default now()
);

create table user_roles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  role           text not null check (role in ('owner','partner','area_manager')),
  cost_center_id uuid references cost_centers(id),
  created_at     timestamptz not null default now(),
  unique (user_id)
);

create table invites (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  role           text not null check (role in ('partner','area_manager')),
  cost_center_id uuid references cost_centers(id),
  token          text not null default encode(gen_random_bytes(32), 'hex'),
  expires_at     timestamptz not null default (now() + interval '7 days'),
  accepted_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- SUB-ÁREAS (Quadras de Areia, Society, Churrasqueira…)
-- ============================================================
create table sub_areas (
  id             uuid primary key default gen_random_uuid(),
  cost_center_id uuid not null references cost_centers(id),
  name           text not null,
  description    text,
  is_active      boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- CONCILIAÇÃO DIÁRIA
-- ============================================================
create table daily_reports (
  id             uuid primary key default gen_random_uuid(),
  report_date    date not null,
  cost_center_id uuid not null references cost_centers(id),
  sub_area_id    uuid references sub_areas(id),

  sys_cash       numeric(12,2) not null default 0,
  sys_debit      numeric(12,2) not null default 0,
  sys_credit     numeric(12,2) not null default 0,
  sys_pix        numeric(12,2) not null default 0,
  sys_cashless   numeric(12,2) not null default 0,
  sys_other      numeric(12,2) not null default 0,
  sys_total      numeric(12,2) generated always as (
    sys_cash + sys_debit + sys_credit + sys_pix + sys_cashless + sys_other
  ) stored,

  maq_debit      numeric(12,2) not null default 0,
  maq_credit     numeric(12,2) not null default 0,
  maq_pix        numeric(12,2) not null default 0,
  maq_total      numeric(12,2) generated always as (
    maq_debit + maq_credit + maq_pix
  ) stored,

  cash_counted   numeric(12,2) not null default 0,
  status         text not null default 'pending'
                 check (status in ('pending','ok','discrepancy')),
  notes          text,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),

  unique (report_date, cost_center_id, sub_area_id)
);

-- ============================================================
-- CATEGORIAS DE DESPESA
-- ============================================================
create table expense_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sort_order int not null default 0
);

-- ============================================================
-- DESPESAS
-- ============================================================
create table expenses (
  id               uuid primary key default gen_random_uuid(),
  expense_date     date not null,
  cost_center_id   uuid references cost_centers(id),   -- null = geral
  sub_area_id      uuid references sub_areas(id),
  category_id      uuid references expense_categories(id),
  description      text not null,
  amount           numeric(12,2) not null check (amount > 0),
  payment_method   text not null check (payment_method in ('pix','transfer','cash','card','boleto','other')),
  is_general       boolean not null default false,
  supplier_name    text,           -- nome do fornecedor (opcional)
  proof_note       text,           -- referência do comprovante
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now()
);

-- ============================================================
-- RATEIO DE DESPESAS GERAIS
-- ============================================================
create table expense_allocations (
  id             uuid primary key default gen_random_uuid(),
  expense_id     uuid not null references expenses(id) on delete cascade,
  cost_center_id uuid not null references cost_centers(id),
  percentage     numeric(5,2) not null check (percentage > 0 and percentage <= 100),
  amount         numeric(12,2) not null,
  unique (expense_id, cost_center_id)
);

-- ============================================================
-- PATROCINADORES
-- ============================================================
create table sponsors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null default 'empresa' check (type in ('empresa','pessoa_fisica')),
  contact     text,           -- telefone ou email
  amount      numeric(12,2) not null default 0,
  periodicity text not null default 'mensal' check (periodicity in ('mensal','anual','pontual')),
  status      text not null default 'ativo' check (status in ('ativo','inativo')),
  notes       text,
  created_at  timestamptz not null default now()
);

create table sponsor_payments (
  id           uuid primary key default gen_random_uuid(),
  sponsor_id   uuid not null references sponsors(id) on delete cascade,
  payment_date date not null,
  amount       numeric(12,2) not null check (amount > 0),
  notes        text,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- ESCOLINHA (módulo futuro — código pronto, não ativado)
-- ============================================================

create table modalities (
  id             uuid primary key default gen_random_uuid(),
  cost_center_id uuid not null references cost_centers(id),
  name           text not null,
  is_active      boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

create table students (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  phone          text,
  email          text,
  birth_date     date,
  guardian_name  text,           -- responsável
  guardian_phone text,
  guardian_email text,
  address        text,
  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create table enrollments (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references students(id) on delete cascade,
  modality_id    uuid not null references modalities(id),
  monthly_amount numeric(12,2) not null check (monthly_amount > 0),
  due_day        int not null check (due_day between 1 and 28),
  start_date     date not null,
  status         text not null default 'active' check (status in ('active','inactive','suspended')),
  created_at     timestamptz not null default now()
);

create table monthly_fees (
  id               uuid primary key default gen_random_uuid(),
  enrollment_id    uuid not null references enrollments(id) on delete cascade,
  reference_month  date not null,   -- primeiro dia do mês: 2026-06-01
  amount           numeric(12,2) not null check (amount > 0),
  due_date         date not null,
  status           text not null default 'pending' check (status in ('pending','paid','overdue')),
  paid_at          timestamptz,
  payment_method   text check (payment_method in ('pix','cash','card','transfer')),
  notes            text,
  created_at       timestamptz not null default now(),
  unique (enrollment_id, reference_month)
);

-- ============================================================
-- ÍNDICES CRÍTICOS PARA PERFORMANCE
-- ============================================================
create index on daily_reports        (report_date, cost_center_id);
create index on daily_reports        (report_date);
create index on expenses             (expense_date, cost_center_id);
create index on expense_allocations  (expense_id);
create index on sponsor_payments     (payment_date);
create index on monthly_fees         (reference_month, status);
create index on enrollments          (student_id, status);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Cria perfil automaticamente ao criar usuário Supabase Auth
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Usuário'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Calcula status de conciliação ao salvar daily_report
create or replace function update_reconciliation_status()
returns trigger language plpgsql as $$
declare
  diff_debit  numeric;
  diff_credit numeric;
  diff_pix    numeric;
begin
  diff_debit  := abs(new.sys_debit  - new.maq_debit);
  diff_credit := abs(new.sys_credit - new.maq_credit);
  diff_pix    := abs(new.sys_pix    - new.maq_pix);

  if diff_debit < 0.01 and diff_credit < 0.01 and diff_pix < 0.01 then
    new.status := 'ok';
  else
    new.status := 'discrepancy';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reconciliation_status on daily_reports;
create trigger trg_reconciliation_status
  before insert or update on daily_reports
  for each row execute function update_reconciliation_status();

-- ============================================================
-- RPCs (funções chamadas pelo frontend via supabase.rpc())
-- ============================================================

-- Gera mensalidades do mês para todas as matrículas ativas
-- Chamada: supabase.rpc('generate_monthly_fees', { p_month: '2026-06-01' })
-- Retorna: número de mensalidades criadas
create or replace function generate_monthly_fees(p_month date)
returns int language plpgsql security definer
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
    -- Calcula vencimento no mês correto
    v_due_date := make_date(
      extract(year  from v_month_start)::int,
      extract(month from v_month_start)::int,
      v_enrollment.due_day
    );

    -- Insere apenas se não existir ainda
    insert into public.monthly_fees (enrollment_id, reference_month, amount, due_date)
    values (v_enrollment.id, v_month_start, v_enrollment.monthly_amount, v_due_date)
    on conflict (enrollment_id, reference_month) do nothing;

    if found then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

-- Marca como inadimplente mensalidades vencidas e não pagas
-- Chamada: supabase.rpc('update_overdue_fees')
create or replace function update_overdue_fees()
returns void language plpgsql security definer
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
  set    status = 'overdue'
  where  status = 'pending'
  and    due_date < current_date;
end;
$$;

-- Insere despesa + rateio atomicamente com validação de auth e role
-- Chamada: supabase.rpc('insert_expense_with_allocations', { p_expense, p_allocations })
drop function if exists insert_expense_with_allocations(jsonb, jsonb);
create or replace function insert_expense_with_allocations(
  p_expense     jsonb,
  p_allocations jsonb
) returns void language plpgsql security definer
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
  from   public.user_roles where user_id = v_uid limit 1;

  if v_role is null then
    raise exception 'Sem permissão para lançar despesas.';
  end if;

  if v_role not in ('owner', 'partner', 'area_manager') then
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
  ) returning id into v_expense_id;

  for v_alloc in select * from jsonb_array_elements(p_allocations) loop
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

-- Retorna dados do convite pelo token (acessível sem autenticação — anon)
-- Chamada: supabase.rpc('get_invite_by_token', { p_token })
create or replace function get_invite_by_token(p_token uuid)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare
  v_invite record;
begin
  select i.id, i.email, i.role, i.cost_center_id, i.expires_at, i.accepted_at,
         cc.name as cost_center_name
  into   v_invite
  from   public.invites i
  left join public.cost_centers cc on cc.id = i.cost_center_id
  where  i.token = p_token;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  return jsonb_build_object(
    'id',               v_invite.id,
    'email',            v_invite.email,
    'role',             v_invite.role,
    'cost_center_id',   v_invite.cost_center_id,
    'expires_at',       v_invite.expires_at,
    'accepted_at',      v_invite.accepted_at,
    'cost_center_name', v_invite.cost_center_name
  );
end;
$$;

-- Aceita convite: usa auth.uid() para evitar falsificação de identidade
-- Chamada: supabase.rpc('accept_invite', { p_token })
drop function if exists accept_invite(uuid, uuid);
create or replace function accept_invite(p_token uuid)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid    := auth.uid();
  v_email   text    := lower(coalesce(auth.jwt()->>'email', ''));
  v_invite  record;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'Não autenticado.');
  end if;

  select * into v_invite
  from   public.invites
  where  token = p_token
    and  accepted_at is null
    and  expires_at > now();

  if not found then
    return jsonb_build_object('error', 'Convite inválido ou expirado.');
  end if;

  if v_email = '' or v_email <> lower(v_invite.email) then
    return jsonb_build_object('error', 'O convite pertence a outro endereço de e-mail.');
  end if;

  if exists (select 1 from public.user_roles where user_id = v_user_id) then
    return jsonb_build_object('error', 'Este usuário já possui um perfil de acesso.');
  end if;

  insert into public.user_roles (user_id, role, cost_center_id)
  values (v_user_id, v_invite.role, v_invite.cost_center_id);

  update public.invites set accepted_at = now() where id = v_invite.id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
-- RLS — ROW LEVEL SECURITY
-- ============================================================
alter table cost_centers        enable row level security;
alter table profiles            enable row level security;
alter table user_roles          enable row level security;
alter table invites             enable row level security;
alter table sub_areas           enable row level security;
alter table daily_reports       enable row level security;
alter table expense_categories  enable row level security;
alter table expenses            enable row level security;
alter table expense_allocations enable row level security;
alter table sponsors            enable row level security;
alter table sponsor_payments    enable row level security;
alter table modalities          enable row level security;
alter table students            enable row level security;
alter table enrollments         enable row level security;
alter table monthly_fees        enable row level security;

-- Helpers de role
create or replace function my_role()
returns text language sql security definer stable
set search_path = ''
as $$
  select role from public.user_roles where user_id = auth.uid() limit 1;
$$;

create or replace function my_cc()
returns uuid language sql security definer stable
set search_path = ''
as $$
  select cost_center_id from public.user_roles where user_id = auth.uid() limit 1;
$$;

-- cost_centers
create policy "cc_read"  on cost_centers for select using (true);
create policy "cc_write" on cost_centers for all    using (my_role() in ('owner','partner'));

-- profiles
create policy "prof_read" on profiles for select using (true);
create policy "prof_own"  on profiles for update using (auth.uid() = id);

-- user_roles
create policy "ur_read"  on user_roles for select using (true);
create policy "ur_write" on user_roles for all    using (my_role() = 'owner');

-- invites
create policy "inv_read"  on invites for select using (my_role() in ('owner','partner'));
create policy "inv_write" on invites for all    using (my_role() = 'owner');

-- sub_areas
create policy "sub_read"  on sub_areas for select using (true);
create policy "sub_write" on sub_areas for all    using (my_role() in ('owner','partner'));

-- daily_reports
create policy "dr_read_all"  on daily_reports for select using (my_role() in ('owner','partner'));
create policy "dr_read_area" on daily_reports for select using (my_role() = 'area_manager' and cost_center_id = my_cc());
create policy "dr_write"     on daily_reports for all
  using      (my_role() in ('owner','partner') or (my_role() = 'area_manager' and cost_center_id = my_cc()))
  with check (my_role() in ('owner','partner') or (my_role() = 'area_manager' and cost_center_id = my_cc()));

-- expense_categories
create policy "ecat_read"  on expense_categories for select using (true);
create policy "ecat_write" on expense_categories for all    using (my_role() in ('owner','partner'));

-- expenses
create policy "exp_read_all"  on expenses for select using (my_role() in ('owner','partner'));
create policy "exp_read_area" on expenses for select using (my_role() = 'area_manager' and cost_center_id = my_cc());
create policy "exp_write"     on expenses for all
  using      (my_role() in ('owner','partner') or (my_role() = 'area_manager' and cost_center_id = my_cc()))
  with check (my_role() in ('owner','partner') or (my_role() = 'area_manager' and cost_center_id = my_cc()));

-- expense_allocations
create policy "alloc_read"  on expense_allocations for select using (my_role() in ('owner','partner'));
create policy "alloc_write" on expense_allocations for all    using (my_role() in ('owner','partner'));

-- sponsors
create policy "spon_read"  on sponsors for select using (my_role() in ('owner','partner'));
create policy "spon_write" on sponsors for all    using (my_role() = 'owner');

-- sponsor_payments
create policy "spay_read"  on sponsor_payments for select using (my_role() in ('owner','partner'));
create policy "spay_write" on sponsor_payments for all    using (my_role() in ('owner','partner'));

-- modalities
create policy "mod_read"  on modalities for select using (true);
create policy "mod_write" on modalities for all    using (my_role() in ('owner','partner'));

-- students
create policy "stu_read"  on students for select using (my_role() in ('owner','partner'));
create policy "stu_write" on students for all    using (my_role() in ('owner','partner'));

-- enrollments
create policy "enr_read"  on enrollments for select using (my_role() in ('owner','partner'));
create policy "enr_write" on enrollments for all    using (my_role() in ('owner','partner'));

-- monthly_fees
create policy "fee_read"  on monthly_fees for select using (my_role() in ('owner','partner'));
create policy "fee_write" on monthly_fees for all    using (my_role() in ('owner','partner'));

-- ============================================================
-- SEED — DADOS INICIAIS
-- ============================================================

insert into cost_centers (name, code, sort_order) values
  ('Bar',               'BAR', 1),
  ('Escolinha',         'ESC', 2),
  ('Society / Quadras', 'SOC', 3),
  ('Estacionamento',    'EST', 4)
on conflict (code) do nothing;

insert into sub_areas (cost_center_id, name, sort_order)
select c.id, s.name, s.ord
from cost_centers c,
     (values
       ('Quadras de Areia', 1),
       ('Quadras Society',  2),
       ('Churrasqueira',    3)
     ) as s(name, ord)
where c.code = 'SOC'
on conflict do nothing;

insert into expense_categories (name, sort_order) values
  ('Aluguel',          1),
  ('Energia elétrica', 2),
  ('Água',             3),
  ('Internet',         4),
  ('Salários',         5),
  ('Fornecedores',     6),
  ('Manutenção',       7),
  ('Taxa de máquina',  8),
  ('Impostos',         9),
  ('Marketing',       10),
  ('Equipamentos',    11),
  ('Outros',          12)
on conflict do nothing;

-- SEED — Modalidades da Escolinha (ativar junto com o módulo)
insert into modalities (cost_center_id, name, sort_order)
select c.id, m.name, m.ord
from cost_centers c,
     (values
       ('Beach Tennis',   1),
       ('Futevôlei',      2),
       ('Vôlei de Praia', 3),
       ('Natação',        4)
     ) as m(name, ord)
where c.code = 'ESC'
on conflict do nothing;

-- ============================================================
-- PERMISSÕES DE EXECUÇÃO DAS RPCs
-- ============================================================

-- Revogar acesso público padrão
revoke execute on function insert_expense_with_allocations(jsonb, jsonb) from public;
revoke execute on function get_invite_by_token(uuid)                      from public;
revoke execute on function accept_invite(uuid)                            from public;
revoke execute on function generate_monthly_fees(date)                    from public;
revoke execute on function update_overdue_fees()                          from public;
revoke execute on function my_role()                                      from public;
revoke execute on function my_cc()                                        from public;

-- Conceder apenas ao role correto
grant execute on function insert_expense_with_allocations(jsonb, jsonb) to authenticated;
grant execute on function get_invite_by_token(uuid)                      to anon, authenticated;
grant execute on function accept_invite(uuid)                            to authenticated;
grant execute on function generate_monthly_fees(date)                    to authenticated;
grant execute on function update_overdue_fees()                          to authenticated;
grant execute on function my_role()                                      to authenticated;
grant execute on function my_cc()                                        to authenticated;
