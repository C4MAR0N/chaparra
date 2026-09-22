-- Chaparra · admitir los lotes en la sincronización
--
-- Un lote es una operación en grupo: el destete del 2 de octubre, la venta de
-- diez añojos, el traslado de un cercado a otro. La aplicación lo guarda como
-- un registro más, igual que un animal o una factura.
--
-- La tabla `registros` limita el campo `tipo` a una lista cerrada. Sin añadir
-- 'lote' a esa lista, el servidor rechaza la fila; y como la subida va por
-- tandas y un error corta la sincronización entera, no se quedaría sin subir
-- solo el lote: se quedarían sin subir también los animales de esa misma tanda.
-- Por eso esto se aplica ANTES de desplegar la versión que crea lotes.
--
-- CÓMO APLICARLO: pega este archivo entero en el editor SQL de Supabase y pulsa
-- Run. La última consulta comprueba el resultado, así que el propio panel te
-- dirá si ha funcionado: debe devolver UNA fila con `admite_lote = true`. Si
-- sale un error en rojo, cópialo tal cual; el editor ejecuta todo de una vez y
-- un fallo en cualquier línea deshace el resto.
--
-- Es seguro repetirlo: si ya está aplicado, vuelve a dejarlo igual.

-- ---------------------------------------------------------------------------
-- 1. Ampliar la lista de tipos admitidos
-- ---------------------------------------------------------------------------
-- No se puede "editar" un check: se quita y se vuelve a poner. Entre las dos
-- instrucciones la tabla se queda un instante sin esa comprobación, pero ambas
-- van en la misma transacción, así que nadie llega a ver ese hueco.

alter table public.registros
  drop constraint if exists tipo_valido;

alter table public.registros
  add constraint tipo_valido check (
    tipo in ('explotacion', 'animal', 'factura', 'plantilla', 'ordeno', 'pesada', 'lote')
  );

-- ---------------------------------------------------------------------------
-- 2. Que PostgREST se entere del cambio
-- ---------------------------------------------------------------------------
-- La API cachea el esquema. Sin este aviso puede seguir rechazando el tipo
-- nuevo durante un rato, y el fallo parecería del código.

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 3. Comprobación
-- ---------------------------------------------------------------------------
-- Debe devolver UNA fila:
--   admite_lote = true
-- ---------------------------------------------------------------------------

select
  pg_get_constraintdef(c.oid) like '%''lote''%' as admite_lote,
  pg_get_constraintdef(c.oid)                   as definicion
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public' and t.relname = 'registros' and c.conname = 'tipo_valido';
