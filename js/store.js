/*
 * store.js · Utilidades comunes (U) y capa de almacenamiento (Store).
 * Adaptador «local»: localStorage, sincroniza pestañas con el evento `storage`.
 * Adaptador «compartido»: hoja de Google vía Apps Script; guarda una copia local,
 * envía los cambios en cola (POST text/plain) y consulta cada 10 s.
 */
(function (root) {
  'use strict';

  /* ---------- Utilidades ---------- */
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function dos(n) { return (n < 10 ? '0' : '') + n; }

  var U = {
    ROTULO_DEMO: 'DATO DE DEMOSTRACIÓN (ficticio)',
    esc: function (t) {
      return String(t === null || t === undefined ? '' : t)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    id: function (pref) {
      return (pref || 'x') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },
    // Número con coma decimal: 4,7
    num: function (v, dec) {
      if (v === null || v === undefined || isNaN(v)) return '';
      var d = dec === undefined ? 1 : dec;
      var s = Number(v).toFixed(d);
      if (d > 0) s = s.replace(/\.?0+$/, '') || '0';
      return s.replace('.', ',');
    },
    fecha: function (iso) {
      var d = new Date(iso);
      if (isNaN(d)) return '';
      return dos(d.getDate()) + '/' + dos(d.getMonth() + 1) + '/' + d.getFullYear();
    },
    hora: function (iso) {
      var d = new Date(iso);
      if (isNaN(d)) return '';
      var h = d.getHours(), m = d.getMinutes();
      var sufijo = h < 12 ? 'a. m.' : 'p. m.';
      var h12 = h % 12 === 0 ? 12 : h % 12;
      return h12 + ':' + dos(m) + ' ' + sufijo;
    },
    fechaHora: function (iso) { return U.fecha(iso) + ' ' + U.hora(iso); },
    // Fecha local aaaa-mm-dd (para <input type="date">)
    diaISO: function (d) {
      d = d ? new Date(d) : new Date();
      return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
    },
    mesClave: function (d) {
      d = d ? new Date(d) : new Date();
      return d.getFullYear() + '-' + dos(d.getMonth() + 1);
    },
    mesNombre: function (clave) {
      var p = String(clave).split('-');
      return MESES[Number(p[1]) - 1] + ' de ' + p[0];
    },
    // «07:00» → minutos desde medianoche
    minutos: function (hhmm) {
      var p = String(hhmm).split(':');
      return Number(p[0]) * 60 + Number(p[1] || 0);
    },
    horaTexto: function (hhmm) {
      var m = U.minutos(hhmm);
      var d = new Date(2000, 0, 1, Math.floor(m / 60), m % 60);
      return U.hora(d);
    },
    esPico: function (fecha, picos) {
      var d = new Date(fecha);
      var m = d.getHours() * 60 + d.getMinutes();
      return (picos || []).some(function (f) { return m >= U.minutos(f.desde) && m < U.minutos(f.hasta); });
    },
    duracion: function (seg) {
      seg = Math.max(0, Math.round(seg));
      return Math.floor(seg / 60) + ':' + dos(seg % 60);
    },
    clon: function (o) { return JSON.parse(JSON.stringify(o)); },
    limpiarTexto: function (t, max) {
      return String(t || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 140);
    }
  };

  /* ---------- Persistencia básica ---------- */
  var PREF = 'avf1_';
  var TIPOS = ['reporte', 'calificacion', 'respuestaTop', 'auditoria', 'ronda', 'recorrido', 'sesionPrueba'];
  var memoria = {};
  var localDisponible = true;

  function leer(clave) {
    var crudo;
    try { crudo = root.localStorage.getItem(PREF + clave); } catch (e) { localDisponible = false; crudo = undefined; }
    if (crudo === null || crudo === undefined) {
      return memoria[clave] !== undefined ? U.clon(memoria[clave]) : null;
    }
    try { return JSON.parse(crudo); } catch (e) { return null; }
  }
  function escribir(clave, valor) {
    memoria[clave] = U.clon(valor);
    try { root.localStorage.setItem(PREF + clave, JSON.stringify(valor)); } catch (e) { localDisponible = false; }
  }

  /* ---------- Configuración ---------- */
  var CATALOGO = [
    ['Arroz 1 kg', 'Granos'], ['Aceite 1 L', 'Despensa'], ['Huevos x30', 'Frescos'], ['Leche 1,1 L', 'Lácteos'],
    ['Azúcar 1 kg', 'Despensa'], ['Panela', 'Despensa'], ['Café 250 g', 'Despensa'], ['Pasta 500 g', 'Granos'],
    ['Atún', 'Enlatados'], ['Lentejas 500 g', 'Granos'], ['Harina de maíz 1 kg', 'Despensa'],
    ['Papel higiénico x4', 'Aseo'], ['Jabón de barra', 'Aseo'], ['Detergente 1 kg', 'Aseo'], ['Agua 6 L', 'Bebidas'],
    ['Gaseosa 1,5 L', 'Bebidas'], ['Pan tajado', 'Panadería'], ['Queso costeño', 'Lácteos'],
    ['Salchichas', 'Carnes frías'], ['Avena', 'Granos']
  ].map(function (p) { return { nombre: p[0], seccion: p[1] }; });

  var CONFIG_BASE = {
    tiendas: { T1: 'Tienda piloto 1', T2: 'Tienda piloto 2' },
    catalogo: CATALOGO,
    pasillos: 6,
    picos: [{ desde: '07:00', hasta: '09:00' }, { desde: '17:00', hasta: '20:00' }],
    // Metas supuestas por el equipo (editables en Ajustes)
    metas: {
      1: { valor: 5, sentido: 'menor' }, 2: { valor: 90, sentido: 'mayor' }, 3: { valor: 80, sentido: 'mayor' },
      4: { valor: 80, sentido: 'mayor' }, 5: { valor: 10, sentido: 'menor' }, 6: { valor: 70, sentido: 'mayor' },
      7: { valor: 90, sentido: 'mayor' }, 8: { valor: 8, sentido: 'menor' }, 9: { valor: 1, sentido: 'menor' }
    },
    pin: '2026',
    adaptador: 'local',
    urlScript: '',
    urlBase: '',
    incluirDemo: true
  };

  function config() {
    var c = leer('config') || {};
    var base = U.clon(CONFIG_BASE);
    Object.keys(c).forEach(function (k) { base[k] = c[k]; });
    Object.keys(CONFIG_BASE.metas).forEach(function (k) {
      if (!base.metas[k]) base.metas[k] = U.clon(CONFIG_BASE.metas[k]);
    });
    return base;
  }
  function guardarConfig(parcial) {
    var actual = leer('config') || {};
    Object.keys(parcial).forEach(function (k) { actual[k] = parcial[k]; });
    escribir('config', actual);
    reiniciarSync();
    avisar('config');
  }

  /* ---------- Suscriptores ---------- */
  var oyentes = [];
  function avisar(origen) { oyentes.forEach(function (fn) { try { fn(origen); } catch (e) { console.error(e); } }); }
  root.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf(PREF) === 0) avisar('otra-pestana');
  });

  /* ---------- Adaptador compartido (Apps Script) ---------- */
  var sync = { enviando: false, error: '', ultimo: null, temporizador: null };

  function cola() { return leer('cola') || []; }
  function guardarCola(c) { escribir('cola', c); }

  function encolar(op) {
    if (config().adaptador !== 'compartido') return;
    var c = cola(); c.push(op); guardarCola(c);
    enviarCola();
  }

  function enviarCola() {
    var cfg = config();
    if (cfg.adaptador !== 'compartido' || !cfg.urlScript || sync.enviando) return;
    var c = cola();
    if (!c.length) return;
    var lote = c.slice(0, 50);
    sync.enviando = true;
    fetch(cfg.urlScript, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ops: lote })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'Respuesta inválida');
      var resto = cola().slice(lote.length);
      guardarCola(resto);
      sync.enviando = false; sync.error = ''; sync.ultimo = new Date().toISOString();
      avisar('sync');
      if (resto.length) enviarCola();
    }).catch(function (e) {
      sync.enviando = false;
      sync.error = 'Sin conexión con la hoja: los envíos quedan en cola (' + cola().length + ').';
      avisar('sync');
    });
  }

  function aplicarCola(tipo, registros) {
    var mapa = {};
    registros.forEach(function (r) { mapa[r.id] = r; });
    cola().forEach(function (op) {
      if (op.op === 'set' && op.tipo === tipo) mapa[op.registro.id] = op.registro;
      if (op.op === 'del' && op.tipo === tipo) delete mapa[op.id];
      if (op.op === 'borrarDemo') Object.keys(mapa).forEach(function (k) { if (mapa[k].demo) delete mapa[k]; });
    });
    return Object.keys(mapa).map(function (k) { return mapa[k]; })
      .sort(function (a, b) { return String(a.creado).localeCompare(String(b.creado)); });
  }

  function consultar() {
    var cfg = config();
    if (cfg.adaptador !== 'compartido' || !cfg.urlScript) return Promise.resolve(false);
    var url = cfg.urlScript + (cfg.urlScript.indexOf('?') >= 0 ? '&' : '?') + 'accion=listar&_=' + Date.now();
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'Respuesta inválida');
      var cambio = false;
      TIPOS.forEach(function (tipo) {
        var nuevo = aplicarCola(tipo, (j.datos && j.datos[tipo]) || []);
        if (JSON.stringify(nuevo) !== JSON.stringify(leer(tipo) || [])) { escribir(tipo, nuevo); cambio = true; }
      });
      sync.error = ''; sync.ultimo = new Date().toISOString();
      enviarCola();
      avisar(cambio ? 'sync-datos' : 'sync');
      return true;
    }).catch(function (e) {
      sync.error = 'No se pudo consultar la hoja compartida. Se sigue trabajando con la copia local.';
      avisar('sync');
      return false;
    });
  }

  function reiniciarSync() {
    if (sync.temporizador) { clearInterval(sync.temporizador); sync.temporizador = null; }
    var cfg = config();
    if (cfg.adaptador === 'compartido' && cfg.urlScript) {
      consultar();
      sync.temporizador = setInterval(consultar, 10000);
    }
  }

  /* ---------- API de datos ---------- */
  function lista(tipo) { return leer(tipo) || []; }

  function guardarLista(tipo, registros) { escribir(tipo, registros); }

  function agregar(tipo, obj) {
    var r = U.clon(obj);
    r.id = r.id || U.id(tipo.slice(0, 3));
    r.creado = r.creado || new Date().toISOString();
    r.demo = r.demo === true;
    r.tienda = r.tienda || 'T1';
    var l = lista(tipo); l.push(r); guardarLista(tipo, l);
    encolar({ op: 'set', tipo: tipo, registro: r });
    avisar(tipo);
    return r;
  }

  function agregarVarios(tipo, registros) {
    var l = lista(tipo);
    registros.forEach(function (o) {
      var r = U.clon(o);
      r.id = r.id || U.id(tipo.slice(0, 3));
      r.creado = r.creado || new Date().toISOString();
      r.demo = r.demo === true;
      r.tienda = r.tienda || 'T1';
      l.push(r);
      encolar({ op: 'set', tipo: tipo, registro: r });
    });
    guardarLista(tipo, l);
    avisar(tipo);
  }

  function actualizar(tipo, id, cambios) {
    var l = lista(tipo), hecho = null;
    l.forEach(function (r) {
      if (r.id === id) { Object.keys(cambios).forEach(function (k) { r[k] = cambios[k]; }); hecho = r; }
    });
    if (hecho) {
      guardarLista(tipo, l);
      encolar({ op: 'set', tipo: tipo, registro: hecho });
      avisar(tipo);
    }
    return hecho;
  }

  function eliminar(tipo, id) {
    guardarLista(tipo, lista(tipo).filter(function (r) { return r.id !== id; }));
    encolar({ op: 'del', tipo: tipo, id: id });
    avisar(tipo);
  }

  function borrarDemo() {
    TIPOS.forEach(function (t) { guardarLista(t, lista(t).filter(function (r) { return !r.demo; })); });
    encolar({ op: 'borrarDemo' });
    avisar('demo');
  }

  function hayDemo() {
    return TIPOS.some(function (t) { return lista(t).some(function (r) { return r.demo; }); });
  }

  // Importa un respaldo JSON. Agrega solo los registros cuyo id no existe.
  function importar(datos) {
    var agregados = 0;
    TIPOS.forEach(function (t) {
      var entrantes = (datos && datos[t]) || [];
      if (!Array.isArray(entrantes)) return;
      var existentes = {};
      lista(t).forEach(function (r) { existentes[r.id] = true; });
      var nuevos = entrantes.filter(function (r) { return r && r.id && !existentes[r.id]; });
      if (nuevos.length) { agregarVarios(t, nuevos); agregados += nuevos.length; }
    });
    return agregados;
  }

  function estadoSync() {
    var cfg = config();
    return {
      adaptador: cfg.adaptador,
      pendientes: cola().length,
      ultimo: sync.ultimo,
      error: sync.error,
      localDisponible: localDisponible
    };
  }

  var Store = {
    TIPOS: TIPOS,
    lista: lista,
    agregar: agregar,
    agregarVarios: agregarVarios,
    actualizar: actualizar,
    eliminar: eliminar,
    borrarDemo: borrarDemo,
    hayDemo: hayDemo,
    importar: importar,
    config: config,
    guardarConfig: guardarConfig,
    alCambiar: function (fn) { oyentes.push(fn); },
    estadoSync: estadoSync,
    consultar: consultar,
    enviarCola: enviarCola,
    iniciar: reiniciarSync,
    // Valores por dispositivo que no son entidades (antirrebote, filtros)
    leerLocal: leer,
    escribirLocal: escribir
  };

  root.U = U;
  root.Store = Store;
})(this);
