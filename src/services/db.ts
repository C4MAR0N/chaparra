import { Animal, FarmConfig, InvoiceDoc, SaleInvoiceTemplate } from '../types';

const INITIAL_FARM_CONFIG: FarmConfig = {
  nombreExplotacion: 'Ganadería La Dehesa Verde',
  codigoRega: 'ES100480009123',
  titular: 'Alejandro Ganadero',
  tipoGanadoPrincipal: 'Vacuno',
  propositoPrincipal: 'Mixto',
  vecesOrdenoDia: 2,
  precioPorLitroLecheEuro: 0.58,
  precioEstimadoKgCarneEuro: 5.40,
  moneda: '€'
};

const INITIAL_ANIMALS: Animal[] = [
  {
    id: '1',
    crotal: 'ES091004581290',
    tipoGanado: 'Vacuno',
    proposito: 'Ordeño',
    ubicacion: 'Nave de Ordeño',
    numeroPartos: 3,
    fechaNacimiento: '2019-04-12',
    criasAsociadas: ['ES091004581294', 'ES091004581298'],
    estadoSanitario: 'Sano',
    notasSanitarias: 'Vacunación de IBR y BVD al día. Excelente mamitis score.',
    raza: 'Frisona / Holstein',
    sexo: 'Hembra',
    produccionDiariaLitros: 28.5,
    costeAcumuladoEuro: 720,
    fechaUltimoControl: '2026-09-10'
  },
  {
    id: '2',
    crotal: 'ES091004581291',
    tipoGanado: 'Vacuno',
    proposito: 'Carne',
    ubicacion: 'Cercado Dehesa Sur',
    numeroPartos: 2,
    fechaNacimiento: '2020-09-03',
    criasAsociadas: ['ES091004581295'],
    estadoSanitario: 'Sano',
    notasSanitarias: 'Desparasitada en primavera.',
    raza: 'Retinta',
    sexo: 'Hembra',
    pesoKg: 620,
    precioEstimadoVentaEuro: 1850,
    costeAcumuladoEuro: 810,
    fechaUltimoControl: '2026-09-01'
  },
  {
    id: '3',
    crotal: 'ES091004581292',
    tipoGanado: 'Vacuno',
    proposito: 'Carne',
    ubicacion: 'Pastizal El Robledo',
    numeroPartos: 0,
    fechaNacimiento: '2023-01-15',
    criasAsociadas: [],
    estadoSanitario: 'En tratamiento',
    notasSanitarias: 'Tratamiento antibiótico para cojera en pata trasera izquierda.',
    raza: 'Limusina',
    sexo: 'Macho',
    pesoKg: 540,
    precioEstimadoVentaEuro: 1620,
    costeAcumuladoEuro: 650,
    fechaUltimoControl: '2026-09-14'
  },
  {
    id: '4',
    crotal: 'ES091004581293',
    tipoGanado: 'Vacuno',
    proposito: 'Ordeño',
    ubicacion: 'Nave de Ordeño',
    numeroPartos: 4,
    fechaNacimiento: '2018-03-22',
    criasAsociadas: ['ES091004581296', 'ES091004581297'],
    estadoSanitario: 'Vacunado',
    notasSanitarias: 'Re-vacunación tularemia completada.',
    raza: 'Frisona / Holstein',
    sexo: 'Hembra',
    produccionDiariaLitros: 31.0,
    costeAcumuladoEuro: 940,
    fechaUltimoControl: '2026-09-15'
  },
  {
    id: '5',
    crotal: 'ES091004581294',
    tipoGanado: 'Vacuno',
    proposito: 'Ordeño',
    ubicacion: 'Establo Maternidad',
    numeroPartos: 1,
    fechaNacimiento: '2022-05-10',
    criasAsociadas: [],
    estadoSanitario: 'Sano',
    raza: 'Frisona / Holstein',
    sexo: 'Hembra',
    produccionDiariaLitros: 22.0,
    costeAcumuladoEuro: 510,
    fechaUltimoControl: '2026-09-08'
  },
  {
    id: '6',
    crotal: 'ES091004581295',
    tipoGanado: 'Vacuno',
    proposito: 'Carne',
    ubicacion: 'Cercado Las Encinas',
    numeroPartos: 0,
    fechaNacimiento: '2023-11-01',
    criasAsociadas: [],
    estadoSanitario: 'En cuarentena',
    notasSanitarias: 'En observación por aislamiento preventivo tras entrada nueva.',
    raza: 'Avileña Negra Ibérica',
    sexo: 'Hembra',
    pesoKg: 380,
    precioEstimadoVentaEuro: 1150,
    costeAcumuladoEuro: 420,
    fechaUltimoControl: '2026-09-12'
  }
];

const INITIAL_INVOICES: InvoiceDoc[] = [
  {
    id: 'inv-1',
    tipo: 'Compra / Gasto',
    titulo: 'Factura Pienso de Lactancia y Forraje',
    fecha: '2026-09-02',
    proveedorOCliente: 'SCA Nutrición Animal Extremadura',
    importeTotalEuro: 1450.80,
    categoria: 'Pienso/Alimentación',
    notas: '2,5 Toneladas taco campero de mantenimiento + calcio',
    crotalesRelacionados: ['ES091004581290', 'ES091004581293']
  },
  {
    id: 'inv-2',
    tipo: 'Compra / Gasto',
    titulo: 'Visita Veterinaria y Tratamientos Sanitarios',
    fecha: '2026-09-08',
    proveedorOCliente: 'Clínica Veterinaria Rural CampoBadajoz',
    importeTotalEuro: 380.00,
    categoria: 'Veterinario/Sanidad',
    notas: 'Revisión cojera ES091004581292 y vacunas IBR del lote',
    crotalesRelacionados: ['ES091004581292']
  },
  {
    id: 'inv-3',
    tipo: 'Compra / Gasto',
    titulo: 'Gasto Gasóleo Agrícola B - Tractores',
    fecha: '2026-09-12',
    proveedorOCliente: 'Gasolineras del Valle S.L.',
    importeTotalEuro: 620.50,
    categoria: 'Maquinaria/Combustible',
    notas: '500 Litros Gasóleo B para limpiezas y reparto de alpaca'
  }
];

const STORAGE_KEYS = {
  ANIMALS: 'chaparra_animals_v1',
  FARM_CONFIG: 'chaparra_farm_config_v1',
  INVOICES: 'chaparra_invoices_v1',
  SALE_TEMPLATE: 'chaparra_sale_template_v1'
};

export class LocalDbService {
  static getFarmConfig(): FarmConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FARM_CONFIG);
      return data ? JSON.parse(data) : INITIAL_FARM_CONFIG;
    } catch {
      return INITIAL_FARM_CONFIG;
    }
  }

  static saveFarmConfig(config: FarmConfig): void {
    localStorage.setItem(STORAGE_KEYS.FARM_CONFIG, JSON.stringify(config));
  }

  static getAnimals(): Animal[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ANIMALS);
      return data ? JSON.parse(data) : INITIAL_ANIMALS;
    } catch {
      return INITIAL_ANIMALS;
    }
  }

  static saveAnimals(animals: Animal[]): void {
    localStorage.setItem(STORAGE_KEYS.ANIMALS, JSON.stringify(animals));
  }

  static addAnimal(animal: Omit<Animal, 'id'>): Animal {
    const animals = this.getAnimals();
    const newAnimal: Animal = {
      ...animal,
      id: 'anm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)
    };
    animals.unshift(newAnimal);
    this.saveAnimals(animals);
    return newAnimal;
  }

  static updateAnimal(updated: Animal): void {
    const animals = this.getAnimals().map(a => a.id === updated.id ? updated : a);
    this.saveAnimals(animals);
  }

  static deleteAnimal(id: string): void {
    const animals = this.getAnimals().filter(a => a.id !== id);
    this.saveAnimals(animals);
  }

  static getInvoices(): InvoiceDoc[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      return data ? JSON.parse(data) : INITIAL_INVOICES;
    } catch {
      return INITIAL_INVOICES;
    }
  }

  static saveInvoices(invoices: InvoiceDoc[]): void {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }

  static addInvoice(invoice: Omit<InvoiceDoc, 'id'>): InvoiceDoc {
    const invoices = this.getInvoices();
    const newInvoice: InvoiceDoc = {
      ...invoice,
      id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)
    };
    invoices.unshift(newInvoice);
    this.saveInvoices(invoices);
    return newInvoice;
  }

  static deleteInvoice(id: string): void {
    const invoices = this.getInvoices().filter(i => i.id !== id);
    this.saveInvoices(invoices);
  }

  static getSaleTemplate(): SaleInvoiceTemplate {
    const config = this.getFarmConfig();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALE_TEMPLATE);
      if (data) return JSON.parse(data);
    } catch {}

    return {
      numeroFactura: 'FAC-2026-001',
      fechaEmision: new Date().toISOString().split('T')[0],
      nombreGanadero: config.titular || 'Alejandro Ganadero',
      nifCif: '12345678Z',
      codigoRega: config.codigoRega || 'ES100480009123',
      direccion: 'Camino de las Encinas km 4, 06001 Badajoz',
      telefono: '+34 600 123 456',
      email: 'ganaderia.dehesaverde@email.com',
      clienteNombre: 'Comercializadora de Ganado e Industrias Cárnicas S.A.',
      clienteNif: 'A98765432',
      clienteDireccion: 'Polígono Industrial El Prado, Parcela 12, Mérida',
      items: [
        {
          id: 'item-1',
          descripcion: 'Venta de Ternero de Cebo de raza Retinta (Crotal ES091004581291) - 620 kg live weight',
          cantidad: 1,
          precioUnitarioEuro: 1850.00,
          subtotalEuro: 1850.00
        }
      ],
      ivaPorcentaje: 10,
      irpfPorcentaje: 2,
      notasPie: 'Factura de venta ganadera emitida de acuerdo al régimen especial de agricultura, ganadería y pesca.'
    };
  }

  static saveSaleTemplate(template: SaleInvoiceTemplate): void {
    localStorage.setItem(STORAGE_KEYS.SALE_TEMPLATE, JSON.stringify(template));
  }

  static resetToDefault(): void {
    localStorage.setItem(STORAGE_KEYS.ANIMALS, JSON.stringify(INITIAL_ANIMALS));
    localStorage.setItem(STORAGE_KEYS.FARM_CONFIG, JSON.stringify(INITIAL_FARM_CONFIG));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
  }
}
