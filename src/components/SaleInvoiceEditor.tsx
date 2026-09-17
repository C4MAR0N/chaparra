import { useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Printer, Save, Trash2 } from 'lucide-react';
import type { InvoiceCategory, SaleInvoiceTemplate } from '../types';
import { useFarm } from '../context/FarmContext';
import { dateLabel, euro, hasMilk, roundMoney, saleTotals, uid } from '../lib/domain';
import { Banner, Button, Card, Field, Input, Modal, Select, Textarea } from './ui';
export function InvoiceDocument({ template }: { template: SaleInvoiceTemplate }) {
  const totals = saleTotals(template),
    special = template.regimen === 'REAGP';
  return (
    <article className="space-y-6 bg-white text-stone-900">
      <header className="flex flex-wrap justify-between gap-4 border-b-2 border-brand-700 pb-5">
        <div>
          <h2 className="text-xl font-bold">
            {special ? 'Recibo de compensación REAGP' : 'Factura de venta'}
          </h2>
          <p className="mt-2 font-semibold">N.º {template.numeroFactura || 'Sin asignar'}</p>
          <p className="text-sm">Emisión: {dateLabel(template.fechaEmision)}</p>
        </div>
        {template.logoUrl && (
          <img
            src={template.logoUrl}
            alt="Logotipo del emisor"
            className="h-16 w-24 object-contain"
          />
        )}
      </header>
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="space-y-1 text-sm">
          <h3 className="font-bold">{special ? 'Titular de la explotación' : 'Emisor'}</h3>
          <p>{template.nombreGanadero}</p>
          <p>NIF: {template.nifCif}</p>
          <p>{template.direccion}</p>
          {template.codigoRega && <p>REGA: {template.codigoRega}</p>}
          <p>
            {template.telefono} {template.email}
          </p>
        </section>
        <section className="space-y-1 text-sm">
          <h3 className="font-bold">{special ? 'Adquirente / expedidor del recibo' : 'Cliente'}</h3>
          <p>{template.clienteNombre}</p>
          <p>NIF: {template.clienteNif}</p>
          <p>{template.clienteDireccion}</p>
        </section>
      </div>
      <p className="text-sm">
        Operación: {dateLabel(template.fechaOperacion)} · {template.lugarOperacion}
      </p>
      <table className="w-full table-fixed text-left text-xs">
        <thead className="border-b-2 border-stone-700">
          <tr>
            <th className="w-[40%] py-3">Concepto</th>
            <th className="py-3">Cantidad</th>
            <th className="py-3">Precio</th>
            <th className="py-3 text-right">Importe</th>
          </tr>
        </thead>
        <tbody>
          {template.items.map(item => (
            <tr key={item.id} className="border-b border-stone-200">
              <td className="break-words py-3 pr-3">{item.descripcion}</td>
              <td className="break-words py-3">{item.cantidad.toLocaleString('es-ES')}</td>
              <td className="break-words py-3">{euro(item.precioUnitarioEuro)}</td>
              <td className="break-words py-3 text-right">
                {euro(roundMoney(item.cantidad * item.precioUnitarioEuro))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="print-totals ml-auto max-w-sm space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Base</dt>
          <dd>{euro(totals.base)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>
            {special ? 'Compensación REAGP' : 'IVA'} (
            {special ? template.compensacionPorcentaje : template.ivaPorcentaje} %)
          </dt>
          <dd>+ {euro(totals.tax)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Retención IRPF ({template.irpfPorcentaje} %)</dt>
          <dd>− {euro(totals.withholding)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-stone-300 pt-3 text-lg font-bold">
          <dt>Total a cobrar</dt>
          <dd>{euro(totals.total)}</dd>
        </div>
      </dl>
      {special && (
        <div className="space-y-6 text-sm">
          <p>
            El titular declara estar acogido al régimen especial de la agricultura, ganadería y
            pesca. Recibo a expedir por el adquirente y a firmar por el titular de la explotación.
          </p>
          <p className="pt-8">Firma del titular: __________________________________</p>
        </div>
      )}
      {template.notasPie && (
        <p className="whitespace-pre-wrap border-t border-stone-200 pt-4 text-sm">
          {template.notasPie}
        </p>
      )}
    </article>
  );
}
export function PrintableInvoice({ template }: { template: SaleInvoiceTemplate }) {
  return createPortal(
    <div id="print-root" className="hidden">
      <InvoiceDocument template={template} />
    </div>,
    document.body
  );
}
export function SavedInvoiceModal({
  template,
  onClose
}: {
  template: SaleInvoiceTemplate;
  onClose: () => void;
}) {
  return (
    <Modal title="Documento de venta guardado" onClose={onClose} wide>
      <Button onClick={() => window.print()}>
        <Printer size={18} />
        Imprimir / Guardar PDF
      </Button>
      <InvoiceDocument template={template} />
      <PrintableInvoice template={template} />
    </Modal>
  );
}
export function SaleInvoiceEditor() {
  const { data, update, notify, farm } = useFarm();
  const [draft, setDraft] = useState<SaleInvoiceTemplate>(data.saleTemplate),
    [error, setError] = useState(''),
    [category, setCategory] = useState<InvoiceCategory>('Venta Ganado');
  const patch = (values: Partial<SaleInvoiceTemplate>) => setDraft({ ...draft, ...values });
  const totals = saleTotals(draft);
  const formRef = useRef<HTMLFormElement>(null);
  function print() {
    setError('');
    if (!formRef.current?.reportValidity()) return;
    if (
      !draft.items.length ||
      draft.items.some(i => !i.descripcion.trim() || i.cantidad <= 0 || i.precioUnitarioEuro < 0)
    ) {
      setError('Añade conceptos válidos antes de imprimir.');
      return;
    }
    window.print();
  }
  function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (
      !draft.items.length ||
      draft.items.some(
        i =>
          !i.descripcion.trim() ||
          !Number.isFinite(i.cantidad) ||
          i.cantidad <= 0 ||
          !Number.isFinite(i.precioUnitarioEuro) ||
          i.precioUnitarioEuro < 0
      )
    ) {
      setError(
        'Añade al menos un concepto con descripción, cantidad mayor que cero y precio no negativo.'
      );
      return;
    }
    if (
      data.invoices.some(
        i =>
          i.documentoVenta?.numeroFactura.trim().toUpperCase() ===
          draft.numeroFactura.trim().toUpperCase()
      )
    ) {
      setError('Ya existe un documento con ese número. Usa otro número para una nueva venta.');
      return;
    }
    const document = {
      ...draft,
      numeroFactura: draft.numeroFactura.trim(),
      items: draft.items.map(i => ({
        ...i,
        subtotalEuro: roundMoney(i.cantidad * i.precioUnitarioEuro)
      }))
    };
    update(d => ({
      ...d,
      saleTemplate: document,
      invoices: [
        {
          id: uid(),
          tipo: 'Venta',
          titulo: (document.regimen === 'REAGP' ? 'Recibo ' : 'Factura ') + document.numeroFactura,
          fecha: document.fechaEmision,
          proveedorOCliente: document.clienteNombre,
          importeTotalEuro: totals.total,
          categoria: category,
          documentoVenta: document
        },
        ...d.invoices
      ]
    }));
    notify('Documento guardado y venta registrada. Puedes imprimirlo o guardarlo como PDF.');
  }
  const textFields: {
    key: keyof Pick<
      SaleInvoiceTemplate,
      | 'numeroFactura'
      | 'nombreGanadero'
      | 'nifCif'
      | 'codigoRega'
      | 'direccion'
      | 'telefono'
      | 'email'
      | 'clienteNombre'
      | 'clienteNif'
      | 'clienteDireccion'
      | 'lugarOperacion'
    >;
    label: string;
    required?: boolean;
  }[] = [
    { key: 'numeroFactura', label: 'Número de factura o recibo', required: true },
    { key: 'nombreGanadero', label: 'Nombre o razón social del ganadero', required: true },
    { key: 'nifCif', label: 'NIF del ganadero', required: true },
    { key: 'codigoRega', label: 'Código REGA' },
    { key: 'direccion', label: 'Domicilio del ganadero', required: true },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'email', label: 'Correo de contacto' },
    { key: 'clienteNombre', label: 'Nombre o razón social del cliente', required: true },
    { key: 'clienteNif', label: 'NIF del cliente', required: true },
    { key: 'clienteDireccion', label: 'Domicilio del cliente', required: true },
    { key: 'lugarOperacion', label: 'Lugar de la operación', required: true }
  ];
  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <div>
          <h2 className="section-heading">Preparar documento de venta</h2>
          <p className="mt-2 text-sm text-stone-600">
            Completa los datos, guarda el documento y utiliza la impresión del navegador para
            obtener el PDF.
          </p>
        </div>
        <form ref={formRef} onSubmit={save} className="space-y-5">
          <Field label="Régimen del documento">
            <Select
              value={draft.regimen}
              onChange={e => patch({ regimen: e.target.value as SaleInvoiceTemplate['regimen'] })}
            >
              <option value="REAGP">REAGP · Recibo de compensación</option>
              <option value="General">Régimen general · Factura con IVA</option>
            </Select>
          </Field>
          {draft.regimen === 'REAGP' && (
            <Banner>
              En el REAGP ganadero se aplica una compensación del 10,5 % cuando corresponde, en
              lugar de repercutir IVA. El adquirente expide el recibo y el titular lo firma.
              Selecciona 0 % cuando la operación no dé derecho a compensación.
            </Banner>
          )}
          <div className="form-grid">
            {textFields.map(field => (
              <Field key={field.key} label={field.label}>
                <Input
                  value={draft[field.key]}
                  required={field.required}
                  type={field.key === 'email' ? 'email' : 'text'}
                  onChange={e => patch({ [field.key]: e.target.value })}
                />
              </Field>
            ))}
            <Field label="Fecha de emisión">
              <Input
                type="date"
                value={draft.fechaEmision}
                onChange={e => patch({ fechaEmision: e.target.value })}
                required
              />
            </Field>
            <Field label="Fecha de la operación">
              <Input
                type="date"
                value={draft.fechaOperacion}
                onChange={e => patch({ fechaOperacion: e.target.value })}
                required
              />
            </Field>
            <Field label="Categoría del ingreso">
              <Select
                value={category}
                onChange={e => setCategory(e.target.value as InvoiceCategory)}
              >
                <option value="Venta Ganado">Venta de ganado</option>
                {hasMilk(farm) && <option value="Venta Leche">Venta de leche</option>}
                <option>Otros</option>
              </Select>
            </Field>
          </div>
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="section-heading">Conceptos</h3>
              <Button
                variant="secondary"
                onClick={() =>
                  patch({
                    items: [
                      ...draft.items,
                      {
                        id: uid(),
                        descripcion: '',
                        cantidad: 1,
                        precioUnitarioEuro: 0,
                        subtotalEuro: 0
                      }
                    ]
                  })
                }
              >
                <Plus size={18} />
                Añadir concepto
              </Button>
            </div>
            {!draft.items.length && (
              <p className="text-sm text-stone-600">
                Añade un concepto por producto o lote vendido.
              </p>
            )}
            {draft.items.map((item, index) => (
              <div
                key={item.id}
                className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4"
              >
                <Field label={`Concepto ${index + 1}`}>
                  <Input
                    required
                    value={item.descripcion}
                    onChange={e =>
                      patch({
                        items: draft.items.map(i =>
                          i.id === item.id ? { ...i, descripcion: e.target.value } : i
                        )
                      })
                    }
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Cantidad">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.001"
                      min="0.001"
                      required
                      value={item.cantidad}
                      onChange={e =>
                        patch({
                          items: draft.items.map(i =>
                            i.id === item.id ? { ...i, cantidad: Number(e.target.value) } : i
                          )
                        })
                      }
                    />
                  </Field>
                  <Field label="Precio unitario (€)">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      required
                      value={item.precioUnitarioEuro}
                      onChange={e =>
                        patch({
                          items: draft.items.map(i =>
                            i.id === item.id
                              ? { ...i, precioUnitarioEuro: Number(e.target.value) }
                              : i
                          )
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    Subtotal: {euro(roundMoney(item.cantidad * item.precioUnitarioEuro))}
                  </span>
                  <Button
                    variant="ghost"
                    aria-label={`Eliminar concepto ${index + 1}`}
                    onClick={() => patch({ items: draft.items.filter(i => i.id !== item.id) })}
                  >
                    <Trash2 size={18} />
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </section>
          <div className="form-grid">
            {draft.regimen === 'REAGP' ? (
              <Field label="Compensación REAGP">
                <Select
                  value={draft.compensacionPorcentaje}
                  onChange={e => patch({ compensacionPorcentaje: Number(e.target.value) })}
                >
                  <option value={10.5}>10,5 % · Ganadería</option>
                  <option value={0}>0 % · Sin compensación</option>
                </Select>
              </Field>
            ) : (
              <Field label="IVA">
                <Select
                  value={draft.ivaPorcentaje}
                  onChange={e => patch({ ivaPorcentaje: Number(e.target.value) })}
                >
                  {[0, 4, 10, 21].map(n => (
                    <option key={n} value={n}>
                      {n} %
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field
              label="Retención IRPF"
              help="Se calcula sobre la base, sin añadir IVA ni compensación."
            >
              <Select
                value={draft.irpfPorcentaje}
                onChange={e => patch({ irpfPorcentaje: Number(e.target.value) })}
              >
                <option value={2}>2 % · Actividad ganadera general</option>
                <option value={1}>1 % · Engorde de porcino y avicultura</option>
                <option value={0}>0 % · Sin retención</option>
              </Select>
            </Field>
          </div>
          <Field label="Notas del documento">
            <Textarea
              rows={3}
              value={draft.notasPie ?? ''}
              onChange={e => patch({ notasPie: e.target.value })}
            />
          </Field>
          {error && <Banner tone="error">{error}</Banner>}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                update(d => ({
                  ...d,
                  saleTemplate: {
                    ...draft,
                    items: draft.items.map(i => ({
                      ...i,
                      subtotalEuro: roundMoney(i.cantidad * i.precioUnitarioEuro)
                    }))
                  }
                }));
                notify('Borrador guardado.');
              }}
            >
              <Save size={18} />
              Guardar borrador
            </Button>
            <Button type="submit">Guardar documento y registrar ingreso</Button>
            <Button variant="secondary" onClick={print}>
              <Printer size={18} />
              Imprimir / PDF
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-stone-600">
            Elige los impuestos que correspondan a la operación. Información:{' '}
            <a
              className="inline-flex min-h-12 items-center font-semibold text-brand-700 underline"
              href="https://sede.agenciatributaria.gob.es/Sede/iva/regimenes-tributacion-iva/regimen-especial-agricultura-ganaderia-pesca/que-consiste-regimen-especial-agricultura-pesca.html"
              target="_blank"
              rel="noreferrer"
            >
              REAGP · Agencia Tributaria
            </a>
            . Este generador no presenta declaraciones tributarias.
          </p>
        </form>
      </Card>
      <Card>
        <InvoiceDocument template={draft} />
      </Card>
      <PrintableInvoice template={draft} />
    </div>
  );
}
