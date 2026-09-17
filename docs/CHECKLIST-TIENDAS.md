# Checklist de publicación en Google Play y App Store

Auditoría ejecutada el 17 de septiembre de 2026 contra
<https://chaparra.agrovanza.es>. Los detalles de cada ejecución están en
[`INFORME-TIENDAS.md`](./INFORME-TIENDAS.md).

## Cómo leer los estados

- ✅ **Comprobado:** la ejecución indicada produjo el resultado esperado.
- ⚠️ **Parcial o pendiente:** solo se pudo comprobar una parte o falta una actuación externa.
- ❌ **Bloqueo:** el resultado actual impide enviar o publicar.
- ⬜ **No comprobado:** no había navegador, credenciales, dispositivo o consola de tienda.

Ningún estado verde se basa únicamente en leer el código.

Las filas de navegador las completó la revisión posterior con el navegador integrado; el resto
proceden de la auditoría automatizada, que no disponía de uno.

## Estado público y funcional

| Requisito                           | Estado | Ejecución y resultado                                                                                                                                                                       |
| ----------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dominio de producción por HTTPS     |     ✅ | `fetch('https://chaparra.agrovanza.es/')`: `200`, URL final sin redirección y `text/html`                                                                                                   |
| Manifiesto PWA servido              |     ✅ | `/manifest.webmanifest`: `200 application/manifest+json`; JSON válido, `display=standalone`, `start_url=./`, `scope=./`                                                                     |
| Iconos declarados                   |     ✅ | Descarga y lectura del encabezado PNG: 192×192, 512×512, maskable 192×192 y 512×512; `apple-touch-icon` 180×180                                                                             |
| Recursos de arranque                |     ✅ | Todos los JS, CSS, fuente, icono y manifiesto enlazados desde la portada devolvieron `200`                                                                                                  |
| Service worker                      |     ✅ | Comprobado en el navegador sobre el dominio público: registrado y `activated`, con 14 recursos precargados (1 en `chaparra-shell-v2` y 13 en `chaparra-assets-v2`)                          |
| Diseño móvil sin desbordamiento     |     ✅ | Navegador a 375×812 recorriendo las cuatro pestañas: desbordamiento horizontal de 0 px en todas                                                                                             |
| Áreas táctiles de 44 px             |     ✅ | Medidas en las cuatro pestañas: ningún control por debajo del mínimo salvo «Saltar al contenido», que está oculto hasta recibir el foco                                                     |
| Consola sin errores                 |     ✅ | Recorrido completo de las cuatro pestañas sin un solo mensaje de error                                                                                                                       |
| Formularios accesibles              |     ✅ | Ningún `input`, `select` ni `textarea` sin etiqueta asociada en las cuatro pestañas                                                                                                          |
| Supabase Auth accesible             |     ✅ | `/auth/v1/health`: `200`, GoTrue `v2.197.0`                                                                                                                                                 |
| RLS ante una consulta anónima       |     ⚠️ | La petición REST con la clave pública devolvió `200 []`, sin filtrar filas. **No comprobado** el aislamiento entre dos usuarios autenticados porque no se manejaron cuentas ni credenciales |
| Registro, acceso y multidispositivo |     ⬜ | **No comprobado:** requería una cuenta de prueba y el encargo prohíbe crear cuentas o manejar credenciales                                                                                  |
| Sincronización y lápidas            |     ✅ | `npm test`: 62/62; incluye subida, bajada, conflictos por fecha, lápidas y reconstrucción                                                                                                   |
| Apertura real sin cobertura         |     ⬜ | **No comprobado:** requiere navegador o dispositivo con una sesión preparada                                                                                                                |
| Borrado completo de cuenta          |     ❌ | La migración `002_borrar_cuenta.sql` todavía no está aplicada. No se puede afirmar que funcione en producción hasta aplicarla y probar una cuenta desechable                                |
| OCR propio disponible               |     ⚠️ | `worker.min.js` y `spa.traineddata.gz` públicos devuelven `200`; 14 pruebas de interpretación pasan. **No comprobado** el recorrido completo cámara/PDF→OCR en navegador                    |
| Límite de adjunto de 2 MB           |     ✅ | Ejecución directa: PDF de 2.097.152 bytes aceptado; 2.097.153 bytes rechazado con el mensaje previsto                                                                                       |
| Exportación Excel                   |     ✅ | 5 pruebas de ZIP/XLSX pasan y la prueba de manada acotada arrastra solo sus datos                                                                                                           |
| Open-Meteo, cinco días              |     ✅ | La API devolvió `200`, cinco fechas y cinco valores de precipitación                                                                                                                        |
| AEMET público                       |     ❌ | `/tiempo/indice.json` devuelve `404`; hoy la app cae a Open-Meteo. Falta configurar la clave y ejecutar el flujo de AEMET                                                                   |
| Política de privacidad pública      |     ✅ | `/privacidad.html`: `200 text/html`                                                                                                                                                         |
| Página pública de borrado           |     ⚠️ | La URL pública devuelve `200`, pero la versión desplegada contiene dos frases antiguas sobre datos solo locales. La fuente quedó corregida; falta desplegarla                               |
| CI de `master`                      |     ✅ | API de GitHub: último flujo «Desplegar en GitHub Pages», `completed/success`, actualizado `2026-09-17T14:58:41Z`                                                                            |
| Formato                             |     ✅ | `npm run format:check`: todos los ficheros comprobados usan Prettier                                                                                                                        |
| Pruebas                             |     ✅ | `npm test`: 62 pruebas, 62 correctas, 0 fallos                                                                                                                                              |
| Build                               |     ✅ | `npm run build`: Vite generó `dist/` correctamente; salida completa en el informe                                                                                                           |

## Google Play

| Requisito                      | Estado | Detalle                                                                                                                                                                                                               |
| ------------------------------ | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dominio TWA                    |     ✅ | `host`, `startUrl`, `webManifestUrl`, `fullScopeUrl` e iconos usan `chaparra.agrovanza.es`                                                                                                                            |
| Paquete                        |     ✅ | `es.agrovanza.chaparra` coincide entre TWA y Digital Asset Links                                                                                                                                                      |
| API objetivo 36                |     ⚠️ | El manifiesto deja `targetSdkVersion: 36` como control del proyecto. Bubblewrap no consume ese campo: hay que generar con Bubblewrap 1.25.0 o posterior y verificar `targetSdkVersion 36` en el Gradle/AAB resultante |
| Accesos directos               |     ✅ | «Rebaño» y «Facturas» apuntan a enlaces que la aplicación interpreta después del acceso                                                                                                                               |
| Digital Asset Links en `dist/` |     ✅ | La compilación copia `dist/.well-known/assetlinks.json`; la vista previa lo sirve como `application/json`                                                                                                             |
| Huella de firma real           |     ❌ | El JSON contiene un marcador deliberadamente inválido. Sustituirlo por la SHA‑256 de **Play App Signing** antes de desplegar                                                                                          |
| Digital Asset Links público    |     ❌ | La URL pública todavía devuelve `404`; depende de desplegar y de completar la huella                                                                                                                                  |
| AAB firmado y verificación TWA |     ⬜ | **No comprobado:** no hay proyecto generado, huella, keystore de publicación ni dispositivo                                                                                                                           |
| Data Safety                    |     ⚠️ | Respuestas preparadas en [`GOOGLE-PLAY.md`](./GOOGLE-PLAY.md); no enviar hasta aplicar la migración 002                                                                                                               |
| Clasificación IARC             |     ⚠️ | Respuestas preparadas; la clasificación final solo la emite el cuestionario de Play Console                                                                                                                           |
| Cuenta del revisor             |     ❌ | Debe crearla el dueño con datos ficticios y entregarla en «Acceso a la aplicación»                                                                                                                                    |
| Ficha y capturas               |     ⚠️ | Textos y guion listos en [`FICHA-TIENDAS.md`](./FICHA-TIENDAS.md); las imágenes no se han creado por indicación expresa                                                                                               |

## App Store

| Requisito                                       | Estado | Detalle                                                                                          |
| ----------------------------------------------- | -----: | ------------------------------------------------------------------------------------------------ |
| Aplicación iOS nativa                           |     ❌ | No existe todavía un proyecto Xcode/Capacitor que se pueda archivar                              |
| Funcionalidad por encima de una web empaquetada |     ❌ | Riesgo directo de la directriz 4.2. Plan concreto y estimado en [`APP-STORE.md`](./APP-STORE.md) |
| Ficha App Privacy                               |     ⚠️ | Respuestas preparadas, pero deben revisarse contra el binario iOS final y sus SDK                |
| Borrado dentro de la aplicación                 |     ❌ | La interfaz existe, pero la función del servidor no hasta aplicar la migración 002               |
| Cuenta del revisor                              |     ❌ | Debe crearla el dueño; la cuenta real con 235 vacas no se debe entregar                          |
| Ficha y capturas                                |     ⚠️ | Textos y tamaños listos; no se han creado capturas                                               |
| Archive/TestFlight/App Review                   |     ⬜ | **No comprobado:** requieren Mac, Xcode, cuenta de Apple y un binario que aún no existe          |

## Orden de cierre

1. Aplicar `supabase/migraciones/002_borrar_cuenta.sql` y probar el borrado con una cuenta desechable.
2. Crear la aplicación en Play Console, activar Play App Signing y copiar su SHA‑256 en
   `public/.well-known/assetlinks.json`.
3. Desplegar y comprobar que Digital Asset Links responde `200 application/json` sin redirección.
4. Generar con Bubblewrap 1.25.0 o posterior, revisar el Gradle y el AAB con API objetivo 36, e
   instalarlo desde una pista interna para confirmar que no aparece la barra del navegador.
5. Crear la cuenta sintética del revisor y las capturas descritas.
6. Enviar Android primero.
7. Implementar y probar el plan nativo de iOS antes de abrir una revisión de App Store.

## Referencias oficiales

- [API objetivo de Google Play](https://developer.android.com/google/play/requirements/target-sdk)
- [Digital Asset Links para TWA](https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs)
- [Firma de aplicaciones de Play](https://support.google.com/googleplay/android-developer/answer/9842756)
- [Seguridad de los datos](https://support.google.com/googleplay/android-developer/answer/10787469?hl=es)
- [Borrado de cuentas](https://support.google.com/googleplay/android-developer/answer/13327111?hl=es)
- [Clasificación de contenido](https://support.google.com/googleplay/android-developer/answer/9898843?hl=es)
- [Directrices de revisión de Apple](https://developer.apple.com/app-store/review/guidelines/)
- [Privacidad en App Store](https://developer.apple.com/app-store/app-privacy-details/)
