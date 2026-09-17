# Empaquetado Android (TWA)

Genera una app Android que envuelve la PWA de Chaparra mediante una
**Trusted Web Activity**: un Chrome sin barra de navegador, a pantalla completa,
indistinguible de una app nativa cuando la verificación de dominio es correcta.

Configuración ya preparada en [`twa-manifest.json`](twa-manifest.json):

| Campo | Valor |
|---|---|
| Identificador de paquete | `es.agrovanza.chaparra` |
| Origen | `c4mar0n.github.io` |
| URL de inicio | `/chaparra/` |
| Target SDK | 36 — el mínimo que exige Play desde el 31/08/2026 |
| Min SDK | 23 (Android 6) |
| Iconos | los de la PWA, incluida la variante *maskable* |

---

## Antes de empezar: dos pasos son tuyos

Hay dos cosas que esta guía **no** hace por ti, a propósito:

1. **Crear el keystore.** Es la clave que firma la app. Si la pierdes, no podrás
   volver a publicar una actualización en Google Play **nunca más**: Play rechaza
   cualquier subida firmada con otra clave. Debes elegir tú su contraseña,
   guardarla en tu gestor de contraseñas y hacer copia del archivo `.keystore`
   fuera de este ordenador.
2. **Aceptar las licencias del SDK de Android.** Es un acuerdo legal con Google y
   te corresponde aceptarlo a ti.

El archivo `.keystore` y su contraseña están excluidos del repositorio en
`.gitignore`. No los subas jamás.

---

## Paso 1 · Preparar el entorno

Bubblewrap ya está instalado (`npm i -g @bubblewrap/cli`). La primera vez pide
descargar el JDK 17 y el SDK de Android, unos 1,5 GB. **Ejecútalo en una terminal
tuya**, no desde aquí, porque necesita respuestas interactivas.

```bash
bubblewrap doctor
```

Responde `Y` a instalar el JDK y el SDK, y acepta las licencias cuando las muestre.

## Paso 2 · Generar el proyecto

Desde la carpeta `android/`, para que use el `twa-manifest.json` ya preparado:

```bash
cd android && bubblewrap init --manifest=https://c4mar0n.github.io/chaparra/manifest.webmanifest
```

Te preguntará los datos: acepta los que propone, porque coinciden con el
`twa-manifest.json`. Cuando llegue al keystore, elige **crear uno nuevo** y define
tu contraseña. Anota el alias: `chaparra`.

## Paso 3 · Compilar el APK

```bash
cd android && bubblewrap build
```

Pedirá la contraseña del keystore. Al terminar genera dos archivos:

- `app-release-signed.apk` — para instalar directamente en tu móvil y probar
- `app-release-bundle.aab` — el formato que exige Google Play para publicar

## Paso 4 · Verificación de dominio (assetlinks)

Sin este paso la app abre **con barra de navegador** y no parece nativa.

Al compilar, Bubblewrap genera `assetlinks.json` con la huella SHA-256 de tu
clave. Ese archivo debe servirse en la **raíz del dominio**:

```
https://c4mar0n.github.io/.well-known/assetlinks.json
```

Ojo: **no** vale bajo `/chaparra/`. La verificación es por origen, y el repo
`chaparra` solo sirve su subcarpeta. Hace falta un repositorio de sitio de usuario
llamado `C4MAR0N.github.io`, que todavía no existe.

Para obtener la huella una vez creado el keystore:

```bash
keytool -list -v -keystore android/android.keystore -alias chaparra
```

Pásame esa huella SHA-256 y creo el repositorio con el `assetlinks.json` correcto.

---

## Instalar el APK en el móvil

1. Sube el APK a algún sitio al que llegue el teléfono. Lo más cómodo, usando el
   repositorio que ya existe:
   ```bash
   gh release create v1.0.0-prueba android/app-release-signed.apk --title "Chaparra 1.0.0 (prueba)" --notes "Build de prueba"
   ```
2. Abre la URL de la release en el navegador del móvil y descarga el APK.
3. Android pedirá permiso para **instalar apps de fuentes desconocidas** para ese
   navegador. Acéptalo.
4. Instala y abre.

Si la verificación de dominio del paso 4 aún no está hecha, la app funcionará pero
mostrará una barra con la dirección durante unos segundos.

---

## Antes de subirla a Google Play

- Cuenta de Play Console: 25 USD, pago único.
- Si la cuenta es **personal** y se creó después del 13/11/2023: prueba cerrada con
  **12 probadores durante 14 días seguidos** antes de poder pedir acceso a
  producción. Las cuentas de **organización** están exentas.
- Ficha de tienda: icono 512×512, gráfico destacado 1024×500, capturas, descripción,
  categoría y clasificación por edades.
- Formulario de seguridad de datos: Chaparra puede declarar **«no se recopilan
  datos»**, porque no sale nada del dispositivo.
- Enlace de política de privacidad:
  https://c4mar0n.github.io/chaparra/privacidad.html
- Enlace de borrado de cuenta (obligatorio al permitir crear cuenta):
  https://c4mar0n.github.io/chaparra/borrar-cuenta.html

Detalle completo en [`../docs/CHECKLIST-TIENDAS.md`](../docs/CHECKLIST-TIENDAS.md).
