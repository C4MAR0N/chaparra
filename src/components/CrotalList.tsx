import { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, HeartPulse, MapPin, Plus, Search, Tag } from 'lucide-react';
import type { Animal } from '../types';
import { useFarm } from '../context/FarmContext';
import { ESPECIES, ESTADOS, especieLabel } from '../lib/constants';
import {
  age,
  edadTexto,
  herdLabel,
  necesitaAtencion,
  porUbicacion,
  ubicacionDe
} from '../lib/domain';
import { Badge, Button, Card, EmptyState, Field, Input, Select, StatTile } from './ui';
import { AnimalFormModal } from './AnimalFormModal';
import { AnimalDetailModal } from './AnimalDetailModal';

/* Sin filtros la lista se queda corta a propósito: de 235 animales, los cinco
 * primeros ya dicen que la explotación está ahí, y el resto se despliega cuando
 * de verdad se busca algo. */
const VISIBLES_SIN_FILTRO = 5;

export function CrotalList() {
  const { data, farm } = useFarm();
  const animals = data.animals;
  const [search, setSearch] = useState(''),
    [species, setSpecies] = useState(''),
    [health, setHealth] = useState(''),
    [sex, setSex] = useState(''),
    [ubicacion, setUbicacion] = useState(''),
    [active, setActive] = useState('active'),
    [sort, setSort] = useState('crotal');
  const [selectedId, setSelectedId] = useState<string | null>(null),
    [editing, setEditing] = useState<Animal | 'new' | null>(null),
    [verManadas, setVerManadas] = useState(false),
    [verTodos, setVerTodos] = useState(false);
  const selected = animals.find(a => a.id === selectedId);
  const lista = useRef<HTMLDivElement>(null);
  const manadas = useMemo(() => porUbicacion(animals), [animals]);
  const ubicaciones = useMemo(
    () => [...new Set(animals.map(ubicacionDe))].sort((a, b) => a.localeCompare(b, 'es')),
    [animals]
  );
  const filtered = useMemo(
    () =>
      animals
        .filter(
          a =>
            (!search ||
              [a.crotal, a.raza, a.ubicacion].some(s =>
                s.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))
              )) &&
            (!species || a.especie === species) &&
            (!health ||
              (health === 'atencion' ? necesitaAtencion(a) : a.estadoSanitario === health)) &&
            (!sex || a.sexo === sex) &&
            (!ubicacion || ubicacionDe(a) === ubicacion) &&
            (active === 'all' || a.activo === (active === 'active'))
        )
        .sort((a, b) =>
          sort === 'age'
            ? a.fechaNacimiento.localeCompare(b.fechaNacimiento)
            : sort === 'review'
              ? (b.fechaUltimoControl ?? '').localeCompare(a.fechaUltimoControl ?? '')
              : a.crotal.localeCompare(b.crotal, 'es', { numeric: true })
        ),
    [animals, search, species, health, sex, ubicacion, active, sort]
  );
  const hayFiltros =
    Boolean(search || species || health || sex || ubicacion) || active !== 'active';
  const visibles = hayFiltros || verTodos ? filtered : filtered.slice(0, VISIBLES_SIN_FILTRO);
  const ocultos = filtered.length - visibles.length;
  const reset = () => {
    setSearch('');
    setSpecies('');
    setHealth('');
    setSex('');
    setUbicacion('');
    setActive('active');
    setVerTodos(false);
  };
  /* Llevar la vista al listado: un filtro que cambia una lista que no se ve es
   * un clic que parece no haber hecho nada. */
  const irAlListado = () =>
    requestAnimationFrame(() => lista.current?.scrollIntoView({ behavior: 'smooth' }));
  function verAtencion() {
    if (health === 'atencion') return setHealth('');
    reset();
    setHealth('atencion');
    irAlListado();
  }
  function verManada(nombre: string) {
    reset();
    setUbicacion(nombre);
    setVerManadas(false);
    irAlListado();
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-heading">Tu {herdLabel(farm)}</h1>
          <p className="mt-2 text-sm text-stone-600">
            Identificación, sanidad e historial de cada animal.
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus size={20} />
          Dar de alta
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile
          label="Animales activos"
          value={animals.filter(a => a.activo).length}
          icon={Tag}
        />
        <StatTile
          label="Necesitan atención"
          value={animals.filter(necesitaAtencion).length}
          icon={HeartPulse}
          onClick={animals.some(necesitaAtencion) ? verAtencion : undefined}
          expanded={health === 'atencion'}
        />
        <StatTile
          label="Ubicaciones"
          value={manadas.length}
          icon={MapPin}
          onClick={manadas.length ? () => setVerManadas(v => !v) : undefined}
          expanded={verManadas}
        />
      </div>
      {verManadas && (
        <Card className="space-y-3">
          <div>
            <h2 className="section-heading">Reparto por ubicación</h2>
            <p className="mt-1 text-sm text-stone-600">
              Solo animales activos. Toca una manada para ver sus crotales.
            </p>
          </div>
          <ul className="divide-y divide-stone-200">
            {manadas.map(m => (
              <li key={m.ubicacion}>
                <button
                  type="button"
                  onClick={() => verManada(m.ubicacion)}
                  className="flex w-full min-h-12 items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-brand-50"
                >
                  <MapPin size={18} className="shrink-0 text-brand-700" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{m.ubicacion}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {m.hembras} {m.hembras === 1 ? 'hembra' : 'hembras'} · {m.machos}{' '}
                      {m.machos === 1 ? 'macho' : 'machos'} · edad media {edadTexto(m.mesesMedios)}
                    </p>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="text-xl font-bold tabular-nums text-brand-900">{m.total}</span>
                    <span className="block text-xs text-stone-600">animales</span>
                  </p>
                  <ChevronRight size={20} className="shrink-0 text-stone-500" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {animals.length === 0 ? (
        <Card>
          <EmptyState
            icon={Tag}
            title="Tu explotación empieza aquí"
            description="Todavía no has registrado animales. Añade el primero para guardar su crotal, ubicación e historial."
            action={
              <Button onClick={() => setEditing('new')}>
                <Plus size={20} />
                Dar de alta el primer animal
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="space-y-4">
            <Field label="Buscar por crotal, raza o ubicación">
              <Input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Escribe un crotal, una raza o un cercado"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <Field label="Ubicación">
                <Select value={ubicacion} onChange={e => setUbicacion(e.target.value)}>
                  <option value="">Todas</option>
                  {ubicaciones.map(u => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Especie">
                <Select value={species} onChange={e => setSpecies(e.target.value)}>
                  <option value="">Todas</option>
                  {ESPECIES.filter(
                    s => animals.some(a => a.especie === s) || farm.especies.includes(s)
                  ).map(s => (
                    <option key={s} value={s}>
                      {especieLabel(s)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Sanidad">
                <Select value={health} onChange={e => setHealth(e.target.value)}>
                  <option value="">Todos los estados</option>
                  <option value="atencion">Necesitan atención</option>
                  {ESTADOS.map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Sexo">
                <Select value={sex} onChange={e => setSex(e.target.value)}>
                  <option value="">Todos</option>
                  <option>Hembra</option>
                  <option>Macho</option>
                </Select>
              </Field>
              <Field label="Situación">
                <Select value={active} onChange={e => setActive(e.target.value)}>
                  <option value="active">Activos</option>
                  <option value="inactive">De baja</option>
                  <option value="all">Todos</option>
                </Select>
              </Field>
              <Field label="Ordenar por">
                <Select value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="crotal">Crotal</option>
                  <option value="age">Mayor edad</option>
                  <option value="review">Última revisión</option>
                </Select>
              </Field>
            </div>
          </Card>
          <div ref={lista} className="flex items-center justify-between gap-3 scroll-mt-4">
            <p className="text-sm font-semibold text-stone-600">
              {filtered.length}{' '}
              {filtered.length === 1 ? 'animal encontrado' : 'animales encontrados'}
              {ubicacion && ` en ${ubicacion}`}
            </p>
            <Button variant="ghost" size="sm" onClick={reset}>
              Restablecer filtros
            </Button>
          </div>
          {!filtered.length ? (
            <Card>
              <EmptyState
                icon={Search}
                title="No hay coincidencias"
                description="Prueba con otro crotal o cambia los filtros."
                action={
                  <Button variant="secondary" onClick={reset}>
                    Limpiar filtros
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {visibles.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className="block w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold tracking-tight text-brand-800">{a.crotal}</p>
                        <p className="mt-1 text-sm text-stone-600">
                          {especieLabel(a.especie)} · {a.raza || 'Raza sin indicar'}
                        </p>
                      </div>
                      <ChevronRight size={20} className="shrink-0 text-stone-500" />
                    </div>
                    <p className="my-3 text-sm text-stone-600">
                      {age(a.fechaNacimiento)} · {a.sexo}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{a.estadoSanitario}</Badge>
                      {!a.activo && <Badge>De baja</Badge>}
                    </div>
                    <p className="mt-3 flex items-center gap-2 text-sm text-stone-600">
                      <MapPin size={16} />
                      {a.ubicacion || 'Sin ubicación'}
                    </p>
                  </button>
                ))}
              </div>
              <Card className="hidden overflow-hidden !p-0 md:block">
                <table className="data-table">
                  <caption className="sr-only">Listado de animales</caption>
                  <thead>
                    <tr>
                      <th>Crotal / especie</th>
                      <th>Edad / sexo</th>
                      <th>Sanidad</th>
                      <th className="hidden lg:table-cell">Ubicación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map(a => (
                      <tr key={a.id} className="hover:bg-brand-50">
                        <td>
                          <Button
                            variant="ghost"
                            className="max-w-full justify-start px-0 font-semibold tracking-tight"
                            onClick={() => setSelectedId(a.id)}
                          >
                            {a.crotal}
                          </Button>
                          <p className="text-xs text-stone-600">
                            {especieLabel(a.especie)} · {a.raza || 'Sin raza'}
                          </p>
                          {!a.activo && <Badge>De baja</Badge>}
                        </td>
                        <td>
                          {age(a.fechaNacimiento)}
                          <p className="mt-1 text-xs text-stone-600">{a.sexo}</p>
                        </td>
                        <td>
                          <Badge>{a.estadoSanitario}</Badge>
                        </td>
                        <td className="hidden lg:table-cell">{a.ubicacion || 'Sin ubicación'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              {ocultos > 0 && (
                <Button variant="secondary" className="w-full" onClick={() => setVerTodos(true)}>
                  <ChevronDown size={18} />
                  Ver los {ocultos} animales restantes
                </Button>
              )}
              {verTodos && !hayFiltros && filtered.length > VISIBLES_SIN_FILTRO && (
                <Button variant="ghost" className="w-full" onClick={() => setVerTodos(false)}>
                  Ver solo los primeros {VISIBLES_SIN_FILTRO}
                </Button>
              )}
            </>
          )}
        </>
      )}
      {editing && (
        <AnimalFormModal
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {selected && !editing && (
        <AnimalDetailModal
          key={selected.id}
          animal={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => setEditing(selected)}
          onSelect={setSelectedId}
        />
      )}
    </div>
  );
}
