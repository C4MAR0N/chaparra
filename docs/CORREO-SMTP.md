# Correo de la aplicación · configurar SMTP propio

Los correos de activación de cuenta los envía Supabase. Con su proveedor por
defecto hay dos problemas para un ganadero:

- **2 correos por hora.** Si tres personas se registran seguidas, dos se quedan
  sin recibirlo y no entienden por qué.
- **Texto en inglés y remitente desconocido.** Candidato claro a la carpeta de
  spam. Y en los proyectos gratuitos creados después del 3 de junio de 2026 —el
  nuestro— las plantillas **no se pueden editar** mientras se use ese proveedor.

Las dos cosas se arreglan conectando un SMTP propio.

## Paso 1 · Conectar Hostinger

_Authentication → Emails → SMTP Settings → Enable custom SMTP_

| Campo        | Valor                                                       |
| ------------ | ----------------------------------------------------------- |
| Host         | `smtp.hostinger.com`                                        |
| Port         | `465`                                                       |
| Username     | la dirección completa del buzón, p. ej. `agro@agrovanza.es` |
| Password     | la del buzón                                                |
| Sender email | la misma dirección                                          |
| Sender name  | `Chaparra`                                                  |

Si el puerto 465 diera problemas, la alternativa es el `587` con STARTTLS.

> **Importante:** no actives el SMTP sin rellenar la contraseña. Guardar la
> configuración a medias deja la aplicación **sin poder enviar ningún correo**,
> que es peor que el límite de dos por hora.

Límites de Hostinger: de 100 correos al día en los planes básicos a 3.000 en
Business Premium. De sobra para empezar. Si algún día hay cientos de altas,
conviene un servicio de correo transaccional (Resend, Postmark) en vez de un
buzón de persona.

## Paso 2 · Traducir las plantillas

En cuanto el SMTP esté activo se desbloquea _Authentication → Emails →
Templates_. `{{ .ConfirmationURL }}` es el enlace que genera Supabase; debe ir
tal cual.

### Confirm sign up

**Asunto:** `Confirma tu correo · Chaparra`

```html
<h2>Bienvenido a Chaparra</h2>
<p>Para activar tu cuenta y empezar con tu cuaderno de campo, confirma tu correo:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar mi correo</a></p>
<p>Si no has sido tú, puedes ignorar este mensaje.</p>
```

### Reset password

**Asunto:** `Cambiar tu contraseña · Chaparra`

```html
<h2>Cambiar tu contraseña</h2>
<p>Has pedido cambiar la contraseña de tu cuenta de Chaparra. Pulsa aquí para elegir una nueva:</p>
<p><a href="{{ .ConfirmationURL }}">Cambiar mi contraseña</a></p>
<p>Si no has sido tú, ignora este mensaje: tu contraseña no cambiará.</p>
```

### Change email address

**Asunto:** `Confirma tu nuevo correo · Chaparra`

```html
<h2>Confirma tu nuevo correo</h2>
<p>Has cambiado el correo de tu cuenta de Chaparra. Confírmalo para seguir entrando con él:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar el nuevo correo</a></p>
```

## Paso 3 · Que no caiga en spam

Enviar desde `agrovanza.es` solo ayuda si el dominio autoriza a Hostinger a
hacerlo. En el DNS del dominio deben existir los registros **SPF** y **DKIM** que
indica Hostinger. Sin ellos, el correo sale pero muchos proveedores lo marcan
como sospechoso, que es justo lo que se quería evitar.

## Estado actual

- Site URL: `https://chaparra.agrovanza.es/` ✅
- URL de redirección permitida: la misma ✅
- Confirmación de correo al registrarse: activada ✅
- SMTP propio: **pendiente**
- Plantillas en español: bloqueadas hasta configurar el SMTP
