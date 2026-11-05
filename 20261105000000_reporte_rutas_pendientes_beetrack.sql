create table public.reporte_periodos (
  id bigint generated always as identity primary key,
  reporte text not null,
  periodo date not null,
  archivo text,
  actualizado_en timestamptz not null default now(),
  unique (reporte, periodo)
);
create table public.rutas_pendientes (
  id bigint generated always as identity primary key,
  periodo_id bigint not null references public.reporte_periodos(id) on delete cascade,
  identificador text, orden text, sucursal text, fecha_estimada text, estado text, usuario_movil text, sucursal_reporte text
);
create index rutas_pendientes_periodo_idx on public.rutas_pendientes(periodo_id);
create table public.rutas_resultado (
  id bigint generated always as identity primary key,
  periodo_id bigint not null references public.reporte_periodos(id) on delete cascade,
  sucursal text not null,
  ordenes_pendientes integer not null,
  cumplimiento_gerente text, ponderado_gerente numeric,
  cumplimiento_administrativo text, ponderado_administrativo numeric,
  auditoria_gerente numeric,
  unique (periodo_id, sucursal)
);
alter table public.reporte_periodos enable row level security;
alter table public.rutas_pendientes enable row level security;
alter table public.rutas_resultado enable row level security;
create policy "usuarios autenticados" on public.reporte_periodos for all to authenticated using (true) with check (true);
create policy "usuarios autenticados" on public.rutas_pendientes for all to authenticated using (true) with check (true);
create policy "usuarios autenticados" on public.rutas_resultado for all to authenticated using (true) with check (true);

create or replace function public.guardar_reporte_rutas(p_periodo date, p_archivo text, p_detalle jsonb, p_resultado jsonb)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare v_id bigint;
begin
  insert into public.reporte_periodos (reporte, periodo, archivo, actualizado_en)
  values ('rutas_pendientes_beetrack', p_periodo, p_archivo, now())
  on conflict (reporte, periodo) do update set archivo = excluded.archivo, actualizado_en = now()
  returning id into v_id;
  delete from public.rutas_pendientes where periodo_id = v_id;
  delete from public.rutas_resultado where periodo_id = v_id;
  insert into public.rutas_pendientes (periodo_id, identificador, orden, sucursal, fecha_estimada, estado, usuario_movil, sucursal_reporte)
  select v_id, x->>'identificador', x->>'orden', x->>'sucursal', x->>'fecha_estimada', x->>'estado', x->>'usuario_movil', x->>'sucursal_reporte'
  from jsonb_array_elements(p_detalle) x;
  insert into public.rutas_resultado (periodo_id, sucursal, ordenes_pendientes, cumplimiento_gerente, ponderado_gerente, cumplimiento_administrativo, ponderado_administrativo, auditoria_gerente)
  select v_id, x->>'sucursal', (x->>'ordenes_pendientes')::int, x->>'cumplimiento_gerente', nullif(x->>'ponderado_gerente','')::numeric,
         x->>'cumplimiento_administrativo', nullif(x->>'ponderado_administrativo','')::numeric, nullif(x->>'auditoria_gerente','')::numeric
  from jsonb_array_elements(p_resultado) x;
  return v_id;
end; $$;
revoke execute on function public.guardar_reporte_rutas(date, text, jsonb, jsonb) from public, anon;
grant execute on function public.guardar_reporte_rutas(date, text, jsonb, jsonb) to authenticated;
