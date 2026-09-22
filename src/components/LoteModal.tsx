import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Animal, TipoLote } from '../types';
import { useFarm } from '../context/FarmContext';
import { TIPOS_LOTE } from '../lib/constants';
import { today, ubicacionDe } from '../lib/domain';
import { aplicarLote, describirLote } from '../services/lotes';
import { Banner, Button, Field, Input, Modal, Select, Textarea } from './ui';

/*
 * Lo que ve el ganadero al hacer algo con varios animales a la vez.
 *
 * El orden de la pantalla no es casual: primero cuántos animales lleva
 * seleccionados y cuáles, porque es lo que más fácil es equivocar; después qué
 * se les hace y cuándo; y al final, en grande, la frase de lo que va a pasar.
 * Una venta de diez añojos los da de baja de verdad, y eso tiene que estar
 * leído antes de pulsar, no descubierto después.
 */
export function LoteModal({
  animales,
  onClose,
  onHecho,
  tipoInicial = 'Destete'
}: {
  animales: Animal[];
  onClose: () => void;
  onHecho: (loteId: string) => void;
  /* Al vender un destete ya registrado se entra con la venta elegida: obligar a
   * cambiarlo a mano sería pedir dos veces lo que ya se ha dicho. */
  tipoInicial?: TipoLote;
}) {
  const { data, update, notify } = useFarm();
  const [tipo, setTipo] = useState<TipoLote>(tipoInicial);
  const [fecha, setFecha] = useState(today());
  const [destino, setDestino] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');

  const definicion = TIPOS_LOTE.find(t => t.tipo === tipo);
  const ubicaciones = useMemo(
    () => [...new Set(data.animals.map(ubicacionDe))].sort((a, b) => a.localeCompare(b, 'es')),
    [data.animals]
  );
  const propuesta = {
    tipo,
    fecha,
    animalIds: animales.map(a => a.id),
    ubicacionDestino: tipo === 'Traslado' ? destino : undefined,
    notas
  };
  /* Todo lo que da de baja —vender, destetar, morir— saca al animal de la
   * explotación y no se deshace desde esta pantalla, así que se pide con la
   * frase delante y no con un botón que dice solo «Aceptar». Trasladar no:
   * cambiar de cercado se arregla volviendo a trasladar. */
  const delicado = tipo !== 'Traslado';
  const previsto = fecha > today();

  function guardar(e: FormEvent) {
    e.preventDefault();
    try {
      const siguiente = aplicarLote(data, propuesta);
      const lote = siguiente.lotes[siguiente.lotes.length - 1];
      update(() => siguiente);
      notify(`${describirLote(propuesta, animales, false)} Ya puedes verlo como grupo.`);
      onHecho(lote.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido registrar la operación.');
    }
  }

  return (
    <Modal title="Operación en grupo" onClose={onClose}>
      <form onSubmit={guardar} className="space-y-5">
        <section className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <p className="font-semibold">
            {animales.length}{' '}
            {animales.length === 1 ? 'animal seleccionado' : 'animales seleccionados'}
          </p>
          <p className="mt-2 break-words text-sm leading-relaxed text-stone-600">
            {animales
              .slice(0, 12)
              .map(a => a.crotal)
              .join(' · ')}
            {animales.length > 12 && ` · y ${animales.length - 12} más`}
          </p>
        </section>

        <Field label="Qué se hace" help={definicion?.efecto}>
          <Select value={tipo} onChange={e => setTipo(e.target.value as TipoLote)}>
            {TIPOS_LOTE.map(t => (
              <option key={t.tipo} value={t.tipo}>
                {t.titulo}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Fecha"
          help="El día en que pasa. Puede ser anterior a hoy, o posterior si lo estás dejando preparado."
        >
          <Input type="date" value={fecha} required onChange={e => setFecha(e.target.value)} />
        </Field>

        {tipo === 'Traslado' && (
          <Field
            label="Ubicación de destino"
            help="Escribe un cercado nuevo o elige uno de los que ya usas."
          >
            <Input
              list="ubicaciones-lote"
              value={destino}
              required
              placeholder="Cercado del Pantano"
              onChange={e => setDestino(e.target.value)}
            />
          </Field>
        )}
        <datalist id="ubicaciones-lote">
          {ubicaciones.map(u => (
            <option key={u} value={u} />
          ))}
        </datalist>

        <Field label="Notas" help="Opcional. Comprador, motivo, lo que quieras recordar.">
          <Textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
        </Field>

        <Banner tone={delicado ? 'warning' : 'success'}>
          {describirLote(propuesta, animales)}
          {delicado && ' Esto no se puede deshacer desde esta pantalla.'}
          {/* Una venta con fecha por delante se aplica igual en el momento: el
              animal deja de contar como activo hoy, no el día que dice la
              fecha. Decirlo aquí evita descubrirlo en el recuento. */}
          {previsto &&
            delicado &&
            ' Ojo: la fecha es futura, pero dejan de contar como activos ya.'}
          {previsto && !delicado && ' Queda anotado para esa fecha.'}
        </Banner>

        {error && (
          <Banner tone="error">
            <span className="flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </span>
          </Banner>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Registrar {definicion?.titulo.toLowerCase()}</Button>
        </div>
      </form>
    </Modal>
  );
}
