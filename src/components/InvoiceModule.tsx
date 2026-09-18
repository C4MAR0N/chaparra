import { useState, type FormEvent } from 'react';
import { ExternalLink, FileText, Paperclip, Plus, Trash2, Wand2 } from 'lucide-react';
import type { InvoiceCategory, InvoiceDoc, SaleInvoiceTemplate } from '../types';
import { useFarm } from '../context/FarmContext';
import { CATEGORIAS } from '../lib/constants';
import { dateLabel, euro, hasMilk, today, uid } from '../lib/domain';
import { abrirAdjunto, esPdf, prepararAdjunto } from '../services/images';
import { interpretarFactura } from '../lib/factura';
import {
  Badge,
  Banner,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  Field,
  Input,
  Modal,
  SegmentedControl,
  Select,
  StatTile,
  Textarea
} from './ui';
import { SaleInvoiceEditor, SavedInvoiceModal } from './SaleInvoiceEditor';
export function InvoiceModule() {
  const { data, farm, update, notify } = useFarm();
  const [tab, setTab] = useState<'records' | 'sale'>('records'),
    [adding, setAdding] = useState(false),
    [deleting, setDeleting] = useState<InvoiceDoc | null>(null),
    [image, setImage] = useState<string | null>(null),
    [document, setDocument] = useState<SaleInvoiceTemplate | null>(null);
  const [type, setType] = useState(''),
    [category, setCategory] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [busqueda, setBusqueda] = useState('');
  const categories = CATEGORIAS.filter(c => hasMilk(farm) || c !== 'Venta Leche');
  /* Sin acentos ni mayúsculas: nadie escribe «Alimentación» con tilde en el
   * buscador, y el proveedor suele estar guardado en mayúsculas. */
  const normalizar = (t: string) =>
    t.normalize('NFD').replace(new RegExp('[\u0300-\u036f]', 'g'), '').toLocaleLowerCase('es');
  const aguja = normalizar(busqueda.trim());
  const filtered = data.invoices.filter(
    i =>
      (!type || i.tipo === type) &&
      (!category || i.categoria === category) &&
      (!from || i.fecha >= from) &&
      (!to || i.fecha <= to) &&
      (!aguja || normalizar(`${i.titulo} ${i.proveedorOCliente} ${i.notas ?? ''}`).includes(aguja))
  );
  const expenses = filtered
      .filter(i => i.tipo === 'Compra / Gasto')
      .reduce((sum, i) => sum + i.importeTotalEuro, 0),
    income = filtered
      .filter(i => i.tipo === 'Venta')
      .reduce((sum, i) => sum + i.importeTotalEuro, 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-heading">Facturas</h1>
          <p className="mt-2 text-sm text-stone-600">
            Gastos, ingresos y justificantes de tu explotación.
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus size={20} />
          Añadir registro
        </Button>
      </div>
      <SegmentedControl
        label="Documentos"
        value={tab}
        options={[
          { value: 'records', label: 'Gastos e ingresos' },
          { value: 'sale', label: 'Documento de venta' }
        ]}
        onChange={setTab}
      />
      {tab === 'sale' ? (
        <SaleInvoiceEditor />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Ingresos del periodo" value={euro(income)} />
            <StatTile label="Gastos del periodo" value={euro(expenses)} />
            <StatTile label="Balance del periodo" value={euro(income - expenses)} />
          </div>
          <Card className="space-y-4">
            <Field label="Buscar por concepto o proveedor">
              <Input
                type="search"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Pienso, gasóleo, el nombre de la cooperativa..."
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Tipo">
                <Select value={type} onChange={e => setType(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="Compra / Gasto">Gastos</option>
                  <option value="Venta">Ingresos</option>
                </Select>
              </Field>
              <Field label="Categoría">
                <Select value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Todas</option>
                  {categories.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Desde">
                <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
              </Field>
              <Field
                label="Hasta"
                error={
                  from && to && to < from ? 'La fecha final es anterior a la inicial.' : undefined
                }
              >
                <Input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={e => setTo(e.target.value)}
                />
              </Field>
            </div>
          </Card>
          {!filtered.length ? (
            <Card>
              <EmptyState
                icon={FileText}
                title={
                  data.invoices.length
                    ? 'No hay documentos en este periodo'
                    : 'Tus cuentas, desde el primer registro'
                }
                description={
                  data.invoices.length
                    ? 'Revisa el tipo, la categoría o las fechas seleccionadas.'
                    : 'Añade un gasto o un ingreso y adjunta una foto del justificante si la tienes.'
                }
                action={<Button onClick={() => setAdding(true)}>Añadir el primer registro</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {[...filtered]
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .map(i => (
                  <Card key={i.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Badge>{i.tipo === 'Venta' ? 'Ingreso' : 'Gasto'}</Badge>
                          <span className="text-xs text-stone-600">
                            {i.categoria === 'Venta Leche' && !hasMilk(farm)
                              ? 'Venta de producto'
                              : i.categoria}
                          </span>
                        </div>
                        <h3 className="font-semibold">{i.titulo}</h3>
                        <p className="mt-1 break-words text-sm text-stone-600">
                          {i.proveedorOCliente || 'Sin tercero indicado'} · {dateLabel(i.fecha)}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-brand-900">{euro(i.importeTotalEuro)}</p>
                    </div>
                    {i.notas && (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-stone-600">{i.notas}</p>
                    )}
                    <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-3">
                      {i.imagenUrl && (
                        <Button variant="secondary" onClick={() => setImage(i.imagenUrl ?? null)}>
                          <Paperclip size={18} />
                          Ver justificante
                        </Button>
                      )}
                      {i.documentoVenta && (
                        <Button
                          variant="secondary"
                          onClick={() => setDocument(i.documentoVenta ?? null)}
                        >
                          <FileText size={18} />
                          Ver documento
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        aria-label={'Eliminar ' + i.titulo}
                        onClick={() => setDeleting(i)}
                      >
                        <Trash2 size={18} />
                        Eliminar
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </>
      )}
      {adding && <InvoiceForm onClose={() => setAdding(false)} />}
      {image && (
        <Modal
          title={esPdf(image) ? 'Justificante en PDF' : 'Foto del justificante'}
          onClose={() => setImage(null)}
          wide
        >
          {esPdf(image) ? (
            <div className="space-y-3">
              {/* Muchos navegadores de móvil no dibujan un PDF incrustado, así que
                  el enlace para abrirlo aparte no es un extra: es la salida. */}
              <iframe
                src={image}
                title="Justificante en PDF"
                className="h-[70vh] w-full rounded-xl border border-stone-200"
              />
              <Button variant="secondary" onClick={() => abrirAdjunto(image)}>
                <ExternalLink size={18} />
                Abrir en otra pestaña
              </Button>
            </div>
          ) : (
            <img
              src={image}
              alt="Justificante adjunto"
              className="max-h-[70vh] w-full object-contain"
            />
          )}
        </Modal>
      )}
      {document && <SavedInvoiceModal template={document} onClose={() => setDocument(null)} />}
      {deleting && (
        <ConfirmModal
          title="Eliminar registro de factura"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            update(d => ({ ...d, invoices: d.invoices.filter(i => i.id !== deleting.id) }));
            setDeleting(null);
            notify('Registro eliminado.');
          }}
        >
          Se eliminará «{deleting.titulo}», por {euro(deleting.importeTotalEuro)}, y el justificante
          adjunto.
        </ConfirmModal>
      )}
    </div>
  );
}
function InvoiceForm({ onClose }: { onClose: () => void }) {
  const { farm, update, notify } = useFarm();
  const [type, setType] = useState<InvoiceDoc['tipo']>('Compra / Gasto'),
    [title, setTitle] = useState(''),
    [party, setParty] = useState(''),
    [amount, setAmount] = useState(''),
    [category, setCategory] = useState<InvoiceCategory>('Pienso/Alimentación'),
    [fecha, setFecha] = useState(today()),
    [notes, setNotes] = useState(''),
    [image, setImage] = useState<string | undefined>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  /*
   * Leer y tirar, sin opción de conservarlo.
   *
   * Lo que da valor al registro son las cifras, no la imagen: una foto ocupa
   * diez mil veces más que los cuatro datos que contiene, y el archivo legal de
   * la factura lo lleva el gestor del ganadero, no esta aplicación. El
   * justificante se usa para leerlo y se descarta al guardar.
   */
  const [leyendo, setLeyendo] = useState(''),
    [lectura, setLectura] = useState(''),
    /* Lo último que propuso la lectura. Sirve para distinguir un concepto que
     * escribió la persona —que no se toca— de uno que pusimos nosotros, que sí
     * se sustituye: si no, al cambiar de justificante quedaba en el formulario
     * el proveedor de la factura anterior. */
    [propuesto, setPropuesto] = useState('');
  const categories = CATEGORIAS.filter(c => hasMilk(farm) || c !== 'Venta Leche');

  /*
   * Leer el justificante y PROPONER los campos. Nada se guarda solo: un importe
   * mal leído por una coma descuadra las cuentas sin que nadie se entere, así
   * que lo que sale de aquí se rellena en el formulario y lo confirma la persona.
   */
  async function rellenarDesdeElJustificante() {
    if (!image) return;
    setError('');
    setLectura('');
    setLeyendo('Abriendo el justificante…');
    try {
      const { leerJustificante } = await import('../services/lectura');
      const texto = await leerJustificante(image, setLeyendo);
      const s = interpretarFactura(texto);
      if (!s.encontrados.length) {
        setLectura('');
        setError('No se ha podido sacar nada en claro del justificante. Escribe los datos a mano.');
        return;
      }
      if (s.importeTotalEuro !== undefined) setAmount(String(s.importeTotalEuro));
      if (s.fecha) setFecha(s.fecha);
      if (s.proveedor) setParty(s.proveedor);
      if (s.titulo && (!title.trim() || title === propuesto)) {
        setTitle(s.titulo);
        setPropuesto(s.titulo);
      }
      if (s.categoria && categories.includes(s.categoria)) setCategory(s.categoria);
      if (s.tipo) setType(s.tipo);
      const falta = ['el importe', 'la fecha', 'el proveedor'].filter(
        c => !s.encontrados.includes(c)
      );
      setLectura(
        `Se ha leído ${s.encontrados.join(', ')}. Revísalo antes de guardar` +
          (falta.length ? `; no se ha encontrado ${falta.join(' ni ')}.` : '.')
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido leer el justificante.');
    } finally {
      setLeyendo('');
    }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      setImage(await prepararAdjunto(file));
      setLectura('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido cargar el justificante.');
    } finally {
      setBusy(false);
    }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !Number.isFinite(Number(amount)) || Number(amount) < 0 || !amount) {
      setError('Indica un concepto y un importe no negativo.');
      return;
    }
    const row: InvoiceDoc = {
      id: uid(),
      tipo: type,
      titulo: title.trim(),
      fecha,
      proveedorOCliente: party.trim(),
      importeTotalEuro: Number(amount),
      categoria: category,
      notas: notes.trim()
    };
    update(d => ({ ...d, invoices: [row, ...d.invoices] }));
    notify('Registro guardado.');
    onClose();
  }
  return (
    <Modal title="Añadir gasto o ingreso" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        {/* Lo primero de todo, y no al final: si va abajo, el ganadero teclea
            los seis campos a mano y descubre que podía leerlos de la foto
            cuando ya ha terminado. */}
        <Field
          label="Leer los datos de una factura"
          help="Elige el PDF que te ha llegado por correo o hazle una foto al papel. No te preocupes por el tamaño: la foto se reduce sola. Chaparra rellena el formulario y tú lo revisas."
        >
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={e => {
              void upload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </Field>
        <Field label="O hacerle una foto ahora">
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={e => {
              void upload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </Field>
        {image && (
          <div className="space-y-2">
            {esPdf(image) ? (
              <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-4">
                <FileText size={24} className="shrink-0 text-brand-700" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm">
                  PDF listo para adjuntar
                  <span className="block text-xs text-stone-600">
                    Se guardará junto al registro.
                  </span>
                </p>
                <Button variant="ghost" size="sm" onClick={() => abrirAdjunto(image)}>
                  <ExternalLink size={16} />
                  Ver
                </Button>
              </div>
            ) : (
              <img
                src={image}
                alt="Justificante que se adjuntará al registro"
                className="h-40 w-full rounded-xl border border-stone-200 object-contain"
              />
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => void rellenarDesdeElJustificante()}
                loading={!!leyendo}
              >
                <Wand2 size={18} />
                Rellenar desde el justificante
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setImage(undefined);
                  setLectura('');
                }}
              >
                Quitar justificante
              </Button>
            </div>
            {leyendo && (
              <p role="status" className="text-sm text-stone-600">
                {leyendo} La primera vez que se lee una foto hay que descargar el lector; tarda un
                poco.
              </p>
            )}
            {lectura && <Banner tone="success">{lectura}</Banner>}
          </div>
        )}
        <div className="border-t border-stone-200 pt-1" />
        <Field label="Tipo de registro">
          <Select value={type} onChange={e => setType(e.target.value as InvoiceDoc['tipo'])}>
            <option value="Compra / Gasto">Gasto</option>
            <option value="Venta">Ingreso</option>
          </Select>
        </Field>
        <Field label="Concepto">
          <Input required value={title} onChange={e => setTitle(e.target.value)} />
        </Field>
        <Field label={type === 'Venta' ? 'Cliente' : 'Proveedor'}>
          <Input value={party} onChange={e => setParty(e.target.value)} />
        </Field>
        <div className="form-grid">
          <Field label="Importe total (€)">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Fecha">
            <Input type="date" required value={fecha} onChange={e => setFecha(e.target.value)} />
          </Field>
        </div>
        <Field label="Categoría">
          <Select value={category} onChange={e => setCategory(e.target.value as InvoiceCategory)}>
            {categories.map(c => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Notas (opcional)">
          <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </Field>
        {busy && (
          <p role="status" className="text-sm">
            Preparando el justificante…
          </p>
        )}
        {error && <Banner tone="error">{error}</Banner>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Guardar registro
          </Button>
        </div>
      </form>
    </Modal>
  );
}
