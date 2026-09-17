# Informe de desarrollo — Chaparra

Implementación del pliego `docs/SPEC-REDISENO.md`.

**Quién hizo qué.** El desarrollo lo ejecutó Codex CLI (`gpt-6-astra`, razonamiento `xhigh`).
Codex agotó su cuota antes del último paso y no llegó a escribir este informe ni a limpiar
algunos artefactos de su entorno. El repaso final —formato del código, retirada de los apaños
de sandbox, tres correcciones menores y este documento— lo hizo Claude Code, que además
verificó los diez criterios de aceptación en un navegador real.

---

## 1. Inventario

### Archivos nuevos

| Archivo | Cometido |
|---|---|
| `tailwind.config.js`, `postcss.config.js` | Tailwind 3.4 real, con la paleta `brand`/`tierra` del pliego |
| `src/services/auth.ts` | Cuentas locales, PBKDF2-SHA-256, sesiones |
| `src/services/storage.ts` | Acceso a `localStorage`/`sessionStorage` con respaldo en memoria |
| `src/services/backup.ts` | Exportación e importación de copias en JSON, con validación |
| `src/services/images.ts` | Redimensionado y compresión de fotos antes de guardarlas |
| `src/lib/domain.ts` | Fechas, edades, GMD, importes, adaptación por orientación |
| `src/lib/validation.ts` | Validación de formularios (crotal, fechas, importes) |
| `src/lib/constants.ts` | Especies, estados, categorías, provincias |
| `src/context/FarmContext.tsx` | Estado de la explotación, sin gestores externos |
| `src/components/ui/` | Primitivos: Button, Input, Select, Field, Card, Badge, Banner, StatTile, SegmentedControl, EmptyState, Modal |
| `src/components/AuthScreen.tsx` | Bienvenida, acceso y alta de cuenta |
| `src/components/Onboarding.tsx` | Encuesta de 4 pasos |
| `src/components/AppShell.tsx` | Barra lateral (escritorio) y barra inferior (móvil) |
| `src/components/Charts.tsx` | Gráficas compartidas sobre Recharts |
| `src/components/SaleInvoiceEditor.tsx` | Documento de venta: REAGP y régimen general |
| `src/components/DeleteAccountModal.tsx` | Borrado de cuenta con doble confirmación |
| `src/components/ErrorBoundary.tsx` | Evita la pantalla en blanco ante un fallo |
| `tests/services.test.mjs` | 14 pruebas de servicios y cálculos |
| `scripts/test-loader.mjs`, `scripts/register-test-loader.mjs` | Cargador que transpila TS para el runner de Node |
| `scripts/check-dev.mjs` | Comprobación del servidor de desarrollo (`npm run check:dev`) |
| `scripts/browser-check.mjs` | Recorrido en Chrome, manual; necesita Chrome instalado |
| `.prettierrc.json` | Formato del código |

### Archivos reescritos

`src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/types/index.ts`, `src/services/db.ts`,
`src/components/CrotalList.tsx`, `AnimalFormModal.tsx`, `AnimalDetailModal.tsx`,
`ProductionModule.tsx`, `InvoiceModule.tsx`, `AnalyticsDashboard.tsx`,
`FarmSettingsModal.tsx`, `SecurityPrivacyModal.tsx`, más `index.html`, `vite.config.ts`,
`tsconfig.json` y `package.json`.

### Archivos eliminados

`src/components/Header.tsx` y `src/components/BottomNav.tsx`, sustituidos por `AppShell.tsx`.

---

## 2. Cómo arrancarlo

```bash
npm install
npm run dev
```

Servidor en **http://localhost:5180** (`strictPort: true`: si el puerto está ocupado falla en
vez de saltar a otro). El puerto 3000 no se toca en ningún caso.

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run build` | Comprueba tipos y compila a `dist/` |
| `npm test` | 14 pruebas de servicios y cálculos |
| `npm run typecheck` | Solo comprobación de tipos |
| `npm run format` | Aplica Prettier |
| `npm run check:dev` | Levanta el servidor y comprueba que responde en el 5180 |

### Probar el recorrido completo

1. Abre http://localhost:5180 → **Crear una cuenta local**.
2. Nombre, correo y contraseña (mínimo 8 caracteres), acepta el tratamiento de datos.
3. Encuesta: nombre de la ganadería → especies → orientación de cada una → precios.
4. Entras con la explotación **vacía**. Da de alta un animal desde el estado vacío.
5. Cierra sesión y vuelve a entrar: los datos siguen ahí.
6. Crea una segunda cuenta: explotación vacía e independiente.

Para volver al punto de partida, borra los datos del sitio en el navegador, o usa
**Ajustes y cuenta → Eliminar cuenta**.

---

## 3. Decisiones técnicas

**Contraseñas.** PBKDF2-SHA-256 con 150.000 iteraciones, sal aleatoria de 16 bytes por usuario
y clave derivada de 32 bytes, vía Web Crypto. Se guarda `{salt, passwordHash, iterations, algo}`
en base64. `crypto.subtle` solo existe en contextos seguros: en `localhost` funciona, y si se
sirve la app por HTTP plano desde otra máquina se muestra un error explicativo en vez de fallar
en silencio.

**Aislamiento por usuario.** Cada cuenta tiene su juego de claves
`chaparra:v2:u:<userId>:{farm,animals,invoices,saleTemplate,milkRecords,weightRecords}`.
Al primer arranque se borran las cuatro claves `chaparra_*_v1` de la versión anterior: eran
datos de demostración inventados y no se migra nada.

**Almacenamiento tolerante a fallos.** Si `localStorage` no está disponible o se llena, los
cambios se mantienen en memoria, se avisa al usuario y se le ofrece exportar la copia de
seguridad antes de perder nada, en lugar de romper la aplicación.

**Adaptación por orientación.** `hasMilk()` y `hasMeat()` derivan del mapa
`orientacionPorEspecie` y gobiernan qué secciones, campos, KPIs y gráficas se montan.
Declarando solo carne, no aparece ordeño en ninguna pantalla, y al revés.

**Impuestos de la factura de venta.** Se distinguen dos regímenes, porque no son lo mismo:

- **REAGP**: documento de *recibo de compensación* (lo expide el comprador y lo firma el
  titular), con compensación del 10,5 % para actividad ganadera, u opción de 0 %.
- **Régimen general**: factura con IVA repercutido (0/4/10/21 %).

La retención de IRPF (2 % ganadería general, 1 % engorde de porcino y avicultura, o 0 %) se
calcula **sobre la base imponible**, no sobre base más impuesto. Total = base + impuesto −
retención. La aplicación no presenta declaraciones ni sustituye a un asesor, y así se indica
en pantalla junto al enlace a la Agencia Tributaria.

**Valoración del ganado de carne.** La GMD se calcula entre las dos últimas pesadas reales.
El peso actual se extrapola solo si la última pesada tiene menos de 30 días; si es más antigua
se marca como caducada en vez de inventar una cifra. La valoración se hace sobre **peso vivo**:
no se aplica ningún rendimiento de canal supuesto.

**Fotos de facturas.** Se redimensionan a 1280 px y se recomprimen a JPEG antes de guardarse,
porque las imágenes en `dataURL` agotan la cuota de `localStorage` enseguida.

---

## 4. Verificación de los criterios de aceptación

Los diez criterios de la §10 del pliego se comprobaron de forma efectiva, no por inspección
del código: los del 4 al 9 recorriendo la aplicación en un navegador real.

| # | Criterio | Cómo se comprobó |
|---|---|---|
| 1 | Compilación limpia | `npm run build`: 2.294 módulos, sin errores de TypeScript |
| 2 | Puerto 5180, nunca el 3000 | Sin ninguna referencia al 3000/3001/5173 en el código; el proceso ajeno del 3000 siguió intacto |
| 3 | Tailwind aplicándose | Las reglas `.flex`, `.grid`, `.rounded-xl`, `.min-h-screen` están en el CSS compilado (22 kB) |
| 4 | Alta → encuesta → app vacía | Recorrido completo en navegador |
| 5 | Los datos vuelven al reentrar | Sesión cerrada y reabierta, incluso escribiendo el correo en mayúsculas |
| 6 | Segunda cuenta aislada | Ni el crotal ni el nombre de explotación de la primera aparecen en la segunda |
| 7 | Sin contraseñas en claro | `chaparra:v2:users` solo contiene hash y sal; la contraseña no aparece |
| 8 | Solo carne ⇒ sin ordeño | Cero coincidencias de «ordeño», «litro» y «leche» en las cuatro pestañas |
| 9 | 375 px y 1440 px | Lateral en escritorio, inferior en móvil, sin scroll horizontal, ningún botón por debajo de 44 px |
| 10 | Sin datos de demostración | Sin rastro de las vacas ni la ganadería inventadas |

Además: **0 errores en la consola del navegador**, cero `any` y cero `@ts-ignore` en `src/`,
cada `input` con su `<label>`, y enlace «Saltar al contenido».

---

## 5. Correcciones aplicadas tras la revisión

1. **Formato del código.** Codex escribió los archivos casi minificados: 74 líneas pasaban de
   400 caracteres y la mayor tenía 1.712. Se añadió Prettier (`printWidth` 100) y se reformateó
   `src/`. Ahora no queda ninguna línea por encima de 400 caracteres.
2. **Apaños de sandbox retirados.** Codex había creado `scripts/vite.mjs` y
   `scripts/esbuild-local.mjs`, y desviado `package.json` a través de ellos, porque dentro de su
   entorno restringido esbuild no podía recorrer directorios superiores. Se comprobó que fuera
   de ese entorno son innecesarios —`vite` estándar compila con hashes de salida idénticos y
   arranca en 438 ms— así que se eliminaron junto al bloque `optimizeDeps` de `vite.config.ts`,
   y `package.json` vuelve a `vite` / `tsc && vite build`.
3. **Precios unitarios.** `0,5 €/litro` se mostraba con un decimal. Nuevo ayudante `euroRate()`
   que fuerza dos decimales: `0,50 €/litro`, `0,00 €/kg en vivo`.
4. **Copia de seguridad en móvil.** El botón ocupaba una franja completa por encima del título
   de la página. Ahora es un botón de icono en la cabecera, junto a Ajustes.
5. **Iconos de especie.** Las siete tarjetas de la encuesta usaban el mismo icono de etiqueta.
   Ahora son tarjetas más grandes con un icono por especie.

---

## 6. Limitaciones conocidas

- **No hay copia en la nube ni recuperación de contraseña.** Es consecuencia directa de que no
  hay servidor. Si se pierde la contraseña, la única salida es borrar la cuenta y empezar de
  cero; la aplicación lo dice claramente en vez de ofrecer un envío de correo que no existe.
  La exportación a JSON desde Ajustes es la única copia de seguridad real: conviene usarla.
- **Los datos no están cifrados.** Solo la contraseña pasa por PBKDF2. Quien tenga acceso al
  navegador, a sus herramientas de desarrollo o a una sesión abierta puede leer la explotación.
  Está advertido en la pantalla de Privacidad.
- **Los datos viven en un solo navegador.** No se sincroniza entre el móvil y el ordenador:
  son dos explotaciones distintas salvo que se exporte e importe el JSON a mano.
- **Iconografía de especies aproximada.** Lucide no tiene glifos de oveja, cabra ni caballo.
  Vacuno, porcino y aves llevan icono fiel; ovino y caprino usan uno asociativo (lana, monte)
  y equino y «Otro» una huella genérica. Sustituible por un juego de SVG propio.
- **`scripts/browser-check.mjs` no está conectado a ningún comando.** Espera Chrome en la ruta
  por defecto de Windows (ajustable con la variable `CHAPARRA_BROWSER`) y se ejecuta a mano.
- **Fuera de alcance por decisión del pliego:** modo oscuro y PWA con service worker.
- **Sin pruebas de interfaz automatizadas.** Las 14 pruebas cubren servicios y cálculos
  (autenticación, aislamiento, caducidad de sesión, cuota llena, copias, GMD, impuestos).
  Los componentes se verificaron a mano en el navegador, no hay regresión automática sobre ellos.
