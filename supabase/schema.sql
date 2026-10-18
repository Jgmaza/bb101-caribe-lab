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
-- Tiene su propia cuenta Stellar custodial: ahí llega el pago y desde ahí se reparte.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  name text not null check (char_length(name) between 2 and 120),
  kind public.project_kind not null default 'banda',
  stellar_public_key text not null unique check (stellar_public_key ~ '^G[A-Z2-7]{55}$'),
  stellar_secret_enc text not null,
  created_by uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Integrantes: personas registradas con su % en puntos básicos (10000 = 100%).
-- El reparto va a la wallet de cada usuario. Solo los admins editan el proyecto.
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete restrict,
  role text not null default '' check (char_length(role) <= 60),
  share_bps integer not null check (share_bps between 1 and 10000),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_members_user_id_idx on public.project_members (user_id);

-- Historial de cambios de integrantes y %. before/after: [{user_id, username, display_name,
-- role, share_bps, is_admin}]. La creación del proyecto queda con before = [].
create table if not exists public.share_changes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  changed_by uuid not null references public.users (id) on delete restrict,
  before jsonb not null check (jsonb_typeof(before) = 'array'),
  after jsonb not null check (jsonb_typeof(after) = 'array'),
  created_at timestamptz not null default now()
);

create index if not exists share_changes_project_id_idx on public.share_changes (project_id, created_at desc);

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

-- Lo que recibió cada persona en un pago (stroops). share_bps es la foto del % al momento del
-- reparto. Apunta al usuario y no a project_members: así se puede sacar del proyecto a alguien
-- que ya cobró sin perder el historial.
create table if not exists public.distributions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete restrict,
  share_bps integer not null check (share_bps between 1 and 10000),
  amount_stroops bigint not null check (amount_stroops >= 0),
  created_at timestamptz not null default now(),
  unique (payment_id, user_id)
);

create index if not exists distributions_user_id_idx on public.distributions (user_id, created_at desc);

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

-- Los porcentajes de un proyecto siempre suman 100%. Como sin integrantes suman 0, esto
-- también impide dejar un proyecto vacío.
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
  select coalesce(sum(share_bps), 0) into total from project_members where project_id = pid;
  if total <> 10000 then
    raise exception 'Los porcentajes del proyecto deben sumar 100%% (suman %)',
      trim_scale(round(total / 100.0, 2))::text || '%'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

drop trigger if exists project_members_shares_sum on public.project_members;
create constraint trigger project_members_shares_sum
  after insert or update or delete on public.project_members
  deferrable initially deferred
  for each row execute function public.check_project_shares();

-- Todo proyecto tiene al menos un admin.
create or replace function public.check_project_has_admin()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  pid uuid := coalesce(new.project_id, old.project_id);
begin
  if exists (select 1 from projects where id = pid)
     and not exists (select 1 from project_members where project_id = pid and is_admin) then
    raise exception 'Un proyecto necesita al menos un admin' using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

drop trigger if exists project_members_has_admin on public.project_members;
create constraint trigger project_members_has_admin
  after insert or update or delete on public.project_members
  deferrable initially deferred
  for each row execute function public.check_project_has_admin();

-- Todo proyecto nace con al menos un integrante (los triggers de project_members no se
-- disparan si el proyecto se crea sin filas).
create or replace function public.check_project_has_members()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from projects where id = new.id)
     and not exists (select 1 from project_members where project_id = new.id) then
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

-- Quien recibe en un reparto es integrante del proyecto del pago (al momento del reparto).
create or replace function public.check_distribution_member()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from payments p
    join project_members pm on pm.project_id = p.project_id
    where p.id = new.payment_id and pm.user_id = new.user_id
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

-- Foto de los integrantes para share_changes, en un orden fijo para poder compararlas.
create or replace function public.project_members_snapshot(p_project_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', pm.user_id,
        'username', u.username,
        'display_name', u.display_name,
        'role', pm.role,
        'share_bps', pm.share_bps,
        'is_admin', pm.is_admin
      )
      order by pm.share_bps desc, u.username
    ),
    '[]'::jsonb
  )
  from project_members pm
  join users u on u.id = pm.user_id
  where pm.project_id = p_project_id;
$$;

-- p_members: [{user_id, role, share_bps, is_admin}]. Quien crea entra como integrante y admin.
create or replace function public.create_project(
  p_slug text,
  p_name text,
  p_kind public.project_kind,
  p_stellar_public_key text,
  p_stellar_secret_enc text,
  p_created_by uuid,
  p_members jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  new_id uuid;
begin
  if not exists (
    select 1
    from jsonb_to_recordset(p_members) as m(user_id uuid, is_admin boolean)
    where m.user_id = p_created_by and m.is_admin
  ) then
    raise exception 'Quien crea el proyecto debe quedar como integrante y admin'
      using errcode = 'check_violation';
  end if;

  insert into projects (slug, name, kind, stellar_public_key, stellar_secret_enc, created_by)
  values (p_slug, p_name, p_kind, p_stellar_public_key, p_stellar_secret_enc, p_created_by)
  returning id into new_id;

  insert into project_members (project_id, user_id, role, share_bps, is_admin)
  select new_id, m.user_id, coalesce(m.role, ''), m.share_bps, coalesce(m.is_admin, false)
  from jsonb_to_recordset(p_members) as m(user_id uuid, role text, share_bps integer, is_admin boolean);

  insert into share_changes (project_id, changed_by, before, after)
  values (new_id, p_created_by, '[]'::jsonb, project_members_snapshot(new_id));

  return new_id;
end;
$$;

-- Reemplaza la lista de integrantes (altas, bajas, %, roles y admins) y deja el cambio en
-- share_changes. p_members: [{user_id, role, share_bps, is_admin}]. Solo un admin puede.
-- Devuelve false si no había nada que cambiar.
create or replace function public.update_project_members(
  p_project_id uuid,
  p_changed_by uuid,
  p_members jsonb
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  before_snapshot jsonb;
  after_snapshot jsonb;
begin
  -- Bloquea el proyecto: dos ediciones al tiempo se aplican una detrás de la otra.
  perform 1 from projects where id = p_project_id for update;
  if not found then
    raise exception 'El proyecto no existe' using errcode = 'no_data_found';
  end if;
  if not exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = p_changed_by and is_admin
  ) then
    raise exception 'Solo los admins pueden editar el proyecto' using errcode = 'insufficient_privilege';
  end if;

  before_snapshot := project_members_snapshot(p_project_id);

  delete from project_members pm
  where pm.project_id = p_project_id
    and not exists (
      select 1 from jsonb_to_recordset(p_members) as m(user_id uuid) where m.user_id = pm.user_id
    );

  insert into project_members (project_id, user_id, role, share_bps, is_admin)
  select p_project_id, m.user_id, coalesce(m.role, ''), m.share_bps, coalesce(m.is_admin, false)
  from jsonb_to_recordset(p_members) as m(user_id uuid, role text, share_bps integer, is_admin boolean)
  on conflict (project_id, user_id) do update
    set role = excluded.role, share_bps = excluded.share_bps, is_admin = excluded.is_admin;

  after_snapshot := project_members_snapshot(p_project_id);
  if after_snapshot = before_snapshot then
    return false;
  end if;

  insert into share_changes (project_id, changed_by, before, after)
  values (p_project_id, p_changed_by, before_snapshot, after_snapshot);
  return true;
end;
$$;

-- Registra el reparto ejecutado en Stellar y marca el pago como repartido.
-- p_rows: [{user_id, share_bps, amount_stroops}] (amount_stroops como texto: no cabe en un double)
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
  insert into distributions (payment_id, user_id, share_bps, amount_stroops)
  select p_payment_id, r.user_id, r.share_bps, r.amount_stroops
  from jsonb_to_recordset(p_rows) as r(user_id uuid, share_bps integer, amount_stroops bigint);

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
alter table public.project_members enable row level security;
alter table public.share_changes enable row level security;
alter table public.payments enable row level security;
alter table public.distributions enable row level security;

revoke all on public.users, public.sessions, public.topups from anon, authenticated;
revoke all on public.projects, public.project_members, public.share_changes from anon, authenticated;
revoke all on public.payments, public.distributions from anon, authenticated;

revoke execute on function public.project_members_snapshot(uuid) from public, anon, authenticated;
revoke execute on function public.create_project(text, text, public.project_kind, text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.update_project_members(uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.record_distribution(uuid, text, jsonb) from public, anon, authenticated;

grant usage on schema public to service_role;
grant all on public.users, public.sessions, public.topups to service_role;
grant all on public.projects, public.project_members, public.share_changes to service_role;
grant all on public.payments, public.distributions to service_role;
grant execute on function public.project_members_snapshot(uuid) to service_role;
grant execute on function public.create_project(text, text, public.project_kind, text, text, uuid, jsonb) to service_role;
grant execute on function public.update_project_members(uuid, uuid, jsonb) to service_role;
grant execute on function public.record_distribution(uuid, text, jsonb) to service_role;
