-- Chaparra · esquema de sincronización multi-dispositivo
--
-- Diseño: una sola tabla de registros con el contenido en JSONB.
--
-- ¿Por qué no una tabla por entidad? Porque la app es local-first: el servidor
-- no consulta ni calcula nada, solo guarda y devuelve lo que cambió. Una tabla
-- genérica da sincronización registro a registro (solo viaja lo modificado, que
-- es lo que importa con datos de móvil) sin tener que mapear cada campo ni
-- migrar el esquema cada vez que la ficha del animal gane un dato.
--
-- ¿Por qué no un único documento por explotación? Porque cualquier cambio
-- obligaría a subir y bajar la explotación entera, fotos de facturas incluidas.

create table if not exists public.registros (
  user_id     uuid        not null references auth.users on delete cascade,
  -- 'explotacion' | 'animal' | 'factura' | 'plantilla' | 'ordeno' | 'pesada'
  tipo        text        not null,
  id          text        not null,
  datos       jsonb       not null,
  -- Marca de la última modificación. Es el árbitro cuando hay conflicto.
  actualizado timestamptz not null default now(),
  -- Borrado lógico: sin esta lápida, un registro eliminado en el móvil
  -- reaparecería en la siguiente sincronización desde el ordenador.
  borrado     boolean     not null default false,
  primary key (user_id, tipo, id),
  constraint tipo_valido check (
    tipo in ('explotacion', 'animal', 'factura', 'plantilla', 'ordeno', 'pesada')
  ),
  constraint id_no_vacio check (length(id) between 1 and 120)
);

-- La sincronización siempre pregunta "qué ha cambiado desde tal momento".
create index if not exists registros_por_cambio
  on public.registros (user_id, actualizado desc);

-- Un crotal no puede repetirse dentro de la misma explotación, pero sí puede
-- reutilizarse si el animal anterior fue eliminado.
create unique index if not exists animales_crotal_unico
  on public.registros (user_id, (datos ->> 'crotal'))
  where tipo = 'animal' and borrado = false;

-- `actualizado` lo pone el servidor, no el cliente: si lo fijara el dispositivo,
-- un móvil con la hora mal puesta ganaría todos los conflictos para siempre.
create or replace function public.marcar_actualizado()
returns trigger
language plpgsql
as $$
begin
  new.actualizado := now();
  return new;
end;
$$;

drop trigger if exists registros_actualizado on public.registros;
create trigger registros_actualizado
  before insert or update on public.registros
  for each row execute function public.marcar_actualizado();

-- ---------------------------------------------------------------------------
-- Seguridad a nivel de fila
--
-- Esta es la protección real contra una descarga masiva: no es que esté
-- prohibida, es que la consulta no puede devolver filas ajenas. Aunque alguien
-- use la clave pública de la app y escriba sus propias consultas, Postgres solo
-- le devolverá lo suyo.
-- ---------------------------------------------------------------------------

alter table public.registros enable row level security;
-- Ni siquiera el dueño de la tabla se salta las políticas.
alter table public.registros force row level security;

drop policy if exists registros_lectura on public.registros;
create policy registros_lectura on public.registros
  for select using (auth.uid() = user_id);

drop policy if exists registros_alta on public.registros;
create policy registros_alta on public.registros
  for insert with check (auth.uid() = user_id);

drop policy if exists registros_cambio on public.registros;
create policy registros_cambio on public.registros
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No se concede DELETE a propósito: los registros se marcan como borrados para
-- que la lápida viaje a los demás dispositivos. La limpieza real la hace el
-- borrado en cascada cuando se elimina la cuenta.

revoke delete on public.registros from anon, authenticated;
grant select, insert, update on public.registros to authenticated;

-- ---------------------------------------------------------------------------
-- Freno a un dispositivo que se desboque
--
-- Un bucle de sincronización mal hecho puede vaciar la cuota del plan gratuito
-- en una tarde. Este tope es una red de seguridad, no una medida antifraude:
-- contra abuso deliberado está el límite de peticiones de Supabase.
-- ---------------------------------------------------------------------------

create or replace function public.comprobar_volumen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reciente integer;
begin
  select count(*) into reciente
  from public.registros
  where user_id = new.user_id and actualizado > now() - interval '1 minute';

  if reciente > 2000 then
    raise exception 'Demasiados cambios seguidos. Espera un momento y vuelve a sincronizar.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists registros_volumen on public.registros;
create trigger registros_volumen
  before insert or update on public.registros
  for each row execute function public.comprobar_volumen();
