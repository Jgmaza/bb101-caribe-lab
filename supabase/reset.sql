-- Orilla — borra TODOS los objetos de Orilla (tablas, datos, funciones, tipos).
-- Irreversible. Después hay que volver a aplicar schema.sql.
-- Uso: npm run db:reset -- --yes   (desde frontend/), luego npm run db:apply.
-- Las cuentas Stellar de testnet no se borran: solo quedan huérfanas.

-- Funciones RPC: se borran todas las sobrecargas por nombre, existan o no sus tipos.
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_project', 'update_members', 'update_project_members', 'record_distribution',
        'project_members_snapshot'
      )
  loop
    execute format('drop function %s', f);
  end loop;
end
$$;

-- cascade arrastra los triggers de cada tabla.
drop table if exists public.withdrawals cascade;
drop table if exists public.topups cascade;
drop table if exists public.distributions cascade;
drop table if exists public.payments cascade;
drop table if exists public.share_changes cascade;
drop table if exists public.project_members cascade;
drop table if exists public.members cascade;
drop table if exists public.projects cascade;
drop table if exists public.sessions cascade;
drop table if exists public.users cascade;

drop function if exists public.check_project_shares();
drop function if exists public.check_project_has_members();
drop function if exists public.check_project_has_admin();
drop function if exists public.check_distribution_sum();
drop function if exists public.check_distribution_member();

drop type if exists public.payment_status;
drop type if exists public.withdrawal_status;
drop type if exists public.withdrawal_kind;
drop type if exists public.project_kind;
