# Checklist de publicación en Google Play y App Store

Auditoría de Chaparra frente a los requisitos de ambas tiendas.
Fecha: 17 de septiembre de 2026. App en producción: https://c4mar0n.github.io/chaparra/

---

## 0. Lo primero, y es importante

**Chaparra es una aplicación web. Ninguna de las dos tiendas acepta una URL.** No existe
forma de «subir la web» a Google Play ni a la App Store: hay que empaquetarla dentro de una
aplicación nativa que la contenga.

| Tienda | Cómo se empaqueta |
|---|---|
| Google Play | **TWA** (Trusted Web Activity) con Bubblewrap o PWABuilder, o bien **Capacitor** |
| App Store | **Capacitor** sobre WKWebView. En iOS no existe equivalente a TWA |

Y hay un riesgo que conviene conocer antes de gastar dinero y tiempo:

> **Apple, directriz 4.2 (Minimum Functionality).** Es el motivo de rechazo más frecuente para
> aplicaciones nacidas de una web. Apple rechaza los envoltorios que se limitan a cargar un sitio
> responsive sin aportar navegación nativa, comportamiento sin conexión, notificaciones ni
> integración con el dispositivo. Para pasar la revisión, Chaparra necesita aportar valor nativo
> real: cámara para las facturas, funcionamiento sin cobertura, notificaciones de tareas
> sanitarias, biometría para entrar, o compartir nativo.

Google Play es bastante más permisivo con las TWA, siempre que la aplicación sea una PWA
instalable en condiciones. **Lo sensato es empezar por Android y dejar iOS para después.**

---

## 1. Estado verificado hoy

Comprobado ejecutando la aplicación, no por lectura del código.

| Requisito | Estado | Detalle |
|---|---|---|
| Servida por HTTPS | ✅ | GitHub Pages con `https_enforced` |
| Contexto seguro (`crypto.subtle`) | ✅ | Verificado en la URL pública; el registro funciona |
| Diseño adaptable a móvil | ✅ | 375 px y 1440 px, sin scroll horizontal |
| Áreas táctiles ≥ 44 px | ✅ | Ningún botón por debajo del mínimo |
| Sin errores en consola | ✅ | Consola limpia en todo el recorrido |
| Etiquetas de formulario | ✅ | Todo `input` con su `<label>` |
| `viewport` y `theme-color` | ✅ | Presentes en `index.html` |
| `apple-mobile-web-app-capable` | ✅ | Presente |
| Borrado de cuenta **dentro** de la app | ✅ | `DeleteAccountModal`, con doble confirmación |
| Compilación reproducible en CI | ✅ | Formato, pruebas y build en cada push |
| Web App Manifest | ✅ | `public/manifest.webmanifest`, con rutas relativas |
| Service worker / sin conexión | ✅ | `public/sw.js`, escrito a mano y sin dependencias |
| Iconos PNG 192 y 512, incluido maskable | ✅ | Más `apple-touch-icon` de 180 |
| Política de privacidad en URL pública | ✅ | [/privacidad.html](https://c4mar0n.github.io/chaparra/privacidad.html) |
| URL web de solicitud de borrado de cuenta | ✅ | [/borrar-cuenta.html](https://c4mar0n.github.io/chaparra/borrar-cuenta.html) |
| Contraste de color AA | ⚠️ | No medido con herramienta; pendiente de auditoría formal |
| Funcionalidad nativa para Apple 4.2 | ❌ | Sigue siendo el riesgo principal en iOS |

---

## 2. Lo que falta, por bloques

### 2.1 PWA instalable — **hecho**

Chaparra ya se instala desde el navegador y funciona sin cobertura:

- `public/manifest.webmanifest` con `display: standalone`, colores de marca y rutas relativas,
  para que funcione igual en local que bajo `/chaparra/`.
- Iconos PNG de 192 y 512, variantes `maskable` con la marca dentro de la zona segura, y
  `apple-touch-icon` de 180. Generados a partir de `public/icon.svg`, así que se pueden rehacer.
- `public/sw.js`: red primero para la navegación, caché primero con revalidación en segundo plano
  para estáticos y tipografías. Sin Workbox ni dependencias añadidas.

> El pliego original dejó PWA fuera de alcance de forma deliberada. Ese acuerdo se tomó antes de
> plantear la publicación en tiendas; al pasar a serlo, dejó de ser un extra.

### 2.2 Empaquetado

**Android (TWA):** generar el proyecto con Bubblewrap o PWABuilder, publicar
`.well-known/assetlinks.json` en el dominio para verificar la propiedad —así la app abre sin
barra de navegador— y firmar el App Bundle. Debe apuntar a **API 36 (Android 16)**: desde el
31 de agosto de 2026 es obligatorio para aplicaciones nuevas y actualizaciones.

**iOS (Capacitor):** requiere un Mac con Xcode, o un servicio de compilación en la nube.
Añadir funcionalidad nativa antes de enviar, por lo de la directriz 4.2.

### 2.3 Fichas de tienda

Icono de 512×512, gráfico destacado de 1024×500 (Play), capturas por tamaño de dispositivo,
descripción corta y larga, categoría, clasificación por edades, y datos de contacto del
desarrollador.

### 2.4 Privacidad y datos

Aquí Chaparra parte con ventaja, y conviene aprovecharlo: **los datos no salen del dispositivo**,
así que tanto el formulario de seguridad de datos de Play como las etiquetas de privacidad de
Apple se pueden rellenar como «no se recopilan datos». Es un argumento comercial además de
un trámite.

**Páginas publicadas — hecho:**

- [Política de privacidad](https://c4mar0n.github.io/chaparra/privacidad.html)
- [Borrado de cuenta](https://c4mar0n.github.io/chaparra/borrar-cuenta.html) — Play lo exige a
  toda app que permita crear cuenta, además del borrado dentro de la aplicación. En aplicación
  plena desde el 15 de abril de 2024.

Ambas declaran el contacto `agro@agrovanza.es` y describen con precisión las dos únicas
conexiones a terceros que existen: **Google Fonts** (la tipografía se descarga de Google, que ve
la IP) y **GitHub Pages** (el alojamiento registra la IP, como cualquier servidor web). Ninguna
recibe datos de la explotación.

> **Mejora pendiente que merece la pena:** alojar la tipografía en el propio dominio elimina la
> única conexión a Google y permite afirmar sin matices que no sale nada del dispositivo. Además
> la app cargaría antes y sin conexión se vería con su tipografía real. Es trabajo de poco más de
> un rato y refuerza justo el argumento de venta de Chaparra.

### 2.5 Cuentas, costes y plazos

| Concepto | Coste | Nota |
|---|---|---|
| Google Play Console | 25 USD, pago único | |
| Apple Developer Program | 99 USD al año | Recurrente |
| Mac con Xcode | — | Imprescindible para compilar iOS |

**El plazo oculto de Google:** las cuentas **personales** de Play creadas a partir del
13 de noviembre de 2023 deben superar una prueba cerrada con **12 probadores durante 14 días
seguidos** antes de poder solicitar acceso a producción. Google comprueba además que esos
probadores usaran la app de verdad, y cumplir el mínimo no garantiza la aprobación. Las cuentas
de **organización** están exentas. Si la ganadería tiene sociedad, abrir la cuenta como empresa
ahorra semanas.

---

## 3. Camino recomendado

1. ~~**PWA primero.**~~ **Hecho.** Chaparra se instala desde el navegador —icono en la pantalla
   de inicio, pantalla completa, funcionando sin cobertura— sin tienda, sin cuotas y sin
   revisión. Para empezar con un grupo de ganaderos, esto puede ser suficiente: se comparte un
   enlace y listo.
2. ~~**Política de privacidad y página de borrado de cuenta.**~~ **Hecho.**
3. **Probarlo con ganaderos reales antes de pagar nada.** Instalando la PWA se recoge el mismo
   aprendizaje que con una app de tienda, sin cuotas ni tiempos de revisión. Si el producto no
   encaja, es mejor descubrirlo aquí.
4. **Android vía TWA**, cuando el producto esté asentado. El empaquetado es cuestión de horas.
   Contar con el plazo de los 12 probadores si la cuenta de Play es personal.
5. **iOS al final**, y solo si compensa: 99 USD al año, un Mac y el riesgo real de la
   directriz 4.2. Antes de enviar hay que añadir funcionalidad nativa de verdad —cámara para las
   facturas, notificaciones de tareas sanitarias, biometría—, no basta con empaquetar la web.

---

## Fuentes

- [Meet Google Play's target API level requirement — Android Developers](https://developer.android.com/google/play/requirements/target-sdk)
- [Target API level requirements for Google Play apps — Play Console Help](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Understanding Google Play's app account deletion requirements — Play Console Help](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [App testing requirements for new personal developer accounts — Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [App Store Review Guidelines: Will Your Webview App Be Rejected? — MobiLoud](https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper)
- [Rejected on Guideline 4.2.2 — Apple Developer Forums](https://developer.apple.com/forums/thread/82714)
