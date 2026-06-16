-- ============================================================
-- ARENA KICKS JACAREÍ — SCHEMA v3
-- Baseado nas respostas reais do Marcus (dono)
-- Escopo: conciliação diária + despesas + sub-áreas/eventos + DRE
-- ============================================================

-- Habilitar UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- LIMPEZA (remove tabelas v1/v2 que não serão usadas)
-- ============================================================
drop table if exists transaction_allocations cascade;
drop table if exists transactions cascade;
drop table if exists monthly_fees cascade;
drop table if exists enrollments cascade;
drop table if exists students cascade;
drop table if exists modalities cascade;
drop table if exists categories cascade;

-- ============================================================
-- TABELAS BASE (mantidas do v2)
-- ============================================================

-- Centros de Custo
create table if not exists cost_centers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text not null unique,  -- BAR, ESC, SOC, EST
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Perfis de usuário
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text not null,
  created_at timestamptz not null default now()
);

-- Roles
create table if not exists user_roles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  role           text not null check (role in ('owner','partner','area_manager')),
  cost_center_id uuid references cost_centers(id),
  created_at     timestamptz not null default now(),
  unique (user_id)
);

-- Convites
create table if not exists invites (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  role           text not null check (role in ('partner','area_manager')),
  cost_center_id uuid references cost_centers(id),
  token          uuid not null default gen_random_uuid(),
  expires_at     timestamptz not null default (now() + interval '7 days'),
  accepted_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- SUB-ÁREAS (ex: Quadras de Areia dentro de Society)
-- ============================================================
create table if not exists sub_areas (
  id             uuid primary key default gen_random_uuid(),
  cost_center_id uuid not null references cost_centers(id),
  name           text not null,
  description    text,
  is_active      boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- EVENTOS (ex: Campeonato de Vôlei dentro de Quadras de Areia)
-- Têm receita e despesa próprias
-- ============================================================
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  sub_area_id uuid not null references sub_areas(id) on delete cascade,
  name        text not null,
  event_date  date,
  description text,
  status      text not null default 'open' check (status in ('open','closed')),
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- CONCILIAÇÃO DIÁRIA
-- Marcus recebe relatório do sistema + maquininha por área
-- Confere se bate: dinheiro / cartão / pix
-- ============================================================
create table if not exists daily_reports (
  id             uuid primary key default gen_random_uuid(),
  report_date    date not null,
  cost_center_id uuid not null references cost_centers(id),
  sub_area_id    uuid references sub_areas(id),  -- opcional (ex: aluguel de quadra específica)

  -- Valores do SISTEMA (relatório enviado pelo gerente)
  sys_cash       numeric(12,2) not null default 0,
  sys_debit      numeric(12,2) not null default 0,
  sys_credit     numeric(12,2) not null default 0,
  sys_pix        numeric(12,2) not null default 0,
  sys_cashless   numeric(12,2) not null default 0,
  sys_other      numeric(12,2) not null default 0,
  sys_total      numeric(12,2) generated always as (
    sys_cash + sys_debit + sys_credit + sys_pix + sys_cashless + sys_other
  ) stored,

  -- Valores da MAQUININHA (fechamento enviado pelo gerente)
  maq_debit      numeric(12,2) not null default 0,
  maq_credit     numeric(12,2) not null default 0,
  maq_pix        numeric(12,2) not null default 0,
  maq_total      numeric(12,2) generated always as (
    maq_debit + maq_credit + maq_pix
  ) stored,

  -- DINHEIRO contado fisicamente
  cash_counted   numeric(12,2) not null default 0,

  -- Status da conciliação
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
create table if not exists expense_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sort_order int not null default 0
);

-- ============================================================
-- DESPESAS (substitui a planilha de segunda-feira do Marcus)
-- ============================================================
create table if not exists expenses (
  id               uuid primary key default gen_random_uuid(),
  expense_date     date not null,
  cost_center_id   uuid references cost_centers(id),  -- null = geral (rateado)
  sub_area_id      uuid references sub_areas(id),
  event_id         uuid references events(id),
  category_id      uuid references expense_categories(id),
  description      text not null,
  amount           numeric(12,2) not null check (amount > 0),
  payment_method   text not null check (payment_method in ('pix','transfer','cash','card','boleto','other')),
  is_general       boolean not null default false,  -- true = ratear entre todas as áreas
  proof_note       text,  -- descrição do comprovante (vai pro WhatsApp)
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now()
);

-- ============================================================
-- RATEIO DE DESPESAS GERAIS
-- Quando is_general=true, define % por CC
-- ============================================================
create table if not exists expense_allocations (
  id             uuid primary key default gen_random_uuid(),
  expense_id     uuid not null references expenses(id) on delete cascade,
  cost_center_id uuid not null references cost_centers(id),
  percentage     numeric(5,2) not null check (percentage > 0 and percentage <= 100),
  amount         numeric(12,2) not null,
  unique (expense_id, cost_center_id)
);

-- ============================================================
-- TRANSAÇÕES DE EVENTOS
-- Receita e despesa específicas de um evento (ex: campeonato)
-- ============================================================
create table if not exists event_transactions (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  type           text not null check (type in ('income','expense')),
  amount         numeric(12,2) not null check (amount > 0),
  description    text not null,
  payment_method text not null check (payment_method in ('pix','transfer','cash','card','boleto','other')),
  transaction_date date not null,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now()
);

-- ============================================================
-- TRIGGER: cria perfil ao criar usuário
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Usuário'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- TRIGGER: auto-status conciliação diária
-- Calcula discrepância ao salvar
-- ============================================================
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
-- RLS
-- ============================================================
alter table cost_centers         enable row level security;
alter table sub_areas            enable row level security;
alter table events               enable row level security;
alter table daily_reports        enable row level security;
alter table expenses             enable row level security;
alter table expense_allocations  enable row level security;
alter table expense_categories   enable row level security;
alter table event_transactions   enable row level security;
alter table profiles             enable row level security;
alter table user_roles           enable row level security;
alter table invites              enable row level security;

-- Helper: role do usuário logado
create or replace function my_role()
returns text language sql security definer stable as $$
  select role from user_roles where user_id = auth.uid() limit 1;
$$;

-- Helper: CC do usuário (area_manager)
create or replace function my_cc()
returns uuid language sql security definer stable as $$
  select cost_center_id from user_roles where user_id = auth.uid() limit 1;
$$;

-- cost_centers: todos leem, só owner/partner escrevem
create policy "cc_read"   on cost_centers for select using (true);
create policy "cc_write"  on cost_centers for all using (my_role() in ('owner','partner'));

-- sub_areas
create policy "sub_read"  on sub_areas for select using (true);
create policy "sub_write" on sub_areas for all using (my_role() in ('owner','partner'));

-- events
create policy "ev_read"   on events for select using (true);
create policy "ev_write"  on events for all using (my_role() in ('owner','partner'));

-- event_transactions
create policy "evt_read"  on event_transactions for select using (true);
create policy "evt_write" on event_transactions for all using (my_role() in ('owner','partner'));

-- expense_categories
create policy "ecat_read" on expense_categories for select using (true);
create policy "ecat_write"on expense_categories for all using (my_role() in ('owner','partner'));

-- daily_reports: owner/partner veem tudo; area_manager vê só seu CC
create policy "dr_read_all"  on daily_reports for select
  using (my_role() in ('owner','partner'));
create policy "dr_read_area" on daily_reports for select
  using (my_role() = 'area_manager' and cost_center_id = my_cc());
create policy "dr_write"     on daily_reports for all
  using (my_role() in ('owner','partner','area_manager'));

-- expenses: owner/partner veem tudo; area_manager vê só seu CC
create policy "exp_read_all"  on expenses for select
  using (my_role() in ('owner','partner'));
create policy "exp_read_area" on expenses for select
  using (my_role() = 'area_manager' and cost_center_id = my_cc());
create policy "exp_write"     on expenses for all
  using (my_role() in ('owner','partner','area_manager'));

-- expense_allocations
create policy "alloc_read"  on expense_allocations for select using (my_role() in ('owner','partner'));
create policy "alloc_write" on expense_allocations for all  using (my_role() in ('owner','partner'));

-- profiles
create policy "prof_read"    on profiles for select using (true);
create policy "prof_own"     on profiles for update using (auth.uid() = id);

-- user_roles
create policy "ur_read"      on user_roles for select using (true);
create policy "ur_write"     on user_roles for all using (my_role() = 'owner');

-- invites
create policy "inv_read"     on invites for select using (my_role() in ('owner','partner'));
create policy "inv_write"    on invites for all   using (my_role() = 'owner');

-- ============================================================
-- SEED: Centros de Custo
-- ============================================================
insert into cost_centers (name, code, sort_order) values
  ('Bar',                    'BAR', 1),
  ('Escolinha',              'ESC', 2),
  ('Society / Quadras',      'SOC', 3),
  ('Estacionamento',         'EST', 4)
on conflict (code) do nothing;

-- SEED: Sub-áreas de Society
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

-- SEED: Categorias de despesa
insert into expense_categories (name, sort_order) values
  ('Aluguel',              1),
  ('Energia elétrica',     2),
  ('Água',                 3),
  ('Internet',             4),
  ('Salários',             5),
  ('Fornecedores',         6),
  ('Manutenção',           7),
  ('Taxa de máquina',      8),
  ('Impostos',             9),
  ('Marketing',           10),
  ('Equipamentos',        11),
  ('Outros',              12)
on conflict do nothing;
