import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/*
 * Conexión con el servidor.
 *
 * La URL y la clave son PÚBLICAS a propósito: viajan dentro de la aplicación,
 * como en cualquier app que use Supabase. Lo que protege los datos no es
 * esconder esta clave —imposible en una app que se descarga— sino la seguridad
 * a nivel de fila del servidor: con ella, una consulta solo puede devolver las
 * filas del usuario autenticado.
 *
 * La clave `service_role` es otra cosa: esa se salta todas las políticas y no
 * debe estar nunca aquí, ni en el repositorio, ni en ningún archivo del cliente.
 */

const URL_NUBE = import.meta.env.VITE_SUPABASE_URL ?? 'https://zytuzxmmorvlspgiudrf.supabase.co';
const CLAVE_PUBLICA =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_DMogDEDPW2kuKPcwMEVLaw_oLaZND7d';

export const hayNube = Boolean(URL_NUBE && CLAVE_PUBLICA);

/*
 * `persistSession` guarda la sesión en el dispositivo: sin ella, el ganadero no
 * podría abrir la aplicación en el campo sin cobertura. `autoRefreshToken` la
 * renueva sola cuando vuelve a haber señal.
 */
export const nube: SupabaseClient | null = hayNube
  ? createClient(URL_NUBE, CLAVE_PUBLICA, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'chaparra:v2:sesion-nube'
      }
    })
  : null;

/** Traduce los errores de Supabase a algo que un ganadero pueda entender. */
export function mensajeDeError(error: unknown): string {
  const texto = error instanceof Error ? error.message : String(error ?? '');
  const t = texto.toLowerCase();
  if (t.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (t.includes('user already registered') || t.includes('already been registered'))
    return 'Ya existe una cuenta con ese correo. Inicia sesión.';
  if (t.includes('password should be at least'))
    return 'La contraseña debe tener al menos 8 caracteres.';
  if (t.includes('email not confirmed'))
    return 'Tienes que confirmar el correo antes de entrar. Revisa tu bandeja de entrada.';
  if (t.includes('row-level security'))
    return 'El servidor ha rechazado la operación por seguridad. Vuelve a iniciar sesión.';
  if (t.includes('demasiados cambios')) return texto;
  if (t.includes('failed to fetch') || t.includes('networkerror') || t.includes('load failed'))
    return 'Sin conexión con el servidor. Tus datos siguen guardados en este dispositivo.';
  return texto || 'Ha ocurrido un error inesperado.';
}

/** Hay conexión aparente y servidor configurado. */
export const puedeSincronizar = () => hayNube && navigator.onLine;
