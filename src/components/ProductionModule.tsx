import { useState, type FormEvent } from 'react';
import { Milk, Plus, Scale, Trash2 } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import {
  animalMeat,
  animalMilk,
  dateLabel,
  esActivo,
  euro,
  hasMeat,
  hasMilk,
  milkSeries,
  number,
  euroRate,
  today,
  uid,
  weightStats
} from '../lib/domain';
import type { MilkRecord, WeightRecord } from '../types';
import {
  Button,
  Card,
  ComboBox,
  ConfirmModal,
  EmptyState,
  Field,
  Input,
  SegmentedControl,
  Select,
  StatTile,
  Textarea
} from './ui';
import { DataChart } from './Charts';
export function ProductionModule({ onAnimals }: { onAnimals: () => void }) {
  const { farm } = useFarm();
  const milk = hasMilk(farm),
    meat = hasMeat(farm);
  const [tab, setTab] = useState<'milk' | 'meat'>(milk ? 'milk' : 'meat');
  const activeTab = milk && meat ? tab : milk ? 'milk' : 'meat';
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-heading">Producción</h1>
        <p className="mt-2 text-sm text-stone-600">
          Registra lo que ocurre en el campo y sigue su evolución.
        </p>
      </div>
      {milk && meat && (
        <SegmentedControl
          label="Tipo de producción"
          value={tab}
          options={[
            { value: 'milk', label: 'Leche' },
            { value: 'meat', label: 'Carne' }
          ]}
          onChange={setTab}
        />
      )}
      {activeTab === 'milk' ? <MilkProduction /> : <MeatProduction onAnimals={onAnimals} />}
    </div>
  );
}
function MilkProduction() {
  const { data, farm, update, notify } = useFarm();
  const records = data.milkRecords;
  const last = [...records].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const [fecha, setFecha] = useState(today()),
    [animalId, setAnimalId] = useState(''),
    [ordeno, setOrdeno] = useState<1 | 2 | 3>(1),
    [litros, setLitros] = useState(last ? String(last.litros) : ''),
    [notas, setNotas] = useState(''),
    [error, setError] = useState(''),
    [deleting, setDeleting] = useState<MilkRecord | null>(null);
  const animals = data.animals.filter(a => esActivo(a) && animalMilk(a, farm));
  const series = milkSeries(records, 30);
  const total = records.filter(r => r.fecha === fecha).reduce((sum, r) => sum + r.litros, 0);
  const average = (days: number) =>
    milkSeries(records, days).reduce((sum, r) => sum + r.value, 0) / days;
  function defaults(id: string, turn: 1 | 2 | 3) {
    const previous = [...records]
      .filter(r => (r.animalId ?? '') === id && r.ordeno === turn)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
    setLitros(previous ? String(previous.litros) : '');
  }
  function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    const amount = Number(litros);
    if (!Number.isFinite(amount) || amount < 0 || !litros.trim()) {
      setError('Introduce una cantidad de litros no negativa.');
      return;
    }
    const same = records.filter(r => r.fecha === fecha && (r.ordeno ?? 1) === ordeno);
    if (same.some(r => (r.animalId ?? '') === animalId)) {
      setError(
        'Ya hay un registro para esa fecha, ordeño y animal o conjunto. Elimina el registro incorrecto antes de sustituirlo.'
      );
      return;
    }
    if (same.some(r => !!r.animalId !== !!animalId)) {
      setError(
        'En un mismo ordeño registra el total de la explotación o los animales por separado, para evitar contar la leche dos veces.'
      );
      return;
    }
    const a = animals.find(a => a.id === animalId);
    if (a && fecha < a.fechaNacimiento) {
      setError('La fecha no puede ser anterior al nacimiento del animal.');
      return;
    }
    const row: MilkRecord = {
      id: uid(),
      fecha,
      animalId: animalId || undefined,
      ordeno,
      litros: amount,
      notas
    };
    update(d => ({ ...d, milkRecords: [...d.milkRecords, row] }));
    setNotas('');
    notify('Producción registrada.');
  }
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total del día seleccionado" value={number(total) + ' L'} icon={Milk} />
        <StatTile label="Media diaria · 7 días" value={number(average(7)) + ' L'} />
        <StatTile label="Media diaria · 30 días" value={number(average(30)) + ' L'} />
        <StatTile
          label="Ingreso estimado del día"
          value={euro(total * (farm.precioLitroLecheEuro ?? 0))}
          help={euroRate(farm.precioLitroLecheEuro ?? 0, 'litro')}
        />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="section-heading">Registrar ordeño</h2>
          <form onSubmit={save} className="space-y-4">
            <div className="form-grid">
              <Field label="Fecha">
                <Input
                  type="date"
                  max={today()}
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  required
                />
              </Field>
              <Field label="Ordeño">
                <Select
                  value={ordeno}
                  onChange={e => {
                    const n = Number(e.target.value) as 1 | 2 | 3;
                    setOrdeno(n);
                    defaults(animalId, n);
                  }}
                >
                  {Array.from({ length: farm.ordenosPorDia ?? 2 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      Ordeño {i + 1}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field
              label="Animal o conjunto"
              help="Registra un total por ordeño o registros individuales, sin mezclarlos."
            >
              <ComboBox
                value={animalId}
                onChange={id => {
                  setAnimalId(id);
                  defaults(id, ordeno);
                }}
                clearLabel="Toda la explotación"
                placeholder="Escribe un crotal o una raza"
                options={animals.map(a => ({
                  value: a.id,
                  label: a.crotal,
                  detail: a.raza || undefined
                }))}
              />
            </Field>
            <Field label="Litros" error={error}>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={litros}
                onChange={e => setLitros(e.target.value)}
                required
              />
            </Field>
            <Field label="Notas (opcional)">
              <Textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
            </Field>
            <Button type="submit" className="w-full">
              <Plus size={18} />
              Guardar ordeño
            </Button>
          </form>
        </Card>
        <div className="space-y-3">
          <DataChart
            title="Evolución de los últimos 30 días"
            data={records.length ? series : []}
            unit="L"
            line
          />
          <p className="text-xs text-stone-600">
            Las medias se calculan sobre días naturales hasta hoy. Los días sin registro cuentan
            como cero; completa los registros para obtener una media representativa.
          </p>
        </div>
      </div>
      <Card>
        <h2 className="section-heading">Historial de registros</h2>
        {!records.length ? (
          <EmptyState
            icon={Milk}
            title="Aún no has registrado producción"
            description="Guarda el primer ordeño con el formulario. Los totales y la gráfica se calcularán a partir de tus registros."
          />
        ) : (
          <ul className="divide-y divide-stone-200">
            {[...records]
              .sort((a, b) => b.fecha.localeCompare(a.fecha))
              .map(r => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="text-sm">
                    <p className="font-semibold">
                      {dateLabel(r.fecha)} · Ordeño {r.ordeno ?? 1} · {number(r.litros)} L
                    </p>
                    <p className="mt-1 text-stone-600">
                      {r.animalId
                        ? data.animals.find(a => a.id === r.animalId)?.crotal
                        : 'Toda la explotación'}
                    </p>
                    {r.notas && <p className="mt-1 text-stone-600">{r.notas}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    aria-label={'Eliminar registro del ' + dateLabel(r.fecha)}
                    onClick={() => setDeleting(r)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </li>
              ))}
          </ul>
        )}
      </Card>
      {deleting && (
        <ConfirmModal
          title="Eliminar registro de producción"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            update(d => ({ ...d, milkRecords: d.milkRecords.filter(r => r.id !== deleting.id) }));
            setDeleting(null);
            notify('Registro eliminado.');
          }}
        >
          Se eliminarán {number(deleting.litros)} litros del {dateLabel(deleting.fecha)}.
        </ConfirmModal>
      )}
    </>
  );
}
function MeatProduction({ onAnimals }: { onAnimals: () => void }) {
  const { data, farm, update, notify } = useFarm();
  const animals = data.animals.filter(a => esActivo(a) && animalMeat(a, farm));
  const [animalId, setAnimalId] = useState(animals[0]?.id ?? ''),
    [fecha, setFecha] = useState(today()),
    [peso, setPeso] = useState(() => {
      const last = animals[0] ? weightStats(animals[0], data.weightRecords).last : null;
      return last ? String(last.pesoKg) : '';
    }),
    [notas, setNotas] = useState(''),
    [error, setError] = useState(''),
    [deleting, setDeleting] = useState<WeightRecord | null>(null);
  const selected = animals.find(a => a.id === animalId) ?? animals[0];
  const stats = selected ? weightStats(selected, data.weightRecords) : null;
  const history = selected
    ? data.weightRecords
        .filter(r => r.animalId === selected.id)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
    : [];
  function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!selected) return;
    const weight = Number(peso);
    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Introduce un peso mayor que cero.');
      return;
    }
    if (fecha < selected.fechaNacimiento) {
      setError('La fecha no puede ser anterior al nacimiento.');
      return;
    }
    if (data.weightRecords.some(r => r.animalId === selected.id && r.fecha === fecha)) {
      setError(
        'Ya hay una pesada de este animal en esa fecha. Elimina la incorrecta antes de sustituirla.'
      );
      return;
    }
    update(d => ({
      ...d,
      weightRecords: [
        ...d.weightRecords,
        { id: uid(), fecha, animalId: selected.id, pesoKg: weight, notas }
      ]
    }));
    setNotas('');
    notify('Pesada registrada.');
  }
  if (!animals.length)
    return (
      <Card>
        <EmptyState
          icon={Scale}
          title="Registra el primer animal"
          description="Necesitas un animal activo con orientación de carne para registrar sus pesadas y calcular la ganancia media diaria."
          action={<Button onClick={onAnimals}>Ir al rebaño</Button>}
        />
      </Card>
    );
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Peso actual estimado"
          value={stats?.current == null ? 'Sin peso reciente' : number(stats.current) + ' kg'}
          icon={Scale}
        />
        <StatTile
          label="GMD entre últimas pesadas"
          value={stats?.gmd == null ? 'Faltan dos pesadas' : number(stats.gmd, 3) + ' kg/día'}
        />
        <StatTile
          label="Valor estimado por peso"
          value={
            stats?.current == null
              ? 'Sin peso reciente'
              : euro(stats.current * (farm.precioKgCarneEuro ?? 0))
          }
          help={euroRate(farm.precioKgCarneEuro ?? 0, 'kg en vivo')}
        />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="section-heading">Registrar pesada</h2>
          <form onSubmit={save} className="space-y-4">
            <Field label="Animal">
              <ComboBox
                value={selected?.id ?? ''}
                onChange={id => {
                  setAnimalId(id);
                  const animal = animals.find(a => a.id === id);
                  const last = animal ? weightStats(animal, data.weightRecords).last : null;
                  setPeso(last ? String(last.pesoKg) : '');
                }}
                placeholder="Escribe un crotal o una raza"
                options={animals.map(a => ({
                  value: a.id,
                  label: a.crotal,
                  detail: a.raza || undefined
                }))}
              />
            </Field>
            <div className="form-grid">
              <Field label="Fecha de pesada">
                <Input
                  type="date"
                  min={selected?.fechaNacimiento}
                  max={today()}
                  required
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                />
              </Field>
              <Field label="Peso vivo (kg)" error={error}>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={peso}
                  required
                  onChange={e => setPeso(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Notas (opcional)">
              <Textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
            </Field>
            <Button type="submit" className="w-full">
              <Plus size={18} />
              Guardar pesada
            </Button>
          </form>
        </Card>
        <div className="space-y-3">
          <DataChart
            title="Evolución del peso"
            data={history.map(r => ({ label: dateLabel(r.fecha), value: r.pesoKg }))}
            unit="kg"
            line
          />
          <p className="text-xs text-stone-600">
            El peso actual se estima prolongando la GMD de las dos últimas pesadas hasta hoy. Con
            una sola pesada se muestra ese peso. No sustituye una nueva medición. Si han pasado más
            de 30 días, no se calcula una estimación actual.
            {stats?.last ? ' Última pesada: ' + dateLabel(stats.last.fecha) + '.' : ''}
          </p>
        </div>
      </div>
      <Card>
        <h2 className="section-heading">Historial de pesadas · {selected?.crotal}</h2>
        {!history.length ? (
          <EmptyState
            title="Todavía no hay pesadas"
            description="La GMD se calculará al registrar dos pesadas en fechas distintas."
          />
        ) : (
          <ul className="divide-y divide-stone-200">
            {[...history].reverse().map(r => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="text-sm">
                  <p>
                    {dateLabel(r.fecha)} · <strong>{number(r.pesoKg)} kg</strong>
                  </p>
                  {r.notas && <p className="text-stone-600">{r.notas}</p>}
                </div>
                <Button
                  variant="ghost"
                  aria-label={'Eliminar pesada del ' + dateLabel(r.fecha)}
                  onClick={() => setDeleting(r)}
                >
                  <Trash2 size={18} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {deleting && (
        <ConfirmModal
          title="Eliminar pesada"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            update(d => ({
              ...d,
              weightRecords: d.weightRecords.filter(r => r.id !== deleting.id)
            }));
            setDeleting(null);
            notify('Pesada eliminada.');
          }}
        >
          Se eliminará la pesada del {dateLabel(deleting.fecha)}. La GMD se volverá a calcular.
        </ConfirmModal>
      )}
    </>
  );
}
