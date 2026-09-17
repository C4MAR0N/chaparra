# Chaparra — Pliego técnico de rediseño y desarrollo

App web de gestión ganadera para ganaderos españoles. Uso principal: **móvil, en el campo**,
a menudo con guantes, con sol directo y conexión mala o inexistente.

Este documento es la especificación completa. Impleméntala entera. No inventes alcance nuevo
fuera de lo aquí descrito, y no recortes lo que sí está descrito.

---

## 0. Estado actual y causas raíz a corregir

El código existente lo generó otro modelo y tiene tres fallos graves ya diagnosticados:

1. **La interfaz no tiene estilos.** Los 10 componentes de `src/components/` usan ~550 clases
   utilitarias de Tailwind (`flex`, `bg-gray-50`, `rounded-xl`, `px-4`, `text-sm`, `grid`...),
   pero **Tailwind no está instalado ni cargado por CDN**. `src/index.css` solo define 17 clases
   propias (`.card-farm`, `.btn-farm-primary`, `.bottom-nav`...). Todo lo demás es texto muerto:
   la app se renderiza como bloques apilados sin maquetación. **Esta es la causa raíz de que sea fea.**
2. **Roba el puerto 3000**, que está ocupado por otra plataforma del usuario.
3. **No existe ningún sistema de usuarios**: ni registro, ni login, ni encuesta de alta,
   ni separación de datos entre usuarios.

Además: los datos de demo (6 vacas y 3 facturas inventadas) están cableados en `src/services/db.ts`
y se le muestran a cualquiera que abra la app.

---

## 1. Decisiones ya tomadas (no las cuestiones, no las cambies)

| Tema | Decisión |
|---|---|
| Autenticación | **100% local, sin servidor.** Cuentas en el navegador. Sin Supabase, sin Firebase, sin backend Node. |
| Datos iniciales | La app arranca **completamente vacía** tras el registro. **Cero datos de demo.** |
| Puerto dev | **5180**, con `strictPort: true`. |
| Estilos | **Tailwind CSS v3.4** instalado de verdad (no CDN). |
| Framework | Se mantiene React 18 + TypeScript + Vite. No migres a Next.js ni a otra cosa. |
| Modo oscuro | **Fuera de alcance.** No lo implementes. |
| PWA / service worker | **Fuera de alcance.** No lo implementes. |

---

## 2. Reglas de trabajo obligatorias

- **Nunca uses ni configures el puerto 3000, 3001 ni 5173.** Están ocupados o reservados.
- **No arranques `npm run dev` y lo dejes corriendo**: bloquearía la sesión. Verifica con `npm run build`.
- **No toques el directorio `.git`** ni hagas `git reset --hard`, `git clean` ni `git push`.
  Puedes hacer commits normales si quieres, pero no reescribas historia.
- **No borres el archivo `docs/SPEC-REDISENO.md`.**
- Dependencias nuevas permitidas: `tailwindcss@^3.4`, `postcss`, `autoprefixer`, y nada más
  salvo que sea imprescindible. Mantén `react`, `react-dom`, `lucide-react`, `recharts`.
  **Prohibido** añadir librerías de componentes (MUI, Chakra, shadcn, Ant, Bootstrap), routers
  pesados, gestores de estado externos (Redux, Zustand) o SDKs de backend.
- TypeScript **estricto**: cero `any`, cero `@ts-ignore`. `npm run build` debe terminar sin errores.
- Todos los textos de interfaz en **español de España**, con tildes correctas y terminología ganadera
  real (crotal, REGA, explotación, rebaño, ordeño, parto, cebo, GMD, canal).

---

## 3. Sistema de diseño

**Objetivo estético:** herramienta de trabajo profesional del campo. Sobria, densa en información,
legible a pleno sol, con áreas táctiles grandes. **Debe parecer software agrario serio, no una
landing de startup.**

**Prohibido explícitamente:** gradientes morados/azules tipo IA genérica, glassmorphism,
emojis usados como iconos (🐄 como icono de navegación), sombras exageradas, animaciones
decorativas, texto por debajo de 13px, botones de menos de 44px de alto.

### 3.1 Paleta (defínela en `tailwind.config.js` como colores con nombre)

```
brand (verde dehesa, serio y desaturado — NO verde chillón)
  50  #F1F6F2   100 #DCE9E0   200 #BAD3C2   300 #8FB79D
  400 #5F9373   500 #3E7554   600 #2D5F42   700 #1F4A33  (color principal)
  800 #173928   900 #0F2419

tierra (acento cuero/ámbar, para avisos suaves y acciones secundarias)
  50 #FDF7ED  100 #F8E9CE  300 #E4B563  500 #C67C1E  600 #A8630F  700 #7F4A0C

neutral: usa la escala `stone` de Tailwind (cálida), NO `gray` (fría)
  fondo app #FAFAF9 · superficie #FFFFFF · borde #E7E5E4
  texto principal #1C1917 · texto secundario #57534E · texto atenuado #78716C
```

Estados sanitarios (fondo / texto / borde):

```
Sano           #ECFDF5 / #065F46 / #A7F3D0
En tratamiento #FEF3C7 / #92400E / #FDE68A
En cuarentena  #FEE2E2 / #991B1B / #FECACA
Vacunado       #DBEAFE / #1E40AF / #BFDBFE
Observación    #EDE9FE / #5B21B6 / #DDD6FE
```

### 3.2 Tipografía

- Fuente: **Plus Jakarta Sans** (ya está). Cárgala **una sola vez** desde `index.html`;
  **elimina el `@import` duplicado del principio de `src/index.css`**.
- Tamaño base 16px. Nunca bajes de 13px, ni siquiera en etiquetas.
- **Todas las cifras (kg, litros, €, fechas, crotales) con `font-variant-numeric: tabular-nums`**
  para que las columnas cuadren. Crea una utilidad o usa `tabular-nums` de Tailwind.
- Los crotales, al ser códigos, con `tracking-tight` y peso 600 para que se lean de un vistazo.

### 3.3 Componentes base (créalos en `src/components/ui/`)

Crea primitivos reutilizables y úsalos en toda la app en vez de repetir clases sueltas:
`Button` (variantes: primary, secondary, ghost, danger; tamaños sm/md/lg; estado `loading`),
`Input`, `Select`, `Textarea`, `Field` (label + input + error + texto de ayuda),
`Card`, `Modal` (con foco atrapado y cierre con Escape), `Badge`, `EmptyState`,
`StatTile` (KPI), `SegmentedControl`, `Toast`/`Banner`.

Reglas: radio 12px en controles y 16px en tarjetas; bordes `1px` stone-200; sombra sutil
(`0 1px 2px rgba(28,25,23,.06)`); altura mínima 48px en todo lo pulsable; foco visible siempre
(`ring-2 ring-brand-500 ring-offset-2`).

### 3.4 Navegación responsive

- **Móvil (<768px):** barra inferior fija de 4 pestañas con iconos `lucide-react`
  (nada de emojis) + etiqueta, respetando `env(safe-area-inset-bottom)`.
- **Escritorio (≥768px):** **barra lateral izquierda** fija con las mismas 4 secciones,
  nombre de la explotación arriba y menú de usuario abajo. La barra inferior se oculta.
  (Ahora mismo en escritorio se ve una bottom-nav móvil, que queda mal.)
- Secciones: **Rebaño · Producción · Facturas · Informes**.

---

## 4. Autenticación local (sin servidor)

### 4.1 Almacenamiento y hash

- Módulo nuevo `src/services/auth.ts`.
- Contraseñas: **PBKDF2-SHA-256 vía Web Crypto (`crypto.subtle`)**, 150.000 iteraciones,
  salt aleatorio de 16 bytes por usuario, derivar 32 bytes. Guarda `{ salt, hash, iterations, algo }`
  en base64. **Jamás guardes la contraseña en claro ni un hash sin salt.**
- Registro de usuarios en `localStorage` bajo `chaparra:v2:users`.
  Correo normalizado a minúsculas y sin espacios; **único**; error claro si ya existe.
- Sesión en `chaparra:v2:session` = `{ userId, expiresAt }`. Caducidad 30 días.
  Casilla **"Mantener la sesión iniciada"**: si está desmarcada, guarda la sesión en
  `sessionStorage` en vez de `localStorage`.
- Limpieza: al primer arranque de la v2, **elimina las claves antiguas**
  `chaparra_animals_v1`, `chaparra_farm_config_v1`, `chaparra_invoices_v1`,
  `chaparra_sale_template_v1`. No migres nada: eran datos de demo falsos.

### 4.2 Pantallas de acceso

Diseño a pantalla completa, dos columnas en escritorio (panel de marca a la izquierda con
el valor de la app en 3 puntos; formulario a la derecha), una sola columna en móvil.

- **Iniciar sesión:** correo, contraseña (con botón mostrar/ocultar), "mantener sesión",
  enlace a registro. Error genérico "Correo o contraseña incorrectos" (no reveles cuál falla).
- **Crear cuenta:** nombre y apellidos, correo, contraseña, repetir contraseña.
  Validación **en vivo**: correo con formato válido; contraseña de **mínimo 8 caracteres** con
  indicador de fuerza; confirmación coincidente. El botón se habilita solo cuando todo es válido.
  Casilla obligatoria de aceptación de tratamiento de datos (enlaza a la pantalla de privacidad).
- **Recuperación de contraseña:** como no hay servidor, **no prometas envío de correo**.
  Muestra un aviso honesto: los datos y la cuenta viven solo en este dispositivo/navegador;
  si se olvida la contraseña no se puede recuperar, solo borrar la cuenta y empezar de cero
  (ofrece ese botón, con doble confirmación escribiendo el correo).

### 4.3 Honestidad sobre la seguridad

En la pantalla de Privacidad y en el registro, explica en lenguaje llano y sin exagerar:
los datos se guardan **únicamente en este navegador**, no se envían a ningún servidor,
nadie más puede verlos, pero **tampoco hay copia de seguridad en la nube**: si se borran los
datos del navegador o se pierde el dispositivo, se pierde la información.
Por eso la exportación de copia de seguridad (§8.5) es importante y debe estar bien visible.
**No escribas afirmaciones falsas** del tipo "cifrado de extremo a extremo" o "cumple RGPD
automáticamente". Revisa `SecurityPrivacyModal.tsx` actual y corrige cualquier afirmación
que no sea cierta.

---

## 5. Encuesta de alta (onboarding)

Se ejecuta **una sola vez**, justo después de crear la cuenta, antes de entrar a la app.
Asistente de **4 pasos** con barra de progreso, botón Atrás, y textos de ayuda breves.
Cada paso valida antes de avanzar. Nada de scroll infinito: un paso = una pantalla.

**Paso 1 — Tu explotación**

- Nombre de la ganadería *(obligatorio)*
- Código REGA *(opcional)* — con texto de ayuda "lo encuentras en tu tarjeta de explotación"
- Provincia *(opcional, desplegable con las 50 provincias españolas)*
- Titular *(prerellenado con el nombre de la cuenta, editable)*

**Paso 2 — ¿Qué animales tienes?** *(selección múltiple, obligatorio al menos uno)*

Tarjetas grandes y pulsables con icono e indicador de selección:
`Vacuno · Ovino · Caprino · Porcino · Equino · Avícola · Otro`.

**Paso 3 — ¿Para qué los cría?**

Una fila **por cada especie seleccionada** en el paso 2, con control segmentado de 3 opciones:
**Carne · Leche · Mixto**. Obligatorio responder todas.

**Paso 4 — Datos económicos de partida** *(todos editables luego en Ajustes)*

- Si alguna especie es de **Leche** o **Mixto**: nº de ordeños al día (1/2/3) y precio €/litro.
- Si alguna es de **Carne** o **Mixto**: precio estimado €/kg de carne.
- Si no aplica ninguno, sáltate el paso automáticamente.
- Valores por defecto razonables y claramente marcados como estimación editable.

**Al finalizar:** crea el perfil de explotación del usuario y entra en la app **vacía**,
con estados vacíos útiles (§8.1). Guarda `onboardingCompletedAt`.
La encuesta debe poder **reabrirse y editarse** desde Ajustes.

---

## 6. Modelo de datos multiusuario

Reescribe `src/services/db.ts` para que **todo esté aislado por usuario**:

```
chaparra:v2:users                       -> UserRecord[]  (id, nombre, email, passwordHash...)
chaparra:v2:session                     -> { userId, expiresAt }
chaparra:v2:u:<userId>:farm             -> FarmProfile
chaparra:v2:u:<userId>:animals          -> Animal[]
chaparra:v2:u:<userId>:invoices         -> InvoiceDoc[]
chaparra:v2:u:<userId>:saleTemplate     -> SaleInvoiceTemplate
chaparra:v2:u:<userId>:milkRecords      -> MilkRecord[]
chaparra:v2:u:<userId>:weightRecords    -> WeightRecord[]
```

Tipos en `src/types/index.ts` (amplía los actuales):

```ts
type Especie = 'Vacuno' | 'Ovino' | 'Caprino' | 'Porcino' | 'Equino' | 'Avicola' | 'Otro';
type Orientacion = 'Carne' | 'Leche' | 'Mixto';

interface UserRecord {
  id: string; nombre: string; email: string;
  passwordHash: string; salt: string; iterations: number;
  createdAt: string; onboardingCompletedAt?: string;
}

interface FarmProfile {
  nombreExplotacion: string; codigoRega?: string; provincia?: string; titular: string;
  especies: Especie[];
  orientacionPorEspecie: Partial<Record<Especie, Orientacion>>;
  ordenosPorDia?: 1 | 2 | 3;
  precioLitroLecheEuro?: number;
  precioKgCarneEuro?: number;
  moneda: 'EUR';
}

interface MilkRecord { id: string; fecha: string; animalId?: string; litros: number; ordeno?: 1 | 2 | 3; notas?: string; }
interface WeightRecord { id: string; fecha: string; animalId: string; pesoKg: number; notas?: string; }
```

`Animal` mantiene los campos actuales pero cambia `tipoGanado: TipoGanado` por `especie: Especie`
y `proposito` por `orientacion: Orientacion`. Añade `activo: boolean` y `motivoBaja?` para poder
dar de baja un animal (vendido, muerto, sacrificado) **sin borrar su historial**.

Toda escritura pasa por funciones con `try/catch`: si `localStorage` falla (modo privado,
cuota llena), la app no debe romperse; muestra un aviso y sigue funcionando en memoria.

---

## 7. Adaptación de la app a la encuesta *(requisito clave)*

La encuesta no es decorativa: **debe cambiar lo que el ganadero ve.**

- Si **ninguna** especie es de Leche/Mixto → oculta por completo lo de ordeño: litros,
  €/litro, gráficas de leche y los KPIs lácteos. La sección "Producción" muestra solo carne.
- Si **ninguna** especie es de Carne/Mixto → oculta peso de canal, €/kg y KPIs cárnicos.
- En el alta de animal, el desplegable de especie ofrece **solo las especies declaradas**
  (más "Otro" al final), y la orientación viene preseleccionada según la especie elegida.
- Los KPIs de Informes y los campos del detalle del animal se adaptan igual.
- Terminología por especie: en Ovino/Caprino di "rebaño"; en Vacuno "ganado";
  no escribas "vacas" cuando el usuario solo tiene ovejas.

---

## 8. Pantallas

### 8.1 Rebaño (antes "Crotales")

- Buscador por crotal, raza o ubicación; filtros por especie, estado sanitario, sexo y activo/baja.
- Orden por crotal, edad o última revisión.
- Ficha de animal en lista: crotal destacado, especie+raza, edad calculada en años y meses,
  badge de estado sanitario, ubicación. En escritorio, tabla densa; en móvil, tarjetas.
- **Estado vacío real y útil**: título, una frase de por qué está vacío y botón primario
  "Dar de alta el primer animal".
- Alta/edición en modal con validación: crotal obligatorio y **único**, formato español
  `ES` + 12 dígitos (si no encaja, permite guardar pero muestra aviso, no bloquees),
  fecha de nacimiento no futura, números no negativos.
- Detalle: datos, historial sanitario, crías asociadas (enlazadas y navegables),
  registros de leche/peso, coste acumulado, y acciones Editar / Dar de baja / Eliminar
  (eliminar siempre con confirmación).

### 8.2 Producción

- **Leche** (si aplica): registro diario rápido de litros por ordeño, total del día,
  media de los últimos 7/30 días, gráfica de evolución (`recharts`), ingreso estimado.
- **Carne** (si aplica): registro de pesadas, **GMD (ganancia media diaria) calculada** entre
  pesadas, peso actual estimado, valor estimado a €/kg.
- Entrada de datos optimizada para el campo: pocos toques, teclado numérico
  (`inputMode="decimal"`), valores por defecto tomados del último registro.

### 8.3 Facturas

- Alta de gasto/ingreso con categoría, importe, fecha, proveedor/cliente y **foto adjunta**
  (la imagen se guarda como dataURL; **limita el tamaño**: redimensiona a máx. 1280px
  y comprime a JPEG calidad 0.7 antes de guardar, o rechaza archivos >2MB con aviso claro —
  si no, se revienta la cuota de localStorage).
- Listado con filtros por tipo, categoría y rango de fechas; totales por periodo.
- Generador de factura de venta: revisa el `InvoiceModule.tsx` actual (637 líneas), conserva
  lo que funcione, calcula bien **IVA e IRPF** del régimen especial agrario y permite imprimir
  a PDF vía `window.print()` con una hoja de estilos de impresión decente.

### 8.4 Informes

- KPIs en tarjetas: nº de animales activos, altas/bajas del mes, distribución por especie
  y estado sanitario, litros del mes e ingreso estimado, gastos por categoría, balance del periodo.
- Gráficas con `recharts`, con colores de la paleta, etiquetas legibles y **estado vacío**
  cuando no hay datos (no muestres una gráfica vacía y rota).

### 8.5 Ajustes y cuenta

- Editar datos de la explotación y **rehacer la encuesta**.
- Datos de la cuenta: nombre, correo, **cambiar contraseña** (pidiendo la actual).
- **Copia de seguridad: exportar todo a JSON** e **importar** desde ese JSON, con validación
  del archivo y confirmación antes de sobrescribir. Botón bien visible.
- Cerrar sesión. Eliminar cuenta y todos sus datos (doble confirmación).
- Pantalla de privacidad honesta (§4.3).

---

## 9. Accesibilidad y robustez

- Todo `input` con `<label>` asociada (`htmlFor`/`id`). Nada de placeholders como única etiqueta.
- Modales: `role="dialog"`, `aria-modal`, foco atrapado, Escape cierra, foco devuelto al
  elemento que lo abrió, scroll del fondo bloqueado.
- Errores de formulario anunciados con `aria-live="polite"` y asociados con `aria-describedby`.
- Contraste mínimo AA (4.5:1) en todo el texto. Verifica el verde sobre blanco.
- Estados de carga y de error visibles; nunca una pantalla en blanco.
- Un `ErrorBoundary` en la raíz que muestre un mensaje comprensible en vez de pantalla negra.
- Sin errores ni warnings en la consola del navegador (claves de React, props no válidas, etc.).

---

## 10. Criterios de aceptación (esto es lo que se va a revisar)

1. `npm install && npm run build` termina **sin errores ni warnings de TypeScript**.
2. `npm run dev` levanta en **http://localhost:5180** y **jamás toca el 3000**.
3. Tailwind está instalado como dependencia real y las clases utilitarias **se aplican**
   (verificable porque el CSS compilado contiene las reglas).
4. Un usuario nuevo ve: bienvenida → crear cuenta (nombre, correo, contraseña) → encuesta de
   4 pasos → app **vacía** con estados vacíos útiles.
5. Cerrar sesión y volver a entrar con el mismo correo **recupera exactamente sus datos**.
6. Registrar un **segundo usuario** distinto da una explotación vacía e independiente:
   ningún dato del primero es visible.
7. La contraseña **no aparece en claro** en ninguna parte de `localStorage`.
8. Si en la encuesta se elige solo "Carne", **no aparece nada de ordeño** en toda la app.
9. La app se ve correcta y usable a **375px de ancho** y a **1440px**, sin scroll horizontal
   ni solapamientos, con barra lateral en escritorio y barra inferior en móvil.
10. Cero referencias a los datos de demo (vacas ES09100458129x, "La Dehesa Verde", etc.)
    en el código de producción.

---

## 11. Entregable final

Al terminar, escribe `docs/INFORME-CODEX.md` con:

- Resumen de lo implementado, archivo por archivo (nuevos, modificados, eliminados).
- Cómo arrancarlo y cómo probar el flujo completo de registro.
- Decisiones técnicas relevantes que hayas tenido que tomar.
- **Limitaciones conocidas y lo que no hayas llegado a implementar**, dicho claramente.
  Es preferible una limitación declarada a una afirmación falsa de que algo funciona.
