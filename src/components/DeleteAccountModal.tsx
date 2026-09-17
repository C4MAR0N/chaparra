import { useState } from 'react';
import { Banner, Button, Field, Input, Modal } from './ui';
import { deleteUser, getUsers, normalizeEmail } from '../services/auth';
export function DeleteAccountModal({
  email,
  onClose,
  onDeleted
}: {
  email?: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [step, setStep] = useState(1),
    [typed, setTyped] = useState(''),
    [error, setError] = useState(''),
    [selectedEmail, setSelectedEmail] = useState(email ?? '');
  const target = normalizeEmail(email ?? typed);
  return (
    <Modal
      title={step === 1 ? 'Eliminar la cuenta local' : 'Confirmación definitiva'}
      onClose={onClose}
    >
      <Banner tone="error">
        Se eliminarán la cuenta y todos sus animales, facturas y registros de este navegador. Esta
        acción no se puede deshacer.
      </Banner>
      {step === 1 ? (
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
          <Field label="Escribe el correo para confirmar" error={error}>
            <Input type="email" value={typed} onChange={e => setTyped(e.target.value)} />
          </Field>
          <Button
            variant="danger"
            disabled={!typed.trim()}
            onClick={() => {
              const normalized = normalizeEmail(typed);
              const user = getUsers().find(u => u.email === normalized);
              if (!user || normalized !== selectedEmail) {
                setError('El correo no coincide con la cuenta.');
                return;
              }
              deleteUser(user.id);
              onDeleted();
            }}
          >
            Eliminar cuenta y todos sus datos
          </Button>
        </>
      )}
      {step === 1 && error && <Banner tone="error">{error}</Banner>}
      <Button variant="secondary" onClick={onClose}>
        Cancelar
      </Button>
    </Modal>
  );
}
