-- Auditoría de Colaboración: checklist por sucursal y auditorías por sucursal y mes.
-- Checklist propio de cada sucursal (importado desde Excel). Si no hay fila, la app usa el de Kuroda Mosaikos.
create table public.auditoria_checklists (
  sucursal text primary key,
  plantilla jsonb not null,
  actualizado_en timestamptz not null default now()
);
-- Una auditoría de colaboración por sucursal y mes.
create table public.auditorias_colab (
  id bigint generated always as identity primary key,
  sucursal text not null,
  periodo date not null,
  nombre text,
  aplicar boolean not null default true,
  resp jsonb not null default '{}'::jsonb,
  obs jsonb not null default '{}'::jsonb,
  puntos integer,
  cumplen integer,
  pct numeric,
  estatus text,
  actualizado_en timestamptz not null default now(),
  unique (sucursal, periodo)
);
alter table public.auditoria_checklists enable row level security;
alter table public.auditorias_colab enable row level security;
create policy "usuarios autenticados" on public.auditoria_checklists for all to authenticated using (true) with check (true);
create policy "usuarios autenticados" on public.auditorias_colab for all to authenticated using (true) with check (true);
