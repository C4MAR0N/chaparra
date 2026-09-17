import { useState, type FormEvent } from 'react';
import { ClipboardList, Eye, EyeOff, HardDrive, Leaf, TrendingUp } from 'lucide-react';
import { Banner, Button, Field, Input } from './ui';
import { login, normalizeEmail, register, validEmail } from '../services/auth';
import type { UserRecord } from '../types';
import { SecurityPrivacyModal } from './SecurityPrivacyModal';
import { DeleteAccountModal } from './DeleteAccountModal';
export function AuthScreen({ onAccess }: { onAccess: (user: UserRecord) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  const [nombre, setNombre] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState('');
  const [remember, setRemember] = useState(true),
    [accepted, setAccepted] = useState(false),
    [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [privacy, setPrivacy] = useState(false),
    [deleting, setDeleting] = useState(false);
  const emailError =
    email && !validEmail(normalizeEmail(email)) ? 'Introduce un correo válido.' : '';
  const passwordError = password && password.length < 8 ? 'Usa al menos 8 caracteres.' : '';
  const confirmError =
    confirmation && password !== confirmation ? 'Las contraseñas no coinciden.' : '';
  const valid =
    nombre.trim() &&
    validEmail(normalizeEmail(email)) &&
    password.length >= 8 &&
    confirmation === password &&
    accepted;
  const strength =
    password.length < 8
      ? 'Insuficiente'
      : password.length >= 12 && /[A-Z]/.test(password) && /[^a-zA-Z]/.test(password)
        ? 'Alta'
        : 'Aceptable';
  const changeMode = (next: typeof mode) => {
    setMode(next);
    setError('');
    setPassword('');
    setConfirmation('');
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user =
        mode === 'register'
          ? await register(nombre, email, password, remember)
          : await login(email, password, remember);
      setPassword('');
      setConfirmation('');
      onAccess(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido acceder. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen md:grid md:grid-cols-2">
      <aside className="flex flex-col justify-between bg-brand-800 p-6 text-white md:min-h-screen md:p-10 lg:p-16">
        <div className="flex items-center gap-3 text-2xl font-bold">
          <Leaf size={32} /> Chaparra
        </div>
        <div className="hidden max-w-md space-y-8 md:block">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-brand-200">
              Tu cuaderno de campo
            </p>
            <h1 className="text-4xl font-bold leading-tight">
              La explotación al día.
              <br />
              Estés donde estés.
            </h1>
          </div>
          <ul className="space-y-6">
            {[
              [
                ClipboardList,
                'Cada animal, con su historial',
                'Crotales, sanidad y crías en una misma ficha.'
              ],
              [
                TrendingUp,
                'Las cuentas, claras',
                'Producción, gastos e ingresos de tu explotación.'
              ],
              [
                HardDrive,
                'Tus datos, en tu dispositivo',
                'Cuentas locales y copias de seguridad que controlas tú.'
              ]
            ].map(([Icon, title, description]) => {
              const I = Icon as typeof Leaf;
              return (
                <li key={String(title)} className="flex gap-4">
                  <I size={24} className="mt-1 shrink-0 text-brand-200" />
                  <div>
                    <p className="font-semibold">{String(title)}</p>
                    <p className="mt-1 text-sm leading-relaxed text-brand-100">
                      {String(description)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="hidden text-xs text-brand-200 md:block">Gestión ganadera · Sin servidor</p>
      </aside>
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div>
            <p className="mb-2 text-sm font-semibold text-brand-700">
              {mode === 'login'
                ? 'Bienvenido a Chaparra'
                : mode === 'register'
                  ? 'Empieza tu cuaderno de campo'
                  : 'Acceso a tu cuenta'}
            </p>
            <h2 className="page-heading">
              {mode === 'login'
                ? 'Iniciar sesión'
                : mode === 'register'
                  ? 'Crear cuenta'
                  : 'He olvidado mi contraseña'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              {mode === 'login'
                ? 'Accede a la explotación guardada en este navegador. Si creaste la cuenta en otro dispositivo, aquí no aparecerá: crea una y restaura tu copia de seguridad.'
                : mode === 'register'
                  ? 'Después configuraremos tu explotación en cuatro pasos.'
                  : 'No hay recuperación por correo: la cuenta vive únicamente en este navegador.'}
            </p>
          </div>
          {mode === 'recovery' ? (
            <>
              <Banner>
                Si has olvidado la contraseña no podemos recuperarla. Puedes borrar la cuenta y
                empezar de cero. Si conservas una copia JSON, podrás importarla después.
              </Banner>
              <Button variant="danger" onClick={() => setDeleting(true)}>
                Borrar la cuenta y empezar de cero
              </Button>
              <Button variant="ghost" onClick={() => changeMode('login')}>
                Volver a iniciar sesión
              </Button>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {mode === 'register' && (
                <Field label="Nombre y apellidos">
                  <Input
                    autoComplete="name"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    required
                  />
                </Field>
              )}
              <Field
                label="Correo electrónico"
                error={mode === 'register' ? emailError : undefined}
              >
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </Field>
              <div className="relative">
                <Field
                  label="Contraseña"
                  error={mode === 'register' ? passwordError : undefined}
                  help={
                    mode === 'register' && password
                      ? `Seguridad: ${strength}. Una frase larga es más fácil de recordar.`
                      : undefined
                  }
                >
                  <Input
                    className="pr-14"
                    type={show ? 'text' : 'password'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </Field>
                <Button
                  variant="ghost"
                  className="absolute right-0 top-7 px-3"
                  aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={show}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={20} /> : <Eye size={20} />}
                </Button>
              </div>
              {mode === 'register' && (
                <>
                  <Field label="Repetir contraseña" error={confirmError}>
                    <Input
                      type={show ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmation}
                      onChange={e => setConfirmation(e.target.value)}
                      required
                    />
                  </Field>
                  <p className="rounded-xl bg-stone-100 p-3 text-xs leading-relaxed text-stone-600">
                    Tus datos se guardan únicamente en este navegador y no se envían a ningún
                    servidor. No hay copia en la nube: si borras el navegador o pierdes el
                    dispositivo, pierdes la información. Exporta copias desde Ajustes.
                  </p>
                  <label htmlFor="accept" className="touch-label">
                    <input
                      id="accept"
                      type="checkbox"
                      checked={accepted}
                      onChange={e => setAccepted(e.target.checked)}
                    />
                    Acepto el tratamiento local de mis datos.
                  </label>
                  <Button variant="ghost" onClick={() => setPrivacy(true)}>
                    Leer la información de privacidad
                  </Button>
                </>
              )}
              <label htmlFor="remember" className="touch-label">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                />
                Mantener la sesión iniciada
              </label>
              {error && <Banner tone="error">{error}</Banner>}
              <Button
                type="submit"
                loading={busy}
                disabled={mode === 'register' ? !valid : !email || !password}
                className="w-full"
              >
                {mode === 'register' ? 'Crear cuenta' : 'Entrar'}
              </Button>
              {mode === 'login' && (
                <Button variant="ghost" onClick={() => changeMode('recovery')}>
                  He olvidado mi contraseña
                </Button>
              )}
              <div className="border-t border-stone-200 pt-4">
                <p className="text-sm text-stone-600">
                  {mode === 'login'
                    ? '¿Es tu primera vez aquí?'
                    : '¿Ya tienes una cuenta en este navegador?'}
                </p>
                <Button
                  variant="ghost"
                  onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}
                >
                  {mode === 'login' ? 'Crear una cuenta local' : 'Iniciar sesión'}
                </Button>
              </div>
            </form>
          )}
          <Button variant="ghost" size="sm" onClick={() => setPrivacy(true)}>
            Privacidad y almacenamiento
          </Button>
        </div>
      </main>
      {privacy && <SecurityPrivacyModal onClose={() => setPrivacy(false)} />}
      {deleting && (
        <DeleteAccountModal
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            setDeleting(false);
            changeMode('register');
          }}
        />
      )}
    </div>
  );
}
