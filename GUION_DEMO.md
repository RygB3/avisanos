# Guion de demostración · 3 minutos

> Propuesta conceptual no oficial · Ejercicio académico Uninorte

## Antes de entrar al comité (5 minutos antes)

1. Abre `index.html` en el computador que se proyecta.
2. Entra a «Acceso del personal» con el PIN `2026` y luego a **Ajustes → Cargar datos de demostración**.
3. Deja el navegador en **dos pestañas lado a lado**:
   - izquierda: `index.html?t=T1&p=lacteos` (vista del cliente). Si un integrante usa su celular con el enlace publicado y el modo compartido, esta pestaña sobra;
   - derecha: `index.html#panel` (tablero).
4. Revisa que el interruptor «Incluir datos de demostración» esté encendido y que se vea la franja amarilla de datos ficticios.

## Guion

| Tiempo | Quién | Acción | Qué decir |
|---|---|---|---|
| 0:00 | Integrante A | Abre el QR en el celular o en la pestaña del cliente. Señala el aviso rojo. | «El cliente escanea el QR de la góndola. No pide datos personales y el código no sirve para pagar.» |
| 0:20 | A | Pulsa «No encontré un producto», escribe «acei», elige «Aceite 1 L» y pulsa **Enviar**. | «Reportar toma menos de 20 segundos. Le confirmamos que lo revisamos en 48 horas y le sugerimos pedir un sustituto.» |
| 0:40 | Integrante B | En el panel muestra el reporte nuevo arriba de la bandeja, sin recargar. | «El reporte llega al tablero en vivo.» |
| 1:00 | B | Cambia el estado del reporte a **resuelto**. Señala la tarjeta KPI 2 y una fila roja. | «El KPI 2 se recalcula. En rojo están los reportes con más de 48 horas sin resolver.» |
| 1:25 | B | En «Top 5 del mes» escribe una respuesta para el primer producto y pulsa **Publicar**. | «Cada mes respondemos los 5 productos más pedidos. El KPI 3 sube.» |
| 1:45 | A | En la vista del cliente abre «Lo que más nos piden». | «El cliente ve la respuesta: cuándo vuelve o por qué no vuelve.» |
| 2:00 | A | Vuelve al inicio, pulsa «Califica la atención», elige **2 · Mala**, marca «fila larga» y envía. | «Al salir, el cliente califica la atención.» |
| 2:15 | B | Señala la tarjeta KPI 5 (tasa de quejas). | «La tasa de quejas sube con esa calificación. Cada tarjeta muestra su fórmula y sus registros.» |
| 2:30 | B | Abre **Ronda**, suma un bloqueo en el pasillo 2 y guarda. Abre **Recorrido**, pulsa «Inicia» y luego «Termina». | «En hora pico el anfitrión hace la ronda cada hora y el equipo cronometra el recorrido. Alimentan los KPI 7, 8 y 9.» |
| 2:50 | B | Apaga el interruptor de datos de demostración. | «Los datos de demostración son ficticios y están rotulados. Con un clic se separan de los reales.» |

## Plan B sin internet

El modo local no necesita red. Si falla el wifi o el celular:

1. Abre `index.html` con doble clic desde la memoria USB o el disco.
2. Abre una segunda pestaña con el mismo archivo y agrega `#panel` al final de la dirección.
3. Pon las pestañas lado a lado (Windows: arrastra cada pestaña a un borde de la pantalla).
4. Sigue el mismo guion: el reporte de la pestaña del cliente aparece en el panel sin recargar.

Si el navegador bloquea el almacenamiento local (por ejemplo, en modo incógnito estricto), la app sigue funcionando en una sola pestaña. El tablero lo avisa en «Almacenamiento». En ese caso haz todo el guion en una pestaña, cambiando entre `#inicio` y `#panel`.

## Preguntas probables del comité

**«¿Qué pasa si queremos cambiar una meta?»**
Se cambia en vivo: **Ajustes → Metas de los KPI**. Cambia, por ejemplo, la meta del KPI 4 de 80 a 65 y pulsa «Guardar metas». Vuelve al tablero: la tarjeta pasa de ámbar a verde. Las metas están rotuladas como «meta supuesta» porque las propuso el equipo.

**«¿Los datos son reales?»**
No. Los datos cargados son de demostración y llevan el rótulo «DATO DE DEMOSTRACIÓN (ficticio)». Los datos reales saldrán del piloto.

**«¿Depende de los sistemas de Ara?»**
No. Todos los datos los generan el cliente con el QR y el equipo con las rondas, las auditorías y los cronómetros.

**«¿Cómo se ve el QR impreso?»**
En **Ajustes → Generador de QR → Generar hoja de QR**. Hay un QR por tienda y por punto, y uno para calificar en la salida.

**«¿Cómo validaron la usabilidad?»**
Con el **Modo prueba**: 6 participantes (P1 a P6, sin nombres), 5 tareas cronometradas y un CSV exportable con los resultados y los cambios hechos.
