# Empaquetado Android con TWA

Chaparra se publica en Android como Trusted Web Activity. La asociación entre el paquete y
<https://chaparra.agrovanza.es> permite abrirla sin barra del navegador.

## Configuración preparada

| Campo                    | Valor                   |
| ------------------------ | ----------------------- |
| Paquete                  | `es.agrovanza.chaparra` |
| Origen                   | `chaparra.agrovanza.es` |
| Inicio y ámbito          | `/`                     |
| API mínima               | 23                      |
| API objetivo             | 36                      |
| Notificaciones delegadas | Desactivadas            |
| Accesos directos         | Rebaño y Facturas       |

El campo `targetSdkVersion` de `twa-manifest.json` documenta y permite auditar la versión esperada,
pero Bubblewrap no lo consume. La API real procede de su plantilla Gradle. Hay que usar
**Bubblewrap 1.25.0 o posterior**, cuya plantilla compila y apunta a API 36, y revisar el Gradle/AAB
resultante.

## Claves: no confundirlas

- **Clave de subida:** la que guarda el dueño en `android.keystore` y usa para subir el AAB. No se
  versiona ni se comparte.
- **Clave de firma de la aplicación:** la conserva Google cuando se activa Play App Signing y firma
  lo que reciben los usuarios. Su SHA‑256 es la que debe estar en
  `public/.well-known/assetlinks.json`.

Perder la clave de subida complica las actualizaciones. Guardar archivo, alias y contraseñas en un
gestor de secretos y en una copia externa. Este repositorio excluye el keystore.

## Generar sin sobrescribir esta guía

Instalar o actualizar la herramienta de forma consciente en el equipo del dueño:

```bash
npm install --global @bubblewrap/cli@1.25.0
bubblewrap doctor
```

Desde `android/`, generar los archivos derivados en una subcarpeta. `update` recrea el destino, por
eso no se ejecuta sobre la propia carpeta que contiene esta documentación:

```bash
bubblewrap update --skipVersionUpgrade --manifest ./twa-manifest.json --directory ./proyecto
bubblewrap build --manifest ./twa-manifest.json --directory ./proyecto
```

Bubblewrap puede pedir el JDK, el SDK de Android, la aceptación de licencias y las contraseñas del
keystore. Esas decisiones corresponden al dueño. La salida esperada incluye:

- `app-release-signed.apk`, para la comprobación directa;
- `app-release-bundle.aab`, para Play Console.

Antes de subir, abrir `proyecto/app/build.gradle` y confirmar `compileSdkVersion 36` y
`targetSdkVersion 36`. Play Console vuelve a verificar la API objetivo al recibir el AAB.

## Digital Asset Links

El archivo está en `public/.well-known/assetlinks.json` y la compilación web lo copia al mismo lugar
de `dist/`. El marcador de huella es deliberadamente inválido para que no parezca una asociación
terminada.

Después de subir el primer AAB y activar Play App Signing:

1. Abrir **Play Console → Integridad de la aplicación → Firma de aplicaciones de Play**.
2. Copiar la huella **SHA‑256 del certificado de firma de la aplicación**, no la del certificado de
   subida.
3. Sustituir `REEMPLAZAR_POR_LA_HUELLA_SHA256_DE_PLAY_APP_SIGNING` conservando las parejas
   hexadecimales mayúsculas separadas por `:`.
4. Desplegar la web y comprobar:

```bash
curl -i https://chaparra.agrovanza.es/.well-known/assetlinks.json
```

Debe devolver `200`, `Content-Type: application/json`, sin redirección, con el paquete y la huella
correctos. Después instalar desde una pista interna de Play y confirmar en un dispositivo que no
aparece la barra de Chrome. Una instalación firmada localmente necesita además la huella del
keystore local para validar; no sustituye la prueba de la versión distribuida por Play.

## Antes de enviar

- Aplicar y probar `supabase/migraciones/002_borrar_cuenta.sql`.
- Completar Data Safety e IARC según [`../docs/GOOGLE-PLAY.md`](../docs/GOOGLE-PLAY.md).
- Preparar la cuenta ficticia del revisor y las imágenes de
  [`../docs/FICHA-TIENDAS.md`](../docs/FICHA-TIENDAS.md).
- Confirmar que la política y la página de borrado públicas contienen la versión corregida.
- Instalar el AAB desde Play, recorrer la aplicación y probar modo avión/recuperación de red.

No se puede declarar «no se recopilan datos»: la cuenta y la explotación se sincronizan con
Supabase. El OCR sí permanece en el dispositivo mientras lee el justificante.

## Referencias

- [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap/tree/main/packages/cli)
- [API objetivo de Google Play](https://developer.android.com/google/play/requirements/target-sdk)
- [Firma de aplicaciones de Play](https://support.google.com/googleplay/android-developer/answer/9842756)
- [Digital Asset Links para TWA](https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs)
