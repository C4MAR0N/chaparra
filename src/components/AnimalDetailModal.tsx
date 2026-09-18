import { useState, type FormEvent } from 'react';
import { ChevronRight, Edit, Plus, Trash2 } from 'lucide-react';
import type { Animal, CategoriaAnimal, EstadoSanitario } from '../types';
import { useFarm } from '../context/FarmContext';
import {
  accumulatedCost,
  age,
  animalMeat,
  animalMilk,
  criasDe,
  dateLabel,
  esActivo,
  euro,
  madreDe,
  number,
  today,
  uid,
  weightStats
} from '../lib/domain';
import { CATEGORIAS_ANIMAL, ESTADOS, especieLabel } from '../lib/constants';
import {
  Badge,
  Banner,
  Button,
  ConfirmModal,
  Field,
  Input,
  Modal,
  Select,
  StatTile,
  Textarea
} from './ui';
export function AnimalDetailModal({
  animal,
  onClose,
  onEdit,
  onSelect
}: {
  animal: Animal;
  onClose: () => void;
  onEdit: () => void;
  onSelect: (id: string) => void;
}) {
  const { data, farm, update, notify } = useFarm();
  // La madre es quien tiene a este animal entre sus crías: una sola relación.
  const madre = madreDe(data.animals, animal.id);
  const abuela = madre ? madreDe(data.animals, madre.id) : undefined;
  const crias = criasDe(data.animals, animal.id);
  const [deleting, setDeleting] = useState(false),
    [baja, setBaja] = useState(false),
    [healthOpen, setHealthOpen] = useState(false);
  const [categoriaNueva, setCategoriaNueva] = useState<CategoriaAnimal>('Vendido'),
    [bajaDate, setBajaDate] = useState(today());
  const categoriasBaja = CATEGORIAS_ANIMAL.filter(c => c !== 'Activo');
  const [health, setHealth] = useState<EstadoSanitario>(animal.estadoSanitario),
    [notes, setNotes] = useState(''),
    [cost, setCost] = useState('0'),
    [healthDate, setHealthDate] = useState(today()),
    [error, setError] = useState('');
  const weights = data.weightRecords
    .filter(r => r.animalId === animal.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const milk = data.milkRecords
    .filter(r => r.animalId === animal.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const stats = weightStats(animal, data.weightRecords);
  const value =
    animal.precioEstimadoVentaEuro ??
    (stats.current === null ? null : stats.current * (farm.precioKgCarneEuro ?? 0));
  function addHealth(e: FormEvent) {
    e.preventDefault();
    if (
      healthDate > today() ||
      healthDate < animal.fechaNacimiento ||
      !Number.isFinite(Number(cost)) ||
      Number(cost) < 0
    ) {
      setError('Revisa la fecha y el coste de la actuación.');
      return;
    }
    const record = {
      id: uid(),
      fecha: healthDate,
      estado: health,
      notas: notes.trim(),
      costeEuro: Number(cost)
    };
    update(d => ({
      ...d,
      animals: d.animals.map(a =>
        a.id !== animal.id
          ? a
          : {
              ...a,
              historialSanitario: [...a.historialSanitario, record],
              ...(healthDate >= (a.fechaUltimoControl ?? '')
                ? {
                    estadoSanitario: health,
                    notasSanitarias: notes,
                    fechaUltimoControl: healthDate
                  }
                : {})
            }
      )
    }));
    setHealthOpen(false);
    setNotes('');
    setCost('0');
    notify('Actuación sanitaria registrada.');
  }
  return (
    <Modal title={animal.crotal} onClose={onClose} wide>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{animal.estadoSanitario}</Badge>
        {!esActivo(animal) && <Badge>{animal.categoria}</Badge>}
        <p className="text-sm text-stone-600">
          {especieLabel(animal.especie)} · {animal.raza || 'Raza sin indicar'} · {animal.sexo}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-4 rounded-xl bg-stone-50 p-4 text-sm">
        {[
          ['Nacimiento', dateLabel(animal.fechaNacimiento)],
          ['Edad', age(animal.fechaNacimiento)],
          ['Ubicación', animal.ubicacion || 'Sin indicar'],
          ['Partos', String(animal.numeroPartos)],
          [
            'Última revisión',
            animal.fechaUltimoControl ? dateLabel(animal.fechaUltimoControl) : 'Sin revisión'
          ],
          ['Alta', dateLabel(animal.fechaAlta)]
        ].map(([label, v]) => (
          <div key={label}>
            <dt className="text-stone-600">{label}</dt>
            <dd className="mt-1 break-words font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {!esActivo(animal) && (
        <Banner>
          {animal.categoria} desde{' '}
          {animal.fechaBaja ? dateLabel(animal.fechaBaja) : 'fecha sin indicar'}. Su historial se
          conserva.
        </Banner>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Coste acumulado"
          value={euro(accumulatedCost(animal))}
          help="Coste inicial más actuaciones sanitarias. Las facturas no se suman automáticamente."
        />
        {animalMeat(animal, farm) && (
          <StatTile
            label="Valor estimado de venta"
            value={value === null ? 'Sin peso registrado' : euro(value)}
            help="Estimación; no es un ingreso cobrado."
          />
        )}
      </div>
      <section className="space-y-3">
        <h3 className="section-heading">Parentesco</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-stone-600">Linaje:</span>
          {madre ? (
            <>
              {abuela && (
                <>
                  <Button
                    variant="secondary"
                    className="tracking-tight"
                    onClick={() => onSelect(abuela.id)}
                  >
                    {abuela.crotal}
                  </Button>
                  <ChevronRight size={16} className="shrink-0 text-stone-400" aria-hidden="true" />
                </>
              )}
              <Button
                variant="secondary"
                className="tracking-tight"
                onClick={() => onSelect(madre.id)}
              >
                {madre.crotal}
              </Button>
              <ChevronRight size={16} className="shrink-0 text-stone-400" aria-hidden="true" />
              <span className="font-semibold tracking-tight">{animal.crotal}</span>
            </>
          ) : (
            <span className="text-sm text-stone-600">
              Sin madre indicada. Puedes asignarla al editar la ficha.
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-stone-600">Crías:</p>
        {crias.length ? (
          <div className="flex flex-wrap gap-2">
            {/* Con la fecha al lado, la lista de crías se lee como el historial
                de partos de la madre y no como un montón de crotales sueltos. */}
            {crias.map(cria => (
              <Button
                key={cria.id}
                variant="secondary"
                className="flex-col items-start gap-0 py-2 tracking-tight"
                onClick={() => onSelect(cria.id)}
              >
                {cria.crotal}
                <span className="text-xs font-normal text-stone-600">
                  {cria.fechaNacimiento ? dateLabel(cria.fechaNacimiento) : 'Sin fecha'}
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-600">
            No hay crías vinculadas. Puedes asociarlas al editar la ficha.
          </p>
        )}
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-heading">Historial sanitario</h3>
          <Button variant="secondary" onClick={() => setHealthOpen(!healthOpen)}>
            <Plus size={18} />
            Añadir actuación
          </Button>
        </div>
        {healthOpen && (
          <form className="space-y-4 rounded-xl border border-stone-200 p-4" onSubmit={addHealth}>
            <div className="form-grid">
              <Field label="Fecha de actuación">
                <Input
                  type="date"
                  min={animal.fechaNacimiento}
                  max={today()}
                  required
                  value={healthDate}
                  onChange={e => setHealthDate(e.target.value)}
                />
              </Field>
              <Field label="Estado tras la actuación">
                <Select value={health} onChange={e => setHealth(e.target.value as EstadoSanitario)}>
                  {ESTADOS.map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Coste de la actuación (€)">
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={cost}
                  required
                  onChange={e => setCost(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Tratamiento u observaciones">
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} required rows={3} />
            </Field>
            {error && <Banner tone="error">{error}</Banner>}
            <Button type="submit">Guardar actuación</Button>
          </form>
        )}
        {animal.historialSanitario.length ? (
          <ol className="divide-y divide-stone-200">
            {[...animal.historialSanitario]
              .sort((a, b) => b.fecha.localeCompare(a.fecha))
              .map(r => (
                <li key={r.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span>
                      {dateLabel(r.fecha)} · {euro(r.costeEuro)}
                    </span>
                    <Badge>{r.estado}</Badge>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-stone-600">{r.notas}</p>
                </li>
              ))}
          </ol>
        ) : (
          <p className="text-sm text-stone-600">No hay actuaciones sanitarias registradas.</p>
        )}
      </section>
      {animalMeat(animal, farm) && (
        <section className="space-y-3">
          <h3 className="section-heading">Pesadas</h3>
          <p className="text-sm text-stone-600">
            GMD entre las dos últimas pesadas:{' '}
            {stats.gmd === null ? 'faltan dos fechas distintas' : number(stats.gmd, 3) + ' kg/día'}.
          </p>
          {animal.pesoCanalKg !== undefined && (
            <p className="text-sm">Peso de canal: {number(animal.pesoCanalKg)} kg.</p>
          )}
          {weights.length ? (
            <ul className="divide-y divide-stone-200">
              {weights.map(r => (
                <li key={r.id} className="py-3 text-sm">
                  {dateLabel(r.fecha)} · <strong>{number(r.pesoKg)} kg</strong>
                  {r.notas && <p className="text-stone-600">{r.notas}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-600">Registra las pesadas en Producción.</p>
          )}
        </section>
      )}
      {animalMilk(animal, farm) && (
        <section className="space-y-3">
          <h3 className="section-heading">Registros de leche</h3>
          {milk.length ? (
            <ul className="divide-y divide-stone-200">
              {milk.map(r => (
                <li key={r.id} className="py-3 text-sm">
                  {dateLabel(r.fecha)} · Ordeño {r.ordeno ?? 1} ·{' '}
                  <strong>{number(r.litros)} litros</strong>
                  {r.notas && <p className="text-stone-600">{r.notas}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-600">
              Todavía no hay registros individuales de leche.
            </p>
          )}
        </section>
      )}
      <div className="flex flex-wrap justify-between gap-3 border-t border-stone-200 pt-4">
        <Button variant="ghost" className="text-red-800" onClick={() => setDeleting(true)}>
          <Trash2 size={18} />
          Eliminar
        </Button>
        <div className="flex flex-wrap gap-2">
          {esActivo(animal) && (
            <Button variant="secondary" onClick={() => setBaja(true)}>
              Cambiar categoría
            </Button>
          )}
          <Button onClick={onEdit}>
            <Edit size={18} />
            Editar
          </Button>
        </div>
      </div>
      {deleting && (
        <ConfirmModal
          title="Eliminar animal e historial"
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            update(d => ({
              ...d,
              animals: d.animals
                .filter(a => a.id !== animal.id)
                .map(a => ({
                  ...a,
                  criasAsociadas: a.criasAsociadas.filter(id => id !== animal.id)
                })),
              milkRecords: d.milkRecords.filter(r => r.animalId !== animal.id),
              weightRecords: d.weightRecords.filter(r => r.animalId !== animal.id)
            }));
            notify('Animal e historial eliminados.');
            onClose();
          }}
        >
          Se eliminará {animal.crotal}, su historial sanitario y sus registros individuales de
          producción. Las facturas se conservan. Para conservar el historial, utiliza Cambiar
          categoría.
        </ConfirmModal>
      )}
      {baja && (
        <Modal title="Cambiar la categoría del animal" onClose={() => setBaja(false)}>
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              update(d => ({
                ...d,
                animals: d.animals.map(a =>
                  a.id === animal.id ? { ...a, categoria: categoriaNueva, fechaBaja: bajaDate } : a
                )
              }));
              setBaja(false);
              notify('Categoría actualizada. El historial se conserva.');
            }}
          >
            <Field label="Nueva categoría">
              <Select
                value={categoriaNueva}
                onChange={e => setCategoriaNueva(e.target.value as CategoriaAnimal)}
              >
                {categoriasBaja.map(c => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha de baja">
              <Input
                type="date"
                min={animal.fechaAlta}
                max={today()}
                value={bajaDate}
                onChange={e => setBajaDate(e.target.value)}
                required
              />
            </Field>
            <Button type="submit">Confirmar</Button>
          </form>
        </Modal>
      )}
    </Modal>
  );
}
