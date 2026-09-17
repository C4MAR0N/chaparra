import { useState, type FormEvent } from 'react';
import { FileText, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import type { InvoiceCategory, InvoiceDoc, SaleInvoiceTemplate } from '../types';
import { useFarm } from '../context/FarmContext';
import { CATEGORIAS } from '../lib/constants';
import { dateLabel, euro, hasMilk, today, uid } from '../lib/domain';
import { compressImage } from '../services/images';
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
    [to, setTo] = useState('');
  const categories = CATEGORIAS.filter(c => hasMilk(farm) || c !== 'Venta Leche');
  const filtered = data.invoices.filter(
    i =>
      (!type || i.tipo === type) &&
      (!category || i.categoria === category) &&
      (!from || i.fecha >= from) &&
      (!to || i.fecha <= to)
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
          <Card className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                          <ImageIcon size={18} />
                          Ver foto
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
        <Modal title="Foto del justificante" onClose={() => setImage(null)} wide>
          <img
            src={image}
            alt="Justificante adjunto"
            className="max-h-[70vh] w-full object-contain"
          />
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
          Se eliminará «{deleting.titulo}», por {euro(deleting.importeTotalEuro)}, y su foto
          adjunta.
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
  const categories = CATEGORIAS.filter(c => hasMilk(farm) || c !== 'Venta Leche');
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      setImage(await compressImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido cargar la imagen.');
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
      imagenUrl: image,
      notas: notes.trim()
    };
    update(d => ({ ...d, invoices: [row, ...d.invoices] }));
    notify('Registro guardado.');
    onClose();
  }
  return (
    <Modal title="Añadir gasto o ingreso" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
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
        <Field
          label="Adjuntar foto del justificante"
          help="JPEG, PNG o WebP de hasta 2 MB. Se reduce a 1280 px y se comprime antes de guardar."
        >
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={e => {
              void upload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </Field>
        <Field label="Tomar foto con la cámara">
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
            <img
              src={image}
              alt="Foto que se adjuntará al registro"
              className="h-40 w-full rounded-xl border border-stone-200 object-contain"
            />
            <Button variant="ghost" onClick={() => setImage(undefined)}>
              Quitar foto
            </Button>
          </div>
        )}
        {busy && (
          <p role="status" className="text-sm">
            Preparando imagen…
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
