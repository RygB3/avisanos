/**
 * «Avísanos qué faltó» · Backend opcional en Google Apps Script.
 * Propuesta conceptual no oficial · Ejercicio académico Uninorte.
 *
 * Guarda cada registro de la app como una fila de la hoja «datos»:
 *   tipo | id | json | actualizado
 * No recibe ni guarda datos personales: la app no los pide.
 *
 * GET  ?accion=listar           → { ok: true, datos: { reporte: [...], calificacion: [...], ... } }
 * POST (text/plain) { ops: [...] } con operaciones:
 *   { op: 'set', tipo, registro }  crea o reemplaza el registro con ese id
 *   { op: 'del', tipo, id }        borra el registro
 *   { op: 'borrarDemo' }           borra todos los registros con demo:true
 */

var HOJA = 'datos';
var TIPOS = ['reporte', 'calificacion', 'respuestaTop', 'auditoria', 'ronda', 'recorrido', 'sesionPrueba'];

function hoja_() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var h = libro.getSheetByName(HOJA);
  if (!h) {
    h = libro.insertSheet(HOJA);
    h.appendRow(['tipo', 'id', 'json', 'actualizado']);
    h.setFrozenRows(1);
  }
  return h;
}

function responder_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var h = hoja_();
    var valores = h.getDataRange().getValues();
    var datos = {};
    TIPOS.forEach(function (t) { datos[t] = []; });
    for (var i = 1; i < valores.length; i++) {
      var tipo = valores[i][0];
      if (!datos[tipo]) continue;
      try { datos[tipo].push(JSON.parse(valores[i][2])); } catch (err) { /* fila dañada: se ignora */ }
    }
    return responder_({ ok: true, datos: datos });
  } catch (err) {
    return responder_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  var candado = LockService.getScriptLock();
  try {
    candado.waitLock(20000);
    var cuerpo = JSON.parse(e.postData.contents || '{}');
    var ops = cuerpo.ops || [];
    var h = hoja_();
    var valores = h.getDataRange().getValues();
    // Índice tipo|id → número de fila (1 = encabezado)
    var indice = {};
    for (var i = 1; i < valores.length; i++) indice[valores[i][0] + '|' + valores[i][1]] = i + 1;
    var ahora = new Date().toISOString();
    var aBorrar = {};

    ops.forEach(function (op) {
      if (op.op === 'set' && TIPOS.indexOf(op.tipo) >= 0 && op.registro && op.registro.id) {
        var clave = op.tipo + '|' + op.registro.id;
        var fila = [op.tipo, op.registro.id, JSON.stringify(op.registro), ahora];
        if (indice[clave]) {
          h.getRange(indice[clave], 1, 1, 4).setValues([fila]);
          delete aBorrar[indice[clave]];
        } else {
          h.appendRow(fila);
          indice[clave] = h.getLastRow();
        }
      } else if (op.op === 'del' && indice[op.tipo + '|' + op.id]) {
        aBorrar[indice[op.tipo + '|' + op.id]] = true;
      } else if (op.op === 'borrarDemo') {
        var actuales = h.getDataRange().getValues();
        for (var j = 1; j < actuales.length; j++) {
          try { if (JSON.parse(actuales[j][2]).demo === true) aBorrar[j + 1] = true; } catch (err) { /* fila dañada */ }
        }
      }
    });

    // Se borran de abajo hacia arriba para no correr los números de fila.
    Object.keys(aBorrar).map(Number).sort(function (a, b) { return b - a; })
      .forEach(function (fila) { h.deleteRow(fila); });

    return responder_({ ok: true, procesadas: ops.length });
  } catch (err) {
    return responder_({ ok: false, error: String(err) });
  } finally {
    candado.releaseLock();
  }
}
