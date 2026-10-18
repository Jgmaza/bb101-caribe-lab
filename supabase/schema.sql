-- Orilla — modelo de datos completo.
-- Idempotente: se puede aplicar varias veces sobre el mismo proyecto Supabase.
-- Aplicar con `npm run db:apply` (desde frontend/) o pegándolo en el SQL editor.
-- Todo cambio de esquema se hace aquí; nada se configura a mano en el dashboard.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'received', 'distributed', 'failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'project_kind') then
    create type public.project_kind as enum ('banda', 'staff', 'otro');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

-- Personas con cuenta en Orilla. Cada una tiene UNA wallet custodial (creada al registrarse),
-- aunque esté en varios proyectos. Para cambiar una contraseña a mano, ver frontend/README.md.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 2 and 60),
  -- bcrypt ($2a$/$2b$, costo 12). Lo genera bcryptjs o crypt(..., gen_salt('bf', 12)).
  password_hash text not null check (password_hash ~ '^\$2[aby]\$\d{2}\$.{53}$'),
  stellar_public_key text not null unique check (stellar_public_key ~ '^G[A-Z2-7]{55}$'),
  stellar_secret_enc text not null,
  created_at timestamptz not null default now()
);

-- Sesiones de login. La cookie lleva un token aleatorio; aquí solo su sha256 (hex).
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions (user_id);

-- Un proyecto es el grupo (banda, staff) que cobra en conjunto.
-- Tiene su propia cuenta Stellar custodial: ahí paga el organizador.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  name text not null check (char_length(name) between 2 and 120),
  kind public.project_kind not null default 'banda',
  stellar_public_key text not null unique check (stellar_public_key ~ '^G[A-Z2-7]{55}$'),
  stellar_secret_enc text not null,
  -- sha256 (hex) del token del link de administración. El token en claro nunca se guarda.
  admin_token_hash text not null check (admin_token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

-- Para bases creadas antes de que existiera la columna (esas filas quedan sin link de administración).
alter table public.projects add column if not exists admin_token_hash text;
create unique index if not exists projects_admin_token_hash_key on public.projects (admin_token_hash);

-- Integrantes con su porcentaje en puntos básicos (10000 = 100%).
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (phone ~ '^[0-9]{10,12}$'),
  role text not null default '' check (char_length(role) <= 60),
  share_bps integer not null check (share_bps between 1 and 10000),
  stellar_public_key text not null unique check (stellar_public_key ~ '^G[A-Z2-7]{55}$'),
  stellar_secret_enc text not null,
  created_at timestamptz not null default now(),
  unique (project_id, phone)
);

create index if not exists members_project_id_idx on public.members (project_id);
create index if not exists members_phone_idx on public.members (phone);

-- Un pago de una persona a la cuenta del proyecto. En Stellar va en XLM (stroops);
-- amount_cop es lo que escribió y cop_per_xlm la tasa congelada al momento del pago.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  payer_id uuid not null references public.users (id) on delete restrict,
  amount_cop bigint not null check (amount_cop > 0),
  amount_stroops bigint not null check (amount_stroops > 0),
  cop_per_xlm numeric(20, 6) not null check (cop_per_xlm > 0),
  status public.payment_status not null default 'pending',
  -- recarga automática previa al pago (si el saldo no alcanzaba)
  topup_tx_hash text check (topup_tx_hash ~ '^[0-9a-f]{64}$'),
  payment_tx_hash text unique check (payment_tx_hash ~ '^[0-9a-f]{64}$'),
  distribution_tx_hash text unique check (distribution_tx_hash ~ '^[0-9a-f]{64}$'),
  error text,
  created_at timestamptz not null default now(),
  -- Un pago repartido siempre tiene ambos hashes.
  check (status <> 'distributed' or (payment_tx_hash is not null and distribution_tx_hash is not null)),
  check (status <> 'received' or payment_tx_hash is not null)
);

create index if not exists payments_project_id_idx on public.payments (project_id, created_at desc);
create index if not exists payments_payer_id_idx on public.payments (payer_id, created_at desc);

-- Lo que recibió cada integrante en un pago (stroops). share_bps es la foto del % al momento del reparto.
create table if not exists public.distributions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete restrict,
  share_bps integer not null check (share_bps between 1 and 10000),
  amount_stroops bigint not null check (amount_stroops >= 0),
  created_at timestamptz not null default now(),
  unique (payment_id, member_id)
);

create index if not exists distributions_member_id_idx on public.distributions (member_id, created_at desc);

-- Recargas de saldo. 'prueba' = friendbot de testnet; 'banco' = anchor SEP-24 (futuro).
-- Una fila por transacción de Stellar (una recarga grande puede ser varias rondas).
create table if not exists public.topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  amount_stroops bigint not null check (amount_stroops > 0),
  cop_per_xlm numeric(20, 6) not null check (cop_per_xlm > 0),
  tx_hash text not null unique check (tx_hash ~ '^[0-9a-f]{64}$'),
  source text not null default 'prueba' check (source in ('prueba', 'banco')),
  created_at timestamptz not null default now()
);

create index if not exists topups_user_id_idx on public.topups (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Invariantes (constraint triggers diferidos: se validan al cerrar la transacción)
-- ---------------------------------------------------------------------------

-- Los porcentajes de un proyecto siempre suman 100%.
create or replace function public.check_project_shares()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  pid uuid := coalesce(new.project_id, old.project_id);
  total integer;
begin
  if not exists (select 1 from projects where id = pid) then
    return null; -- proyecto borrado en cascada
  end if;
  select coalesce(sum(share_bps), 0) into total from members where project_id = pid;
  if total <> 10000 then
    raise exception 'Los porcentajes del proyecto deben sumar 100%% (suman %%%)', round(total / 100.0, 2)
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

drop trigger if exists members_shares_sum on public.members;
create constraint trigger members_shares_sum
  after insert or update or delete on public.members
  deferrable initially deferred
  for each row execute function public.check_project_shares();

-- Todo proyecto tiene al menos un integrante.
create or replace function public.check_project_has_members()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from projects where id = new.id)
     and not exists (select 1 from members where project_id = new.id) then
    raise exception 'Un proyecto necesita al menos un integrante' using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

drop trigger if exists projects_has_members on public.projects;
create constraint trigger projects_has_members
  after insert on public.projects
  deferrable initially deferred
  for each row execute function public.check_project_has_members();

-- El reparto de un pago suma exactamente el monto pagado.
create or replace function public.check_distribution_sum()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  pid uuid := coalesce(new.payment_id, old.payment_id);
  paid bigint;
  total bigint;
begin
  select amount_stroops into paid from payments where id = pid;
  if paid is null then
    return null;
  end if;
  select coalesce(sum(amount_stroops), 0) into total from distributions where payment_id = pid;
  if total <> 0 and total <> paid then
    raise exception 'El reparto (%) no coincide con el pago (%)', total, paid
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

drop trigger if exists distributions_sum on public.distributions;
create constraint trigger distributions_sum
  after insert or update or delete on public.distributions
  deferrable initially deferred
  for each row execute function public.check_distribution_sum();

-- Los integrantes del reparto pertenecen al proyecto del pago.
create or replace function public.check_distribution_member()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from payments p
    join members m on m.project_id = p.project_id
    where p.id = new.payment_id and m.id = new.member_id
  ) then
    raise exception 'El integrante no pertenece al proyecto del pago' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists distributions_member on public.distributions;
create trigger distributions_member
  before insert or update on public.distributions
  for each row execute function public.check_distribution_member();

-- ---------------------------------------------------------------------------
-- Funciones RPC (cada llamada es una transacción, así los triggers diferidos aplican al conjunto)
-- ---------------------------------------------------------------------------

-- Versión anterior, sin link de administración.
drop function if exists public.create_project(text, text, public.project_kind, text, text, jsonb);

-- p_members: [{name, phone, role, share_bps, stellar_public_key, stellar_secret_enc}]
create or replace function public.create_project(
  p_slug text,
  p_name text,
  p_kind public.project_kind,
  p_stellar_public_key text,
  p_stellar_secret_enc text,
  p_admin_token_hash text,
  p_members jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into projects (slug, name, kind, stellar_public_key, stellar_secret_enc, admin_token_hash)
  values (p_slug, p_name, p_kind, p_stellar_public_key, p_stellar_secret_enc, p_admin_token_hash)
  returning id into new_id;

  insert into members (project_id, name, phone, role, share_bps, stellar_public_key, stellar_secret_enc)
  select new_id, m.name, m.phone, coalesce(m.role, ''), m.share_bps, m.stellar_public_key, m.stellar_secret_enc
  from jsonb_to_recordset(p_members) as m(
    name text, phone text, role text, share_bps integer, stellar_public_key text, stellar_secret_enc text
  );

  return new_id;
end;
$$;

-- p_members: [{id, name, role, share_bps}]. Solo integrantes del proyecto.
create or replace function public.update_members(p_project_id uuid, p_members jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  touched integer;
begin
  update members m
  set name = u.name, role = coalesce(u.role, ''), share_bps = u.share_bps
  from jsonb_to_recordset(p_members) as u(id uuid, name text, role text, share_bps integer)
  where m.id = u.id and m.project_id = p_project_id;

  get diagnostics touched = row_count;
  if touched <> jsonb_array_length(p_members) then
    raise exception 'Hay integrantes que no pertenecen al proyecto' using errcode = 'check_violation';
  end if;
end;
$$;

-- Registra el reparto ejecutado en Stellar y marca el pago como repartido.
-- p_rows: [{member_id, share_bps, amount_stroops}] (amount_stroops como texto: no cabe en un double)
create or replace function public.record_distribution(
  p_payment_id uuid,
  p_distribution_tx_hash text,
  p_rows jsonb
)
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into distributions (payment_id, member_id, share_bps, amount_stroops)
  select p_payment_id, r.member_id, r.share_bps, r.amount_stroops
  from jsonb_to_recordset(p_rows) as r(member_id uuid, share_bps integer, amount_stroops bigint);

  update payments
  set status = 'distributed', distribution_tx_hash = p_distribution_tx_hash, error = null
  where id = p_payment_id and status in ('received', 'failed');

  if not found then
    raise exception 'El pago % no está pendiente de reparto', p_payment_id using errcode = 'check_violation';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seguridad: solo el servidor (service_role) accede. Sin policies públicas.
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.topups enable row level security;
alter table public.projects enable row level security;
alter table public.members enable row level security;
alter table public.payments enable row level security;
alter table public.distributions enable row level security;

revoke all on public.users, public.sessions, public.topups from anon, authenticated;
revoke all on public.projects, public.members, public.payments, public.distributions from anon, authenticated;

revoke execute on function public.create_project(text, text, public.project_kind, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.update_members(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.record_distribution(uuid, text, jsonb) from public, anon, authenticated;

grant usage on schema public to service_role;
grant all on public.users, public.sessions, public.topups to service_role;
grant all on public.projects, public.members, public.payments, public.distributions to service_role;
grant execute on function public.create_project(text, text, public.project_kind, text, text, text, jsonb) to service_role;
grant execute on function public.update_members(uuid, jsonb) to service_role;
grant execute on function public.record_distribution(uuid, text, jsonb) to service_role;
