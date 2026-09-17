import type { UserRecord } from '../types';
import { mensajeDeError, nube } from './nube';
import {
  adoptarUsuarioDeNube,
  currentUser,
  getUsers,
  login,
  logout,
  normalizeEmail,
  register,
  startSession
} from './auth';

/*
 * Acceso a la aplicación.
 *
 * Con servidor configurado, la identidad la lleva Supabase y la cuenta es la
 * misma en todos los dispositivos. La sesión queda guardada aquí, de modo que
 * abrir la aplicación en el campo sin cobertura sigue funcionando: solo hace
 * falta conexión la primera vez que se entra en un dispositivo.
 *
 * Sin servidor configurado se mantiene el acceso local de siempre, para que la
 * aplicación nunca quede inutilizable si el servidor no responde.
 */

export interface Acceso {
  usuario?: UserRecord;
  /** El alta ha salido bien pero falta confirmar el correo. */
  confirmarCorreo?: boolean;
}

const nombreDe = (meta: Record<string, unknown> | undefined, email: string) => {
  const n = meta?.nombre;
  return typeof n === 'string' && n.trim() ? n.trim() : email;
};

/** Enlaza la sesión del servidor con la ficha local y abre sesión en el dispositivo. */
function adoptar(
  id: string,
  email: string,
  meta: Record<string, unknown> | undefined,
  remember: boolean
): UserRecord {
  const usuario = adoptarUsuarioDeNube(id, email, nombreDe(meta, email));
  startSession(usuario.id, remember);
  return usuario;
}

export async function registrar(
  nombre: string,
  email: string,
  password: string,
  remember: boolean
): Promise<Acceso> {
  if (!nube) return { usuario: await register(nombre, email, password, remember) };

  const { data, error } = await nube.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { nombre: nombre.trim() },
      // El enlace del correo debe devolver a la aplicación, no a la raíz del dominio.
      emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).href
    }
  });
  if (error) throw new Error(mensajeDeError(error));

  // Con la confirmación activada, el alta no devuelve sesión: hay que ir al correo.
  if (!data.session) return { confirmarCorreo: true };
  const u = data.session.user;
  return { usuario: adoptar(u.id, u.email ?? email, u.user_metadata, remember) };
}

export async function entrar(
  email: string,
  password: string,
  remember: boolean
): Promise<UserRecord> {
  if (!nube) return login(email, password, remember);

  const { data, error } = await nube.auth.signInWithPassword({ email: email.trim(), password });
  if (!error) {
    const u = data.session.user;
    return adoptar(u.id, u.email ?? email, u.user_metadata, remember);
  }

  /*
   * Repliegue a la cuenta local.
   *
   * Quien ya usaba Chaparra antes de que hubiera servidor tiene su explotación
   * guardada en este dispositivo bajo una cuenta local. Si el servidor no la
   * reconoce pero aquí sí existe, se entra con ella: dejar fuera a alguien de
   * sus propios datos por haber añadido un servidor sería inaceptable.
   */
  const local = getUsers().find(u => u.origen !== 'nube' && u.email === normalizeEmail(email));
  if (local) return login(email, password, remember);
  throw new Error(mensajeDeError(error));
}

/** Cuentas locales de este dispositivo que todavía no están en el servidor. */
export const cuentasLocalesPendientes = () => getUsers().filter(u => u.origen !== 'nube');

export async function reenviarConfirmacion(email: string): Promise<void> {
  if (!nube) return;
  const { error } = await nube.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).href }
  });
  if (error) throw new Error(mensajeDeError(error));
}

export async function salir(): Promise<void> {
  logout();
  // `local` cierra solo este dispositivo; los demás siguen dentro.
  if (nube) await nube.auth.signOut({ scope: 'local' }).catch(() => undefined);
}

/**
 * Usuario con el que abrir la aplicación. Lee la sesión guardada, sin red: si
 * no hay cobertura el ganadero entra igual y trabaja con los datos del
 * dispositivo.
 */
export async function usuarioActual(): Promise<UserRecord | null> {
  if (!nube) return currentUser();
  try {
    const { data } = await nube.auth.getSession();
    const u = data.session?.user;
    if (u) {
      const usuario = adoptarUsuarioDeNube(
        u.id,
        u.email ?? '',
        nombreDe(u.user_metadata, u.email ?? '')
      );
      // Conserva la sesión local para que el resto de la aplicación no cambie.
      if (currentUser()?.id !== usuario.id) startSession(usuario.id, true);
      return usuario;
    }
  } catch {
    // Servidor inaccesible: se cae a la sesión local, que es la que vale sin cobertura.
  }
  return currentUser();
}

/*
 * Resultado de cerrar la cuenta en el servidor:
 *   'completo' -> no queda nada, ni datos ni acceso
 *   'datos'    -> la explotacion se ha borrado, la ficha de acceso sigue
 *   'local'    -> esta cuenta nunca estuvo en el servidor
 */
export type BorradoEnNube = 'completo' | 'datos' | 'local';

/**
 * Borra la explotación y la cuenta del servidor. La función del servidor solo
 * puede borrar a quien la llama: no recibe ningún identificador, lo saca del
 * token de la sesión.
 */
export async function borrarCuentaEnLaNube(): Promise<BorradoEnNube> {
  if (!nube) return 'local';
  const { data: sesion } = await nube.auth.getSession();
  if (!sesion.session) return 'local';
  const { data, error } = await nube.rpc('borrar_mi_cuenta');
  if (error) throw new Error(mensajeDeError(error));
  // Con la cuenta borrada el token ya no vale para nada; cerrar la sesión aquí
  // evita que la aplicación siga intentando sincronizar contra un hueco.
  await nube.auth.signOut({ scope: 'local' }).catch(() => undefined);
  return data === 'completo' ? 'completo' : 'datos';
}
