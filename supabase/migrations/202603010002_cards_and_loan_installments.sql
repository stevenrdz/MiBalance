do $$
begin
  if not exists (select 1 from pg_type where typname = 'debt_installment_status') then
    create type public.debt_installment_status as enum ('PENDING', 'PARTIAL', 'PAID');
  end if;
end$$;

alter table public.cards
  add column if not exists minimum_payment_amount numeric(12,2) check (
    minimum_payment_amount is null or minimum_payment_amount > 0
  ),
  add column if not exists payment_due_date date;

create table if not exists public.debt_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  debt_id uuid not null references public.debts (id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 5242880),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.debt_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  debt_id uuid not null references public.debts (id) on delete cascade,
  document_id uuid references public.debt_documents (id) on delete set null,
  installment_number int not null check (installment_number > 0),
  due_date date not null,
  scheduled_amount numeric(12,2) not null check (scheduled_amount > 0),
  status public.debt_installment_status not null default 'PENDING',
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  paid_at date,
  payment_method public.payment_method,
  notes text,
  receipt_file_name text,
  receipt_file_path text unique,
  receipt_mime_type text,
  receipt_size_bytes int check (
    receipt_size_bytes is null or (receipt_size_bytes > 0 and receipt_size_bytes <= 5242880)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists debt_documents_user_debt_idx on public.debt_documents (user_id, debt_id);
create index if not exists debt_installments_user_debt_idx on public.debt_installments (user_id, debt_id);
create index if not exists debt_installments_due_date_idx on public.debt_installments (user_id, due_date desc);
create unique index if not exists debt_installments_unique_number_idx
  on public.debt_installments (debt_id, installment_number);

drop trigger if exists trg_debt_documents_updated_at on public.debt_documents;
create trigger trg_debt_documents_updated_at before update on public.debt_documents
for each row execute function public.handle_updated_at();

drop trigger if exists trg_debt_installments_updated_at on public.debt_installments;
create trigger trg_debt_installments_updated_at before update on public.debt_installments
for each row execute function public.handle_updated_at();

alter table public.debt_documents enable row level security;
alter table public.debt_installments enable row level security;

drop policy if exists debt_documents_select on public.debt_documents;
create policy debt_documents_select on public.debt_documents
for select using (user_id = auth.uid());

drop policy if exists debt_documents_insert on public.debt_documents;
create policy debt_documents_insert on public.debt_documents
for insert with check (user_id = auth.uid());

drop policy if exists debt_documents_update on public.debt_documents;
create policy debt_documents_update on public.debt_documents
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists debt_documents_delete on public.debt_documents;
create policy debt_documents_delete on public.debt_documents
for delete using (user_id = auth.uid());

drop policy if exists debt_installments_select on public.debt_installments;
create policy debt_installments_select on public.debt_installments
for select using (user_id = auth.uid());

drop policy if exists debt_installments_insert on public.debt_installments;
create policy debt_installments_insert on public.debt_installments
for insert with check (user_id = auth.uid());

drop policy if exists debt_installments_update on public.debt_installments;
create policy debt_installments_update on public.debt_installments
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists debt_installments_delete on public.debt_installments;
create policy debt_installments_delete on public.debt_installments
for delete using (user_id = auth.uid());
