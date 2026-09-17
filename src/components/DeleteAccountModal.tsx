import { useState } from 'react';
import { Banner, Button, Field, Input, Modal } from './ui';
import { deleteUser, getUsers, normalizeEmail } from '../services/auth';
import { borrarCuentaEnLaNube, type BorradoEnNube } from '../services/acceso';
export function DeleteAccountModal({
  email,
  onClose,
  onDeleted
}: {
  email?: string;
  onClose: () => void;
  onDeleted: (resultado: BorradoEnNube) => void;
}) {
  const [step, setStep] = useState(1),
    [typed, setTyped] = useState(''),
    [error, setError] = useState(''),
    [borrando, setBorrando] = useState(false),
    [resultado, setResultado] = useState<BorradoEnNube | null>(null),
    [selectedEmail, setSelectedEmail] = useState(email ?? '');
  const target = normalizeEmail(email ?? typed);
  /*
   * El orden importa: primero el servidor, después el dispositivo. Si se
   * borrara antes lo local se perdería la sesión, y con ella la única forma de
   * demostrarle al servidor quién pide el borrado; la copia de la nube quedaría
   * ahí para siempre sin que nadie se enterara.
   */
  async function borrar() {
    const normalized = normalizeEmail(typed);
    const user = getUsers().find(u => u.email === normalized);
    if (!user || normalized !== selectedEmail) {
      setError('El correo no coincide con la cuenta.');
      return;
    }
    setBorrando(true);
    setError('');
    try {
      const hecho = await borrarCuentaEnLaNube();
      deleteUser(user.id);
      /* El resultado se enseña aquí y no en quien nos llama: en cuanto se cierra
       * sesión esta ventana desaparece, y con ella el aviso. */
      setResultado(hecho);
      setStep(3);
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : 'No se ha podido contactar con el servidor.') +
          ' No se ha borrado nada: tus datos siguen en el servidor. Comprueba la conexión e' +
          ' inténtalo de nuevo.'
      );
    } finally {
      setBorrando(false);
    }
  }

  return (
    <Modal
      title={
        step === 1
          ? 'Eliminar la cuenta'
          : step === 2
            ? 'Confirmación definitiva'
            : 'Cuenta eliminada'
      }
      onClose={onClose}
    >
      {step !== 3 && (
        <Banner tone="error">
          Se eliminarán la cuenta y todos sus animales, facturas y registros, tanto de este
          dispositivo como del servidor. Esta acción no se puede deshacer.
        </Banner>
      )}
      {step === 3 ? (
        <>
          <Banner tone={resultado === 'datos' ? 'warning' : 'success'}>
            {resultado === 'datos'
              ? 'Se han borrado tu explotación y todos tus datos, aquí y en el servidor. Ha quedado' +
                ' la ficha de acceso, sin nada asociado: escribe a agro@agrovanza.es si quieres que' +
                ' también se elimine.'
              : resultado === 'local'
                ? 'Se han borrado la cuenta y todos sus datos de este dispositivo. Esta cuenta no' +
                  ' estaba en el servidor.'
                : 'Se han borrado la cuenta y todos sus datos, aquí y en el servidor. No queda nada.'}
          </Banner>
          <Button onClick={() => onDeleted(resultado ?? 'local')}>Entendido</Button>
        </>
      ) : step === 1 ? (
        <>
          <p className="text-sm text-stone-600">
            Guarda antes una copia de seguridad si todavía puedes acceder a la cuenta.
          </p>
          {!email && (
            <Field label="Correo de la cuenta que quieres borrar">
              <Input
                type="email"
                autoComplete="email"
                value={typed}
                onChange={e => setTyped(e.target.value)}
              />
            </Field>
          )}
          <Button
            variant="danger"
            disabled={!target}
            onClick={() => {
              if (!email) {
                const user = getUsers().find(u => u.email === target);
                if (!user) {
                  setError('No se ha encontrado esa cuenta en este navegador.');
                  return;
                }
              }
              setSelectedEmail(target);
              setStep(2);
              setTyped('');
              setError('');
            }}
          >
            Continuar con el borrado
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm">
            Escribe el correo completo de la cuenta para confirmar el borrado.
          </p>
          <Field label="Escribe el correo para confirmar">
            <Input type="email" value={typed} onChange={e => setTyped(e.target.value)} />
          </Field>
          <Button
            variant="danger"
            disabled={!typed.trim()}
            loading={borrando}
            onClick={() => void borrar()}
          >
            Eliminar cuenta y todos sus datos
          </Button>
        </>
      )}
      {error && <Banner tone="error">{error}</Banner>}
      {step !== 3 && (
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
      )}
    </Modal>
  );
}
