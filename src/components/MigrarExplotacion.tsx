import { useState } from 'react';
import { UploadCloud, Leaf } from 'lucide-react';
import type { UserRecord } from '../types';
import { cuentasLocalesPendientes } from '../services/acceso';
import { loadData, replaceData } from '../services/db';
import { marcarCambios } from '../services/sincronizacion';
import { guardarMetas, leerMetas } from '../services/sincronizar';
import { Banner, Button, Card } from './ui';

/*
 * Puente entre la Chaparra de antes (cuentas locales, sin servidor) y la de
 * ahora (una cuenta para todos los dispositivos).
 *
 * Al entrar por primera vez con la cuenta del servidor, la explotación está
 * vacía porque los datos siguen guardados bajo la cuenta local del dispositivo.
 * Sin esta pantalla el ganadero vería su explotación en blanco y pensaría que
 * ha perdido el trabajo de meter 235 animales.
 *
 * La copia no borra el original: si algo saliera mal, la cuenta local sigue
 * intacta en este dispositivo.
 */

interface Candidata {
  usuario: UserRecord;
  explotacion: string;
  animales: number;
  facturas: number;
  registros: number;
}

/** Cuentas locales de este dispositivo que tienen algo que traerse. */
export function explotacionesLocales(destino: string): Candidata[] {
  return cuentasLocalesPendientes()
    .filter(u => u.id !== destino)
    .map(usuario => {
      const d = loadData(usuario.id);
      return {
        usuario,
        explotacion: d.farm?.nombreExplotacion ?? 'Explotación sin nombre',
        animales: d.animals.length,
        facturas: d.invoices.length,
        registros: d.milkRecords.length + d.weightRecords.length
      };
    })
    .filter(c => c.animales || c.facturas || c.registros);
}

export function MigrarExplotacion({
  user,
  onHecho,
  onOmitir
}: {
  user: UserRecord;
  onHecho: () => void;
  onOmitir: () => void;
}) {
  const [candidatas] = useState(() => explotacionesLocales(user.id));
  const [trabajando, setTrabajando] = useState('');

  function traer(c: Candidata) {
    setTrabajando(c.usuario.id);
    const origen = loadData(c.usuario.id);
    const destino = loadData(user.id);
    // La explotación viaja entera, pero el correo de la plantilla pasa a ser el
    // de la cuenta nueva: es el que aparecerá en las facturas.
    const datos = {
      ...origen,
      saleTemplate: { ...origen.saleTemplate, email: user.email }
    };
    replaceData(user.id, datos);
    // Marcar todo como cambiado es lo que hace que suba al servidor.
    guardarMetas(user.id, marcarCambios(destino, datos, leerMetas(user.id)));
    onHecho();
  }

  if (!candidatas.length) {
    onOmitir();
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-3 text-2xl font-bold text-brand-800">
        <Leaf size={30} aria-hidden="true" /> Chaparra
      </div>
      <div>
        <h1 className="page-heading">Traer tu explotación a esta cuenta</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          En este dispositivo hay una explotación guardada de antes, cuando las cuentas eran de cada
          navegador. Tráela a tu cuenta nueva y la tendrás también en el móvil y en el ordenador.
        </p>
      </div>

      {candidatas.map(c => (
        <Card key={c.usuario.id} className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">{c.explotacion}</h2>
            <p className="mt-1 text-sm text-stone-600">{c.usuario.email}</p>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-stone-600">
            <li>
              <strong className="tabular-nums text-stone-900">{c.animales}</strong> animales
            </li>
            <li>
              <strong className="tabular-nums text-stone-900">{c.facturas}</strong> facturas
            </li>
            <li>
              <strong className="tabular-nums text-stone-900">{c.registros}</strong> registros de
              producción
            </li>
          </ul>
          <Button onClick={() => traer(c)} loading={trabajando === c.usuario.id}>
            <UploadCloud size={18} />
            Traer esta explotación
          </Button>
        </Card>
      ))}

      <Banner>
        La explotación se copia, no se mueve: la cuenta anterior seguirá intacta en este dispositivo
        por si acaso.
      </Banner>

      <Button variant="ghost" onClick={onOmitir}>
        Empezar de cero con una explotación vacía
      </Button>
    </div>
  );
}
