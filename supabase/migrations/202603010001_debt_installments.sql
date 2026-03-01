alter type public.debt_type add value if not exists 'DEFERRED';

alter table public.debts
  add column if not exists installment_amount numeric(12,2) check (
    installment_amount is null or installment_amount > 0
  ),
  add column if not exists payment_day int check (
    payment_day is null or payment_day between 1 and 31
  ),
  add column if not exists current_installment int not null default 1 check (
    current_installment > 0
  );

alter table public.debt_payments
  add column if not exists installment_number int check (
    installment_number is null or installment_number > 0
  ),
  add column if not exists payment_method public.payment_method,
  add column if not exists receipt_file_name text,
  add column if not exists receipt_file_path text,
  add column if not exists receipt_mime_type text,
  add column if not exists receipt_size_bytes int check (
    receipt_size_bytes is null or (receipt_size_bytes > 0 and receipt_size_bytes <= 5242880)
  );

create unique index if not exists debt_payments_receipt_path_idx
  on public.debt_payments (receipt_file_path)
  where receipt_file_path is not null;
