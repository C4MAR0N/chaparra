import { useEffect, useId, useRef, useState, type InputHTMLAttributes } from 'react';

export interface ComboBoxOption {
  value: string;
  label: string;
  /** Texto adicional que también cuenta al buscar; solo se ve en la lista, no en el campo cerrado. */
  detail?: string;
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>;

export interface ComboBoxProps extends InputProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboBoxOption[];
  /** Si se indica, aparece como primera fila de la lista y permite dejar el campo vacío. */
  clearLabel?: string;
  emptyLabel?: string;
}

/*
 * Los acentos se quitan por descomposición Unicode (NFD) en vez de con una
 * tabla de reemplazos: cubre cualquier vocal acentuada sin mantener una
 * lista a mano. El rango de marcas diacríticas se construye desde una
 * cadena escapada, nunca como literal en la regex, porque Prettier reescribe
 * los literales Unicode y la rompe sin avisar.
 */
const MARCAS_DIACRITICAS = new RegExp('[\\u0300-\\u036f]', 'g');
const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(MARCAS_DIACRITICAS, '').toLocaleLowerCase('es');

/*
 * Desplegable con filtro de texto para listas largas: el rebaño real ronda
 * las 235 cabezas y un <select> nativo con todas es lo que más molesta al
 * ganadero ahora mismo. Las opciones se pintan como una lista propia, no en
 * un portal, porque el componente tiene que funcionar dentro de un
 * <dialog> abierto con showModal(): cualquier cosa fuera de él queda inerte.
 */
export function ComboBox({
  id,
  value,
  onChange,
  options,
  placeholder,
  clearLabel,
  emptyLabel = 'Sin resultados',
  className = '',
  ...rest
}: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selected = options.find(o => o.value === value);
  const filtradas = query
    ? options.filter(o => normalizar(`${o.label} ${o.detail ?? ''}`).includes(normalizar(query)))
    : options;
  const items: ComboBoxOption[] =
    clearLabel === undefined ? filtradas : [{ value: '', label: clearLabel }, ...filtradas];
  const activo = Math.min(activeIndex, Math.max(items.length - 1, 0));

  // Mantiene visible la opción activa al navegar con flechas más allá del recorte del scroll.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[activo] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activo, open]);

  function elegir(v: string) {
    onChange(v);
    setOpen(false);
    setQuery('');
  }
  function abrir() {
    if (open) return;
    setOpen(true);
    setQuery('');
    setActiveIndex(0);
  }
  return (
    <div
      ref={containerRef}
      className="relative min-w-0"
      onBlur={e => {
        // Perder el foco hacia una fila de la propia lista no cierra nada:
        // el onMouseDown de la lista ya resolvió la selección antes de esto.
        if (containerRef.current?.contains(e.relatedTarget as Node)) return;
        setOpen(false);
        setQuery('');
      }}
    >
      <input
        {...rest}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && items.length ? `${listboxId}-${activo}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        className={`control ${className}`}
        value={open ? query : (selected?.label ?? '')}
        onFocus={abrir}
        onClick={abrir}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={e => {
          if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              abrir();
            }
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, items.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = items[activo];
            if (item) elegir(item.value);
          } else if (e.key === 'Escape') {
            // Se traga el Escape para cerrar solo la lista: si se dejara
            // subir, cerraría también el <dialog> que la contiene.
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            setQuery('');
          }
        }}
      />
      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          onMouseDown={e => e.preventDefault()}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-stone-200 bg-white py-1 shadow-card"
        >
          {items.length ? (
            items.map((item, i) => (
              <li
                key={item.value}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={item.value === value}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => elegir(item.value)}
                className={`flex min-h-11 cursor-pointer items-center gap-1 px-3 text-sm ${i === activo ? 'bg-brand-50 text-brand-900' : ''} ${item.value === value ? 'font-semibold' : ''} ${clearLabel !== undefined && item.value === '' ? 'italic text-stone-600' : ''}`}
              >
                <span className="tracking-tight">{item.label}</span>
                {item.detail && <span className="text-stone-600"> · {item.detail}</span>}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-stone-600">{emptyLabel}</li>
          )}
        </ul>
      )}
    </div>
  );
}
