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

## Tamaños y cómo se generan

Las imágenes **no se hacen a mano**: salen de un guion que conduce un Chrome sin interfaz, con la
explotación inventada de `scripts/capturas-datos.mjs`.

```bash
npm run capturas
```

Deja en `capturas/` las seis capturas de teléfono, las seis de tableta y el gráfico destacado. Hay
que volver a lanzarlo cada vez que cambie la interfaz.

### Capturas

| Apartado de Play | Píxeles | Proporción |
| ---------------- | ------- | ---------- |
| Teléfono         | 1080×1920 | 9:16 |
| Tableta          | 1920×1080 | 16:9 |

> **Ojo con la proporción.** Play exige que el lado largo no pase del **doble** del corto. Un
> encuadre de móvil moderno (1320×2868, 2,17×) queda fuera de norma y lo rechaza, aunque el tamaño
> en píxeles sea correcto. Por eso el teléfono va a 9:16 y no al formato alargado de hoy.

### Gráfico destacado

**1024×500**, JPEG sin canal alfa, en `capturas/google-play/grafico-destacado.jpg`. Lo dibuja
`scripts/grafico-destacado.mjs` con la tipografía y los colores de la aplicación. La mitad derecha
se deja despejada a propósito: Play superpone ahí el icono y el título en algunas superficies.

### Estado de sincronización en las capturas

La explotación de demostración vive solo en el navegador, así que la cabecera dice «En este
navegador» en vez de «Al día». Para que salga «Al día», entra con la cuenta ficticia del revisor y
vuelve a lanzar `npm run capturas`.

## Fuentes oficiales

- [Recursos de vista previa de Google Play](https://support.google.com/googleplay/android-developer/answer/9866151?hl=es)
