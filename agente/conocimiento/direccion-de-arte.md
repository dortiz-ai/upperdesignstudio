# Upper: dirección de arte para propuestas nuevas

Este documento complementa `marca.md`. Úsalo cuando te pidan **propuestas nuevas** (no una pieza de plantilla), cuando adaptes una referencia o cuando armes piezas de campaña. Las reglas de abajo salen de correcciones reales del equipo de marca: no las cambies sin que lo pidan.

## 1. Requerimiento para nuevas propuestas

Cuando alguien pida "nuevas propuestas", "una idea distinta", "algo nuevo para la campaña" o similar, **antes de diseñar comparte este requerimiento** y pide lo que falte en un solo mensaje. El formato es obligatorio; lo demás tiene opción por defecto.

> Para armar las propuestas necesito:
> 1. **Formato y tamaño** (obligatorio): feed 4:5 (1080×1350), historia 9:16 (1080×1920), cuadrado (1080×1080), 3:4 (1080×1440, hoy solo para piezas de campaña), banner de la app (1059×465) u otro.
> 2. **Objetivo y mensaje:** qué quieres lograr (vender, informar, lanzar, recordar) y la idea principal en una frase.
> 3. **Datos reales:** precios, porcentajes, fechas, códigos o tiendas. No invento ninguno.
> 4. **Recursos:** PNG sin fondo de productos o personas, fotos, logos de aliados. Si no hay, uso ilustraciones oficiales y el patrón.
> 5. **Referencias** (opcional): 1 a 3 imágenes de lo que te gusta, y qué te gusta de cada una.
> 6. **Campaña o fecha** (opcional): Black Friday, Cyber Monday, Prime Day, Navidad, Día de la Madre… para mantener el estilo de esa campaña.
> 7. **País:** Ecuador (por defecto) o Colombia.
>
> Te entrego **3 direcciones**: una segura (plantilla de la plataforma), una de campaña (más expresiva, con título 3D, cards o composición de productos) y una exploratoria. Si respondes **dale** a lo que no sea el formato, sigo con las opciones por defecto.

Con las respuestas:
- Las 3 direcciones se entregan en el mismo formato, cada una con 1 o 2 líneas de por qué funciona.
- Después de que el equipo elija, se itera solo sobre la elegida.

## 2. Principios visuales

- **Una idea por pieza.** Titular corto y protagonista; el resto acompaña.
- **Bloques compactos y centrados**, con aire alrededor. Nada amontonado ni flotando suelto.
- **Productos reales protagonistas** cuando hay recursos: PNG grandes, sin fondo, ordenados con criterio (por descuento, por categoría).
- **Fondo de marca:** azul oscuro o claro Upper con el patrón de líneas **difuminado** hacia el color de fondo. Nunca parchado ni cortado.
- **Coherencia de campaña:** todas las piezas de una misma campaña repiten título, fondo, cards y tamaños.

## 3. Reglas aprobadas por el equipo

### Título 3D de campaña (herramienta: `scripts/titulo3d.py`)
- Noland Bold en mayúsculas. Relleno verde `#CDF5A3`; las líneas secundarias, en claro `#F1FAE2`.
- **El mismo grosor de contorno y de relieve en todas las líneas.** Nunca uno distinto según el tamaño de la letra.
- **Separación como la referencia** (`docs/referencias/titulos/`): cada línea arranca donde termina el relieve de la anterior, sin hueco blanco ni letras encimadas, y queda delante de ese relieve.
- Las líneas principales tienen el mismo tamaño de letra. Las secundarias (por ejemplo, "EL VERDADERO" y "ES EN") son más angostas, cerca del 80 % del ancho.
- Bloque centrado e inclinado unos 4°. La bandera de EE. UU. es la 3D de la referencia (`assets/titulos/bandera-usa-3d.png`), a la altura de su línea, sin tapar la línea de arriba.
- Sobre fondo azul el relieve azul se pierde: monta el título sobre el patrón difuminado o sobre fondo claro.

### Historias y posts de ofertas con cards (plantilla de las piezas de Black Friday)
- 4 cards en 2×2, con los productos **ordenados de mayor a menor descuento**. Si dos empatan, se respeta el orden en que los dio el equipo.
- Cada card lleva la foto, la etiqueta "XX% OFF", el nombre en Rethink Sans y el precio en Noland verde.
- **Precios con dos decimales:** $30.00, no $30.
- **Nombres en una línea.** Si no entran, acórtalos sin perder la marca y el modelo, y avisa.
- Las fotos con fondo blanco se recortan. Si la foto trae textos o marcas de terceros encima (banners de Amazon, cajas de otro producto), pide una foto limpia.
- **Categoría** (Belleza, Ropa, Tecnología, Zapatos, Niños) bajo el título, en Rethink Sans extra negrita, color claro, **derecha (sin inclinar)**.
- **Versión 3:4 (1080×1440):** sin el título grande. Solo categoría + cards, centrado en vertical, y el patrón difuminado hacia el azul en la parte de arriba.
- **Historias 9:16:** deja libre la zona baja para el sticker de enlace de Instagram.

### Banners de la app
Sigue `docs/referencias/banners/`: texto a la izquierda centrado en vertical, CTA justo bajo el titular, visual a la derecha (ilustración en tarjeta o PNG grande con arco verde), sin logo.

### CTA
Tres estilos permitidos (`cta_estilo`): resaltado recto (por defecto), botón verde redondeado o subrayado. Nunca flechas ni elementos que no están en el copy.

### Productos que no se ofrecen
No uses palabras como "pistola" o "arma" aunque sea un juguete: Upper no trae armas (incluidas paintball y airsoft). Usa "lanzador", que es como la marca del juguete lo llama.

## 4. Revisión visual antes de entregar

Mira cada imagen antes de enviarla y corrige si falla algo:
1. ¿El contorno y el relieve tienen el mismo grosor en todas las líneas?
2. ¿Las líneas del título están a la distancia de la referencia: ni amontonadas ni separadas?
3. ¿El bloque de texto está centrado y con aire alrededor?
4. ¿El fondo se ve continuo, sin parches ni cortes del patrón?
5. ¿Ningún elemento tapa a otro: bandera, etiquetas, productos, título?
6. ¿Los productos están en el orden pedido y con sus datos correctos?
7. ¿Hay contraste suficiente entre texto y fondo?
8. ¿El formato y el tamaño son los que se pidieron?

## 5. Lo que el equipo aún debe entregar para afinar las propuestas

Si alguien pide algo que dependa de esto, dilo y propón la mejor alternativa con lo que hay:
- **Referencias aprobadas con su porqué:** 10 a 20 por tipo (post, historia, banner, carrusel, campaña), más 3 a 5 ejemplos de lo que no se quiere. Van en `docs/referencias/<tipo>/` con una nota por imagen.
- **Patrón de fondo completo** en vector o PNG en alta. Hoy solo existe una versión que se desvanece hacia arriba (`assets/campana/patron-*.png`).
- **Elementos gráficos sueltos:** destellos, sellos de precio, stickers, íconos propios.
- **Confirmación de color:** si `#F1FAE2` entra a la paleta oficial o solo se usa en títulos 3D.
- **Cuándo se usa el título 3D:** solo en campañas o también en el día a día.
- **Calendario de campañas** con el estilo de cada una.
- **Proceso de aprobación:** quién elige entre las 3 direcciones y qué hace que una propuesta se rechace.
