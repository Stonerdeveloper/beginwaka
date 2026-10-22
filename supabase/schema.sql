create table if not exists public.consultation_bookings (
  id uuid primary key default gen_random_uuid(),
  calendly_event_uri text not null unique,
  calendly_invitee_uri text not null,
  invitee_email text not null,
  paystack_reference text not null unique,
  payment_status text not null check (payment_status in ('pending_payment', 'paid', 'expired')),
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists consultation_bookings_expiry_idx on public.consultation_bookings (payment_status, expires_at);
alter table public.consultation_bookings enable row level security;
