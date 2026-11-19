/*
 * Pruebas de las fórmulas de KPI. Ejecutar: node tests/kpi.test.js
 * Sin dependencias. Datos inventados; el resultado esperado está calculado a mano
 * en el comentario de cada prueba.
 */
'use strict';
var assert = require('assert');
var path = require('path');
var KPI = require(path.join(__dirname, '..', 'js', 'kpi.js'));

var pruebas = [];
function prueba(nombre, fn) { pruebas.push({ nombre: nombre, fn: fn }); }
function cerca(real, esperado, msg) {
  assert.ok(Math.abs(real - esperado) < 1e-9, (msg || '') + ' esperado ' + esperado + ', obtenido ' + real);
}
function sinDatos(r) {
  assert.strictEqual(r.valor, null, 'valor debe ser null con denominador 0');
  assert.strictEqual(r.denominador, 0);
}
function items(ausentes, total) {
  var lista = [];
  for (var i = 0; i < total; i++) lista.push({ producto: 'p' + i, presente: i >= ausentes });
  return lista;
}

// KPI 1: auditoría A 2/20 = 10 % y auditoría B 6/20 = 30 %.
// Promedio = (10 + 30) / 2 = 20 %. Numerador 8, denominador 40.
prueba('KPI 1 · Tasa de quiebre (promedio de auditorías)', function () {
  var r = KPI.quiebre([{ items: items(2, 20) }, { items: items(6, 20) }]);
  cerca(r.valor, 20);
  assert.strictEqual(r.numerador, 8);
  assert.strictEqual(r.denominador, 40);
  // Tamaños distintos: 1/4 = 25 % y 1/10 = 10 % → promedio 17,5 % (no 2/14).
  cerca(KPI.quiebre([{ items: items(1, 4) }, { items: items(1, 10) }]).valor, 17.5);
  sinDatos(KPI.quiebre([]));
});

// KPI 2: 4 reportes; resuelto en 10 h (sí), en 48 h exactas (sí), en 50 h (no), sin resolver (no) → 2/4 = 50 %.
prueba('KPI 2 · Reportes atendidos a tiempo', function () {
  var base = '2026-11-01T08:00:00.000Z';
  var r = KPI.atendidosATiempo([
    { creado: base, estado: 'resuelto', resuelto: '2026-11-01T18:00:00.000Z' },
    { creado: base, estado: 'resuelto', resuelto: '2026-11-03T08:00:00.000Z' },
    { creado: base, estado: 'resuelto', resuelto: '2026-11-03T10:00:00.000Z' },
    { creado: base, estado: 'en gestión', resuelto: null }
  ]);
  cerca(r.valor, 50);
  assert.strictEqual(r.numerador, 2);
  assert.strictEqual(r.denominador, 4);
  sinDatos(KPI.atendidosATiempo([]));
});

// KPI 3: top 5 con 5 productos, 2 con respuesta publicada y 1 con borrador → 2/5 = 40 %.
prueba('KPI 3 · Pedidos respondidos', function () {
  var top = ['Arroz 1 kg', 'Aceite 1 L', 'Huevos x30', 'Panela', 'Atún'];
  var r = KPI.pedidosRespondidos(top, [
    { producto: 'aceite 1 l', publicada: true },
    { producto: 'Panela', publicada: true },
    { producto: 'Atún', publicada: false },
    { producto: 'Producto fuera del top', publicada: true }
  ]);
  cerca(r.valor, 40);
  assert.strictEqual(r.numerador, 2);
  assert.strictEqual(r.denominador, 5);
  // Top con solo 2 productos y ambos respondidos: 2/5 = 40 % (el denominador es siempre 5).
  cerca(KPI.pedidosRespondidos(['Arroz 1 kg', 'Panela'], [
    { producto: 'Arroz 1 kg', publicada: true }, { producto: 'Panela', publicada: true }]).valor, 40);
  sinDatos(KPI.pedidosRespondidos([], []));
});

// Top 5: cuenta por producto sin distinguir mayúsculas ni tildes y desempata por orden alfabético.
prueba('Top 5 mensual · conteo y orden', function () {
  var reportes = [];
  function rep(p, n) { for (var i = 0; i < n; i++) reportes.push({ producto: p }); }
  rep('Aceite 1 L', 4); rep('aceite 1 l', 1); rep('Atún', 3); rep('Arroz 1 kg', 3); rep('Panela', 2); rep('Café 250 g', 1); rep('Avena', 1);
  var t = KPI.top5(reportes);
  assert.strictEqual(t.length, 5);
  assert.deepStrictEqual(t.map(function (x) { return x.n; }), [5, 3, 3, 2, 1]);
  assert.strictEqual(t[1].producto, 'Arroz 1 kg');
  assert.strictEqual(t[4].producto, 'Avena');
});

// KPI 4: notas 5, 4, 4, 3, 1 → 3/5 = 60 %.
prueba('KPI 4 · Índice de satisfacción con el trato', function () {
  var r = KPI.satisfaccion([{ nota: 5 }, { nota: 4 }, { nota: 4 }, { nota: 3 }, { nota: 1 }]);
  cerca(r.valor, 60);
  assert.strictEqual(r.numerador, 3);
  sinDatos(KPI.satisfaccion([]));
});

// KPI 5: notas 1, 2, 3, 5 → 2/4 = 50 %.
prueba('KPI 5 · Tasa de quejas', function () {
  var r = KPI.quejas([{ nota: 1 }, { nota: 2 }, { nota: 3 }, { nota: 5 }]);
  cerca(r.valor, 50);
  assert.strictEqual(r.denominador, 4);
  sinDatos(KPI.quejas([]));
});

// KPI 6: 3 consultaron (2 encontraron), 2 no consultaron (se ignoran) → 2/3 = 66,67 %.
prueba('KPI 6 · Consultas resueltas', function () {
  var r = KPI.consultasResueltas([
    { consulto: true, encontro: true }, { consulto: true, encontro: true }, { consulto: true, encontro: false },
    { consulto: false, encontro: null }, { consulto: false, encontro: true }
  ]);
  cerca(r.valor, 200 / 3);
  assert.strictEqual(r.numerador, 2);
  assert.strictEqual(r.denominador, 3);
  sinDatos(KPI.consultasResueltas([{ consulto: false }]));
});

// KPI 7: 4 rondas pico (2 despejadas, 1 con cajas, 1 con obstáculo) + 1 fuera de pico → 2/4 = 50 %.
prueba('KPI 7 · Pasillos despejados', function () {
  var limpio = [{ cajas: false, obstaculo: false }, { cajas: false, obstaculo: false }];
  var r = KPI.pasillosDespejados([
    { pico: true, pasillos: limpio },
    { pico: true, pasillos: limpio },
    { pico: true, pasillos: [{ cajas: true, obstaculo: false }, { cajas: false, obstaculo: false }] },
    { pico: true, pasillos: [{ cajas: false, obstaculo: true }] },
    { pico: false, pasillos: limpio }
  ]);
  cerca(r.valor, 50);
  assert.strictEqual(r.denominador, 4);
  sinDatos(KPI.pasillosDespejados([{ pico: false, pasillos: limpio }]));
});

// KPI 8: recorridos pico de 360 s (6 min) y 540 s (9 min); uno fuera de pico de 60 s → (6 + 9) / 2 = 7,5 min.
prueba('KPI 8 · Tiempo de recorrido en hora pico', function () {
  var r = KPI.tiempoRecorrido([
    { segundos: 360, pico: true }, { segundos: 540, pico: true }, { segundos: 60, pico: false }
  ]);
  cerca(r.valor, 7.5);
  cerca(r.numerador, 15);
  assert.strictEqual(r.denominador, 2);
  sinDatos(KPI.tiempoRecorrido([{ segundos: 60, pico: false }]));
});

// KPI 9: rondas pico con bloqueos 2+1 = 3 y 0+3 = 3; ronda fuera de pico con 5 (no cuenta) → 6/2 = 3.
prueba('KPI 9 · Bloqueos por hora', function () {
  var r = KPI.bloqueosPorHora([
    { pico: true, pasillos: [{ bloqueos: 2 }, { bloqueos: 1 }] },
    { pico: true, pasillos: [{ bloqueos: 0 }, { bloqueos: 3 }] },
    { pico: false, pasillos: [{ bloqueos: 5 }] }
  ]);
  cerca(r.valor, 3);
  assert.strictEqual(r.numerador, 6);
  assert.strictEqual(r.denominador, 2);
  sinDatos(KPI.bloqueosPorHora([]));
});

// Estado frente a la meta.
prueba('Estado del indicador (verde, ámbar, gris)', function () {
  assert.strictEqual(KPI.estado(95, { valor: 90, sentido: 'mayor' }), 'verde');
  assert.strictEqual(KPI.estado(80, { valor: 90, sentido: 'mayor' }), 'ambar');
  assert.strictEqual(KPI.estado(4, { valor: 5, sentido: 'menor' }), 'verde');
  assert.strictEqual(KPI.estado(null, { valor: 5, sentido: 'menor' }), 'gris');
});

prueba('Hay 9 definiciones de KPI con fórmula', function () {
  assert.strictEqual(KPI.DEFINICIONES.length, 9);
  KPI.DEFINICIONES.forEach(function (d) { assert.ok(d.formula.length > 10, 'KPI ' + d.id + ' sin fórmula'); });
});

var fallas = 0;
pruebas.forEach(function (p) {
  try { p.fn(); console.log('  ✔ ' + p.nombre); }
  catch (e) { fallas++; console.log('  ✘ ' + p.nombre + '\n    ' + e.message); }
});
console.log('\n' + (pruebas.length - fallas) + ' de ' + pruebas.length + ' pruebas pasaron.');
process.exit(fallas ? 1 : 0);
