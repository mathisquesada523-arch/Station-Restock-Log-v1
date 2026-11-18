-- Station Restock Log: replace the open "allow anyone" policies.
--
-- After this migration:
--   * Crew (not signed in, role anon) can only INSERT new rows into supply_logs.
--   * Only signed-in users listed in public.supervisors can read, change or delete
--     supply logs and inventory data.
--
-- Not applied automatically. The owner applies it to the live project after the
-- matching front end (Supabase Auth sign-in) is deployed, and after adding the
-- supervisor account(s) to public.supervisors.

begin;

-- 1. Supervisor allowlist ----------------------------------------------------

create table if not exists public.supervisors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.supervisors enable row level security;
-- No policies on purpose: the allowlist is only read through is_supervisor()
-- and managed by the owner in the Supabase dashboard / SQL editor.
revoke all on table public.supervisors from anon, authenticated;

create or replace function public.is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.supervisors s where s.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_supervisor() from public;
grant execute on function public.is_supervisor() to anon, authenticated;

-- 2. Drop the old open policies ---------------------------------------------

drop policy if exists "Allow public delete" on public.supply_logs;
drop policy if exists "Allow public insert" on public.supply_logs;
drop policy if exists "Allow public read" on public.supply_logs;
drop policy if exists "Allow public update" on public.supply_logs;

drop policy if exists "Allow inventory items insert" on public.inventory_items;
drop policy if exists "Allow inventory items read" on public.inventory_items;
drop policy if exists "Allow inventory items update" on public.inventory_items;

drop policy if exists "Allow current inventory counts insert" on public.current_inventory_counts;
drop policy if exists "Allow current inventory counts read" on public.current_inventory_counts;
drop policy if exists "Allow current inventory counts update" on public.current_inventory_counts;

drop policy if exists "Allow inventory movements delete" on public.inventory_movements;
drop policy if exists "Allow inventory movements insert" on public.inventory_movements;
drop policy if exists "Allow inventory movements read" on public.inventory_movements;

drop policy if exists "Allow inventory counts insert" on public.inventory_counts;
drop policy if exists "Allow inventory counts read" on public.inventory_counts;

alter table public.supply_logs enable row level security;
alter table public.inventory_items enable row level security;
alter table public.current_inventory_counts enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_counts enable row level security;

-- 3. Table privileges (second layer under RLS) -------------------------------

revoke all on table
  public.supply_logs,
  public.inventory_items,
  public.current_inventory_counts,
  public.inventory_movements,
  public.inventory_counts
from anon, authenticated;

-- Crew: insert only, and only the columns the crew form sends.
grant insert (date, employee_id, station, category, item, quantity, comments, restocked)
  on table public.supply_logs to anon, authenticated;

-- Signed-in users get table access; the policies below limit it to supervisors.
grant select, insert, update, delete on table
  public.supply_logs,
  public.inventory_items,
  public.current_inventory_counts,
  public.inventory_movements,
  public.inventory_counts
to authenticated;

-- 4. Policies ----------------------------------------------------------------

-- supply_logs: crew may add a fresh, plausible entry.
create policy "Crew can add supply logs"
  on public.supply_logs
  for insert
  to anon, authenticated
  with check (
    coalesce(restocked, false) = false
    and coalesce(archived, false) = false
    and quantity between 1 and 999
    and date between current_date - 365 and current_date + 1
    and char_length(employee_id) between 1 and 50
    and char_length(station) between 1 and 50
    and char_length(category) between 1 and 100
    and char_length(item) between 1 and 100
    and (comments is null or char_length(comments) <= 500)
  );

create policy "Supervisors read supply logs"
  on public.supply_logs for select to authenticated
  using ((select public.is_supervisor()));

create policy "Supervisors update supply logs"
  on public.supply_logs for update to authenticated
  using ((select public.is_supervisor()))
  with check ((select public.is_supervisor()));

create policy "Supervisors delete supply logs"
  on public.supply_logs for delete to authenticated
  using ((select public.is_supervisor()));

-- Inventory tables: supervisors only, every operation.
create policy "Supervisors manage inventory items"
  on public.inventory_items for all to authenticated
  using ((select public.is_supervisor()))
  with check ((select public.is_supervisor()));

create policy "Supervisors manage current inventory counts"
  on public.current_inventory_counts for all to authenticated
  using ((select public.is_supervisor()))
  with check ((select public.is_supervisor()));

create policy "Supervisors manage inventory movements"
  on public.inventory_movements for all to authenticated
  using ((select public.is_supervisor()))
  with check ((select public.is_supervisor()));

create policy "Supervisors manage inventory counts"
  on public.inventory_counts for all to authenticated
  using ((select public.is_supervisor()))
  with check ((select public.is_supervisor()));

commit;

-- After applying, add each supervisor (owner runs this in the SQL editor):
--   insert into public.supervisors (user_id)
--   select id from auth.users where email = '<supervisor email>';
