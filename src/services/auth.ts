import type { Session, UserRecord } from '../types';
import { readJson, writeJson, writeRaw } from './storage';
export const USERS_KEY = 'chaparra:v2:users';
export const SESSION_KEY = 'chaparra:v2:session';
export const ITERATIONS = 150000;
export const normalizeEmail = (email: string) => email.replace(/\s/g, '').toLowerCase();
export const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const bytes = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
export function getUsers(): UserRecord[] {
  const raw = readJson(USERS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter((u: unknown): u is UserRecord => {
    if (
      !isObject(u) ||
      typeof u.id !== 'string' ||
      typeof u.email !== 'string' ||
      typeof u.nombre !== 'string' ||
      typeof u.createdAt !== 'string'
    )
      return false;
    // Las cuentas de la nube no guardan contraseña aquí: la identidad es del servidor.
    if (u.origen === 'nube') return true;
    return (
      typeof u.passwordHash === 'string' &&
      typeof u.salt === 'string' &&
      u.iterations === ITERATIONS &&
      u.algo === 'PBKDF2-SHA-256'
    );
  });
}

/**
 * Crea o actualiza la ficha local de una cuenta de la nube. El identificador es
 * el mismo que en el servidor, de modo que los datos guardados en el dispositivo
 * y los del servidor comparten espacio sin traducción de por medio.
 */
export function adoptarUsuarioDeNube(id: string, email: string, nombre: string): UserRecord {
  const users = getUsers();
  const previo = users.find(u => u.id === id);
  const usuario: UserRecord = {
    ...previo,
    id,
    email: normalizeEmail(email),
    nombre: nombre.trim() || previo?.nombre || normalizeEmail(email),
    origen: 'nube',
    createdAt: previo?.createdAt ?? new Date().toISOString()
  };
  writeJson(USERS_KEY, previo ? users.map(u => (u.id === id ? usuario : u)) : [...users, usuario]);
  return usuario;
}
async function derive(password: string, salt: Uint8Array, iterations: number) {
  if (!globalThis.crypto?.subtle)
    throw new Error('Este navegador necesita HTTPS o localhost para proteger la contraseña.');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const saltBuffer = new Uint8Array(salt.length);
  saltBuffer.set(salt);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBuffer, iterations },
    key,
    256
  );
  return b64(new Uint8Array(hash));
}
async function credentials(password: string) {
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    passwordHash: await derive(password, salt, ITERATIONS),
    salt: b64(salt),
    iterations: ITERATIONS,
    algo: 'PBKDF2-SHA-256' as const
  };
}
export async function verifyPassword(user: UserRecord, password: string) {
  // Una cuenta de la nube no tiene contraseña guardada aquí: nunca valida por esta vía.
  if (!user.passwordHash || !user.salt || !user.iterations) return false;
  try {
    const actual = bytes(await derive(password, bytes(user.salt), user.iterations));
    const expected = bytes(user.passwordHash);
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}
export function startSession(userId: string, remember: boolean) {
  logout();
  const session: Session = { userId, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 };
  writeJson(SESSION_KEY, session, remember ? 'local' : 'session');
}
export function logout() {
  writeRaw(SESSION_KEY, null, 'local');
  writeRaw(SESSION_KEY, null, 'session');
}
export function currentUser(): UserRecord | null {
  const session = readJson(SESSION_KEY, 'session') ?? readJson(SESSION_KEY, 'local');
  if (
    !isObject(session) ||
    typeof session.userId !== 'string' ||
    typeof session.expiresAt !== 'number'
  )
    return null;
  if (session.expiresAt <= Date.now()) {
    logout();
    return null;
  }
  const user = getUsers().find(u => u.id === session.userId) ?? null;
  if (!user) logout();
  return user;
}
export async function register(nombre: string, email: string, password: string, remember: boolean) {
  email = normalizeEmail(email);
  if (!nombre.trim() || !validEmail(email))
    throw new Error('Escribe tu nombre y un correo válido.');
  if (getUsers().some(u => u.email === email))
    throw new Error('Ya existe una cuenta con este correo en este navegador.');
  const hash = await credentials(password);
  // Releer después de Web Crypto para evitar sobrescribir altas simultáneas.
  const users = getUsers();
  if (users.some(u => u.email === email))
    throw new Error('Ya existe una cuenta con este correo en este navegador.');
  const user: UserRecord = {
    id: crypto.randomUUID(),
    nombre: nombre.trim(),
    email,
    ...hash,
    createdAt: new Date().toISOString()
  };
  writeJson(USERS_KEY, [...users, user]);
  startSession(user.id, remember);
  return user;
}
export async function login(email: string, password: string, remember: boolean) {
  const users = getUsers();
  /*
   * Sin servidor, las cuentas viven en el navegador donde se crearon. Si aquí no
   * hay ninguna, decirlo en lugar de "contraseña incorrecta": el usuario estaría
   * probando una contraseña correcta de otro dispositivo una y otra vez. No
   * revela nada, porque no hay ninguna cuenta que proteger en este navegador.
   */
  if (!users.length)
    throw new Error(
      'En este navegador todavía no hay ninguna cuenta. Las cuentas de Chaparra no se comparten entre dispositivos: crea una aquí y luego restaura tu copia de seguridad desde Ajustes.'
    );
  const user = users.find(u => u.email === normalizeEmail(email));
  if (user?.origen === 'nube')
    throw new Error(
      'Esta cuenta se gestiona en el servidor. Entra con el acceso normal, que ya sincroniza entre dispositivos.'
    );
  if (!user || !(await verifyPassword(user, password)))
    throw new Error('Correo o contraseña incorrectos');
  startSession(user.id, remember);
  return user;
}
export function updateUser(
  userId: string,
  update: Partial<Pick<UserRecord, 'nombre' | 'email' | 'onboardingCompletedAt'>>
) {
  const users = getUsers(),
    user = users.find(u => u.id === userId);
  if (!user) throw new Error('La cuenta ya no existe.');
  const email = normalizeEmail(update.email ?? user.email),
    nombre = (update.nombre ?? user.nombre).trim();
  if (!validEmail(email) || !nombre) throw new Error('Escribe tu nombre y un correo válido.');
  if (users.some(u => u.id !== userId && u.email === email))
    throw new Error('Ya existe otra cuenta con ese correo.');
  const updated = { ...user, ...update, email, nombre };
  writeJson(
    USERS_KEY,
    users.map(u => (u.id === userId ? updated : u))
  );
  return updated;
}
/**
 * Marca la encuesta como completada sin pasar por la validación de correo único.
 *
 * Durante la migración conviven dos cuentas con el mismo correo —la local de
 * siempre y la del servidor— y esa duplicidad es legítima y temporal. Validar
 * aquí dejaría al ganadero atrapado en la encuesta después de traer sus datos.
 */
export function marcarEncuestaCompletada(userId: string): UserRecord {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) throw new Error('La cuenta ya no existe.');
  const actualizado: UserRecord = {
    ...user,
    onboardingCompletedAt: user.onboardingCompletedAt ?? new Date().toISOString()
  };
  writeJson(
    USERS_KEY,
    users.map(u => (u.id === userId ? actualizado : u))
  );
  return actualizado;
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = getUsers().find(u => u.id === userId);
  if (!user || !(await verifyPassword(user, current)))
    throw new Error('La contraseña actual no es correcta.');
  const hash = await credentials(next);
  writeJson(
    USERS_KEY,
    getUsers().map(u => (u.id === userId ? { ...u, ...hash } : u))
  );
}
export function deleteUser(userId: string) {
  ['farm', 'animals', 'invoices', 'saleTemplate', 'milkRecords', 'weightRecords', 'lotes'].forEach(
    key => writeRaw(`chaparra:v2:u:${userId}:${key}`, null)
  );
  writeJson(
    USERS_KEY,
    getUsers().filter(u => u.id !== userId)
  );
  if (currentUser()?.id === userId) logout();
}
