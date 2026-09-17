# Informe de preparación para Google Play y App Store

Fecha de la auditoría: 17 de septiembre de 2026  
Producción auditada: <https://chaparra.agrovanza.es>  
Repositorio: `C4MAR0N/chaparra`

## Resultado

La parte web queda compilable, probada y documentada para preparar las fichas. Android tiene el
manifiesto TWA actualizado, accesos directos coherentes y la plantilla de Digital Asset Links dentro
de `dist/`. Los textos, privacidad, IARC, cuenta de revisión y guion de capturas están redactados.

**Todavía no se puede enviar a ninguna tienda.** No es una precaución genérica: faltan acciones que
solo puede realizar el dueño y una parte de iOS que todavía no existe.

- Google Play: aplicar la migración 002, obtener la huella de Play App Signing, desplegarla, generar
  y probar el AAB con API 36 y crear la cuenta de revisión.
- App Store: además, implementar una aplicación iOS con las integraciones nativas del plan. Un
  `WKWebView` sin ellas mantiene un riesgo alto de rechazo por 4.2.

No se ha creado ninguna cuenta, usado ninguna credencial, subido ningún binario, publicado nada,
hecho `git commit` ni hecho `git push`.

## Cambios realizados

### Android y PWA

- `android/twa-manifest.json`: dominio propio, raíz `/`, iconos públicos comprobados, colores de
  marca, paquete `es.agrovanza.chaparra`, control de API 36 y accesos «Rebaño»/«Facturas».
- `public/manifest.webmanifest`: descripción acorde con la sincronización y los mismos accesos
  directos.
- `src/components/AppShell.tsx`: interpreta `?seccion=rebano` y `?seccion=facturas` después de
  iniciar sesión.
- `public/.well-known/assetlinks.json`: estructura de Digital Asset Links y marcador visible para la
  SHA‑256 de Play App Signing.
- `android/README.md`: procedimiento actualizado, diferencia entre clave de subida y firma de Play,
  Bubblewrap 1.25.0 o posterior y comprobación de API 36.

El campo `targetSdkVersion` del JSON no cambia Gradle por sí mismo: Bubblewrap no lo consume. El
target real lo aporta la plantilla de Bubblewrap 1.25.0 y se debe verificar en el proyecto y el AAB.
Ocultar esta limitación habría dado una falsa sensación de cumplimiento.

### Correcciones encontradas durante la auditoría

- `public/borrar-cuenta.html` afirmaba que desinstalar borraba también la cuenta y que los datos solo
  estaban en el dispositivo. Se corrigió: desinstalar elimina la copia local, no la de Supabase; la
  solicitud por correo sí puede borrar la copia del servidor.
- `index.html` y el manifiesto PWA todavía decían que los datos se guardaban únicamente en el
  dispositivo. Ahora explican modo sin cobertura y sincronización.
- `public/sw.js` tenía un comentario antiguo que negaba servidor y sincronización. Se actualizó sin
  cambiar la estrategia de caché.
- `docs/CORREO-SMTP.md` y `android/README.md` seguían usando el dominio antiguo de GitHub Pages. Ya
  no queda ninguna coincidencia con él fuera de dependencias y artefactos.

### Compilación

El primer `npm run build` no llegó a cargar Vite porque esbuild intentó leer un directorio padre que
el sandbox bloquea. Para que el comando obligatorio fuese ejecutable sin cambiar su resultado:

- se extrajo la configuración común a `scripts/configuracion-vite.mjs`;
- `vite.config.ts` la sigue usando para desarrollo;
- `scripts/compilar.mjs` llama a la API oficial de Vite con `configFile: false`;
- el script `build` ejecuta `tsc && node scripts/compilar.mjs`.

No se añadió ni actualizó ninguna dependencia y `package-lock.json` no cambió.

### Documentación de tiendas

- `docs/CHECKLIST-TIENDAS.md`: auditoría reescrita con estados verdes solo para ejecuciones
  observadas.
- `docs/GOOGLE-PLAY.md`: respuestas de Data Safety por tipo, IARC y cuenta del revisor.
- `docs/APP-STORE.md`: plan nativo por API, pantalla, orden y jornadas; App Privacy.
- `docs/FICHA-TIENDAS.md`: título, descripciones, palabras clave, notas del revisor, datos ficticios,
  pantallas y tamaños.

No se generaron capturas. En iOS, las integraciones VisionKit y demás deberán capturarse desde el
binario o el simulador; fabricarlas en el navegador no reflejaría la aplicación sometida a revisión.

## Comandos ejecutados y salida real

### Peticiones con `curl.exe`

```powershell
curl.exe -sS -L -o NUL -w '%{http_code} %{content_type}' https://chaparra.agrovanza.es/
```

Salida:

```text
curl: (35) schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS (0x8009030e)
000
```

El fallo ocurre en Schannel antes de conectar. Las mismas URLs se comprobaron con `fetch` de Node.

### URLs públicas

Se ejecutó un script de Node con `fetch` sobre la portada, manifiesto, service worker, iconos,
páginas legales y Digital Asset Links. Salida relevante:

```text
https://chaparra.agrovanza.es/ -> 200 text/html; charset=utf-8 1624
https://chaparra.agrovanza.es/manifest.webmanifest -> 200 application/manifest+json; charset=utf-8 1013
https://chaparra.agrovanza.es/sw.js -> 200 application/javascript; charset=utf-8 4214
https://chaparra.agrovanza.es/icon-192.png -> 200 image/png 8263
https://chaparra.agrovanza.es/icon-512.png -> 200 image/png 30111
https://chaparra.agrovanza.es/icon-maskable-512.png -> 200 image/png 20548
https://chaparra.agrovanza.es/apple-touch-icon.png -> 200 image/png 7691
https://chaparra.agrovanza.es/privacidad.html -> 200 text/html; charset=utf-8 10687
https://chaparra.agrovanza.es/borrar-cuenta.html -> 200 text/html; charset=utf-8 7557
https://chaparra.agrovanza.es/.well-known/assetlinks.json -> 404 text/html; charset=utf-8 9379
```

Lectura de dimensiones PNG:

```text
ICONO icon-192.png 200 image/png 192x192
ICONO icon-512.png 200 image/png 512x512
ICONO icon-maskable-192.png 200 image/png 192x192
ICONO icon-maskable-512.png 200 image/png 512x512
ICONO apple-touch-icon.png 200 image/png 180x180
```

Todos los JS, CSS, fuente, iconos y manifiesto enlazados por la portada respondieron `200`. El JS
público contiene las cadenas de registro del service worker:

```text
/assets/index-C2eiP0-t.js serviceWorker=true register=true bytes=164897
```

### Servicios externos y CI

Peticiones ejecutadas sin credenciales de usuario:

```text
SUPABASE auth-health 200 {"version":"v2.197.0","name":"GoTrue",...}
SUPABASE rest-anon 200 []
AEMET indice-publico 404 text/html; charset=utf-8
OPEN-METEO 200 dias=5 litros=5
OCR /ocr/worker.min.js 200 application/javascript; charset=utf-8 length=35295
OCR /ocr/spa.traineddata.gz 200 application/gzip length=1137561
GITHUB-ACTIONS 200 Desplegar en GitHub Pages status=completed conclusion=success event=push updated=2026-09-17T14:58:41Z
```

La respuesta `[]` demuestra que la consulta anónima no obtuvo filas; no demuestra por sí sola el
aislamiento entre dos usuarios autenticados.

### Compilación inicial fallida por el entorno

```powershell
npm.cmd run build
```

Salida antes del ajuste de carga de configuración:

```text
> tsc && vite build
X [ERROR] Cannot read directory "../..": Access is denied.
X [ERROR] Could not resolve "C:\Users\Alejandro\Desktop\Chaparra\vite.config.ts"
failed to load config from C:\Users\Alejandro\Desktop\Chaparra\vite.config.ts
```

`node node_modules/typescript/bin/tsc --noEmit` terminó con código 0, confirmando que el fallo era el
cargador de configuración y no TypeScript.

### Build final e inspección de `dist/`

```powershell
npm.cmd run build
```

Salida:

```text
> chaparra-app-ganadera@1.0.0 build
> tsc && node scripts/compilar.mjs

vite v5.4.21 building for production...
✓ 2401 modules transformed.
dist/index.html                              1.59 kB │ gzip:   0.71 kB
dist/assets/pdf.worker.min-yatZIOMy.mjs  1,375.84 kB
dist/assets/index-MNJrgVWj.css              24.71 kB │ gzip:   5.56 kB
dist/assets/lectura-Cd4P5WFE.js              2.82 kB │ gzip:   1.41 kB
dist/assets/react-CdkWbty6.js              141.96 kB │ gzip:  45.49 kB
dist/assets/index-BDcSSiXE.js              164.48 kB │ gzip:  50.46 kB
dist/assets/charts-Du5qrGGq.js             248.35 kB │ gzip:  58.04 kB
dist/assets/lector-BHmUjttt.js             374.61 kB │ gzip: 112.22 kB
dist/assets/vendor-DPCSE0u0.js             395.14 kB │ gzip: 114.03 kB
✓ built in 12.85s
```

La advertencia de Vite sobre `nube.ts` importado estática y dinámicamente ya existía y no invalida
el build; solo indica que ese módulo no se separa en otro chunk.

Se levantó `dist/` con la API de vista previa de Vite y se pidió el archivo nuevo:

```text
TWA host=chaparra.agrovanza.es package=es.agrovanza.chaparra targetSdk=36 shortcuts=2
DAL package=es.agrovanza.chaparra relation=delegate_permission/common.handle_all_urls
COHERENCIA paquete=true marcador=REEMPLAZAR_POR_LA_HUELLA_SHA256_DE_PLAY_APP_SIGNING
PWA display=standalone shortcuts=2 iconos=4
PREVIEW assetlinks 200 application/json bytes=269
PREVIEW manifest 200 application/manifest+json
```

### Límite de las facturas

Se importó `prepararAdjunto` con el cargador de pruebas y se le pasaron dos objetos `File`:

```text
PDF 2097152 aceptado=true
PDF 2097153 rechazado=true mensaje=El PDF supera 2 MB. Adjunta solo las páginas que necesites.
```

### Textos de la ficha

```text
LONGITUDES titulo=27 corta=72 palabras_clave=81
DESCRIPCION_COMPLETA caracteres=1519
```

### OCR sin modificar

```text
OCR archivos=4 bytes=9138219
OCR git-diff=sin cambios
```

No se leyó, reescribió ni regeneró ningún archivo dentro de `public/ocr/`.

### Verificaciones obligatorias

```powershell
npm.cmd run format:check
```

```text
Checking formatting...
All matched files use Prettier code style!
```

```powershell
npm.cmd test
```

Resumen TAP real:

```text
ℹ tests 62
ℹ suites 0
ℹ pass 62
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

`npm.cmd run build` produjo la salida correcta incluida en el apartado anterior.

## Pendientes y responsable

| Pendiente                                                           | Responsable                                    | Bloquea                                     |
| ------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| Aplicar migración 002 y probar el borrado con una cuenta desechable | Dueño, panel de Supabase                       | Ambas tiendas                               |
| Configurar la clave de AEMET y ejecutar el flujo manual             | Dueño, GitHub Actions                          | No bloquea la tienda; la app usa Open‑Meteo |
| Crear aplicación en Play Console y activar Play App Signing         | Dueño                                          | Google Play                                 |
| Sustituir el marcador por la SHA‑256 de firma de Play               | Dueño                                          | TWA sin barra / Google Play                 |
| Desplegar y verificar `assetlinks.json` público                     | Dueño; despliegue al empujar a `master`        | Google Play                                 |
| Generar, firmar e instalar AAB con Bubblewrap 1.25.0+               | Dueño, con keystore y SDK                      | Google Play                                 |
| Crear cuenta de revisión con datos ficticios                        | Dueño                                          | Ambas tiendas                               |
| Crear gráfico destacado y capturas con el guion entregado           | Dueño                                          | Fichas                                      |
| Completar Play Console: ficha, Data Safety, IARC y acceso           | Dueño                                          | Google Play                                 |
| Implementar pasos 0–3, idealmente 0–4, del plan nativo              | Desarrollo iOS                                 | App Store / directriz 4.2                   |
| Compilar, probar en dispositivo y subir a TestFlight                | Dueño/desarrollo con Mac, Xcode y cuenta Apple | App Store                                   |
| Revisar App Privacy contra los SDK del binario final                | Desarrollo iOS y dueño                         | App Store                                   |

## Limitaciones honestas

- **Navegador:** el conector devolvió `apps: []` y `browsers: []`. Edge y Chrome headless terminaron
  porque su proceso GPU no era utilizable. Por ello quedan **no comprobados** el diseño a 375 px,
  áreas táctiles, consola, etiquetas, instalación PWA y apertura real sin red.
- **Cuentas:** no se crearon ni usaron credenciales. No se probaron alta, confirmación, acceso,
  recuperación, dos usuarios RLS, multidispositivo ni borrado real.
- **Supabase:** se verificaron salud de Auth y ausencia de filas para `anon`, pero no la región del
  proyecto, las políticas desde una sesión real ni la migración 002.
- **OCR:** se verificaron recursos públicos y pruebas del intérprete; no el recorrido completo de
  cámara o PDF en un navegador. El directorio del motor no se tocó.
- **AEMET:** el índice público da 404. No se pudo verificar una respuesta AEMET dentro de la app.
- **TWA:** no hay AAB, huella ni dispositivo. El archivo local de Digital Asset Links se sirve bien,
  pero el público seguirá en 404 hasta el próximo despliegue y no validará hasta sustituir la
  huella.
- **iOS:** no hay proyecto, Mac, Xcode, binario ni cuenta App Store Connect. La aceptación por 4.2 no
  se puede garantizar; el documento ofrece un plan defendible, no una promesa.
- **Capturas:** no se hicieron por indicación expresa. Las funciones nativas de iOS no pueden
  representarse honestamente desde el navegador antes de implementarlas.
- **Requisitos de tiendas:** se consultaron fuentes oficiales el 17 de septiembre de 2026. Play
  Console y App Store Connect pueden cambiar textos u opciones; hay que volver a contrastarlos al
  presentar el binario.

## Punto mal planteado que no conviene ocultar

«Hacer todas las capturas de App Store con el navegador» solo sirve para las pantallas web que el
contenedor muestra sin cambios. La propia estrategia contra 4.2 exige VisionKit, hojas de compartir
y otras vistas nativas. Esas imágenes deben salir del binario iOS real. Publicar una representación
inventada puede causar rechazo por metadatos que no corresponden a la aplicación.
