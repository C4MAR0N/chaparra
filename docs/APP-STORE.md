# App Store: plan nativo y ficha de privacidad

Documento preparado el 17 de septiembre de 2026. Chaparra todavía no tiene proyecto iOS; una PWA
embebida sin más cambios tiene un riesgo alto de rechazo por la directriz 4.2.

## El riesgo 4.2, sin rodeos

Apple exige funciones, contenido e interfaz que eleven la aplicación por encima de un sitio web
reempaquetado. El funcionamiento sin cobertura y el OCR local son buenos argumentos, pero en un
`WKWebView` seguirían pareciendo capacidades de la web. Hay que exponer integración visible con iOS
y explicarla al revisor.

No conviene enviar una primera versión solo con Capacitor. Un rechazo temprano no impide volver a
presentarla, pero consume tiempo y deja toda la defensa en una explicación. La directriz no ofrece
una lista mecánica que garantice la aprobación.

## Plan concreto, por orden

Las estimaciones son días de una persona que conozca TypeScript y Swift, e incluyen pruebas en un
iPhone físico pero no los tiempos de espera de Apple.

### 0. Contenedor y base iOS — 1,5 a 2 días

- Crear el proyecto con Capacitor, identificador `es.agrovanza.chaparra`, iPhone como familia de
  destino inicial y `WKWebView` con los archivos compilados dentro del binario.
- Mantener Supabase y la lógica local-first actuales; fijar dominios permitidos a Chaparra,
  Supabase, Open‑Meteo y los recursos meteorológicos necesarios.
- Configurar iconos, pantalla de arranque, zonas seguras, teclado, enlaces de confirmación y
  restauración de sesión.
- Probar alta, acceso, cierre, sincronización, modo avión y recuperación de cobertura.

Esto es infraestructura; por sí solo **no** resuelve 4.2.

### 1. Escáner nativo de justificantes — 2,5 a 3,5 días

Es la función con más relación con el trabajo real del ganadero y debe ir primero.

- API: `VisionKit.VNDocumentCameraViewController`, mediante un complemento Capacitor propio y
  pequeño.
- Pantalla: en **Facturas → Añadir factura**, sustituir la única elección de archivo por una hoja
  nativa con «Escanear documento», «Hacer foto» y «Elegir archivo».
- Flujo: VisionKit detecta bordes, corrige perspectiva y permite varias páginas; el complemento
  devuelve un JPEG o PDF temporal. `prepararAdjunto` mantiene el límite de 2 MB y `lectura.ts`
  reutiliza PDF.js/Tesseract sin subir el documento para leerlo.
- Privacidad: descripción `NSCameraUsageDescription` clara. El temporal nativo se elimina después
  de importarlo; solo se sincroniza si el usuario guarda la factura.
- Pruebas: papel torcido, poca luz, dos páginas, cancelar, superar 2 MB, modo avión y memoria baja.

### 2. Exportar y compartir con iOS — 0,5 a 1 día

- API: `UIActivityViewController` para compartir y `UIDocumentPickerViewController` para guardar.
- Pantalla: los botones actuales «Exportar a Excel», copia JSON y PDF de venta abren la hoja nativa
  de compartir, con nombre de archivo legible y tipo MIME correcto.
- Reutilización: los generadores actuales producen los bytes; el puente nativo solo entrega el
  archivo a iOS.
- Pruebas: Guardar en Archivos, AirDrop, Mail, cancelar y fichero grande.

### 3. Estado de cobertura y sincronización integrado — 1,5 a 2 días

- API: `Network.NWPathMonitor`; no prometer sincronización en segundo plano, porque iOS decide cuándo
  concede tiempo de ejecución.
- Pantalla: al tocar «Al día / Sin conexión», abrir **Estado de sincronización** con hora de la
  última sincronización, número de cambios locales pendientes, red disponible y botón «Sincronizar
  ahora».
- Comportamiento: el puente notifica cambios de red a React; al recuperar cobertura se llama a la
  sincronización existente. La cola y las lápidas siguen siendo las actuales.
- Opcional posterior: registrar `BGAppRefreshTask` solo para intentar una pasada breve; la pantalla
  nunca debe afirmar que se ejecutará a una hora concreta.
- Pruebas: modo avión durante altas, cambios contradictorios en dos dispositivos, cierre forzado y
  reconexión.

### 4. Avisos sanitarios locales — 2 a 3 días

- Modelo: añadir `proximaActuacion` y `avisoId` a un registro sanitario, sincronizados igual que el
  resto.
- API: `UNUserNotificationCenter` con notificaciones locales, sin servidor ni token remoto.
- Pantalla: en la ficha del animal, acción «Programar aviso» con fecha, hora y texto; en Ajustes,
  lista de avisos activos y opción para cancelarlos.
- Al tocar el aviso: abrir directamente la ficha del animal mediante un enlace interno.
- Permiso: pedirlo al programar el primer aviso, no al arrancar.
- Pruebas: permiso denegado, cambio de fecha, baja o borrado del animal, zona horaria y aviso ya
  vencido.

### 5. Bloqueo biométrico opcional — 1 a 1,5 días

- API: `LocalAuthentication.LAContext`; secreto de bloqueo en Keychain.
- Pantalla: interruptor «Pedir Face ID o Touch ID al abrir» en Seguridad y privacidad.
- Alcance: desbloquea la sesión ya guardada; no sustituye la contraseña de Supabase ni sube datos
  biométricos.
- Pruebas: dispositivo sin biometría, fallo y código del dispositivo, cierre de sesión y
  reinstalación.

## Qué versión enviaría

Mínimo defendible: pasos 0 a 3, unas **6 a 8,5 jornadas**. Versión recomendada: añadir avisos
sanitarios, unas **8 a 11,5 jornadas**. El bloqueo biométrico puede esperar a una actualización.

En las notas de revisión se deben señalar expresamente el escáner VisionKit, la hoja nativa de
compartir, la pantalla de sincronización conectada a `NWPathMonitor` y, si se incluye, los avisos
locales. También hay que enseñar esas funciones en las capturas; esconderlas debilita la defensa.

## App Privacy: respuestas

Completar la ficha contra el binario final. Si se añade un SDK, revisar su manifiesto de privacidad
antes de copiar estas respuestas.

### Preguntas generales

| Pregunta de App Store Connect                                                           | Respuesta |
| --------------------------------------------------------------------------------------- | --------- |
| ¿Tú o tus socios terceros recopiláis datos de esta aplicación?                          | **Sí**    |
| ¿Algún dato se usa para rastreo?                                                        | **No**    |
| ¿Se combinan datos con información de terceros para publicidad o medición publicitaria? | **No**    |
| ¿Se muestra publicidad de terceros o del desarrollador?                                 | **No**    |

### Tipos que se deben seleccionar

Todos los datos persistentes de la tabla quedan **vinculados al usuario**, porque se guardan bajo su
UUID de Supabase. Para todos, marcar **App Functionality** como finalidad y **No** en tracking.

| Categoría de Apple | Tipo                 | Vinculado | Qué cubre                                                                  |
| ------------------ | -------------------- | --------: | -------------------------------------------------------------------------- |
| Contact Info       | Name                 |        Sí | Nombre de la cuenta y titular                                              |
| Contact Info       | Email Address        |        Sí | Acceso, confirmación y recuperación                                        |
| Contact Info       | Phone Number         |        Sí | Teléfono opcional en la plantilla de factura                               |
| Contact Info       | Physical Address     |        Sí | Dirección opcional de facturación                                          |
| Financial Info     | Other Financial Info |        Sí | Importes, costes, precios y datos económicos de facturas y producción      |
| Location           | Precise Location     |        Sí | Coordenadas del municipio guardadas en el perfil y usadas para el tiempo   |
| User Content       | Photos or Videos     |        Sí | Fotos de animales y justificantes que el usuario guarda                    |
| User Content       | Other User Content   |        Sí | PDF, explotación, animales, sanidad, producción, facturas y notas          |
| Identifiers        | User ID              |        Sí | UUID de Supabase                                                           |
| Other Data         | Other Data Types     |        Sí | REGA, NIF/CIF y demás datos profesionales que no encajan en otra categoría |

No seleccionar Health: los registros son de animales, no datos de salud humana. Tampoco seleccionar
Usage Data, Diagnostics, Device ID, Browsing History, Search History, Contacts ni Purchases.

### OCR y tiempo

- El OCR que solo lee y descarta un archivo en el dispositivo no es recogida para Apple.
- Si el usuario guarda el justificante, se declara como foto u otro contenido y se sincroniza.
- La petición meteorológica transmite coordenadas. Aunque el proveedor no las conserve tras servir
  la respuesta, Chaparra sí guarda esas coordenadas en el perfil; por prudencia se declaran como
  ubicación precisa vinculada.

### URLs y borrado

- Política: <https://chaparra.agrovanza.es/privacidad.html>
- Borrado: <https://chaparra.agrovanza.es/borrar-cuenta.html>
- Ruta dentro de la aplicación: **Ajustes y cuenta → Eliminar cuenta**.

No enviar la ficha hasta aplicar y probar la migración 002. La cuenta de prueba y las notas del
revisor están descritas en [`FICHA-TIENDAS.md`](./FICHA-TIENDAS.md).

## Fuentes oficiales

- [Directriz 4.2, Minimum Functionality](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality)
- [Detalles de privacidad de App Store](https://developer.apple.com/app-store/app-privacy-details/)
- [Gestión de App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [Especificaciones de capturas](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
