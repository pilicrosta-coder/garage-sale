# Piluki Garage Sale

Sitio web estático con catálogo público por enlace, reservas por orden de llegada y panel privado de administración. **No está publicado ni conectado hasta completar estos pasos.**

## Publicar (aprox. 20–40 minutos)

1. Crear un proyecto gratuito en https://supabase.com/ y abrir **SQL Editor**.
2. Abrir `database.sql` y ejecutarlo **una sola vez**. La administración queda solo para pilicrosta@gmail.com.
3. En Supabase, **Project Settings → API**, copiar la Project URL y la **anon / publishable key**. Nunca copiar la `service_role` o secret key al sitio.
4. Abrir `config.js` y completar la URL, clave pública y el mismo email de administración.
5. En **Authentication → URL Configuration**, configurar la URL final de tu sitio como **Site URL** y agregarla a **Redirect URLs**. Mantener habilitado el login por email (OTP / magic link).
6. Subir **el contenido de esta carpeta** a Netlify Drop (https://app.netlify.com/drop), o a otro hosting estático con HTTPS. Netlify te dará un link para compartir.
7. En Supabase **Database → Publications / Realtime**, habilitar Realtime para la tabla `products` si querés que los estados cambien automáticamente sin recargar la página. Incluso sin Realtime, la base bloquea reservas duplicadas.
8. Abrir el sitio y probar una reserva. El nombre y el teléfono quedan en Supabase, en Table Editor → reservations. El stock se mueve en Table Editor → products.

## Comportamiento

- El catálogo tiene dos secciones: `muebles` y `chiquitaje`.
- Cada artículo guarda hasta 3 unidades en `stock_available`, `stock_reserved` y `stock_sold`. Reservar baja una unidad disponible y suma una reservada. Si dos personas piden la última unidad a la vez, solo una gana.
- En el panel, cada reserva se marca vendida o se libera por separado. Eso mueve una unidad de reservados a vendidos, o la devuelve a disponibles.
- Las reservas guardan nombre y teléfono en una tabla privada. El público solo ve productos y estados, nunca teléfonos.
- Administrar requiere inicio de sesión con el email definido en `database.sql`.
- Al liberar un producto se elimina su reserva anterior; si necesitás historial permanente, habrá que modificar este comportamiento.
- El sitio es **no indexado solo si configurás tu hosting para ello**. Un link no listado no equivale a control de acceso: cualquiera que lo reciba puede reenviarlo. Para restringir el acceso a invitados identificados haría falta autenticación para compradores.
- Los precios y descripciones iniciales son editables en Supabase (Table Editor → products). Son precios de publicación orientativos.
- El botón reserva **no cobra dinero** ni formaliza una compraventa.

## Fotos

Se incluyen las cuatro imágenes originales aportadas. Podés reemplazar las imágenes en `images/` y cambiar la columna `image` de cada producto.

## Seguridad y privacidad

No compartir la clave `service_role`. El sistema almacena teléfonos y nombres; informá a tus invitados que se usarán exclusivamente para coordinar la venta. Las reglas RLS protegen la lectura de reservas y la función de reserva evita que dos compradores bloqueen el mismo producto. Para prevenir reservas falsas o abusivas en un sitio abierto, se recomienda añadir CAPTCHA y limitación de solicitudes antes de difundirlo ampliamente.
