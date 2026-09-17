# Textos y capturas para las tiendas

Contenido preparado el 17 de septiembre de 2026. No incluye imágenes: se han dejado expresamente
para que las haga el dueño después.

## Textos en español

### Título — 27/30 caracteres

> Chaparra · Gestión ganadera

### Descripción corta de Google Play — 72/80 caracteres

> Ganado, sanidad, producción y facturas, incluso cuando no hay cobertura.

### Descripción completa — menos de 4.000 caracteres

> Chaparra es un cuaderno de campo para llevar la explotación desde el móvil o el ordenador.
>
> Guarda los crotales y las fichas del ganado, consulta el historial sanitario y separa los animales
> por manadas o ubicaciones. Apunta ordeños, pesadas, costes y bajas sin depender de papeles sueltos.
>
> Con Chaparra puedes:
>
> • Tener el rebaño y sus datos principales en una sola lista.  
> • Registrar tratamientos, estados sanitarios, partos, pesos y producción.  
> • Guardar facturas de compra y venta con una foto o un PDF.  
> • Rellenar importe, fecha, proveedor y categoría a partir de un justificante. La lectura se hace en
> el propio dispositivo.  
> • Consultar cinco días de previsión y los litros de lluvia previstos para el municipio de la
> explotación.  
> • Ver informes de la explotación y exportar los datos a Excel.  
> • Exportar una manada concreta cuando no necesitas llevarte todo el censo.
>
> En el campo no siempre hay cobertura. Por eso Chaparra guarda los cambios en el dispositivo y los
> sincroniza con tu cuenta cuando vuelve la conexión. Puedes continuar trabajando mientras tanto.
>
> Tu cuenta permite abrir la misma explotación en varios dispositivos. Los datos viajan cifrados en
> tránsito y se alojan en un servidor europeo. No hay publicidad, analítica ni identificadores de
> seguimiento.
>
> Desde Ajustes puedes descargar una copia, exportar la explotación y borrar la cuenta con sus datos.

### Palabras clave de App Store — menos de 100 caracteres

> ganadería,ganado,vacas,crotales,sanidad,ordeño,producción,facturas,cuaderno,campo

No repetir «Chaparra» ni «gestión», que ya están en el título.

## Notas para el revisor

Sustituir los marcadores antes de enviar; no guardar credenciales reales en este repositorio.

> Chaparra requiere iniciar sesión porque la explotación se sincroniza entre dispositivos.
>
> Cuenta de revisión: [CORREO DE LA CUENTA DE PRUEBA]  
> Contraseña: [CONTRASEÑA DE LA CUENTA DE PRUEBA]  
> No utiliza doble factor ni requiere suscripción.
>
> La cuenta contiene exclusivamente datos ficticios. Después de entrar, las cuatro secciones están
> en la navegación principal: Rebaño, Producción, Facturas e Informes.
>
> Para probar la lectura local: Facturas → Añadir factura → Rellenar desde el justificante. El PDF o
> la foto se procesa dentro del dispositivo y no se envía a un servicio de OCR. El adjunto solo se
> sincroniza si se guarda la factura.
>
> Para probar el modo sin conexión, abra primero la cuenta con red, active el modo avión, añada o
> edite un animal y recupere la conexión. El indicador pasa de «Sin conexión» a «Al día» después de
> sincronizar.
>
> El borrado está en Ajustes y cuenta → Eliminar cuenta. No borre la cuenta de revisión hasta haber
> comprobado las demás funciones.
>
> Política de privacidad: https://chaparra.agrovanza.es/privacidad.html  
> Borrado de cuenta: https://chaparra.agrovanza.es/borrar-cuenta.html

Para la versión iOS, añadir al principio, cuando estén implementadas:

> Integraciones nativas de iOS: escáner de documentos con VisionKit, compartir/guardar con la hoja
> del sistema, estado de red mediante NWPathMonitor y avisos sanitarios locales.

## Datos que deben aparecer en las capturas

Usar siempre la cuenta ficticia del revisor, nunca la explotación real de 235 vacas.

- Explotación: **Dehesa La Encina**.
- Titular: **Ganadería de Prueba**; sin NIF, REGA, dirección, teléfono ni correo reales.
- Municipio: uno reconocible pero no el de la explotación real.
- 12 animales ficticios: crotales claramente inventados pero con formato verosímil, dos manadas,
  hembras y machos, y estados «Sano», «En tratamiento» y «Vacunado».
- Varios ordeños o pesadas repartidos por meses para que los gráficos no estén vacíos.
- Tres facturas ficticias: pienso, veterinario y combustible, con importes redondos y proveedores
  como «Proveedor de ejemplo».
- Un justificante diseñado para la demostración, sin logotipos, CIF, IBAN, firmas ni datos de una
  empresa real.
- Sincronización terminada y estado «Al día», salvo la captura dedicada al modo sin cobertura.

No mostrar la pantalla de acceso, contraseñas, correos, avisos del navegador, consola, datos reales
ni un mensaje de error. Las capturas deben ser de la interfaz, sin marco de teléfono ni texto
promocional añadido.

## Secuencia exacta de pantallas

Hacer seis capturas y mantener este orden en ambas tiendas:

1. **Rebaño:** cabecera «Dehesa La Encina», estado «Al día», resumen y lista con varios crotales.
2. **Ficha de animal:** un animal ficticio con raza, edad, manada e historial sanitario visible.
3. **Producción:** gráfico con varios meses y tarjetas de totales; nada vacío.
4. **Facturas:** lista con compra y venta, categorías e importes ficticios.
5. **Lectura de justificante:** formulario ya rellenado con importe, fecha, proveedor y categoría;
   en iOS, sustituirla por el escáner VisionKit cuando exista.
6. **Informes:** reparto por ubicación y evolución; evitar gráficos con una sola barra.

Si solo se suben cuatro a Google Play, usar 1, 2, 4 y 6. Aun así, cuatro en cada tipo de dispositivo
son lo recomendable para optar a las superficies de promoción.

## Tamaños de Google Play

### Teléfono

- Preparar **6 PNG de 24 bits, sin alfa, de 1080×1920 px**, orientación vertical 9:16.
- En el navegador: viewport CSS de **360×640** con factor de dispositivo **3**.
- Google acepta entre 2 y 8 por tipo de dispositivo; cada lado debe estar entre 320 y 3840 px y el
  lado largo no puede superar dos veces el corto.

### Tabletas, si el AAB las admite

La TWA no debe anunciar compatibilidad con tabletas sin probar el diseño. Si se mantienen como
dispositivos compatibles:

- preparar al menos **4 capturas de 1920×1080 px**, orientación horizontal 16:9, para el apartado
  de 7 pulgadas;
- repetir las 4 para el apartado de 10 pulgadas;
- en el navegador: viewport CSS de **960×540** y factor **2**.

Google admite de 1080 a 7680 px para pantallas grandes. No reutilizar una captura de teléfono
estirada: debe mostrar la navegación lateral real de Chaparra.

Además de las capturas, Play exige un gráfico destacado **1024×500 px**, JPEG o PNG de 24 bits sin
alfa. No se ha creado porque el encargo prohíbe preparar imágenes.

## Tamaños de App Store

Para iPhone se puede entregar un único juego de 1 a 10 capturas del tamaño mayor y dejar que App
Store Connect escale las demás:

- **6 capturas verticales de 1320×2868 px** para pantalla de 6,9 pulgadas;
- en el navegador: viewport CSS de **440×956** y factor **3**;
- PNG o JPEG sin transparencia.

Si el binario admite iPad, es obligatorio otro juego:

- **6 capturas verticales de 2064×2752 px** para iPad de 13 pulgadas;
- en el navegador: viewport CSS de **1032×1376** y factor **2**.

La primera versión recomendada en el plan limita el destino a iPhone. Si se habilita iPad, hay que
probarlo y entregar sus imágenes; no basta con ocultar el apartado.

Importante: el navegador sirve para las pantallas compartidas del `WKWebView`, pero no puede generar
honestamente el escáner VisionKit, la hoja de compartir ni los avisos nativos. Cuando esas funciones
existan, sus capturas finales deben salir del simulador o del dispositivo con el binario enviado a
Apple. Inventarlas en el navegador expondría la ficha a rechazo por no coincidir con la aplicación.

## Fuentes oficiales

- [Recursos de vista previa de Google Play](https://support.google.com/googleplay/android-developer/answer/9866151?hl=es)
- [Capturas de App Store](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
