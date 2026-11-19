/*
 * demo.js · Generador de DATOS DE DEMOSTRACIÓN (ficticios).
 * Todos los registros llevan demo:true, se pueden filtrar y borrar,
 * y se exportan aparte de los datos reales. No representan resultados reales.
 */
(function (root) {
  'use strict';

  // Generador pseudoaleatorio con semilla para que la demo sea reproducible.
  function azar(semilla) {
    var s = semilla >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generar() {
    var cfg = Store.config();
    var r = azar(20261118);
    var ahora = Date.now();
    function entre(a, b) { return a + Math.floor(r() * (b - a + 1)); }
    function elegir(lista) { return lista[Math.floor(r() * lista.length)]; }
    function tienda() { return r() < 0.55 ? 'T1' : 'T2'; }
    // Fecha en los últimos 14 días; con 70 % de probabilidad en una franja pico.
    function momento(diasAtras, forzarPico) {
      var d = new Date(ahora);
      d.setDate(d.getDate() - diasAtras);
      var pico = forzarPico !== undefined ? forzarPico : r() < 0.7;
      if (pico && cfg.picos.length) {
        var f = elegir(cfg.picos);
        var m = entre(U.minutos(f.desde), U.minutos(f.hasta) - 1);
        d.setHours(Math.floor(m / 60), m % 60, entre(0, 59), 0);
      } else {
        d.setHours(entre(9, 16), entre(0, 59), entre(0, 59), 0);
      }
      if (d.getTime() > ahora) d.setDate(d.getDate() - 1);
      return d;
    }

    var catalogo = cfg.catalogo;
    // Algunos productos se reportan más que otros.
    var pesos = catalogo.map(function (p, i) { return i < 6 ? 5 - Math.floor(i / 2) : 1; });
    var totalPeso = pesos.reduce(function (a, b) { return a + b; }, 0);
    function productoPonderado() {
      var x = r() * totalPeso;
      for (var i = 0; i < catalogo.length; i++) { x -= pesos[i]; if (x < 0) return catalogo[i]; }
      return catalogo[0];
    }
    var puntos = ['lacteos', 'granos', 'caja', 'general'];

    var reportes = [];
    for (var i = 0; i < 30; i++) {
      var p = productoPonderado();
      var creado = momento(entre(0, 13));
      var rep = { tienda: tienda(), creado: creado.toISOString(), producto: p.nombre, seccion: p.seccion,
        punto: elegir(puntos), estado: 'nuevo', resuelto: null, demo: true };
      var x = r();
      if (x < 0.45) {
        var horas = r() < 0.75 ? entre(2, 40) : entre(50, 90);
        var fin = new Date(creado.getTime() + horas * 3600 * 1000);
        if (fin.getTime() < ahora) { rep.estado = 'resuelto'; rep.resuelto = fin.toISOString(); }
      } else if (x < 0.7) {
        rep.estado = 'en gestión';
      }
      reportes.push(rep);
    }

    var motivos = ['trato', 'fila larga', 'no encontré el producto', 'pasillos llenos', 'otro'];
    var notas = [5, 5, 5, 4, 4, 4, 4, 3, 3, 2, 1];
    var calificaciones = [];
    for (i = 0; i < 60; i++) {
      var nota = elegir(notas);
      var consulto = r() < 0.5;
      calificaciones.push({
        tienda: tienda(), creado: momento(entre(0, 13)).toISOString(), nota: nota, punto: 'salida',
        motivos: nota <= 2 ? [elegir(motivos)] : [],
        consulto: consulto, encontro: consulto ? r() < 0.7 : null, comentario: '', demo: true
      });
    }

    var auditorias = [12, 6, 1].map(function (dias, k) {
      var faltan = {};
      var n = entre(1, 3);
      while (Object.keys(faltan).length < n) faltan[elegir(catalogo).nombre] = true;
      var d = momento(dias, false);
      return { tienda: k === 1 ? 'T2' : 'T1', creado: d.toISOString(), fecha: U.diaISO(d), demo: true,
        items: catalogo.map(function (c) { return { producto: c.nombre, presente: !faltan[c.nombre] }; }) };
    });

    var rondas = [];
    for (i = 0; i < 12; i++) {
      var h = momento(entre(0, 13), i < 10);
      var pasillos = [];
      for (var n = 1; n <= cfg.pasillos; n++) {
        pasillos.push({ n: n, cajas: r() < 0.06, obstaculo: r() < 0.04, bloqueos: r() < 0.85 ? 0 : 1 });
      }
      rondas.push({ tienda: tienda(), creado: h.toISOString(), hora: h.toISOString(),
        pico: U.esPico(h, cfg.picos), pasillos: pasillos, demo: true });
    }

    var recorridos = [];
    for (i = 0; i < 20; i++) {
      var t = momento(entre(0, 13), i < 15);
      var pico = U.esPico(t, cfg.picos);
      recorridos.push({ tienda: tienda(), creado: t.toISOString(),
        segundos: pico ? entre(300, 720) : entre(180, 420), pico: pico, demo: true });
    }

    return { reporte: reportes, calificacion: calificaciones, auditoria: auditorias, ronda: rondas, recorrido: recorridos };
  }

  function cargar() {
    Store.borrarDemo();
    var datos = generar();
    Object.keys(datos).forEach(function (tipo) { Store.agregarVarios(tipo, datos[tipo]); });
    var cfg = Store.config();
    if (!cfg.incluirDemo) Store.guardarConfig({ incluirDemo: true });
    return Object.keys(datos).reduce(function (s, k) { return s + datos[k].length; }, 0);
  }

  root.Demo = { generar: generar, cargar: cargar };
})(this);
