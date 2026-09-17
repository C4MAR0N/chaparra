import { useState, type FormEvent } from 'react';
import { Download, FileSpreadsheet, HardDrive, LogOut, RefreshCw, Shield } from 'lucide-react';
import type { Backup, FarmProfile, UserRecord } from '../types';
import { useFarm } from '../context/FarmContext';
import { hasMeat, hasMilk } from '../lib/domain';
import { PROVINCIAS, especieLabel } from '../lib/constants';
import { changePassword, updateUser } from '../services/auth';
import { downloadBackup, readBackup } from '../services/backup';
import { descargarExcel } from '../services/excel';
import { Banner, Button, Card, ConfirmModal, Field, Input, Modal, Select } from './ui';
import { DeleteAccountModal } from './DeleteAccountModal';
import { SecurityPrivacyModal } from './SecurityPrivacyModal';
export function FarmSettingsModal({
  onClose,
  onSurvey,
  onLogout,
  onUserChange
}: {
  onClose: () => void;
  onSurvey: () => void;
  onLogout: () => void;
  onUserChange: (user: UserRecord) => void;
}) {
  const { user, data, farm, update, notify } = useFarm();
  const [profile, setProfile] = useState(farm),
    [nombre, setNombre] = useState(user.nombre),
    [email, setEmail] = useState(user.email);
  const [current, setCurrent] = useState(''),
    [next, setNext] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const [backup, setBackup] = useState<Backup | null>(null),
    [deleting, setDeleting] = useState(false),
    [privacy, setPrivacy] = useState(false);
  const patch = (p: Partial<FarmProfile>) => setProfile({ ...profile, ...p });
  function saveFarm(e: FormEvent) {
    e.preventDefault();
    update(d => ({
      ...d,
      farm: {
        ...profile,
        nombreExplotacion: profile.nombreExplotacion.trim(),
        titular: profile.titular.trim()
      }
    }));
    setMessage('Datos de la explotación guardados.');
    setError('');
  }
  function saveAccount(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      onUserChange(updateUser(user.id, { nombre, email }));
      setMessage('Datos de la cuenta guardados.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se han podido guardar los datos.');
    }
  }
  async function password(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (next !== confirmation) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(user.id, current, next);
      setCurrent('');
      setNext('');
      setConfirmation('');
      setMessage('Contraseña actualizada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido cambiar la contraseña.');
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      setBackup(await readBackup(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido leer la copia.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Ajustes y cuenta" onClose={onClose} wide>
      <Card className="space-y-4 border-brand-200 bg-brand-50">
        <h3 className="section-heading">Exportar a Excel</h3>
        <p className="text-sm leading-relaxed text-stone-600">
          Descarga tu explotación en una hoja de cálculo, con el rebaño, la sanidad, la producción y
          las facturas en pestañas separadas. Para consultarla, pasársela al gestor o al
          veterinario.
        </p>
        <Button
          onClick={() => {
            try {
              descargarExcel(user, data);
              setError('');
              setMessage('Excel preparado. Comprueba la carpeta de descargas.');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se ha podido crear el Excel.');
            }
          }}
        >
          <FileSpreadsheet size={18} />
          Exportar a Excel
        </Button>
      </Card>
      {error && <Banner tone="error">{error}</Banner>}
      {message && <Banner tone="success">{message}</Banner>}
      {busy && (
        <p className="text-sm" role="status">
          Procesando…
        </p>
      )}
      <section className="space-y-4">
        <h3 className="section-heading">Tu explotación</h3>
        <p className="text-sm text-stone-600">
          {farm.especies
            .map(s => especieLabel(s) + ' · ' + farm.orientacionPorEspecie[s])
            .join(' / ')}
        </p>
        <form onSubmit={saveFarm} className="space-y-4">
          <div className="form-grid">
            <Field label="Nombre de la ganadería">
              <Input
                value={profile.nombreExplotacion}
                onChange={e => patch({ nombreExplotacion: e.target.value })}
                required
                pattern=".*\S.*"
              />
            </Field>
            <Field label="Titular">
              <Input value={profile.titular} onChange={e => patch({ titular: e.target.value })} />
            </Field>
            <Field label="Código REGA">
              <Input
                value={profile.codigoRega ?? ''}
                onChange={e => patch({ codigoRega: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Provincia">
              <Select
                value={profile.provincia ?? ''}
                onChange={e => patch({ provincia: e.target.value })}
              >
                <option value="">Sin indicar</option>
                {PROVINCIAS.map(p => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            {hasMilk(profile) && (
              <>
                <Field label="Ordeños al día">
                  <Select
                    value={profile.ordenosPorDia ?? 2}
                    onChange={e => patch({ ordenosPorDia: Number(e.target.value) as 1 | 2 | 3 })}
                  >
                    {[1, 2, 3].map(n => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Precio estimado de leche (€/litro)">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    required
                    value={profile.precioLitroLecheEuro ?? 0}
                    onChange={e => patch({ precioLitroLecheEuro: Number(e.target.value) })}
                  />
                </Field>
              </>
            )}
            {hasMeat(profile) && (
              <Field label="Precio estimado de carne (€/kg en vivo)">
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  required
                  value={profile.precioKgCarneEuro ?? 0}
                  onChange={e => patch({ precioKgCarneEuro: Number(e.target.value) })}
                />
              </Field>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit">Guardar explotación</Button>
            <Button variant="secondary" onClick={onSurvey}>
              <RefreshCw size={18} />
              Rehacer encuesta
            </Button>
          </div>
        </form>
      </section>
      <section className="space-y-4 border-t border-stone-200 pt-5">
        <h3 className="section-heading">Datos de la cuenta</h3>
        <form onSubmit={saveAccount} className="space-y-4">
          <div className="form-grid">
            <Field label="Nombre y apellidos">
              <Input
                autoComplete="name"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </Field>
            <Field label="Correo electrónico">
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </Field>
          </div>
          <Button variant="secondary" type="submit">
            Guardar cuenta
          </Button>
        </form>
      </section>
      <section className="space-y-4 border-t border-stone-200 pt-5">
        <h3 className="section-heading">Cambiar contraseña</h3>
        <form onSubmit={password} className="space-y-4">
          <Field label="Contraseña actual">
            <Input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
            />
          </Field>
          <div className="form-grid">
            <Field label="Nueva contraseña" help="Al menos 8 caracteres.">
              <Input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={next}
                onChange={e => setNext(e.target.value)}
                required
              />
            </Field>
            <Field
              label="Repetir nueva contraseña"
              error={
                confirmation && confirmation !== next ? 'Las contraseñas no coinciden.' : undefined
              }
            >
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={e => setConfirmation(e.target.value)}
                required
              />
            </Field>
          </div>
          <Button
            variant="secondary"
            type="submit"
            loading={busy}
            disabled={next.length < 8 || next !== confirmation || !current}
          >
            Cambiar contraseña
          </Button>
        </form>
      </section>
      <details className="border-t border-stone-200 pt-5">
        <summary className="inline-flex min-h-12 cursor-pointer items-center gap-2 text-sm font-semibold text-stone-600">
          <HardDrive size={18} />
          Copia de seguridad y restauración
        </summary>
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed text-stone-600">
            El Excel sirve para consultar, pero no se puede volver a cargar en la aplicación. Esta
            copia en JSON es la única forma de recuperar tu explotación si se borran los datos del
            navegador o cambias de dispositivo. Guárdala en un lugar seguro de vez en cuando.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              downloadBackup(user, data);
              setError('');
              setMessage('Copia preparada. Comprueba la carpeta de descargas.');
            }}
          >
            <Download size={18} />
            Descargar copia de seguridad
          </Button>
          <Field
            label="Restaurar desde una copia"
            help="Solo copias de Chaparra. Verás un resumen antes de sustituir los datos."
          >
            <Input
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={e => {
                void upload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </Field>
        </div>
      </details>
      <div className="flex flex-wrap gap-3 border-t border-stone-200 pt-5">
        <Button variant="secondary" onClick={() => setPrivacy(true)}>
          <Shield size={18} />
          Privacidad
        </Button>
        <Button variant="secondary" onClick={onLogout}>
          <LogOut size={18} />
          Cerrar sesión
        </Button>
        <Button variant="ghost" className="text-red-800" onClick={() => setDeleting(true)}>
          Eliminar mi cuenta
        </Button>
      </div>
      {backup && (
        <ConfirmModal
          title="Sustituir los datos de esta cuenta"
          danger={false}
          confirmLabel="Importar y sustituir"
          onClose={() => setBackup(null)}
          onConfirm={() => {
            update(() => backup.data);
            setProfile(backup.data.farm!);
            setBackup(null);
            notify('Copia importada. Se ha conservado tu cuenta de acceso.');
            onClose();
          }}
        >
          <p className="mb-3 font-semibold">{backup.data.farm?.nombreExplotacion}</p>
          <p>
            {backup.data.animals.length} animales · {backup.data.invoices.length} facturas ·{' '}
            {backup.data.milkRecords.length + backup.data.weightRecords.length} registros de
            producción.
          </p>
          <p className="mt-3">
            Esta copia sustituirá todos los datos de explotación de {user.email}. Las otras cuentas
            no se modificarán. Exporta primero tus datos actuales si quieres conservarlos.
          </p>
        </ConfirmModal>
      )}
      {privacy && <SecurityPrivacyModal onClose={() => setPrivacy(false)} />}
      {deleting && (
        <DeleteAccountModal
          email={user.email}
          onClose={() => setDeleting(false)}
          onDeleted={onLogout}
        />
      )}
    </Modal>
  );
}
