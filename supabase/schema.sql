-- Client Management Dashboard — schema (PRD §9, §11)
-- Idempotent: safe to run more than once.

create extension if not exists pgcrypto;

-- Human-readable IDs: CL-001 … CL-999, CL-1000 …
create sequence if not exists client_code_seq;
create sequence if not exists project_code_seq;
create sequence if not exists payment_code_seq;

create or replace function pad_code(prefix text, n bigint) returns text
language sql immutable as $$
  select prefix || case when n < 1000 then lpad(n::text, 3, '0') else n::text end
$$;

create or replace function today_ist() returns date
language sql stable as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

create or replace function set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ───────────────────────── clients
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  client_code text not null unique default pad_code('CL-', nextval('client_code_seq')),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  contact_person text,
  phone text,
  email text,
  source text check (source in ('Referral','LinkedIn','Website','Cold Outreach','Other')),
  status text not null default 'Lead'
    check (status in ('Lead','Contacted','Proposal Sent','Closed','Delivered','Lost')),
  expected_value numeric(12,2) check (expected_value >= 0),
  follow_up_date date,
  lost_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  project_code text not null unique default pad_code('PR-', nextval('project_code_seq')),
  client_id uuid not null references clients(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  start_date date not null,
  deadline date not null,
  priority text not null default 'Medium' check (priority in ('High','Medium','Low')),
  status text not null default 'Not Started'
    check (status in ('Not Started','In Progress','On Hold','Completed','Cancelled')),
  value numeric(12,2) check (value >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deadline_after_start check (deadline >= start_date)
);

-- ───────────────────────── payments
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  payment_code text not null unique default pad_code('PY-', nextval('payment_code_seq')),
  client_id uuid not null references clients(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null default today_ist(),
  month date generated always as (payment_date - (extract(day from payment_date)::int - 1)) stored,
  mode text check (mode in ('UPI','Bank Transfer','Cash','Card','Cheque','Other')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function payments_not_future() returns trigger
language plpgsql as $$
begin
  if new.payment_date > today_ist() then
    raise exception 'Payment date cannot be in the future';
  end if;
  return new;
end $$;

-- ───────────────────────── todos
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  due_date date,
  priority text check (priority in ('High','Medium','Low')),
  is_done boolean not null default false,
  done_at timestamptz,
  sort_order int not null default 0,
  project_id uuid references projects(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── triggers
do $$
declare t text;
begin
  foreach t in array array['clients','projects','payments','todos'] loop
    execute format('drop trigger if exists %I_updated_at on %I', t, t);
    execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

drop trigger if exists payments_date_check on payments;
create trigger payments_date_check before insert or update on payments
  for each row execute function payments_not_future();

-- ───────────────────────── indexes
create index if not exists projects_client_idx on projects(client_id);
create index if not exists projects_status_deadline_idx on projects(status, deadline);
create index if not exists payments_client_idx on payments(client_id);
create index if not exists payments_month_idx on payments(month);
create index if not exists payments_date_idx on payments(payment_date desc);
create index if not exists todos_due_done_idx on todos(due_date, is_done);
create index if not exists clients_status_idx on clients(status);

-- ───────────────────────── views (security_invoker so RLS still applies)
create or replace view monthly_income with (security_invoker = true) as
  select month, sum(amount)::numeric(14,2) as total, count(*)::int as count
  from payments group by month;

create or replace view project_timeline with (security_invoker = true) as
  select
    p.*,
    c.client_code,
    c.name as client_name,
    (p.deadline - p.start_date + 1) as duration_days,
    case when p.status = 'Not Started' then p.start_date - today_ist() end as days_until_start,
    (p.deadline - today_ist()) as days_left,
    case p.priority when 'High' then 1 when 'Medium' then 2 else 3 end as priority_rank,
    case
      when p.status in ('Completed','Cancelled','On Hold') then null
      when p.deadline < today_ist() then 'Overdue'
      when p.status = 'Not Started' and p.start_date < today_ist() then 'Should Have Started'
      when p.deadline <= today_ist() + 7 then 'Due Soon'
      when p.status = 'Not Started' and p.start_date <= today_ist() + 2 then 'Start Soon'
    end as timeline_tag
  from projects p
  join clients c on c.id = p.client_id;

-- ───────────────────────── security: RLS on, no public policies
alter table clients  enable row level security;
alter table projects enable row level security;
alter table payments enable row level security;
alter table todos    enable row level security;

revoke all on clients, projects, payments, todos, monthly_income, project_timeline from anon, authenticated;

-- ───────────────────────── v2 (16 Nov 2026): optional project dates, project files
alter table projects alter column start_date drop not null;
alter table projects alter column deadline drop not null;

create table if not exists project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  path text not null unique,
  size bigint,
  mime text,
  created_at timestamptz not null default now()
);
create index if not exists project_files_project_idx on project_files(project_id);
alter table project_files enable row level security;
revoke all on project_files from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 52428800)
on conflict (id) do nothing;

-- ───────────────────────── v3 (16 Nov 2026): Won → Closed, new Delivered status
alter table clients drop constraint if exists clients_status_check;
update clients set status = 'Closed' where status = 'Won';
alter table clients add constraint clients_status_check
  check (status in ('Lead','Contacted','Proposal Sent','Closed','Delivered','Lost'));
