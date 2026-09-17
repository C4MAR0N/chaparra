import { useState, type FormEvent } from 'react';
import type { Animal, Especie, EstadoSanitario, Orientacion, SexoAnimal } from '../types';
import { useFarm } from '../context/FarmContext';
import { ESTADOS, especieLabel } from '../lib/constants';
import { animalMeat, hasMeat, hasMilk, today, uid } from '../lib/domain';
import { nonnegative, validDate } from '../lib/validation';
import { Banner, Button, Field, Input, Modal, Select, Textarea } from './ui';
export function AnimalFormModal({ initial, onClose }: { initial?: Animal; onClose: () => void }) {
  const { data, farm, update, notify } = useFarm();
  const first = farm.especies[0];
  const allowed: Orientacion[] =
    hasMeat(farm) && hasMilk(farm)
      ? ['Carne', 'Leche', 'Mixto']
      : hasMilk(farm)
        ? ['Leche']
        : ['Carne'];
  const [draft, setDraft] = useState<Animal>(
    initial
      ? {
          ...initial,
          orientacion: allowed.includes(initial.orientacion) ? initial.orientacion : allowed[0]
        }
      : {
          id: uid(),
          crotal: '',
          especie: first,
          orientacion: farm.orientacionPorEspecie[first] ?? 'Carne',
          ubicacion: '',
          numeroPartos: 0,
          fechaNacimiento: '',
          criasAsociadas: [],
          estadoSanitario: 'Sano',
          notasSanitarias: '',
          raza: '',
          sexo: 'Hembra',
          costeAcumuladoEuro: 0,
          activo: true,
          fechaAlta: today(),
          historialSanitario: []
        }
  );
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [child, setChild] = useState('');
  const patch = (values: Partial<Animal>) => setDraft({ ...draft, ...values });
  const species = [...farm.especies.filter(s => s !== 'Otro'), 'Otro'] as Especie[];
  if (initial && !species.includes(initial.especie)) species.unshift(initial.especie);
  const orientations: Orientacion[] =
    hasMeat(farm) && hasMilk(farm)
      ? ['Carne', 'Leche', 'Mixto']
      : hasMilk(farm)
        ? ['Leche']
        : ['Carne'];
  function save(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const crotal = draft.crotal.trim().toUpperCase();
    if (!crotal) nextErrors.crotal = 'El crotal es obligatorio.';
    else if (data.animals.some(a => a.id !== draft.id && a.crotal.trim().toUpperCase() === crotal))
      nextErrors.crotal = 'Ya existe un animal con este crotal, incluso entre las bajas.';
    if (!validDate(draft.fechaNacimiento) || draft.fechaNacimiento > today())
      nextErrors.birth = 'Indica una fecha válida que no sea futura.';
    if (!Number.isInteger(draft.numeroPartos) || draft.numeroPartos < 0)
      nextErrors.partos = 'El número de partos debe ser un entero no negativo.';
    if (
      ['pesoKg', 'pesoCanalKg', 'precioEstimadoVentaEuro', 'costeAcumuladoEuro'].some(k => {
        const value = draft[k as keyof Animal];
        return value !== undefined && !nonnegative(value);
      })
    )
      nextErrors.numbers = 'Los importes y pesos deben ser números no negativos.';
    if (draft.pesoKg !== undefined && draft.pesoKg <= 0)
      nextErrors.numbers = 'El peso debe ser mayor que cero; déjalo vacío si no lo conoces.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    let saved = { ...draft, crotal, raza: draft.raza.trim(), ubicacion: draft.ubicacion.trim() };
    if (
      !initial ||
      initial.estadoSanitario !== draft.estadoSanitario ||
      initial.notasSanitarias !== draft.notasSanitarias
    ) {
      saved = {
        ...saved,
        fechaUltimoControl: today(),
        historialSanitario: [
          ...saved.historialSanitario,
          {
            id: uid(),
            fecha: today(),
            estado: draft.estadoSanitario,
            notas: draft.notasSanitarias?.trim() || 'Estado registrado en la ficha.',
            costeEuro: 0
          }
        ]
      };
    }
    const weightChanged =
      animalMeat(saved, farm) && saved.pesoKg !== undefined && saved.pesoKg !== initial?.pesoKg;
    update(current => ({
      ...current,
      animals: initial
        ? current.animals.map(a => (a.id === saved.id ? saved : a))
        : [saved, ...current.animals],
      weightRecords: weightChanged
        ? [
            ...current.weightRecords.filter(r => !(r.animalId === saved.id && r.fecha === today())),
            {
              id: uid(),
              fecha: today(),
              animalId: saved.id,
              pesoKg: saved.pesoKg!,
              notas: 'Peso registrado en la ficha.'
            }
          ]
        : current.weightRecords
    }));
    notify(initial ? 'Ficha actualizada.' : 'Animal dado de alta.');
    onClose();
  }
  return (
    <Modal title={initial ? 'Editar animal' : 'Dar de alta un animal'} onClose={onClose} wide>
      <form onSubmit={save} noValidate className="space-y-5">
        <div className="form-grid">
          <Field
            label="Crotal"
            error={errors.crotal}
            help={
              draft.crotal && !/^ES\d{12}$/.test(draft.crotal.trim().toUpperCase())
                ? 'El formato habitual es ES seguido de 12 dígitos. Puedes guardar otro identificador si corresponde a tu especie.'
                : undefined
            }
          >
            <Input
              value={draft.crotal}
              onChange={e => patch({ crotal: e.target.value.toUpperCase() })}
              required
              className="font-semibold tracking-tight"
            />
          </Field>
          <Field label="Especie">
            <Select
              value={draft.especie}
              onChange={e => {
                const especie = e.target.value as Especie;
                patch({
                  especie,
                  orientacion: farm.orientacionPorEspecie[especie] ?? orientations[0]
                });
              }}
            >
              {species.map(s => (
                <option key={s} value={s}>
                  {especieLabel(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Orientación">
            <Select
              value={orientations.includes(draft.orientacion) ? draft.orientacion : orientations[0]}
              onChange={e => patch({ orientacion: e.target.value as Orientacion })}
            >
              {orientations.map(o => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </Field>
          <Field label="Raza">
            <Input value={draft.raza} onChange={e => patch({ raza: e.target.value })} />
          </Field>
          <Field label="Sexo">
            <Select
              value={draft.sexo}
              onChange={e => patch({ sexo: e.target.value as SexoAnimal })}
            >
              <option>Hembra</option>
              <option>Macho</option>
            </Select>
          </Field>
          <Field label="Fecha de nacimiento" error={errors.birth}>
            <Input
              type="date"
              max={today()}
              value={draft.fechaNacimiento}
              onChange={e => patch({ fechaNacimiento: e.target.value })}
              required
            />
          </Field>
          <Field label="Ubicación">
            <Input value={draft.ubicacion} onChange={e => patch({ ubicacion: e.target.value })} />
          </Field>
          <Field label="Número de partos" error={errors.partos}>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={draft.numeroPartos}
              onChange={e => patch({ numeroPartos: Number(e.target.value) })}
            />
          </Field>
          <Field label="Estado sanitario">
            <Select
              value={draft.estadoSanitario}
              onChange={e => patch({ estadoSanitario: e.target.value as EstadoSanitario })}
            >
              {ESTADOS.map(s => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Coste acumulado inicial (€)"
            help="Los costes de nuevas actuaciones sanitarias se suman aparte."
            error={errors.numbers}
          >
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={draft.costeAcumuladoEuro ?? ''}
              onChange={e =>
                patch({
                  costeAcumuladoEuro: e.target.value === '' ? undefined : Number(e.target.value)
                })
              }
            />
          </Field>
          {hasMeat(farm) && draft.orientacion !== 'Leche' && (
            <>
              <Field
                label="Peso vivo (kg)"
                help="Si lo cambias se registrará una pesada de hoy; sustituye la de hoy si ya existe."
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={draft.pesoKg ?? ''}
                  onChange={e =>
                    patch({ pesoKg: e.target.value === '' ? undefined : Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Peso de canal (kg, opcional)">
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={draft.pesoCanalKg ?? ''}
                  onChange={e =>
                    patch({
                      pesoCanalKg: e.target.value === '' ? undefined : Number(e.target.value)
                    })
                  }
                />
              </Field>
              <Field
                label="Valor de venta estimado (€)"
                help="Opcional. Si no lo indicas se calcula con el peso y el precio de Ajustes."
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={draft.precioEstimadoVentaEuro ?? ''}
                  onChange={e =>
                    patch({
                      precioEstimadoVentaEuro:
                        e.target.value === '' ? undefined : Number(e.target.value)
                    })
                  }
                />
              </Field>
            </>
          )}
        </div>
        <Field label="Observaciones sanitarias">
          <Textarea
            rows={3}
            value={draft.notasSanitarias ?? ''}
            onChange={e => patch({ notasSanitarias: e.target.value })}
          />
        </Field>
        <section className="space-y-3 rounded-xl border border-stone-200 p-4">
          <h3 className="font-semibold">Crías asociadas</h3>
          <Field label="Seleccionar una cría registrada">
            <Select value={child} onChange={e => setChild(e.target.value)}>
              <option value="">Seleccionar animal</option>
              {data.animals
                .filter(a => a.id !== draft.id && !draft.criasAsociadas.includes(a.id))
                .map(a => (
                  <option key={a.id} value={a.id}>
                    {a.crotal}
                  </option>
                ))}
            </Select>
          </Field>
          <Button
            variant="secondary"
            disabled={!child}
            onClick={() => {
              patch({ criasAsociadas: [...draft.criasAsociadas, child] });
              setChild('');
            }}
          >
            Asociar cría
          </Button>
          {draft.criasAsociadas.map(id => (
            <div key={id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold tracking-tight">
                {data.animals.find(a => a.id === id)?.crotal}
              </span>
              <Button
                variant="ghost"
                onClick={() =>
                  patch({ criasAsociadas: draft.criasAsociadas.filter(c => c !== id) })
                }
              >
                Desvincular
              </Button>
            </div>
          ))}
        </section>
        {Object.keys(errors).length > 0 && (
          <Banner tone="error">Revisa los campos indicados antes de guardar.</Banner>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar animal</Button>
        </div>
      </form>
    </Modal>
  );
}
