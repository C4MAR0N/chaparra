import { useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import {
  MAX_UBICACION,
  borrarUbicacion,
  crearUbicacion,
  fichasEn,
  nombreTrasRenombrar,
  renombrarUbicacion,
  ubicacionesDisponibles
} from '../lib/ubicaciones';
import { Banner, Button, Field, Input } from './ui';

/*
 * Donde se crean y se corrigen las ubicaciones. Es el único sitio en el que se
 * escriben: en la ficha del animal y en los traslados se eligen de la lista.
 *
 * Renombrar es la herramienta para las erratas de antes: si una vaca quedó en
 * «Pantno», se renombra a «Pantano» y pasa al cercado bueno junto con todas las
 * que tuvieran la misma errata.
 */
export function GestionUbicaciones() {
  const { data, update, notify } = useFarm();
  const [nueva, setNueva] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [error, setError] = useState('');
  const lista = ubicacionesDisponibles(data.farm, data.animals);

  function aplicar(
    cambio: () => ReturnType<typeof crearUbicacion>,
    aviso: string | (() => string)
  ) {
    try {
      const siguiente = cambio();
      update(() => siguiente);
      setError('');
      notify(typeof aviso === 'string' ? aviso : aviso());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido guardar.');
      return false;
    }
  }

  function crear(e: FormEvent) {
    e.preventDefault();
    if (aplicar(() => crearUbicacion(data, nueva), `Ubicación «${nueva.trim()}» creada.`))
      setNueva('');
  }

  function guardarNombre(vieja: string) {
    const n = fichasEn(data.animals, vieja);
    /*
     * Se dice el nombre con el que se queda, no el tecleado: al escribir
     * «pantano» teniendo ya «Pantano», los animales van a «Pantano», y el aviso
     * no puede contar otra cosa.
     */
    const aviso = () => {
      const destino = nombreTrasRenombrar(data, vieja, nombreEditado);
      return n > 0
        ? `Renombrada. ${n} ${n === 1 ? 'ficha pasa' : 'fichas pasan'} a «${destino}».`
        : `Renombrada a «${destino}».`;
    };
    if (aplicar(() => renombrarUbicacion(data, vieja, nombreEditado), aviso)) setEditando(null);
  }

  return (
    <section className="space-y-4 border-t border-stone-200 pt-4">
      <div>
        <h3 className="section-heading">Tus ubicaciones</h3>
        <p className="mt-1 text-sm text-stone-600">
          Se escriben aquí una vez y luego se eligen de una lista, en la ficha de cada animal y en
          los traslados. Así no se cuela ninguna errata.
        </p>
      </div>

      <form onSubmit={crear} className="flex flex-wrap items-end gap-2">
        <Field label="Nueva ubicación" className="min-w-0 flex-1">
          <Input
            value={nueva}
            maxLength={MAX_UBICACION}
            placeholder="Cercado del Pantano"
            onChange={e => setNueva(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={!nueva.trim()}>
          <Plus size={18} />
          Añadir
        </Button>
      </form>

      {error && <Banner tone="error">{error}</Banner>}

      {lista.length ? (
        <ul className="divide-y divide-stone-200">
          {lista.map(u => {
            const n = fichasEn(data.animals, u);
            return (
              <li key={u} className="py-3">
                {editando === u ? (
                  <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={e => {
                      e.preventDefault();
                      guardarNombre(u);
                    }}
                  >
                    <Field label={`Nuevo nombre para «${u}»`} className="min-w-0 flex-1">
                      <Input
                        value={nombreEditado}
                        maxLength={MAX_UBICACION}
                        autoFocus
                        onChange={e => setNombreEditado(e.target.value)}
                      />
                    </Field>
                    <Button type="submit" size="sm" disabled={!nombreEditado.trim()}>
                      <Check size={16} />
                      Guardar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditando(null);
                        setError('');
                      }}
                    >
                      <X size={16} />
                      Cancelar
                    </Button>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold">{u}</p>
                      <p className="text-sm text-stone-600">
                        {n ? `${n} ${n === 1 ? 'ficha' : 'fichas'}` : 'Sin animales'}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditando(u);
                        setNombreEditado(u);
                        setError('');
                      }}
                    >
                      <Pencil size={16} />
                      Renombrar
                    </Button>
                    {/* Solo se puede quitar una vacía: con animales dentro
                        seguiría apareciendo, porque la usan sus fichas. */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-800"
                      disabled={n > 0}
                      aria-label={`Eliminar ${u}`}
                      title={n > 0 ? 'Tiene animales: muévelos o renómbrala' : undefined}
                      onClick={() => aplicar(() => borrarUbicacion(data, u), `«${u}» eliminada.`)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-stone-600">Todavía no hay ninguna. Crea la primera arriba.</p>
      )}
    </section>
  );
}
