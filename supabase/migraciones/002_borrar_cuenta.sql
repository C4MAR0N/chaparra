-- Chaparra · borrado de cuenta desde la propia aplicación
--
-- El RGPD y las dos tiendas exigen que el ganadero pueda borrar su cuenta sin
-- escribir a nadie. Hasta ahora el botón de la aplicación solo vaciaba el
-- dispositivo: la copia del servidor se quedaba.
--
-- Se resuelve con una función en la base de datos y no con una función de borde
-- (Edge Function), porque esta se pega en el editor SQL del panel y ya está: no
-- hace falta instalar nada, ni desplegar, ni manejar la clave `service_role`,
-- que es la que se salta todas las políticas y no debe salir del panel.
--
-- CÓMO APLICARLO: pega este archivo entero en el editor SQL de Supabase y pulsa
-- Run. La última consulta comprueba el resultado, así que el propio panel te
-- dirá si ha funcionado: debe devolver UNA fila con tres veces `true` y un
-- `false`. Si sale un error en rojo, cópialo tal cual; el editor ejecuta todo
-- de una vez y un fallo en cualquier línea deshace el resto.

-- ---------------------------------------------------------------------------
-- 1. La función
-- ---------------------------------------------------------------------------

create or replace function public.borrar_mi_cuenta()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  yo uuid := auth.uid();
begin
  -- `auth.uid()` sale del token de quien llama: la función solo puede borrar al
  -- que la invoca. No recibe ningún parámetro a propósito, para que no exista
  -- forma de pedirle que borre a otro.
  if yo is null then
    raise exception 'Hay que haber iniciado sesion para borrar la cuenta.'
      using errcode = '42501';
  end if;

  delete from public.registros where user_id = yo;

  /*
   * La ficha de acceso se borra aparte. `auth.users` no es nuestra tabla, y
   * según cómo esté configurado el proyecto puede que el dueño de esta función
   * no tenga permiso para tocarla. Si ocurre, los datos de la explotación ya se
   * han borrado igualmente y se avisa a la aplicación de que ha quedado a
   * medias, en vez de decir que todo fue bien.
   */
  begin
    delete from auth.users where id = yo;
    return 'completo';
  exception
    when insufficient_privilege or undefined_table then
      return 'datos';
  end;
end;
$$;

comment on function public.borrar_mi_cuenta() is
  'Borra la explotacion y la cuenta de quien la llama. Devuelve completo o datos.';

-- ---------------------------------------------------------------------------
-- 2. Permiso de borrado en la tabla
--
-- La tabla tiene `force row level security`, así que ni el dueño se salta las
-- políticas: sin una política de DELETE, la función de arriba no borraría nada
-- y lo haría en silencio.
--
-- Esto NO abre la puerta a que la aplicación borre filas: el permiso de DELETE
-- sigue revocado para `authenticated`, de modo que el cliente no puede ejecutar
-- un delete ni con esta política puesta. Los registros se siguen marcando como
-- borrados para que la lápida viaje al resto de dispositivos; el borrado de
-- verdad solo ocurre al cerrar la cuenta.
-- ---------------------------------------------------------------------------

drop policy if exists registros_borrado_de_cuenta on public.registros;

create policy registros_borrado_de_cuenta on public.registros
  for delete using (auth.uid() = user_id);

revoke delete on public.registros from anon;
revoke delete on public.registros from authenticated;

-- ---------------------------------------------------------------------------
-- 3. Quién puede llamarla
-- ---------------------------------------------------------------------------

revoke all on function public.borrar_mi_cuenta() from public;
revoke all on function public.borrar_mi_cuenta() from anon;
grant execute on function public.borrar_mi_cuenta() to authenticated;

-- PostgREST guarda en memoria qué funciones existen. Sin este aviso, la
-- aplicación seguiría recibiendo un 404 hasta que al servidor le diera por
-- releer el esquema.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 4. Comprobación
--
-- Tiene que devolver UNA fila con:
--   existe = true · definer = true · puede_authenticated = true · puede_anon = false
-- ---------------------------------------------------------------------------

select
  true                                                          as existe,
  p.prosecdef                                                   as definer,
  has_function_privilege('authenticated', p.oid, 'execute')     as puede_authenticated,
  has_function_privilege('anon', p.oid, 'execute')              as puede_anon,
  has_table_privilege('authenticated', 'public.registros', 'delete') as app_puede_borrar_filas
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'borrar_mi_cuenta';
