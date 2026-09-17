import { useMemo, useState } from 'react';
import { ChevronRight, HeartPulse, MapPin, Plus, Search, Tag } from 'lucide-react';
import type { Animal } from '../types';
import { useFarm } from '../context/FarmContext';
import { ESPECIES, ESTADOS, especieLabel } from '../lib/constants';
import { age, herdLabel } from '../lib/domain';
import { Badge, Button, Card, EmptyState, Field, Input, Select, StatTile } from './ui';
import { AnimalFormModal } from './AnimalFormModal';
import { AnimalDetailModal } from './AnimalDetailModal';
export function CrotalList() {
  const { data, farm } = useFarm();
  const animals = data.animals;
  const [search, setSearch] = useState(''),
    [species, setSpecies] = useState(''),
    [health, setHealth] = useState(''),
    [sex, setSex] = useState(''),
    [active, setActive] = useState('active'),
    [sort, setSort] = useState('crotal');
  const [selectedId, setSelectedId] = useState<string | null>(null),
    [editing, setEditing] = useState<Animal | 'new' | null>(null);
  const selected = animals.find(a => a.id === selectedId);
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
            (!health || a.estadoSanitario === health) &&
            (!sex || a.sexo === sex) &&
            (active === 'all' || a.activo === (active === 'active'))
        )
        .sort((a, b) =>
          sort === 'age'
            ? a.fechaNacimiento.localeCompare(b.fechaNacimiento)
            : sort === 'review'
              ? (b.fechaUltimoControl ?? '').localeCompare(a.fechaUltimoControl ?? '')
              : a.crotal.localeCompare(b.crotal, 'es', { numeric: true })
        ),
    [animals, search, species, health, sex, active, sort]
  );
  const reset = () => {
    setSearch('');
    setSpecies('');
    setHealth('');
    setSex('');
    setActive('active');
  };
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
          value={
            animals.filter(
              a =>
                a.activo &&
                ['En tratamiento', 'En cuarentena', 'Observación'].includes(a.estadoSanitario)
            ).length
          }
          icon={HeartPulse}
        />
        <StatTile
          label="Ubicaciones"
          value={
            new Set(
              animals
                .filter(a => a.activo)
                .map(a => a.ubicacion)
                .filter(Boolean)
            ).size
          }
          icon={MapPin}
        />
      </div>
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
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-stone-600">
              {filtered.length}{' '}
              {filtered.length === 1 ? 'animal encontrado' : 'animales encontrados'}
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
                {filtered.map(a => (
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
                    {filtered.map(a => (
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
