-- MiBalance EC schema (Supabase Postgres)
-- Timezone app-level: America/Guayaquil
-- Currency fixed: USD

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type public.transaction_type as enum ('INCOME', 'EXPENSE');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('cash', 'transfer', 'card');
  end if;
  if not exists (select 1 from pg_type where typname = 'debt_type') then
    create type public.debt_type as enum ('LOAN', 'CASH_ADVANCE');
  end if;
end$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  monthly_income_goal numeric(12,2) not null default 0 check (monthly_income_goal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.transaction_type not null,
  name text not null,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  credit_limit numeric(12,2) not null check (credit_limit > 0),
  statement_day int not null check (statement_day between 1 and 31),
  payment_day int not null check (payment_day between 1 and 31),
  currency text not null default 'USD' check (currency = 'USD'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  type public.transaction_type not null,
  amount numeric(12,2) not null check (amount > 0),
  category_id uuid not null references public.categories (id),
  payment_method public.payment_method not null,
  card_id uuid references public.cards (id),
  merchant text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint transactions_card_required check (
    (payment_method = 'card' and card_id is not null) or payment_method <> 'card'
  )
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 5242880),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  date date not null,
  amount numeric(12,2) not null check (amount > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.debt_type not null,
  creditor text not null,
  principal numeric(12,2) not null check (principal > 0),
  start_date date not null,
  term_months int check (term_months is null or term_months > 0),
  interest_rate numeric(6,3) check (interest_rate is null or interest_rate >= 0),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  debt_id uuid not null references public.debts (id) on delete cascade,
  payment_date date not null,
  amount numeric(12,2) not null check (amount > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists categories_unique_name_active_idx
  on public.categories (user_id, type, lower(name))
  where deleted_at is null;

create index if not exists categories_user_type_idx on public.categories (user_id, type);

create index if not exists cards_user_idx on public.cards (user_id);
create index if not exists cards_user_active_idx on public.cards (user_id, is_active);

create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
create index if not exists transactions_user_type_idx on public.transactions (user_id, type);
create index if not exists transactions_user_category_idx on public.transactions (user_id, category_id);
create index if not exists transactions_user_card_idx on public.transactions (user_id, card_id);
create index if not exists transactions_user_payment_method_idx on public.transactions (user_id, payment_method);

create index if not exists attachments_user_idx on public.attachments (user_id);
create index if not exists attachments_tx_idx on public.attachments (transaction_id);

create index if not exists card_payments_user_date_idx on public.card_payments (user_id, date desc);
create index if not exists card_payments_user_card_idx on public.card_payments (user_id, card_id);

create index if not exists debts_user_idx on public.debts (user_id);
create index if not exists debts_user_type_idx on public.debts (user_id, type);
create index if not exists debts_user_active_idx on public.debts (user_id, is_active);

create index if not exists debt_payments_user_debt_idx on public.debt_payments (user_id, debt_id);
create index if not exists debt_payments_user_date_idx on public.debt_payments (user_id, payment_date desc);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.handle_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories
for each row execute function public.handle_updated_at();

drop trigger if exists trg_cards_updated_at on public.cards;
create trigger trg_cards_updated_at before update on public.cards
for each row execute function public.handle_updated_at();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at before update on public.transactions
for each row execute function public.handle_updated_at();

drop trigger if exists trg_attachments_updated_at on public.attachments;
create trigger trg_attachments_updated_at before update on public.attachments
for each row execute function public.handle_updated_at();

drop trigger if exists trg_card_payments_updated_at on public.card_payments;
create trigger trg_card_payments_updated_at before update on public.card_payments
for each row execute function public.handle_updated_at();

drop trigger if exists trg_debts_updated_at on public.debts;
create trigger trg_debts_updated_at before update on public.debts
for each row execute function public.handle_updated_at();

drop trigger if exists trg_debt_payments_updated_at on public.debt_payments;
create trigger trg_debt_payments_updated_at before update on public.debt_payments
for each row execute function public.handle_updated_at();

create or replace function public.create_default_categories_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, type, name, is_active, is_system)
  values
    (target_user_id, 'INCOME', 'Sueldo', true, true),
    (target_user_id, 'INCOME', 'Honorarios', true, true),
    (target_user_id, 'INCOME', 'Ventas', true, true),
    (target_user_id, 'INCOME', 'Remesas', true, true),
    (target_user_id, 'INCOME', 'Bonos', true, true),
    (target_user_id, 'INCOME', 'Ingresos extras', true, true),
    (target_user_id, 'EXPENSE', 'Alimentación', true, true),
    (target_user_id, 'EXPENSE', 'Vivienda', true, true),
    (target_user_id, 'EXPENSE', 'Transporte', true, true),
    (target_user_id, 'EXPENSE', 'Salud', true, true),
    (target_user_id, 'EXPENSE', 'Educación', true, true),
    (target_user_id, 'EXPENSE', 'Servicios básicos', true, true),
    (target_user_id, 'EXPENSE', 'Entretenimiento', true, true),
    (target_user_id, 'EXPENSE', 'Deuda', true, true),
    (target_user_id, 'EXPENSE', 'Ahorro', true, true),
    (target_user_id, 'EXPENSE', 'Impuestos', true, true),
    (target_user_id, 'EXPENSE', 'Mascotas', true, true),
    (target_user_id, 'EXPENSE', 'Otros', true, true)
  on conflict do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update set email = excluded.email;

  perform public.create_default_categories_for_user(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Backfill profiles and categories for existing users.
insert into public.profiles (id, email, display_name)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do update set email = excluded.email;

do $$
declare user_row record;
begin
  for user_row in select id from auth.users loop
    perform public.create_default_categories_for_user(user_row.id);
  end loop;
end$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.cards enable row level security;
alter table public.transactions enable row level security;
alter table public.attachments enable row level security;
alter table public.card_payments enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
for select using (user_id = auth.uid());

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
for insert with check (user_id = auth.uid());

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories
for delete using (user_id = auth.uid());

drop policy if exists cards_select on public.cards;
create policy cards_select on public.cards
for select using (user_id = auth.uid());

drop policy if exists cards_insert on public.cards;
create policy cards_insert on public.cards
for insert with check (user_id = auth.uid());

drop policy if exists cards_update on public.cards;
create policy cards_update on public.cards
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists cards_delete on public.cards;
create policy cards_delete on public.cards
for delete using (user_id = auth.uid());

drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions
for select using (user_id = auth.uid());

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions
for insert with check (user_id = auth.uid());

drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete on public.transactions
for delete using (user_id = auth.uid());

drop policy if exists attachments_select on public.attachments;
create policy attachments_select on public.attachments
for select using (user_id = auth.uid());

drop policy if exists attachments_insert on public.attachments;
create policy attachments_insert on public.attachments
for insert with check (user_id = auth.uid());

drop policy if exists attachments_update on public.attachments;
create policy attachments_update on public.attachments
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists attachments_delete on public.attachments;
create policy attachments_delete on public.attachments
for delete using (user_id = auth.uid());

drop policy if exists card_payments_select on public.card_payments;
create policy card_payments_select on public.card_payments
for select using (user_id = auth.uid());

drop policy if exists card_payments_insert on public.card_payments;
create policy card_payments_insert on public.card_payments
for insert with check (user_id = auth.uid());

drop policy if exists card_payments_update on public.card_payments;
create policy card_payments_update on public.card_payments
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists card_payments_delete on public.card_payments;
create policy card_payments_delete on public.card_payments
for delete using (user_id = auth.uid());

drop policy if exists debts_select on public.debts;
create policy debts_select on public.debts
for select using (user_id = auth.uid());

drop policy if exists debts_insert on public.debts;
create policy debts_insert on public.debts
for insert with check (user_id = auth.uid());

drop policy if exists debts_update on public.debts;
create policy debts_update on public.debts
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists debts_delete on public.debts;
create policy debts_delete on public.debts
for delete using (user_id = auth.uid());

drop policy if exists debt_payments_select on public.debt_payments;
create policy debt_payments_select on public.debt_payments
for select using (user_id = auth.uid());

drop policy if exists debt_payments_insert on public.debt_payments;
create policy debt_payments_insert on public.debt_payments
for insert with check (user_id = auth.uid());

drop policy if exists debt_payments_update on public.debt_payments;
create policy debt_payments_update on public.debt_payments
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists debt_payments_delete on public.debt_payments;
create policy debt_payments_delete on public.debt_payments
for delete using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "attachments_objects_select" on storage.objects;
create policy "attachments_objects_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "attachments_objects_insert" on storage.objects;
create policy "attachments_objects_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "attachments_objects_update" on storage.objects;
create policy "attachments_objects_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "attachments_objects_delete" on storage.objects;
create policy "attachments_objects_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

