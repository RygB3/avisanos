# Prototipo «Avísanos qué faltó»

> **Propuesta conceptual no oficial · Ejercicio académico Uninorte.**
> Licitación Académica 007 · Proceso Administrativo · Universidad del Norte.
> No es un producto de Tiendas Ara ni está autorizado o patrocinado por Ara. No usa su logo, tipografía ni colores.

Aplicación web funcional que sirve a las tres decisiones de la propuesta:

| Decisión | En el prototipo |
|---|---|
| 1. «Avísanos qué faltó» | El cliente reporta por QR el producto que no encontró. El panel agrupa los reportes, el personal cambia su estado y publica la respuesta del top 5 del mes. |
| 2. «Saluda, orienta, agradece» | El cliente califica la atención de 1 a 5 al salir y dice si consultó al anfitrión. |
| 3. «Pasillo libre» | El anfitrión registra la ronda de pasillos en hora pico. El equipo cronometra el recorrido de los clientes. |

## Cómo abrirlo

1. Descarga o copia la carpeta `03_Prototipo` completa.
2. Haz **doble clic en `index.html`**. Abre en Chrome, Edge o Firefox. No hay que instalar nada, no hace falta internet y no se crean cuentas.
3. Para ver el panel, entra a «Acceso del personal» y escribe el PIN **`2026`**. Es un acceso de demostración, no es seguridad real. Se cambia en Ajustes.

Para la demo con datos, entra a **Ajustes → Datos → Cargar datos de demostración**. Esos datos llevan el rótulo «DATO DE DEMOSTRACIÓN (ficticio)», se pueden apagar con el interruptor del tablero y se borran con un botón.

### Rutas

| Ruta | Pantalla | Quién |
|---|---|---|
| `#inicio` | Inicio con aviso «Este código no sirve para pagar» | Cliente |
| `#reportar` | No encontré un producto | Cliente |
| `#calificar` | Califica la atención | Cliente |
| `#top5` | Lo que más nos piden | Cliente |
| `#panel` | Tablero con 9 KPI, gráficos, bandeja y top 5 | Personal |
| `#auditoria` | Auditoría de góndola (20 productos) | Personal |
| `#ronda` | Ronda de pasillos | Personal |
| `#recorrido` | Cronómetro de recorrido | Personal |
| `#prueba` | Modo prueba de usuario (P1 a P6) | Personal |
| `#ajustes` | Configuración, QR y datos | Personal |

El QR indica la tienda y el punto: `index.html?t=T1&p=lacteos`. Sin parámetros se usa la tienda T1 y el punto «general».

## Publicar en GitHub Pages (paso a paso)

1. Crea una cuenta en [github.com](https://github.com) si el equipo no tiene una.
2. Pulsa **New repository**. Nombre sugerido: `avisanos`. Visibilidad: **Public**. Pulsa **Create repository**.
3. En el repositorio pulsa **Add file → Upload files**. Arrastra el **contenido** de `03_Prototipo`: `index.html` y las carpetas `css`, `js`, `vendor`, `backend` y `tests`. Pulsa **Commit changes**.
4. Entra a **Settings → Pages**. En «Build and deployment» elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`. Pulsa **Save**.
5. Espera uno o dos minutos. GitHub muestra el enlace, por ejemplo `https://usuario.github.io/avisanos/`.
6. Abre el enlace y entra a **Ajustes → Generador de QR**. Pega el enlace en «URL base» y pulsa **Generar hoja de QR**. Luego pulsa **Imprimir hoja (carta)**.
7. Escanea un QR impreso con un celular y confirma que abre la tienda y el punto correctos.

En Netlify: entra a [app.netlify.com/drop](https://app.netlify.com/drop) y arrastra la carpeta `03_Prototipo`.

## Modo compartido (opcional)

En modo local cada navegador guarda sus datos. Dos pestañas del mismo equipo se sincronizan en vivo. Para que los celulares y el panel compartan datos entre equipos, usa una hoja de Google con Apps Script. Sigue la guía de [`backend/README.md`](backend/README.md). La URL del script se configura en **Ajustes → Acceso y almacenamiento**.

## KPI y fórmulas

Las fórmulas están en `js/kpi.js` como funciones puras. Cada tarjeta del tablero muestra el valor, la fórmula, el cálculo, los registros usados y el estado frente a una **meta supuesta**, editable en Ajustes. Si un denominador es 0, la tarjeta muestra «Sin datos», no 0 %.

| # | KPI | Fórmula | Decisión | Meta supuesta |
|---|---|---|---|---|
| 1 | Tasa de quiebre en góndola | productos clave ausentes ÷ productos clave auditados × 100 (promedio de las auditorías del periodo) | 1 | ≤ 5 % |
| 2 | Reportes atendidos a tiempo | reportes resueltos en 48 h o menos ÷ reportes recibidos × 100 | 1 | ≥ 90 % |
| 3 | Pedidos respondidos | productos del top 5 mensual con respuesta publicada ÷ 5 × 100 | 1 | ≥ 80 % |
| 4 | Índice de satisfacción con el trato | calificaciones de 4 y 5 ÷ total de calificaciones × 100 | 2 | ≥ 80 % |
| 5 | Tasa de quejas | calificaciones de 1 y 2 ÷ total de calificaciones × 100 | 2 | ≤ 10 % |
| 6 | Consultas resueltas | «encontró el producto o un sustituto» = sí ÷ «consultó al anfitrión» = sí × 100 | 2 | ≥ 70 % |
| 7 | Pasillos despejados | rondas en hora pico sin cajas ni obstáculos ÷ rondas en hora pico × 100 | 3 | ≥ 90 % |
| 8 | Tiempo de recorrido en hora pico | promedio de minutos de los recorridos en hora pico | 3 | ≤ 8 min |
| 9 | Bloqueos por hora | total de bloqueos registrados ÷ número de rondas en hora pico | 3 | ≤ 1 |

Decisiones de interpretación, para que el equipo las valide:

- **KPI 1:** primero se calcula la tasa de cada auditoría y luego se promedia. La tarjeta también muestra los totales de ausentes y auditados.
- **KPI 3:** el denominador es siempre 5. Si en el mes no hay reportes, no hay top 5 y la tarjeta muestra «Sin datos». El top 5 se calcula con los reportes del mes en curso, según el filtro de tienda.
- **KPI 7:** una ronda cuenta como despejada solo si ningún pasillo tiene cajas en el piso ni otro obstáculo.
- **KPI 9:** se suman los bloqueos de las rondas hechas en hora pico. Las rondas fuera de hora pico no entran ni en el numerador ni en el denominador.

Pruebas de las fórmulas, sin dependencias:

```
node tests/kpi.test.js
```

## Privacidad y restricciones del pliego

- No se piden nombres, teléfonos, correos ni cédulas. Los campos de texto libre tienen un máximo de 140 caracteres y el aviso «No escribas datos personales». El campo «Otro producto» tiene un máximo de 40.
- No depende de inventario, cajas ni APIs de Ara. Todos los datos los generan el cliente o el equipo.
- La leyenda «Propuesta conceptual no oficial · Ejercicio académico Uninorte» está fija en el pie de todas las pantallas y en cada QR impreso.
- El QR no es un medio de pago. El inicio y cada QR impreso dicen «Este código no sirve para pagar».
- Los datos de demostración se exportan en archivos aparte con el prefijo `DEMO_ficticio_`. Si el interruptor «Incluir datos de demostración» está apagado, no se exportan.

## Archivos

```
03_Prototipo/
├── index.html
├── css/estilos.css
├── js/kpi.js        fórmulas (funciones puras)
├── js/store.js      utilidades y almacenamiento (local y compartido)
├── js/vistas.js     pantallas del cliente y del personal
├── js/demo.js       generador de datos de demostración
├── js/qr.js         QR en SVG y hoja imprimible
├── js/app.js        rutas, cabeceras y exportación
├── vendor/qrcode.js qrcode-generator 2.0.4 (Kazuhiko Arase, licencia MIT)
├── backend/         apps-script.gs y su guía
├── tests/kpi.test.js
├── GUION_DEMO.md
└── CAMBIOS.md
```

## No incluido

- **Seguridad real de acceso.** El PIN es solo de demostración.
- **Configuración compartida.** El PIN, las metas y la URL del script se guardan en cada navegador, no en la hoja.
- **Mediciones de campo reales.** El prototipo no trae datos reales. Los resultados del piloto se obtienen al usarlo en tienda.
