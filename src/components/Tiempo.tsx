import { useCallback, useEffect, useState } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  RefreshCw,
  Sun
} from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { describirCielo, obtenerPrevision, type Prevision } from '../services/tiempo';
import { Banner, Button, Card } from './ui';

function IconoCielo({ codigo, ...props }: { codigo: number; size?: number; className?: string }) {
  if (codigo === 0) return <Sun {...props} />;
  if (codigo <= 2) return <CloudSun {...props} />;
  if (codigo === 3) return <Cloud {...props} />;
  if (codigo <= 48) return <CloudFog {...props} />;
  if (codigo <= 57) return <CloudDrizzle {...props} />;
  if (codigo <= 67) return <CloudRain {...props} />;
  if (codigo <= 77) return <CloudSnow {...props} />;
  if (codigo <= 86) return <CloudRain {...props} />;
  return <CloudLightning {...props} />;
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function etiquetaDia(fecha: string, indice: number): string {
  if (indice === 0) return 'Hoy';
  if (indice === 1) return 'Mañana';
  const d = new Date(fecha + 'T12:00:00');
  return DIAS[d.getDay()];
}

const litrosTexto = (mm: number) =>
  mm >= 10 ? String(Math.round(mm)) : mm.toFixed(1).replace('.', ',');

export function Tiempo() {
  const { farm } = useFarm();
  const municipio = farm.municipio;
  const [prevision, setPrevision] = useState<Prevision | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!municipio) return;
    setCargando(true);
    setError('');
    try {
      setPrevision(await obtenerPrevision(municipio));
    } catch (e) {
      setError(
        e instanceof Error && navigator.onLine
          ? e.message
          : 'Sin conexión: no se puede consultar la previsión.'
      );
    } finally {
      setCargando(false);
    }
  }, [municipio]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!municipio) {
    return (
      <Card className="space-y-3">
        <h3 className="section-heading">El tiempo</h3>
        <p className="text-sm leading-relaxed text-stone-600">
          Elige el municipio de tu explotación en <strong>Ajustes y cuenta</strong> y aquí verás la
          previsión de los próximos cinco días, con los litros de lluvia que se esperan.
        </p>
      </Card>
    );
  }

  const total = prevision?.dias.reduce((s, d) => s + (d.litros ?? 0), 0) ?? 0;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="section-heading">El tiempo · 5 días</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
            <MapPin size={15} aria-hidden="true" />
            {municipio.nombre}
            {municipio.provincia ? ` (${municipio.provincia})` : ''}
          </p>
        </div>
        <Button variant="ghost" onClick={() => void cargar()} aria-label="Actualizar la previsión">
          <RefreshCw size={18} className={cargando ? 'animate-spin' : undefined} />
        </Button>
      </div>

      {error && <Banner tone="error">{error}</Banner>}
      {!prevision && !error && (
        <p className="text-sm text-stone-600" role="status">
          Consultando la previsión…
        </p>
      )}

      {prevision && (
        <>
          <ul className="divide-y divide-stone-200">
            {prevision.dias.map((d, i) => (
              <li key={d.fecha} className="flex items-center gap-3 py-3">
                <IconoCielo
                  codigo={d.codigo}
                  size={26}
                  className="shrink-0 text-brand-700"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{etiquetaDia(d.fecha, i)}</p>
                  <p className="truncate text-sm text-stone-600">{describirCielo(d.codigo)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`font-bold tabular-nums ${d.litros && d.litros > 0 ? 'text-brand-700' : 'text-stone-500'}`}
                  >
                    {d.litros === null ? '—' : `${litrosTexto(d.litros)} l/m²`}
                  </p>
                  <p className="text-sm text-stone-600 tabular-nums">
                    {d.probabilidad === null ? '' : `${d.probabilidad}% prob.`}
                  </p>
                </div>
                <div className="w-16 shrink-0 text-right text-sm tabular-nums">
                  <p className="font-semibold">
                    {d.tempMax === null ? '—' : `${Math.round(d.tempMax)}°`}
                  </p>
                  <p className="text-stone-600">
                    {d.tempMin === null ? '' : `${Math.round(d.tempMin)}°`}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3">
            <Droplets size={18} className="shrink-0 text-brand-700" aria-hidden="true" />
            <p className="text-sm">
              <strong className="tabular-nums">{litrosTexto(total)} l/m²</strong> previstos en los
              cinco días.
            </p>
          </div>

          <p className="text-xs leading-relaxed text-stone-600">
            {prevision.fuentes.includes('AEMET') ? (
              <>
                Datos de <strong>AEMET</strong>, la agencia estatal de meteorología. Los litros de
                los días que AEMET no cubre proceden de <strong>Open-Meteo</strong> (modelo ECMWF);
                AEMET solo publica milímetros en su predicción a 48 horas.
              </>
            ) : (
              <>
                Datos de <strong>Open-Meteo</strong> (modelo ECMWF). La previsión oficial de{' '}
                <strong>AEMET</strong> se mostrará en cuanto esté configurada su clave de acceso.
              </>
            )}{' '}
            Una previsión es una estimación, no una certeza.
          </p>
        </>
      )}
    </Card>
  );
}
