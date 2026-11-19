/*
 * kpi.js · Fórmulas de los 9 KPI operativos de «Avísanos qué faltó».
 * Funciones puras: reciben arreglos de registros y devuelven
 * { valor, numerador, denominador }. Si el denominador es 0, valor = null
 * y la interfaz muestra «Sin datos» (nunca 0 %).
 * Funciona en el navegador (window.KPI) y en Node (module.exports).
 */
(function (root) {
  'use strict';

  var H48 = 48 * 3600 * 1000;

  function resultado(numerador, denominador, valor) {
    if (!denominador) return { valor: null, numerador: numerador || 0, denominador: 0 };
    return {
      valor: valor !== undefined ? valor : (numerador / denominador) * 100,
      numerador: numerador,
      denominador: denominador
    };
  }

  function suma(a, b) { return a + b; }

  function normalizar(texto) {
    return String(texto || '').trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // 1 · Tasa de quiebre en góndola (promedio de las auditorías del periodo)
  function quiebre(auditorias) {
    var tasas = [], ausentes = 0, auditados = 0;
    (auditorias || []).forEach(function (a) {
      var items = a.items || [];
      if (!items.length) return;
      var n = items.filter(function (i) { return !i.presente; }).length;
      ausentes += n;
      auditados += items.length;
      tasas.push((n / items.length) * 100);
    });
    if (!tasas.length) return resultado(0, 0);
    var r = resultado(ausentes, auditados, tasas.reduce(suma, 0) / tasas.length);
    r.auditorias = tasas.length;
    return r;
  }

  // 2 · Reportes atendidos a tiempo
  function atendidosATiempo(reportes) {
    var lista = reportes || [];
    var aTiempo = lista.filter(function (r) {
      if (r.estado !== 'resuelto' || !r.resuelto) return false;
      return Date.parse(r.resuelto) - Date.parse(r.creado) <= H48;
    }).length;
    return resultado(aTiempo, lista.length);
  }

  // Top 5 mensual: productos más reportados (empate: orden alfabético)
  function top5(reportes) {
    var conteo = {};
    (reportes || []).forEach(function (r) {
      var clave = normalizar(r.producto);
      if (!clave) return;
      if (!conteo[clave]) conteo[clave] = { producto: r.producto, n: 0, demo: 0 };
      conteo[clave].n += 1;
      if (r.demo) conteo[clave].demo += 1;
    });
    return Object.keys(conteo).map(function (k) { return conteo[k]; })
      .sort(function (a, b) { return b.n - a.n || a.producto.localeCompare(b.producto, 'es'); })
      .slice(0, 5);
  }

  // 3 · Pedidos respondidos: productos del top 5 con respuesta publicada ÷ 5
  function pedidosRespondidos(productosTop, respuestas) {
    var top = productosTop || [];
    var publicadas = (respuestas || []).filter(function (r) { return r.publicada; });
    var n = top.filter(function (p) {
      var clave = normalizar(p.producto || p);
      return publicadas.some(function (r) { return normalizar(r.producto) === clave; });
    }).length;
    // El denominador es siempre 5; sin productos en el top no hay datos.
    return resultado(n, top.length ? 5 : 0);
  }

  // 4 · Índice de satisfacción con el trato
  function satisfaccion(calificaciones) {
    var lista = calificaciones || [];
    return resultado(lista.filter(function (c) { return c.nota >= 4; }).length, lista.length);
  }

  // 5 · Tasa de quejas
  function quejas(calificaciones) {
    var lista = calificaciones || [];
    return resultado(lista.filter(function (c) { return c.nota <= 2; }).length, lista.length);
  }

  // 6 · Consultas resueltas
  function consultasResueltas(calificaciones) {
    var consultaron = (calificaciones || []).filter(function (c) { return c.consulto === true; });
    return resultado(consultaron.filter(function (c) { return c.encontro === true; }).length, consultaron.length);
  }

  function rondasPico(rondas) {
    return (rondas || []).filter(function (r) { return r.pico; });
  }

  function rondaDespejada(ronda) {
    return (ronda.pasillos || []).every(function (p) { return !p.cajas && !p.obstaculo; });
  }

  // 7 · Pasillos despejados
  function pasillosDespejados(rondas) {
    var pico = rondasPico(rondas);
    return resultado(pico.filter(rondaDespejada).length, pico.length);
  }

  // 8 · Tiempo de recorrido en hora pico (minutos promedio)
  function tiempoRecorrido(recorridos) {
    var pico = (recorridos || []).filter(function (r) { return r.pico; });
    var minutos = pico.map(function (r) { return (Number(r.segundos) || 0) / 60; }).reduce(suma, 0);
    return resultado(minutos, pico.length, pico.length ? minutos / pico.length : undefined);
  }

  // 9 · Bloqueos por hora: bloqueos registrados en las rondas en hora pico ÷ rondas en hora pico
  function bloqueosPorHora(rondas) {
    var pico = rondasPico(rondas);
    var total = pico.map(function (r) {
      return (r.pasillos || []).map(function (p) { return Number(p.bloqueos) || 0; }).reduce(suma, 0);
    }).reduce(suma, 0);
    return resultado(total, pico.length, pico.length ? total / pico.length : undefined);
  }

  // Estado frente a la meta: 'verde' cumple, 'ambar' no cumple, 'gris' sin datos
  function estado(valor, meta) {
    if (valor === null || valor === undefined || !meta) return 'gris';
    var cumple = meta.sentido === 'menor' ? valor <= meta.valor : valor >= meta.valor;
    return cumple ? 'verde' : 'ambar';
  }

  var DEFINICIONES = [
    { id: 1, clave: 'quiebre', nombre: 'Tasa de quiebre en góndola', decision: 1, unidad: '%', sentido: 'menor',
      formula: 'productos clave ausentes ÷ productos clave auditados × 100 (promedio de las auditorías del periodo)' },
    { id: 2, clave: 'atendidosATiempo', nombre: 'Reportes atendidos a tiempo', decision: 1, unidad: '%', sentido: 'mayor',
      formula: 'reportes resueltos en 48 h o menos ÷ reportes recibidos × 100' },
    { id: 3, clave: 'pedidosRespondidos', nombre: 'Pedidos respondidos', decision: 1, unidad: '%', sentido: 'mayor',
      formula: 'productos del top 5 mensual con respuesta publicada ÷ 5 × 100' },
    { id: 4, clave: 'satisfaccion', nombre: 'Índice de satisfacción con el trato', decision: 2, unidad: '%', sentido: 'mayor',
      formula: 'calificaciones de 4 y 5 ÷ total de calificaciones × 100' },
    { id: 5, clave: 'quejas', nombre: 'Tasa de quejas', decision: 2, unidad: '%', sentido: 'menor',
      formula: 'calificaciones de 1 y 2 ÷ total de calificaciones × 100' },
    { id: 6, clave: 'consultasResueltas', nombre: 'Consultas resueltas', decision: 2, unidad: '%', sentido: 'mayor',
      formula: '«encontró el producto o un sustituto» = sí ÷ «consultó al anfitrión» = sí × 100' },
    { id: 7, clave: 'pasillosDespejados', nombre: 'Pasillos despejados', decision: 3, unidad: '%', sentido: 'mayor',
      formula: 'rondas en hora pico sin cajas ni obstáculos ÷ rondas en hora pico × 100' },
    { id: 8, clave: 'tiempoRecorrido', nombre: 'Tiempo de recorrido en hora pico', decision: 3, unidad: 'min', sentido: 'menor',
      formula: 'promedio de minutos de los recorridos en hora pico' },
    { id: 9, clave: 'bloqueosPorHora', nombre: 'Bloqueos por hora', decision: 3, unidad: 'bloqueos/ronda', sentido: 'menor',
      formula: 'total de bloqueos registrados ÷ número de rondas en hora pico' }
  ];

  var KPI = {
    quiebre: quiebre,
    atendidosATiempo: atendidosATiempo,
    top5: top5,
    pedidosRespondidos: pedidosRespondidos,
    satisfaccion: satisfaccion,
    quejas: quejas,
    consultasResueltas: consultasResueltas,
    pasillosDespejados: pasillosDespejados,
    rondaDespejada: rondaDespejada,
    tiempoRecorrido: tiempoRecorrido,
    bloqueosPorHora: bloqueosPorHora,
    estado: estado,
    normalizar: normalizar,
    DEFINICIONES: DEFINICIONES
  };

  if (typeof module === 'object' && module.exports) module.exports = KPI;
  else root.KPI = KPI;
})(this);
