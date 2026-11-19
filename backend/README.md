# Modo compartido con Google Sheets (opcional)

> Propuesta conceptual no oficial · Ejercicio académico Uninorte

Por defecto la app guarda los datos en el navegador (modo **local**). Ese modo sirve para la demostración en un solo equipo con dos pestañas. El modo **compartido** sirve para que los celulares de los clientes y el computador del panel vean los mismos datos. Usa una hoja de Google como base de datos.

No necesita servidor propio ni sistemas de Ara. La hoja no guarda datos personales, porque la app no los pide.

## Paso a paso (10 minutos)

1. Entra a [Google Sheets](https://sheets.google.com) con la cuenta del equipo y crea una hoja nueva. Ponle un nombre, por ejemplo «Avísanos qué faltó · piloto».
2. En la hoja abre **Extensiones → Apps Script**.
3. Borra el contenido de `Código.gs` y pega todo el archivo [`apps-script.gs`](apps-script.gs). Guarda con el ícono del disquete.
4. Pulsa **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**.
   - Descripción: «Avísanos v1».
   - Ejecutar como: **Yo** (la cuenta del equipo).
   - Quién tiene acceso: **Cualquier usuario**. Así los celulares de los clientes pueden enviar reportes sin iniciar sesión.
5. Pulsa **Implementar** y autoriza los permisos. Google mostrará la advertencia «Google no ha verificado esta app». Es normal en scripts propios: entra a **Configuración avanzada** y luego a **Ir a … (no seguro)**.
6. Copia la **URL de la aplicación web**. Termina en `/exec`.
7. En la app entra a **Ajustes** (PIN `2026`). En **Acceso y almacenamiento**:
   - elige **Compartido**;
   - pega la URL en «URL de la aplicación web de Apps Script»;
   - pulsa **Probar conexión**. Debe decir «Conexión correcta con la hoja compartida»;
   - pulsa **Guardar almacenamiento**.
8. Repite el paso 7 en cada equipo del personal. La configuración (PIN, URL y metas) se guarda en cada navegador, no en la hoja.

En los celulares de los clientes no hay que configurar nada si la app publicada ya trae la URL guardada. Si no la trae, el reporte se guarda solo en el celular. **Para el piloto, publica la app y configura el modo compartido en cada equipo antes de imprimir los QR.**

> Limitación conocida: hoy el adaptador se elige en Ajustes de cada navegador. Un celular que abre el QR por primera vez usa el modo local. Para que los reportes de clientes lleguen a la hoja, el equipo debe fijar la URL por defecto. Para hacerlo, edita `urlScript` y `adaptador` en `CONFIG_BASE` dentro de `js/store.js` antes de publicar.

## Cómo funciona

- **Envío.** Cada registro nuevo o cambiado entra en una cola local. La app la envía con `fetch` POST y `Content-Type: text/plain`. Ese tipo de contenido evita la verificación previa de CORS, que Apps Script no responde.
- **Sin red.** Si el envío falla, la cola se guarda y se reenvía en la siguiente consulta o cuando vuelve la conexión. El tablero muestra cuántos envíos hay en cola.
- **Consulta.** El panel lee la hoja cada 10 segundos (`GET ?accion=listar`) y se repinta solo si hay cambios.
- **Hoja.** Cada registro es una fila: `tipo | id | json | actualizado`. No edites la columna `json` a mano.

## Probar el script sin la app

Abre en el navegador la URL `/exec?accion=listar`. Debe responder algo como:

```json
{"ok":true,"datos":{"reporte":[],"calificacion":[], "...": []}}
```

## Cambios en el script

Si modificas `apps-script.gs`, publica de nuevo: **Implementar → Administrar implementaciones → Editar → Versión: nueva**. La URL se mantiene.
