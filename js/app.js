/*
 * app.js · Arranque, rutas con hash, cabeceras, avisos y exportación.
 */
(function (root) {
  'use strict';

  var RUTAS = {
    inicio: { titulo: 'Inicio', personal: false },
    reportar: { titulo: 'No encontré un producto', personal: false },
    calificar: { titulo: 'Califica la atención', personal: false },
    top5: { titulo: 'Lo que más nos piden', personal: false },
    panel: { titulo: 'Tablero', personal: true },
    auditoria: { titulo: 'Auditoría', personal: true },
    ronda: { titulo: 'Ronda', personal: true },
    recorrido: { titulo: 'Recorrido', personal: true },
    prueba: { titulo: 'Prueba de usuario', personal: true },
    ajustes: { titulo: 'Ajustes', personal: true }
  };
  // Vistas que se repintan solas cuando llegan datos nuevos (otra pestaña o la hoja compartida).
  var EN_VIVO = { panel: true, top5: true };

  function leerContexto() {
    var cfg = Store.config(), q = {};
    root.location.search.replace(/^\?/, '').split('&').forEach(function (par) {
      if (!par) return;
      var kv = par.split('=');
      try { q[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); } catch (e) { /* parámetro inválido */ }
    });
    var tienda = cfg.tiendas[q.t] ? q.t : 'T1';
    var punto = String(q.p || 'general').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'general';
    return { tienda: tienda, punto: punto };
  }

  var autenticado = false;
  try { autenticado = root.sessionStorage.getItem('avf1_pin') === '1'; } catch (e) { /* sin sessionStorage */ }

  var hoy = U.diaISO(), hace13 = new Date(); hace13.setDate(hace13.getDate() - 13);

  var App = {
    ctx: null,
    ctxPersonal: { tienda: 'T1' },
    filtros: { tienda: 'ambas', desde: U.diaISO(hace13), hasta: hoy },
    borradores: {},
    recorrido: { inicio: null },
    prueba: { participante: 'P1', inicios: {} },
    hojaQR: false,
    rutaActual: null,
    _intervalos: [],

    autenticar: function () {
      autenticado = true;
      try { root.sessionStorage.setItem('avf1_pin', '1'); } catch (e) { /* sin sessionStorage */ }
    },
    salir: function () {
      autenticado = false;
      try { root.sessionStorage.removeItem('avf1_pin'); } catch (e) { /* sin sessionStorage */ }
    },
    intervalo: function (fn, ms) { App._intervalos.push(setInterval(fn, ms)); },
    movimientoReducido: function () {
      return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },
    aviso: function (texto) {
      var el = document.getElementById('aviso');
      el.textContent = texto;
      el.classList.add('visible');
      clearTimeout(App._tAviso);
      App._tAviso = setTimeout(function () { el.classList.remove('visible'); }, 4000);
    },

    render: function (cambioDeRuta) {
      App._intervalos.forEach(clearInterval); App._intervalos = [];
      var ruta = (root.location.hash.replace(/^#/, '') || 'inicio').split('?')[0];
      if (!RUTAS[ruta]) ruta = 'inicio';
      var def = RUTAS[ruta], main = document.getElementById('contenido');
      App.ctx = leerContexto();
      App.rutaActual = ruta;
      document.body.className = def.personal ? 'modo-personal' : 'modo-cliente';
      if (ruta !== 'ajustes') document.body.classList.remove('con-hoja-qr');
      cabecera(ruta, def);
      if (def.personal && !autenticado) V.pin(main, ruta);
      else V[ruta](main);
      document.title = def.titulo + ' · Avísanos qué faltó';
      if (cambioDeRuta) {
        root.scrollTo(0, 0);
        var h1 = main.querySelector('h1');
        if (h1 && !main.contains(document.activeElement)) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
      }
    },

    // Repinta conservando el foco, la selección y el desplazamiento.
    rerender: function () {
      var a = document.activeElement, id = a && a.id, sel = null, y = root.scrollY;
      try { if (a && a.selectionStart !== undefined) sel = [a.selectionStart, a.selectionEnd]; } catch (e) { sel = null; }
      App.render(false);
      if (id) {
        var el = document.getElementById(id);
        if (el) {
          el.focus({ preventScroll: true });
          try { if (sel && sel[0] !== null) el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* campo sin selección */ }
        }
      }
      root.scrollTo(0, y);
    },

    /* ---------- CSV, archivos y exportación ---------- */
    csv: function (columnas, filas) {
      function celda(v) {
        var s = v === null || v === undefined ? '' : String(v);
        return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }
      return '﻿' + [columnas].concat(filas).map(function (f) { return f.map(celda).join(';'); }).join('\r\n');
    },

    exportarTodo: function (incluirDemo) {
      var archivos = [], fecha = U.diaISO();
      var COLUMNAS = {
        reporte: ['id', 'tienda', 'creado', 'producto', 'seccion', 'punto', 'estado', 'resuelto'],
        calificacion: ['id', 'tienda', 'creado', 'punto', 'nota', 'motivos', 'consulto', 'encontro', 'comentario'],
        respuestaTop: ['id', 'tienda', 'creado', 'mes', 'posicion', 'producto', 'texto', 'publicada', 'publicadaEn'],
        auditoria: ['id', 'tienda', 'creado', 'fecha', 'auditados', 'ausentes', 'tasa_quiebre', 'productos_ausentes'],
        ronda: ['id', 'tienda', 'creado', 'hora', 'pico', 'pasillos_revisados', 'pasillos_con_cajas', 'pasillos_con_obstaculo', 'bloqueos'],
        recorrido: ['id', 'tienda', 'creado', 'segundos', 'minutos', 'pico'],
        sesionPrueba: ['id', 'participante', 'tarea', 'segundos', 'resultado', 'observacion', 'cambio']
      };
      function filas(tipo, registros) {
        var out = [];
        registros.forEach(function (r) {
          if (tipo === 'calificacion') out.push([r.id, r.tienda, r.creado, r.punto, r.nota, (r.motivos || []).join(' | '), r.consulto, r.encontro, r.comentario]);
          else if (tipo === 'auditoria') {
            var q = KPI.quiebre([r]);
            out.push([r.id, r.tienda, r.creado, r.fecha, q.denominador, q.numerador, q.valor === null ? '' : U.num(q.valor, 2),
              r.items.filter(function (i) { return !i.presente; }).map(function (i) { return i.producto; }).join(' | ')]);
          } else if (tipo === 'ronda') {
            out.push([r.id, r.tienda, r.creado, r.hora, r.pico, r.pasillos.length,
              r.pasillos.filter(function (p) { return p.cajas; }).length,
              r.pasillos.filter(function (p) { return p.obstaculo; }).length,
              r.pasillos.reduce(function (s, p) { return s + (Number(p.bloqueos) || 0); }, 0)]);
          } else if (tipo === 'recorrido') out.push([r.id, r.tienda, r.creado, r.segundos, U.num(r.segundos / 60, 2), r.pico]);
          else if (tipo === 'sesionPrueba') {
            r.tareas.forEach(function (t) {
              out.push([r.id, r.participante, t.tarea + '. ' + t.nombre, t.segundos === null ? '' : t.segundos, V.RESULTADOS[t.resultado] || '', t.observacion, t.cambio]);
            });
          } else out.push(COLUMNAS[tipo].map(function (c) { return r[c]; }));
        });
        return out;
      }
      var reales = {}, demo = {};
      Store.TIPOS.forEach(function (t) {
        var l = Store.lista(t);
        reales[t] = l.filter(function (r) { return !r.demo; });
        demo[t] = l.filter(function (r) { return r.demo; });
        archivos.push({ nombre: t + '_' + fecha + '.csv', tipo: 'text/csv', contenido: App.csv(COLUMNAS[t], filas(t, reales[t])) });
      });
      archivos.push({ nombre: 'respaldo_datos_reales_' + fecha + '.json', tipo: 'application/json',
        contenido: JSON.stringify({ programa: 'Avísanos qué faltó', version: 1, exportado: new Date().toISOString(), datos: reales }, null, 2) });
      var hayDemo = Store.TIPOS.some(function (t) { return demo[t].length; });
      if (incluirDemo && hayDemo) {
        Store.TIPOS.forEach(function (t) {
          if (!demo[t].length) return;
          archivos.push({ nombre: 'DEMO_ficticio_' + t + '_' + fecha + '.csv', tipo: 'text/csv', demo: true,
            contenido: App.csv(['rotulo'].concat(COLUMNAS[t]), filas(t, demo[t]).map(function (f) { return [U.ROTULO_DEMO].concat(f); })) });
        });
        archivos.push({ nombre: 'DEMO_ficticio_respaldo_' + fecha + '.json', tipo: 'application/json', demo: true,
          contenido: JSON.stringify({ rotulo: U.ROTULO_DEMO, programa: 'Avísanos qué faltó', version: 1, exportado: new Date().toISOString(), datos: demo }, null, 2) });
      }
      return archivos;
    },

    descargar: function (a) {
      try {
        var blob = new Blob([a.contenido], { type: a.tipo + ';charset=utf-8' });
        var url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = a.nombre;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        return true;
      } catch (e) { return false; }
    },

    copiar: function (texto) {
      if (root.navigator.clipboard && root.isSecureContext) return root.navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return copiaManual(texto); });
      return Promise.resolve(copiaManual(texto));
    },

    // Lista de archivos con «Descargar» y «Copiar». Con auto=true intenta descargar de inmediato.
    archivos: function (zona, lista, auto) {
      if (auto) lista.forEach(App.descargar);
      zona.innerHTML = '<div class="archivos"><p>' + (auto ? 'Descarga iniciada. Si tu navegador no la permite, usa «Copiar» y pega el contenido en un archivo de texto.' :
        'Archivos listos. Los datos de demostración van en archivos aparte con el prefijo DEMO_ficticio.') + '</p><ul>' +
        lista.map(function (a, i) {
          return '<li class="' + (a.demo ? 'archivo-demo' : '') + '"><span>' + U.esc(a.nombre) + (a.demo ? ' <span class="rotulo-demo">' + U.ROTULO_DEMO + '</span>' : '') + '</span>' +
            '<span class="acciones"><button type="button" class="boton" data-d="' + i + '">Descargar</button>' +
            '<button type="button" class="boton" data-c="' + i + '">Copiar</button></span></li>';
        }).join('') + '</ul>' +
        (lista.length > 1 ? '<button type="button" class="boton primario" id="btn-todos">Descargar todos</button>' : '') + '</div>';
      Array.prototype.forEach.call(zona.querySelectorAll('[data-d]'), function (b) {
        b.addEventListener('click', function () { if (!App.descargar(lista[Number(b.dataset.d)])) App.aviso('Este navegador no permite descargar. Usa «Copiar».'); });
      });
      Array.prototype.forEach.call(zona.querySelectorAll('[data-c]'), function (b) {
        b.addEventListener('click', function () {
          App.copiar(lista[Number(b.dataset.c)].contenido.replace(/^﻿/, '')).then(function (ok) {
            App.aviso(ok ? 'Contenido copiado. Pégalo en un archivo de texto.' : 'No se pudo copiar automáticamente.');
          });
        });
      });
      var todos = zona.querySelector('#btn-todos');
      if (todos) todos.addEventListener('click', function () {
        lista.forEach(function (a, i) { setTimeout(function () { App.descargar(a); }, i * 300); });
      });
    }
  };

  function copiaManual(texto) {
    var t = document.createElement('textarea');
    t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    t.remove();
    return ok;
  }

  function cabecera(ruta, def) {
    var h = document.getElementById('cabecera');
    var marca = '<a class="marca" href="#inicio"><span class="marca-simbolo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg></span>' +
      '<span class="marca-texto">Avísanos qué faltó<small>Programa de experiencia de compra</small></span></a>';
    if (!def.personal) { h.innerHTML = '<div class="cab-interna">' + marca + '</div>'; return; }
    var enlaces = [['panel', 'Tablero'], ['auditoria', 'Auditoría'], ['ronda', 'Ronda'], ['recorrido', 'Recorrido'], ['prueba', 'Prueba de usuario'], ['ajustes', 'Ajustes']];
    h.innerHTML = '<div class="cab-interna">' + marca + (autenticado ? '<nav aria-label="Personal"><ul>' + enlaces.map(function (e) {
      return '<li><a href="#' + e[0] + '"' + (e[0] === ruta ? ' aria-current="page"' : '') + '>' + e[1] + '</a></li>';
    }).join('') + '<li><a href="#inicio" class="nav-cliente">Vista del cliente</a></li>' +
      '<li><button type="button" id="btn-salir" class="boton-nav">Salir</button></li></ul></nav>' : '') + '</div>';
    var salir = document.getElementById('btn-salir');
    if (salir) salir.addEventListener('click', function () { App.salir(); App.render(true); });
  }

  root.App = App;

  function iniciar() {
    App.render(true);
    root.addEventListener('hashchange', function () { App.render(true); });
    Store.alCambiar(function () { if (EN_VIVO[App.rutaActual]) App.rerender(); });
    // El panel se repinta cada minuto para marcar los reportes que pasan de 48 h.
    setInterval(function () { if (App.rutaActual === 'panel') App.rerender(); }, 60000);
    Store.iniciar();
    root.addEventListener('online', function () { Store.enviarCola(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(this);
