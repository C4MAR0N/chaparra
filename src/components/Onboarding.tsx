import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Beef,
  Bird,
  Check,
  Cloud,
  Leaf,
  Mountain,
  PawPrint,
  PiggyBank
} from 'lucide-react';
import type { Especie, FarmProfile, Orientacion, UserRecord } from '../types';
import { ESPECIES, ORIENTACIONES, PROVINCIAS, especieLabel } from '../lib/constants';
import { hasMeat, hasMilk } from '../lib/domain';
import { Banner, Button, Card, Field, Input, SegmentedControl, Select } from './ui';
// Lucide no tiene glifos de oveja, cabra ni caballo: se usa el icono fiel cuando existe
// (vacuno, porcino, aves) y uno asociativo o genérico en el resto.
const ICONOS_ESPECIE: Record<Especie, typeof Leaf> = {
  Vacuno: Beef,
  Ovino: Cloud,
  Caprino: Mountain,
  Porcino: PiggyBank,
  Equino: PawPrint,
  Avicola: Bird,
  Otro: PawPrint
};
export function Onboarding({
  user,
  initial,
  onComplete,
  onCancel
}: {
  user: UserRecord;
  initial?: FarmProfile;
  onComplete: (farm: FarmProfile) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState(1),
    [error, setError] = useState('');
  const [farm, setFarm] = useState<FarmProfile>({
    ...{
      nombreExplotacion: '',
      codigoRega: '',
      provincia: '',
      titular: user.nombre,
      especies: [],
      orientacionPorEspecie: {},
      moneda: 'EUR' as const
    },
    ...initial,
    ordenosPorDia: initial?.ordenosPorDia ?? 2,
    precioLitroLecheEuro: initial?.precioLitroLecheEuro ?? 0.5,
    precioKgCarneEuro: initial?.precioKgCarneEuro ?? 3
  });
  const patch = (values: Partial<FarmProfile>) => setFarm({ ...farm, ...values });
  const milk = hasMilk(farm),
    meat = hasMeat(farm);
  const headings = [
    'Tu explotación',
    '¿Qué animales tienes?',
    '¿Para qué los crías?',
    'Datos económicos de partida'
  ];
  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (step === 1 && !farm.nombreExplotacion.trim()) {
      setError('Escribe el nombre de la explotación.');
      return;
    }
    if (step === 2 && !farm.especies.length) {
      setError('Selecciona al menos una especie.');
      return;
    }
    if (step === 3 && farm.especies.some(s => !farm.orientacionPorEspecie[s])) {
      setError('Elige una orientación para cada especie.');
      return;
    }
    if (step < 4 && (step !== 3 || milk || meat)) {
      setStep(step + 1);
      return;
    }
    if (
      (milk &&
        (!Number.isFinite(farm.precioLitroLecheEuro) || Number(farm.precioLitroLecheEuro) < 0)) ||
      (meat && (!Number.isFinite(farm.precioKgCarneEuro) || Number(farm.precioKgCarneEuro) < 0))
    ) {
      setError('Los precios deben ser números iguales o mayores que cero.');
      return;
    }
    const orientations: FarmProfile['orientacionPorEspecie'] = {};
    farm.especies.forEach(s => {
      orientations[s] = farm.orientacionPorEspecie[s];
    });
    onComplete({
      ...farm,
      nombreExplotacion: farm.nombreExplotacion.trim(),
      titular: farm.titular.trim(),
      orientacionPorEspecie: orientations,
      ordenosPorDia: milk ? farm.ordenosPorDia : undefined,
      precioLitroLecheEuro: milk ? farm.precioLitroLecheEuro : undefined,
      precioKgCarneEuro: meat ? farm.precioKgCarneEuro : undefined
    });
  }
  return (
    <main className="mx-auto min-h-screen max-w-2xl p-4 py-8 sm:p-8">
      <div className="mb-8 flex items-center gap-2 text-xl font-bold text-brand-800">
        <Leaf /> Chaparra
      </div>
      <Card className="space-y-6 sm:p-8">
        <div>
          <div className="mb-3 flex justify-between gap-4 text-sm">
            <p className="font-semibold text-brand-700">
              {initial ? 'Editar tu explotación' : 'Prepara tu explotación'}
            </p>
            <p className="text-stone-600">Paso {step} de 4</p>
          </div>
          <div
            role="progressbar"
            aria-label="Progreso de la encuesta"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={step}
            className="flex gap-2"
          >
            {headings.map((title, i) => (
              <div
                key={title}
                className={`h-2 flex-1 rounded-full ${i < step ? 'bg-brand-700' : 'bg-stone-200'}`}
              />
            ))}
          </div>
          <h1 className="page-heading mt-6">{headings[step - 1]}</h1>
        </div>
        <form onSubmit={submit} className="space-y-5">
          {step === 1 && (
            <>
              <Field label="Nombre de la ganadería" error={error}>
                <Input
                  value={farm.nombreExplotacion}
                  onChange={e => patch({ nombreExplotacion: e.target.value })}
                  required
                  autoFocus
                />
              </Field>
              <Field
                label="Código REGA (opcional)"
                help="Lo encuentras en tu tarjeta de explotación."
              >
                <Input
                  value={farm.codigoRega}
                  onChange={e => patch({ codigoRega: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Provincia (opcional)">
                <Select value={farm.provincia} onChange={e => patch({ provincia: e.target.value })}>
                  <option value="">Seleccionar provincia</option>
                  {PROVINCIAS.map(p => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Titular">
                <Input value={farm.titular} onChange={e => patch({ titular: e.target.value })} />
              </Field>
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-sm text-stone-600">
                Puedes seleccionar varias especies. Las fichas se adaptarán a tu elección.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {ESPECIES.map(especie => {
                  const Icono = ICONOS_ESPECIE[especie];
                  const seleccionada = farm.especies.includes(especie);
                  return (
                    <Button
                      key={especie}
                      variant={seleccionada ? 'primary' : 'secondary'}
                      aria-pressed={seleccionada}
                      className="relative h-24 flex-col justify-center gap-2 p-4"
                      onClick={() =>
                        patch({
                          especies: seleccionada
                            ? farm.especies.filter(s => s !== especie)
                            : [...farm.especies, especie]
                        })
                      }
                    >
                      <Icono size={26} aria-hidden="true" />
                      {especieLabel(especie)}
                      {seleccionada && <Check size={18} className="absolute right-3 top-3" />}
                    </Button>
                  );
                })}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <p className="text-sm text-stone-600">
                Esta elección determina los registros, campos e informes que verás.
              </p>
              {farm.especies.map(s => (
                <SegmentedControl<Orientacion>
                  key={s}
                  label={especieLabel(s)}
                  options={ORIENTACIONES.map(value => ({ value, label: value }))}
                  value={farm.orientacionPorEspecie[s] ?? ''}
                  onChange={value =>
                    patch({ orientacionPorEspecie: { ...farm.orientacionPorEspecie, [s]: value } })
                  }
                />
              ))}
            </>
          )}
          {step === 4 && (
            <>
              <Banner>
                Los precios propuestos son estimaciones editables, no cotizaciones de mercado.
                Ajusta tus precios ahora o más adelante en Ajustes.
              </Banner>
              {milk && (
                <>
                  <Field label="Ordeños al día">
                    <Select
                      value={farm.ordenosPorDia ?? 2}
                      onChange={e => patch({ ordenosPorDia: Number(e.target.value) as 1 | 2 | 3 })}
                    >
                      {[1, 2, 3].map(n => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Precio estimado de la leche (€/litro)">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      required
                      value={farm.precioLitroLecheEuro ?? 0.5}
                      onChange={e =>
                        patch({
                          precioLitroLecheEuro:
                            e.target.value === '' ? undefined : Number(e.target.value)
                        })
                      }
                    />
                  </Field>
                </>
              )}
              {meat && (
                <Field
                  label="Precio estimado de carne (€/kg en vivo)"
                  help="La valoración se calcula sobre peso vivo. No se aplica un rendimiento de canal supuesto."
                >
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    required
                    value={farm.precioKgCarneEuro ?? 3}
                    onChange={e =>
                      patch({
                        precioKgCarneEuro:
                          e.target.value === '' ? undefined : Number(e.target.value)
                      })
                    }
                  />
                </Field>
              )}
            </>
          )}
          {error && step !== 1 && <Banner tone="error">{error}</Banner>}
          <div className="flex flex-wrap justify-between gap-3 border-t border-stone-200 pt-5">
            {step > 1 ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setStep(step - 1);
                  setError('');
                }}
              >
                <ArrowLeft size={18} />
                Atrás
              </Button>
            ) : onCancel ? (
              <Button variant="secondary" onClick={onCancel}>
                Cancelar
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit">
              {step === 4
                ? initial
                  ? 'Guardar cambios'
                  : 'Entrar en mi explotación'
                : 'Continuar'}
              <ArrowRight size={18} />
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
