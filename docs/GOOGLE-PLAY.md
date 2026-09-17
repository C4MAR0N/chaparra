# Google Play: Data Safety, IARC y acceso del revisor

Respuestas preparadas el 17 de septiembre de 2026. Reflejan la aplicación que hay en este árbol,
incluida la sincronización con Supabase. No se deben copiar a Play Console hasta cumplir los dos
bloqueos siguientes.

## Antes de enviar el formulario

1. Aplicar `supabase/migraciones/002_borrar_cuenta.sql` y probar el borrado completo con una cuenta
   desechable. Hasta entonces, la respuesta sobre borrado desde la aplicación no es cierta en
   producción.
2. Sustituir la huella pendiente de `public/.well-known/assetlinks.json`, desplegar y comprobar la
   URL pública.

## Seguridad de los datos (Data Safety)

### Preguntas generales

| Pregunta de Play Console                                                    | Respuesta que se debe marcar                         | Motivo verificable                                                                                       |
| --------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| ¿La aplicación recoge o comparte alguno de los tipos de datos obligatorios? | **Sí**                                               | La cuenta y los registros se transmiten a Supabase; las coordenadas del municipio se usan para el tiempo |
| ¿Todos los datos recogidos se cifran en tránsito?                           | **Sí**                                               | La web, Supabase y Open‑Meteo usan HTTPS/TLS                                                             |
| ¿Ofreces una forma de solicitar que se borren los datos?                    | **Sí, después de aplicar la migración 002**          | «Ajustes y cuenta → Eliminar cuenta» y <https://chaparra.agrovanza.es/borrar-cuenta.html>                |
| ¿La aplicación permite crear una cuenta?                                    | **Sí**                                               | Alta mediante Supabase Auth                                                                              |
| ¿Se puede borrar la cuenta desde la aplicación?                             | **Sí, después de aplicar y probar la migración 002** | `DeleteAccountModal` llama a `borrar_mi_cuenta`                                                          |
| ¿Hay un recurso web para solicitar el borrado?                              | **Sí**                                               | <https://chaparra.agrovanza.es/borrar-cuenta.html>                                                       |
| ¿Se pueden borrar datos concretos sin borrar la cuenta?                     | **Sí**                                               | El usuario puede eliminar animales, facturas y otros registros; la lápida propaga el borrado             |
| ¿Se ha realizado una revisión de seguridad independiente apta para Play?    | **No**                                               | No se ha aportado una auditoría independiente reconocida por Google                                      |

### Datos que se deben declarar

«Compartido» se marca solo donde se indica. Supabase y el proveedor de correo actúan como
prestadores del servicio por cuenta de Chaparra; no reciben datos para fines propios. La ubicación
sí se declara como compartida de forma conservadora porque se envía a un proveedor meteorológico.

| Categoría / tipo de Play                           | Recogido | Compartido | Obligatorio | Finalidad que se marca                             | Qué representa en Chaparra                                             |
| -------------------------------------------------- | -------: | ---------: | ----------: | -------------------------------------------------- | ---------------------------------------------------------------------- |
| Información personal / Nombre                      |       Sí |         No |          Sí | Gestión de cuentas; funcionalidad de la aplicación | Nombre de la cuenta y titular                                          |
| Información personal / Dirección de correo         |       Sí |         No |          Sí | Gestión de cuentas                                 | Acceso, confirmación y recuperación                                    |
| Información personal / Dirección                   |       Sí |         No |          No | Funcionalidad de la aplicación                     | Dirección que el usuario añade a su plantilla de factura               |
| Información personal / Número de teléfono          |       Sí |         No |          No | Funcionalidad de la aplicación                     | Teléfono opcional de la plantilla de factura                           |
| Información personal / Otros datos                 |       Sí |         No |          No | Funcionalidad de la aplicación                     | NIF/CIF, REGA, provincia y datos de la explotación                     |
| Ubicación / Ubicación aproximada                   |       Sí |         Sí |          No | Funcionalidad de la aplicación                     | Coordenadas del municipio que el usuario elige de una lista            |
| Información financiera / Otros datos financieros   |       Sí |         No |          No | Funcionalidad de la aplicación                     | Importes de facturas, costes, precios y producción económica           |
| Fotos y vídeos / Fotos                             |       Sí |         No |          No | Funcionalidad de la aplicación                     | Fotos de animales o justificantes que el usuario decide guardar        |
| Archivos y documentos / Archivos y documentos      |       Sí |         No |          No | Funcionalidad de la aplicación                     | PDF de justificantes que el usuario decide guardar                     |
| Contenido generado por el usuario / Otro contenido |       Sí |         No |          Sí | Funcionalidad de la aplicación                     | Explotación, animales, crotales, sanidad, producción, facturas y notas |
| Identificadores / ID de usuario                    |       Sí |         No |          Sí | Gestión de cuentas; funcionalidad de la aplicación | UUID de Supabase que separa las explotaciones                          |

> **Ubicación aproximada, no precisa.** La aplicación no pide el permiso de ubicación ni llama
> nunca a la API de geolocalización del navegador: no hay una sola referencia a `geolocation` en
> todo el código. Las coordenadas son las del municipio que el ganadero elige escribiendo su
> nombre en una lista, es decir, el centro del término municipal. Declarar «precisa» obligaría a
> una divulgación destacada por un permiso que la aplicación no usa.

Para todos los tipos recogidos:

- **Tratamiento temporal:** no, salvo la petición meteorológica. Los datos de la cuenta y de la
  explotación se conservan para sincronizar dispositivos. En la ubicación, marcar tratamiento
  temporal solo si el formulario permite distinguir el envío meteorológico de la copia guardada en
  el perfil; como el perfil conserva las coordenadas, la respuesta global prudente es **no**.
- **El usuario puede elegir:** solo en las filas que dicen «No» en «Obligatorio».
- **Publicidad, marketing, analítica, personalización y prevención del fraude:** no marcar.

### Lo que no se declara como recogido

- El texto que extrae el lector de facturas: PDF.js, `TextDetector` y Tesseract trabajan dentro del
  dispositivo.
- Una foto o PDF abierto únicamente para leerlo y descartado sin guardar.
- Interacciones, diagnósticos, ID publicitario e historial de navegación: no hay SDK de analítica,
  publicidad ni seguimiento.

La distinción importante es esta: **leer** un justificante no recoge nada; si el usuario guarda ese
justificante dentro de una factura, el adjunto pasa a formar parte de la explotación y se sincroniza.

### Trazabilidad en el código

- Cuenta, nombre y correo: `src/services/acceso.ts` crea y abre la sesión de Supabase;
  `src/services/auth.ts` conserva la ficha local.
- UUID y cliente europeo: `src/services/nube.ts` configura Supabase; `src/services/sincronizar.ts`
  consulta y escribe los registros del usuario.
- Campos de explotación, animales, sanidad, producción, facturas, contacto, importes, fotos y PDF:
  `src/types/index.ts`.
- Qué cruza el servidor: `src/services/sincronizacion.ts` aplana los seis tipos y
  `src/services/sincronizar.ts` los envía a `registros`.
- Ubicación y proveedores meteorológicos: `src/services/tiempo.ts`.
- Lectura local: `src/services/lectura.ts` usa `TextDetector`, PDF.js y Tesseract con rutas del mismo
  origen.
- Ausencia de seguimiento: `package.json` no contiene SDK de analítica o publicidad y la búsqueda
  ejecutada en `src/` no encontró referencias a Analytics, Firebase, Sentry, Mixpanel, Ads, IDFA ni
  identificador publicitario.

### Tiempo: qué se envía realmente

El perfil conserva municipio, latitud y longitud y los sincroniza con Supabase. En ejecución, el
navegador envía esas coordenadas a Open‑Meteo. AEMET no recibe una petición por usuario: una tarea
de GitHub descarga previamente archivos para los municipios configurados en el repositorio y la app
los lee desde el dominio propio. A fecha de la auditoría ese índice de AEMET devuelve `404`, por lo
que solo funciona Open‑Meteo.

## Clasificación de contenido IARC

Seleccionar **Aplicación** y la categoría de utilidad/productividad. Estas son las respuestas para
el contenido que ofrece Chaparra; el texto libre que cada ganadero guarda de forma privada no
convierte la aplicación en una plataforma de contenido público.

| Bloque del cuestionario                                     | Respuesta                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Violencia, sangre o lesiones gráficas                       | **No**                                                                               |
| Violencia contra personas o animales                        | **No**; «muerto» y «sacrificado» son estados de texto, no representaciones violentas |
| Miedo o terror                                              | **No**                                                                               |
| Sexualidad, desnudez o contenido sugerente                  | **No**                                                                               |
| Lenguaje malsonante o humor vulgar                          | **No**                                                                               |
| Alcohol, tabaco o drogas ilegales                           | **No**                                                                               |
| Apuestas, juegos de azar simulados o premios en metálico    | **No**                                                                               |
| Compras digitales o compras dentro de la aplicación         | **No**                                                                               |
| Publicidad                                                  | **No**                                                                               |
| Contenido generado por usuarios visible para otros usuarios | **No**                                                                               |
| Comunicación entre usuarios                                 | **No**                                                                               |
| Compartir la ubicación con otros usuarios                   | **No**                                                                               |
| Acceso web sin restricciones                                | **No**                                                                               |
| Noticias, educación o contenido médico regulado             | **No**; registra sanidad animal, no ofrece diagnóstico ni consejo médico humano      |

Resultado esperado: apta para todos los públicos, normalmente **IARC 3 / PEGI 3**. Es una previsión,
no una clasificación emitida: la autoridad asignará la definitiva al enviar el cuestionario.

## Cuenta de prueba para el revisor

No entregar la cuenta real de 235 vacas. El dueño debe crear una cuenta exclusiva, confirmada y sin
doble factor, CAPTCHA ni datos personales reales. Debe quedar activa durante toda la revisión.

Prepararla con datos ficticios pero suficientes para abrir cada pantalla:

- una explotación llamada «Dehesa La Encina», con municipio y precios configurados;
- 10–15 animales ficticios, dos ubicaciones y estados sanitarios variados;
- registros de ordeño o pesadas para que haya gráficos;
- tres facturas ficticias y un justificante creado para la prueba, nunca una factura real;
- sincronización terminada, de modo que el estado muestre «Al día».

En Play Console, dentro de **Contenido de la aplicación → Acceso a la aplicación**, proporcionar:

- correo y contraseña de esa cuenta;
- indicar que no hay segundo factor;
- recorrido: iniciar sesión → Rebaño → Producción → Facturas → Informes;
- explicar que el OCR se ejecuta localmente y que la primera lectura de una foto puede preparar el
  motor incluido en el mismo dominio;
- ruta del borrado: «Ajustes y cuenta → Eliminar cuenta», advirtiendo que no borren la cuenta de
  prueba hasta terminar el resto de la revisión.

La cuenta es necesaria porque, sin iniciar sesión y completar una explotación, el revisor solo ve la
pantalla de acceso y no puede validar la funcionalidad anunciada.

## Fuentes oficiales

- [Formulario Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=es)
- [Requisito de borrado de cuenta](https://support.google.com/googleplay/android-developer/answer/13327111?hl=es)
- [Clasificación de contenido](https://support.google.com/googleplay/android-developer/answer/9898843?hl=es)
- [Acceso del revisor](https://support.google.com/googleplay/android-developer/answer/15191715?hl=es)
