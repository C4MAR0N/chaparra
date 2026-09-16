import React, { useState, useRef } from 'react';
import { Camera, Upload, Plus, FileText, Image as ImageIcon, Trash2, Eye, Printer, Download, Euro, Check, Tag, X } from 'lucide-react';
import { InvoiceDoc, SaleInvoiceTemplate, Animal } from '../types';

interface InvoiceModuleProps {
  invoices: InvoiceDoc[];
  onAddInvoice: (invoice: Omit<InvoiceDoc, 'id'>) => void;
  onDeleteInvoice: (id: string) => void;
  saleTemplate: SaleInvoiceTemplate;
  onSaveSaleTemplate: (template: SaleInvoiceTemplate) => void;
  animals: Animal[];
}

export const InvoiceModule: React.FC<InvoiceModuleProps> = ({
  invoices,
  onAddInvoice,
  onDeleteInvoice,
  saleTemplate,
  onSaveSaleTemplate,
  animals
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'scan' | 'generate'>('scan');

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Form State for Expense Invoice
  const [titulo, setTitulo] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [importe, setImporte] = useState<number | ''>('');
  const [categoria, setCategoria] = useState<InvoiceDoc['categoria']>('Pienso/Alimentación');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [selectedCrotals, setSelectedCrotals] = useState<string[]>([]);

  // Modal image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Template Form state for Sale Invoices
  const [templateForm, setTemplateForm] = useState<SaleInvoiceTemplate>(saleTemplate);

  // Camera Activation
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera access fallback to file picker:', err);
      alert('No se pudo abrir la cámara en directo. Puedes adjuntar o subir una foto usando el botón de archivo.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
      }
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveExpenseInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !importe) {
      alert('Por favor indica el título y el importe de la factura.');
      return;
    }

    onAddInvoice({
      tipo: 'Compra / Gasto',
      titulo: titulo.trim(),
      fecha,
      proveedorOCliente: proveedor.trim() || 'Proveedor Agrícola',
      importeTotalEuro: Number(importe),
      categoria,
      imagenUrl: capturedImage || undefined,
      notas: notas.trim(),
      crotalesRelacionados: selectedCrotals
    });

    // Reset Form
    setTitulo('');
    setProveedor('');
    setImporte('');
    setNotas('');
    setCapturedImage(null);
    setSelectedCrotals([]);
    alert('Factura de gasto guardada correctamente en el sistema.');
  };

  // Calculations for Sale Invoice Template
  const subtotalItemsEuro = templateForm.items.reduce((acc, item) => acc + (item.cantidad * item.precioUnitarioEuro), 0);
  const ivaAmountEuro = subtotalItemsEuro * (templateForm.ivaPorcentaje / 100);
  const irpfAmountEuro = subtotalItemsEuro * (templateForm.irpfPorcentaje / 100);
  const totalFacturaVentaEuro = subtotalItemsEuro + ivaAmountEuro - irpfAmountEuro;

  const handleAddItemToTemplate = () => {
    const newItem = {
      id: 'item-' + Date.now(),
      descripcion: 'Venta de Crotal / Producto Ganadero',
      cantidad: 1,
      precioUnitarioEuro: 500,
      subtotalEuro: 500
    };
    setTemplateForm({
      ...templateForm,
      items: [...templateForm.items, newItem]
    });
  };

  const handleUpdateItem = (id: string, field: string, value: any) => {
    const updatedItems = templateForm.items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'cantidad' || field === 'precioUnitarioEuro') {
          updated.subtotalEuro = updated.cantidad * updated.precioUnitarioEuro;
        }
        return updated;
      }
      return item;
    });
    setTemplateForm({ ...templateForm, items: updatedItems });
  };

  const handleRemoveItem = (id: string) => {
    setTemplateForm({
      ...templateForm,
      items: templateForm.items.filter(i => i.id !== id)
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="card-farm p-2 bg-emerald-950/5 border-emerald-200 flex items-center gap-2">
        <button
          onClick={() => setActiveSubTab('scan')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'scan'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'text-gray-600 hover:text-emerald-900 hover:bg-white/50'
          }`}
        >
          <Camera size={18} />
          <span>1. Fotos & Escáner Facturas de Compra</span>
        </button>

        <button
          onClick={() => setActiveSubTab('generate')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'generate'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'text-gray-600 hover:text-emerald-900 hover:bg-white/50'
          }`}
        >
          <FileText size={18} />
          <span>2. Plantilla Facturas de Venta (Opcional)</span>
        </button>
      </div>

      {/* SECTION 1: SCANNER & EXPENSE INVOICE PHOTOS */}
      {activeSubTab === 'scan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Box: Camera Capture Form */}
            <div className="card-farm p-5 space-y-4">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2 border-b border-gray-100 pb-3">
                <Camera size={20} className="text-emerald-700" />
                Digitalizar Factura o Recibo con Cámara
              </h3>

              {/* Camera Preview Area */}
              <div className="bg-gray-900 rounded-2xl overflow-hidden relative min-h-[220px] flex items-center justify-center text-white p-2">
                {isCameraActive ? (
                  <div className="w-full relative">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-56 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white text-emerald-900 font-extrabold px-5 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs hover:bg-emerald-50"
                    >
                      📸 Tomar Foto
                    </button>
                  </div>
                ) : capturedImage ? (
                  <div className="relative w-full">
                    <img src={capturedImage} alt="Factura escaneada" className="w-full h-56 object-contain rounded-xl bg-black" />
                    <button
                      type="button"
                      onClick={() => setCapturedImage(null)}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full text-xs shadow-md"
                      title="Borrar Foto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <div className="bg-white/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-emerald-300">
                      <ImageIcon size={24} />
                    </div>
                    <p className="text-xs text-gray-300 font-medium">
                      Haz una foto a la factura de pienso, veterinario o combustible.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="btn-farm-primary text-xs"
                      >
                        <Camera size={16} /> Abrir Cámara
                      </button>
                      <label className="btn-farm-secondary text-xs cursor-pointer">
                        <Upload size={16} /> Subir Imagen
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Expense Invoice Form */}
              <form onSubmit={handleSaveExpenseInvoice} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Título de la Factura / Recibo</label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="ej. Compra Pienso Taco Campero 2.5tn"
                    className="input-farm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Proveedor / Emisor</label>
                    <input
                      type="text"
                      value={proveedor}
                      onChange={(e) => setProveedor(e.target.value)}
                      placeholder="ej. Nutrición Agrícola S.L."
                      className="input-farm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Importe Total (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={importe}
                      onChange={(e) => setImporte(e.target.value ? Number(e.target.value) : '')}
                      placeholder="ej. 1450.80"
                      className="input-farm font-extrabold text-emerald-900"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Categoría del Gasto</label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value as any)}
                      className="input-farm"
                    >
                      <option value="Pienso/Alimentación">Pienso / Alimentación</option>
                      <option value="Veterinario/Sanidad">Veterinario / Sanidad</option>
                      <option value="Maquinaria/Combustible">Maquinaria / Gasóleo</option>
                      <option value="Otros">Otros Gastos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Fecha de Emisión</label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="input-farm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Notas / Observaciones</label>
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Detalles adicionales o número de factura..."
                    className="input-farm"
                  />
                </div>

                <button type="submit" className="btn-farm-primary w-full text-sm">
                  <Check size={18} /> Guardar Factura de Gasto
                </button>
              </form>
            </div>

            {/* Right Box: Invoice History Gallery */}
            <div className="card-farm p-5 space-y-4">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="flex items-center gap-2">
                  <FileText size={20} className="text-emerald-700" />
                  Facturas Registradas ({invoices.length})
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  Total: {invoices.reduce((acc, i) => acc + i.importeTotalEuro, 0).toLocaleString('es-ES')} €
                </span>
              </h3>

              {invoices.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  No hay facturas guardadas aún. Toma una foto con la cámara para empezar.
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2 hover:border-emerald-300 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-gray-900 text-xs">{inv.titulo}</h4>
                          <p className="text-[11px] text-gray-500 font-medium">
                            {inv.proveedorOCliente} • {inv.fecha}
                          </p>
                        </div>
                        <span className="text-sm font-extrabold text-emerald-900 whitespace-nowrap bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          {inv.importeTotalEuro.toLocaleString('es-ES')} €
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-[11px]">
                        <span className="bg-white px-2 py-0.5 rounded border border-gray-200 font-semibold text-gray-700">
                          {inv.categoria}
                        </span>

                        <div className="flex items-center gap-2">
                          {inv.imagenUrl && (
                            <button
                              onClick={() => setPreviewImage(inv.imagenUrl || null)}
                              className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                            >
                              <Eye size={12} /> Ver Foto
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteInvoice(inv.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SALE INVOICE TEMPLATE GENERATOR */}
      {activeSubTab === 'generate' && (
        <div className="space-y-6">
          <div className="card-farm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-800">Generación de Documentos</span>
                <h2 className="text-xl font-black text-gray-900 mt-0.5">Plantilla de Factura de Venta Personalizable</h2>
              </div>
              <button
                onClick={() => {
                  onSaveSaleTemplate(templateForm);
                  window.print();
                }}
                className="btn-farm-primary text-xs whitespace-nowrap"
              >
                <Printer size={16} /> Imprimir / Exportar PDF
              </button>
            </div>

            {/* Template Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-extrabold text-emerald-900 uppercase">Datos del Ganadero (Emisor)</h3>
                <div>
                  <label className="block text-gray-600 mb-0.5">Nombre / Explotación</label>
                  <input
                    type="text"
                    value={templateForm.nombreGanadero}
                    onChange={(e) => setTemplateForm({ ...templateForm, nombreGanadero: e.target.value })}
                    className="input-farm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-600 mb-0.5">NIF / CIF</label>
                    <input
                      type="text"
                      value={templateForm.nifCif}
                      onChange={(e) => setTemplateForm({ ...templateForm, nifCif: e.target.value })}
                      className="input-farm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-0.5">Código REGA</label>
                    <input
                      type="text"
                      value={templateForm.codigoRega}
                      onChange={(e) => setTemplateForm({ ...templateForm, codigoRega: e.target.value })}
                      className="input-farm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-extrabold text-blue-900 uppercase">Datos del Comprador / Cliente</h3>
                <div>
                  <label className="block text-gray-600 mb-0.5">Nombre / Razón Social Cliente</label>
                  <input
                    type="text"
                    value={templateForm.clienteNombre}
                    onChange={(e) => setTemplateForm({ ...templateForm, clienteNombre: e.target.value })}
                    className="input-farm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-600 mb-0.5">NIF / CIF Cliente</label>
                    <input
                      type="text"
                      value={templateForm.clienteNif}
                      onChange={(e) => setTemplateForm({ ...templateForm, clienteNif: e.target.value })}
                      className="input-farm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-0.5">Nº Factura</label>
                    <input
                      type="text"
                      value={templateForm.numeroFactura}
                      onChange={(e) => setTemplateForm({ ...templateForm, numeroFactura: e.target.value })}
                      className="input-farm font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-gray-900 text-sm">Conceptos de la Venta</h3>
                <button
                  type="button"
                  onClick={handleAddItemToTemplate}
                  className="btn-farm-secondary text-xs py-1.5 px-3"
                >
                  <Plus size={14} /> Añadir Concepto
                </button>
              </div>

              <div className="space-y-2">
                {templateForm.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs">
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={item.descripcion}
                        onChange={(e) => handleUpdateItem(item.id, 'descripcion', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 font-medium"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) => handleUpdateItem(item.id, 'cantidad', Number(e.target.value))}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-center font-bold"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.01"
                        value={item.precioUnitarioEuro}
                        onChange={(e) => handleUpdateItem(item.id, 'precioUnitarioEuro', Number(e.target.value))}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-right font-extrabold text-emerald-900"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Invoice Preview Box */}
            <div className="border-2 border-emerald-800 rounded-2xl p-6 bg-white space-y-4 shadow-sm text-xs">
              <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                <div>
                  <h3 className="font-extrabold text-xl text-emerald-950 font-mono tracking-tight">{templateForm.nombreGanadero}</h3>
                  <p className="text-gray-600 font-semibold mt-0.5">REGA: {templateForm.codigoRega} • NIF: {templateForm.nifCif}</p>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-900 text-white font-mono font-bold px-3 py-1 rounded-lg text-sm">
                    FACTURA Nº {templateForm.numeroFactura}
                  </span>
                  <p className="text-gray-500 text-[11px] mt-1">Fecha: {templateForm.fechaEmision}</p>
                </div>
              </div>

              <div className="py-2 border-b border-gray-200">
                <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider block">Facturado a:</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{templateForm.clienteNombre}</p>
                <p className="text-gray-600">NIF: {templateForm.clienteNif} • {templateForm.clienteDireccion}</p>
              </div>

              {/* Printable Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-emerald-900 text-emerald-950 font-bold">
                    <th className="py-2">Descripción</th>
                    <th className="py-2 text-center">Cant.</th>
                    <th className="py-2 text-right">Precio Unitario (€)</th>
                    <th className="py-2 text-right">Subtotal (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {templateForm.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 font-medium text-gray-900">{item.descripcion}</td>
                      <td className="py-2 text-center font-bold">{item.cantidad}</td>
                      <td className="py-2 text-right font-mono">{item.precioUnitarioEuro.toFixed(2)} €</td>
                      <td className="py-2 text-right font-mono font-bold text-emerald-950">
                        {(item.cantidad * item.precioUnitarioEuro).toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end pt-3 border-t border-gray-200">
                <div className="w-64 space-y-1.5 text-right">
                  <div className="flex justify-between text-gray-600">
                    <span>Base Imponible:</span>
                    <span className="font-mono font-bold">{subtotalItemsEuro.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IVA ({templateForm.ivaPorcentaje}%):</span>
                    <span className="font-mono">+{ivaAmountEuro.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IRPF ({templateForm.irpfPorcentaje}%):</span>
                    <span className="font-mono">-{irpfAmountEuro.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-emerald-950 border-t border-emerald-900 pt-2">
                    <span>TOTAL A COBRAR:</span>
                    <span className="font-mono">{totalFacturaVentaEuro.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div className="bg-black p-2 rounded-2xl max-w-xl w-full relative">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-white text-gray-900 p-2 rounded-full font-bold shadow-lg"
            >
              <X size={18} />
            </button>
            <img src={previewImage} alt="Vista ampliada" className="w-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
