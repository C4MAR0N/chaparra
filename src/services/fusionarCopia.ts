import type { Animal, FarmData, InvoiceDoc, MilkRecord, WeightRecord } from '../types';
import { uid } from '../lib/domain';

/*
 * Añadir una copia a lo que ya hay, sin sustituirlo.
 *
 * «Importar y sustituir» vale para estrenar la aplicación: el ganadero manda su
 * cuaderno, se lo pasamos a un archivo y lo carga de una vez. No vale para el
 * segundo envío, porque le borraría todo lo que haya apuntado desde entonces.
 *
 * Aquí manda una regla: **lo que ya está no se toca**. Si un crotal existe, el
 * animal que se queda es el del ganadero, con sus anotaciones, su ubicación y su
 * historial; el de la copia se descarta y se cuenta aparte para poder decírselo.
 * Machacar sus datos con los nuestros sería peor que no importar nada, porque no
 * se notaría hasta mucho después.
 *
 * Lo delicado no son los animales sueltos, sino lo que cuelga de ellos: las
 * crías apuntan a identificadores, y los ordeños y las pesadas también. Un
 * identificador que no resuelve deja la explotación en un estado que la
 * validación rechaza, y entonces se pierde entera. Por eso todo pasa por una
 * tabla de equivalencias y lo que no encaja se descarta a propósito.
 */

export interface ResumenFusion {
  animalesAnadidos: number;
  /** Crotales que ya tenía: se respeta su ficha y se descarta la de la copia. */
  animalesYaEstaban: number;
  facturasAnadidas: number;
  ordenosAnadidos: number;
  pesadasAnadidas: number;
  /** Registros de la copia que no se han podido encajar y se han dejado fuera. */
  descartados: number;
}

const clave = (crotal: string) => crotal.trim().toUpperCase();

/** Identidad de un ordeño según lo que la validación considera repetido. */
const claveOrdeno = (r: MilkRecord) => [r.fecha, r.ordeno ?? 1, r.animalId ?? ''].join(':');
const claveOrdenoSinAnimal = (r: MilkRecord) => [r.fecha, r.ordeno ?? 1].join(':');
const clavePesada = (r: WeightRecord) => r.animalId + ':' + r.fecha;
/* Una factura no tiene número que valga como identidad, así que se compara por
 * contenido: sirve para no duplicarla si alguien importa dos veces el mismo
 * archivo, que es el descuido más probable. */
const claveFactura = (f: InvoiceDoc) =>
  [f.fecha, f.tipo, f.titulo.trim(), f.importeTotalEuro].join('|');

export function fusionarCopia(
  actual: FarmData,
  entrante: FarmData
): { datos: FarmData; resumen: ResumenFusion } {
  const resumen: ResumenFusion = {
    animalesAnadidos: 0,
    animalesYaEstaban: 0,
    facturasAnadidas: 0,
    ordenosAnadidos: 0,
    pesadasAnadidas: 0,
    descartados: 0
  };

  const porCrotal = new Map(actual.animals.map(a => [clave(a.crotal), a]));
  const idsOcupados = new Set([
    ...actual.animals.map(a => a.id),
    ...actual.invoices.map(f => f.id),
    ...actual.milkRecords.map(r => r.id),
    ...actual.weightRecords.map(r => r.id)
  ]);
  const libre = (id: string) => {
    if (!idsOcupados.has(id)) {
      idsOcupados.add(id);
      return id;
    }
    const nuevo = uid();
    idsOcupados.add(nuevo);
    return nuevo;
  };

  /*
   * De qué animal de la explotación resultante habla cada identificador de la
   * copia. Un crotal repetido apunta al animal que ya estaba; uno nuevo, a sí
   * mismo o a un identificador recién hecho si el suyo estaba pillado.
   */
  const equivalencia = new Map<string, string>();
  const nuevos: Animal[] = [];
  for (const a of entrante.animals) {
    const existente = porCrotal.get(clave(a.crotal));
    if (existente) {
      equivalencia.set(a.id, existente.id);
      resumen.animalesYaEstaban++;
      continue;
    }
    const id = libre(a.id);
    equivalencia.set(a.id, id);
    // Las crías se resuelven después, cuando la tabla esté completa.
    nuevos.push({ ...a, id, criasAsociadas: [] });
    porCrotal.set(clave(a.crotal), nuevos[nuevos.length - 1]);
    resumen.animalesAnadidos++;
  }

  const animals = [...actual.animals, ...nuevos];
  const porId = new Map(animals.map(a => [a.id, a]));
  /* Una cría cuelga de una sola madre. Si ya tiene una en la explotación del
   * ganadero, la copia no se la quita: su dato manda sobre el nuestro. */
  const conMadre = new Set(actual.animals.flatMap(a => a.criasAsociadas));
  const criasPorMadre = new Map<string, string[]>();
  for (const a of entrante.animals) {
    const madreId = equivalencia.get(a.id);
    if (!madreId) continue;
    for (const criaEntrante of a.criasAsociadas) {
      const criaId = equivalencia.get(criaEntrante);
      if (!criaId || criaId === madreId || !porId.has(criaId) || conMadre.has(criaId)) {
        if (criaId !== madreId && !conMadre.has(criaId ?? '')) resumen.descartados++;
        continue;
      }
      conMadre.add(criaId);
      criasPorMadre.set(madreId, [...(criasPorMadre.get(madreId) ?? []), criaId]);
    }
  }
  const conCrias = animals.map(a => {
    const anadidas = criasPorMadre.get(a.id);
    return anadidas ? { ...a, criasAsociadas: [...a.criasAsociadas, ...anadidas] } : a;
  });

  // --- Lo que cuelga de los animales ---------------------------------------
  const facturasVistas = new Set(actual.invoices.map(claveFactura));
  const invoices = [...actual.invoices];
  for (const f of entrante.invoices) {
    if (facturasVistas.has(claveFactura(f))) {
      resumen.descartados++;
      continue;
    }
    facturasVistas.add(claveFactura(f));
    const crotales = f.crotalesRelacionados?.filter(c => porCrotal.has(clave(c)));
    invoices.push({ ...f, id: libre(f.id), crotalesRelacionados: crotales });
    resumen.facturasAnadidas++;
  }

  const ordenosVistos = new Set(actual.milkRecords.map(claveOrdeno));
  /* La validación no admite que un mismo día y ordeño convivan un registro del
   * rebaño entero y otro de un animal: sería contar la leche dos veces. */
  const ordenosDelDia = new Set(actual.milkRecords.map(claveOrdenoSinAnimal));
  const milkRecords = [...actual.milkRecords];
  for (const r of entrante.milkRecords) {
    const animalId = r.animalId ? equivalencia.get(r.animalId) : undefined;
    if (r.animalId && !animalId) {
      resumen.descartados++;
      continue;
    }
    const resuelto = { ...r, animalId };
    const chocaConElDia =
      ordenosDelDia.has(claveOrdenoSinAnimal(resuelto)) &&
      actual.milkRecords.some(
        o =>
          o.fecha === resuelto.fecha &&
          (o.ordeno ?? 1) === (resuelto.ordeno ?? 1) &&
          !!o.animalId !== !!resuelto.animalId
      );
    if (ordenosVistos.has(claveOrdeno(resuelto)) || chocaConElDia) {
      resumen.descartados++;
      continue;
    }
    ordenosVistos.add(claveOrdeno(resuelto));
    ordenosDelDia.add(claveOrdenoSinAnimal(resuelto));
    milkRecords.push({ ...resuelto, id: libre(r.id) });
    resumen.ordenosAnadidos++;
  }

  const pesadasVistas = new Set(actual.weightRecords.map(clavePesada));
  const weightRecords = [...actual.weightRecords];
  for (const r of entrante.weightRecords) {
    const animalId = equivalencia.get(r.animalId);
    if (!animalId) {
      resumen.descartados++;
      continue;
    }
    const resuelto = { ...r, animalId };
    if (pesadasVistas.has(clavePesada(resuelto))) {
      resumen.descartados++;
      continue;
    }
    pesadasVistas.add(clavePesada(resuelto));
    weightRecords.push({ ...resuelto, id: libre(r.id) });
    resumen.pesadasAnadidas++;
  }

  return {
    datos: {
      // La explotación y la plantilla de factura son suyas: la copia no las pisa.
      // Solo se toman si todavía no ha rellenado la encuesta.
      farm: actual.farm ?? entrante.farm,
      saleTemplate: actual.saleTemplate,
      animals: conCrias,
      invoices,
      milkRecords,
      weightRecords
    },
    resumen
  };
}

/**
 * Frase para contarle al ganadero qué entra y qué se queda fuera. Se usa dos
 * veces: antes de decidir, en futuro, y después de hacerlo, en pasado.
 */
export function describirFusion(r: ResumenFusion, antesDeHacerlo = false): string {
  const partes: string[] = [];
  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
  if (r.animalesAnadidos)
    partes.push(plural(r.animalesAnadidos, 'animal nuevo', 'animales nuevos'));
  if (r.facturasAnadidas) partes.push(plural(r.facturasAnadidas, 'factura', 'facturas'));
  if (r.ordenosAnadidos) partes.push(plural(r.ordenosAnadidos, 'ordeño', 'ordeños'));
  if (r.pesadasAnadidas) partes.push(plural(r.pesadasAnadidas, 'pesada', 'pesadas'));

  if (!partes.length && !r.animalesYaEstaban) return 'La copia no traía nada que añadir.';
  const anadido = partes.length
    ? `Se ${antesDeHacerlo ? 'añadirán' : 'han añadido'} ${partes.join(', ')}.`
    : `No se ${antesDeHacerlo ? 'añadirá' : 'ha añadido'} nada.`;
  const repetidos = r.animalesYaEstaban
    ? ` ${plural(r.animalesYaEstaban, 'crotal ya está', 'crotales ya están')} en tu explotación y se ${antesDeHacerlo ? 'respetará' : 'ha respetado'} tu ficha.`
    : '';
  return anadido + repetidos;
}
