/*
 * vistas.js · Pantallas del cliente y del personal.
 * Cada vista recibe el contenedor <main> y pinta su HTML y sus eventos.
 */
(function (root) {
  'use strict';

  var V = {};

  /* ---------- Ayudantes ---------- */
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  var esc = U.esc;

  function rotulo(r) { return r && r.demo ? ' <span class="rotulo-demo">' + U.ROTULO_DEMO + '</span>' : ''; }
  function nombreTienda(t) {
    var c = Store.config();
    return t === 'ambas' ? 'Ambas tiendas' : (c.tiendas[t] || t);
  }
  function opcionesTienda(sel, conAmbas) {
    var c = Store.config(), html = '';
    if (conAmbas) html += '<option value="ambas"' + (sel === 'ambas' ? ' selected' : '') + '>Ambas (T1 y T2)</option>';
    Object.keys(c.tiendas).forEach(function (t) {
      html += '<option value="' + t + '"' + (sel === t ? ' selected' : '') + '>' + t + ' · ' + esc(c.tiendas[t]) + '</option>';
    });
    return html;
  }
  function pl(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  function vacio(texto) { return '<p class="vacio">' + texto + '</p>'; }
  function valorKPI(def, v) {
    if (v === null || v === undefined) return 'Sin datos';
    if (def.unidad === '%') return U.num(v, 1) + ' %';
    if (def.unidad === 'min') return U.num(v, 1) + ' min';
    return U.num(v, 1) + ' por ronda';
  }
  function textoMeta(def, meta) {
    var u = def.unidad === '%' ? ' %' : def.unidad === 'min' ? ' min' : ' por ronda';
    return (meta.sentido === 'menor' ? '≤ ' : '≥ ') + U.num(meta.valor, 1) + u;
  }
  function cara(n) {
    var boca = { 1: 'M12 28 Q20 19 28 28', 2: 'M13 26 Q20 22 27 26', 3: 'M13 24 L27 24', 4: 'M13 22 Q20 28 27 22', 5: 'M11 21 Q20 32 29 21' }[n];
    return '<svg viewBox="0 0 40 40" aria-hidden="true" class="cara"><circle cx="20" cy="20" r="18" class="cara-fondo"/>' +
      '<circle cx="14" cy="15" r="2.4" class="cara-ojo"/><circle cx="26" cy="15" r="2.4" class="cara-ojo"/>' +
      '<path d="' + boca + '" class="cara-boca"/></svg>';
  }
  var NOTAS = { 1: 'Muy mala', 2: 'Mala', 3: 'Regular', 4: 'Buena', 5: 'Muy buena' };
  var MOTIVOS = ['trato', 'fila larga', 'no encontré el producto', 'pasillos llenos', 'otro'];

  function contador(campo, salida) {
    function act() { salida.textContent = campo.value.length + ' de ' + campo.maxLength + ' caracteres'; }
    campo.addEventListener('input', act); act();
  }

  /* ---------- Filtros y cálculos del tablero ---------- */
  function enRango(iso, f) {
    var d = U.diaISO(iso);
    return (!f.desde || d >= f.desde) && (!f.hasta || d <= f.hasta);
  }
  function filtrar(tipo, f, sinFechas) {
    var demo = Store.config().incluirDemo;
    return Store.lista(tipo).filter(function (r) {
      if (!demo && r.demo) return false;
      if (f.tienda !== 'ambas' && r.tienda !== f.tienda) return false;
      if (sinFechas) return true;
      return enRango(r.hora || r.creado, f);
    });
  }
  function top5Mes(alcance) {
    var mes = U.mesClave();
    var reps = filtrar('reporte', { tienda: alcance }, true).filter(function (r) { return U.mesClave(r.creado) === mes; });
    return KPI.top5(reps);
  }
  function respuestasMes(alcance) {
    var mes = U.mesClave(), demo = Store.config().incluirDemo;
    return Store.lista('respuestaTop').filter(function (r) {
      return r.mes === mes && r.tienda === alcance && (demo || !r.demo);
    });
  }

  function calcular(f) {
    var defs = KPI.DEFINICIONES;
    var auds = filtrar('auditoria', f), reps = filtrar('reporte', f), cals = filtrar('calificacion', f);
    var rondas = filtrar('ronda', f), recs = filtrar('recorrido', f);
    var top = top5Mes(f.tienda), resps = respuestasMes(f.tienda);
    var picoR = rondas.filter(function (r) { return r.pico; }).length;
    var picoRec = recs.filter(function (r) { return r.pico; }).length;
    var consultaron = cals.filter(function (c) { return c.consulto === true; }).length;
    var res = {
      1: [KPI.quiebre(auds), pl(auds.length, 'auditoría', 'auditorías')],
      2: [KPI.atendidosATiempo(reps), pl(reps.length, 'reporte', 'reportes')],
      3: [KPI.pedidosRespondidos(top, resps), pl(top.length, 'producto', 'productos') + ' en el top 5 de ' + U.mesNombre(U.mesClave())],
      4: [KPI.satisfaccion(cals), pl(cals.length, 'calificación', 'calificaciones')],
      5: [KPI.quejas(cals), pl(cals.length, 'calificación', 'calificaciones')],
      6: [KPI.consultasResueltas(cals), pl(consultaron, 'calificación', 'calificaciones') + ' que consultaron al anfitrión'],
      7: [KPI.pasillosDespejados(rondas), pl(picoR, 'ronda', 'rondas') + ' en hora pico'],
      8: [KPI.tiempoRecorrido(recs), pl(picoRec, 'recorrido', 'recorridos') + ' en hora pico'],
      9: [KPI.bloqueosPorHora(rondas), pl(picoR, 'ronda', 'rondas') + ' en hora pico']
    };
    return defs.map(function (d) { return { def: d, r: res[d.id][0], registros: res[d.id][1] }; });
  }

  function detalleCalculo(def, r) {
    if (!r.denominador) return 'Denominador 0: no hay registros para calcular.';
    if (def.id === 1) return r.numerador + ' ausentes de ' + r.denominador + ' auditados · promedio de ' + pl(r.auditorias, 'auditoría', 'auditorías');
    if (def.id === 8) return U.num(r.numerador, 1) + ' min ÷ ' + r.denominador + ' recorridos';
    if (def.id === 9) return r.numerador + ' bloqueos ÷ ' + r.denominador + ' rondas';
    return r.numerador + ' ÷ ' + r.denominador;
  }

  /* ---------- Gráficos SVG ---------- */
  function svgAbre(w, h, etiqueta) {
    return '<svg class="grafico" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(etiqueta) + '">';
  }
  function barrasH(datos, etiqueta) {
    if (!datos.length) return vacio('Aún no hay reportes en este periodo.');
    var w = 560, fila = 26, izq = 170, h = datos.length * fila + 8;
    var max = Math.max.apply(null, datos.map(function (d) { return d.valor; })) || 1;
    var s = svgAbre(w, h, etiqueta);
    datos.forEach(function (d, i) {
      var y = i * fila + 4, ancho = (w - izq - 40) * d.valor / max;
      s += '<text x="' + (izq - 8) + '" y="' + (y + 16) + '" class="g-etq" text-anchor="end">' + esc(d.etiqueta) + '</text>' +
        '<rect x="' + izq + '" y="' + (y + 3) + '" width="' + Math.max(ancho, 2) + '" height="' + (fila - 8) + '" rx="3" class="g-barra"/>' +
        '<text x="' + (izq + ancho + 6) + '" y="' + (y + 16) + '" class="g-val">' + d.valor + '</text>';
    });
    return s + '</svg>';
  }
  function barrasHora(conteo, picos) {
    var total = conteo.reduce(function (a, b) { return a + b; }, 0);
    if (!total) return vacio('Aún no hay reportes en este periodo.');
    var w = 560, h = 210, izq = 34, abajo = 28, arriba = 12;
    var ancho = (w - izq - 8) / 24, alto = h - abajo - arriba;
    var max = Math.max.apply(null, conteo) || 1;
    var s = svgAbre(w, h, 'Reportes por franja horaria');
    picos.forEach(function (f) {
      var x1 = izq + U.minutos(f.desde) / 60 * ancho, x2 = izq + U.minutos(f.hasta) / 60 * ancho;
      s += '<rect x="' + x1 + '" y="' + arriba + '" width="' + (x2 - x1) + '" height="' + alto + '" class="g-banda"/>';
    });
    s += '<text x="' + (izq - 6) + '" y="' + (arriba + 10) + '" class="g-eje" text-anchor="end">' + max + '</text>' +
      '<text x="' + (izq - 6) + '" y="' + (arriba + alto) + '" class="g-eje" text-anchor="end">0</text>' +
      '<line x1="' + izq + '" y1="' + (arriba + alto) + '" x2="' + (w - 8) + '" y2="' + (arriba + alto) + '" class="g-linea-base"/>';
    conteo.forEach(function (n, hh) {
      var bh = alto * n / max, x = izq + hh * ancho;
      if (n) s += '<rect x="' + (x + 2) + '" y="' + (arriba + alto - bh) + '" width="' + (ancho - 4) + '" height="' + bh + '" rx="2" class="g-barra"><title>' +
        U.horaTexto(hh + ':00') + ': ' + pl(n, 'reporte', 'reportes') + '</title></rect>';
      if (hh % 3 === 0) s += '<text x="' + (x + ancho / 2) + '" y="' + (h - 8) + '" class="g-eje" text-anchor="middle">' + U.horaTexto(hh + ':00').replace(':00', '') + '</text>';
    });
    return s + '</svg><p class="g-nota"><span class="muestra-banda" aria-hidden="true"></span> Franjas de hora pico configuradas</p>';
  }
  function linea(dias) {
    var total = dias.reduce(function (a, d) { return a + d.n; }, 0);
    if (!total) return vacio('Aún no hay reportes en este periodo.');
    var w = 560, h = 200, izq = 34, abajo = 28, arriba = 14, der = 12;
    var alto = h - abajo - arriba, paso = dias.length > 1 ? (w - izq - der) / (dias.length - 1) : 0;
    var max = Math.max.apply(null, dias.map(function (d) { return d.n; })) || 1;
    var pts = dias.map(function (d, i) { return [izq + i * paso, arriba + alto - alto * d.n / max]; });
    var s = svgAbre(w, h, 'Reportes por día');
    s += '<text x="' + (izq - 6) + '" y="' + (arriba + 8) + '" class="g-eje" text-anchor="end">' + max + '</text>' +
      '<text x="' + (izq - 6) + '" y="' + (arriba + alto) + '" class="g-eje" text-anchor="end">0</text>' +
      '<line x1="' + izq + '" y1="' + (arriba + alto) + '" x2="' + (w - der) + '" y2="' + (arriba + alto) + '" class="g-linea-base"/>' +
      '<polyline points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '" class="g-trazo"/>';
    pts.forEach(function (p, i) {
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" class="g-punto"><title>' + U.fecha(dias[i].fecha) + ': ' + pl(dias[i].n, 'reporte', 'reportes') + '</title></circle>';
    });
    var marcas = [0, Math.floor((dias.length - 1) / 2), dias.length - 1].filter(function (v, i, a) { return a.indexOf(v) === i; });
    marcas.forEach(function (i) {
      s += '<text x="' + pts[i][0] + '" y="' + (h - 8) + '" class="g-eje" text-anchor="' + (i === 0 ? 'start' : i === dias.length - 1 ? 'end' : 'middle') + '">' +
        U.fecha(dias[i].fecha).slice(0, 5) + '</text>';
    });
    return s + '</svg>';
  }
  function comparacion(filas) {
    var w = 560, fila = 46, izq = 200, h = filas.length * fila + 30;
    var s = svgAbre(w, h, 'Comparación de T1 y T2');
    s += '<rect x="' + izq + '" y="4" width="12" height="12" class="g-barra"/><text x="' + (izq + 18) + '" y="14" class="g-etq">T1</text>' +
      '<rect x="' + (izq + 60) + '" y="4" width="12" height="12" class="g-barra-2"/><text x="' + (izq + 78) + '" y="14" class="g-etq">T2</text>';
    filas.forEach(function (f, i) {
      var y = 26 + i * fila, anchoMax = w - izq - 70;
      s += '<text x="' + (izq - 8) + '" y="' + (y + 22) + '" class="g-etq" text-anchor="end">' + esc(f.nombre) + '</text>';
      [['t1', 'g-barra', 0], ['t2', 'g-barra-2', 18]].forEach(function (c) {
        var v = f[c[0]], yy = y + c[2];
        if (v === null) {
          s += '<text x="' + izq + '" y="' + (yy + 12) + '" class="g-sin">Sin datos</text>';
        } else {
          var a = anchoMax * Math.min(v, 100) / 100;
          s += '<rect x="' + izq + '" y="' + yy + '" width="' + Math.max(a, 2) + '" height="15" rx="2" class="' + c[1] + '"/>' +
            '<text x="' + (izq + a + 6) + '" y="' + (yy + 12) + '" class="g-val">' + U.num(v, 1) + ' %</text>';
        }
      });
    });
    return s + '</svg>';
  }

  /* =========================================================
   * VISTA DEL CLIENTE
   * ========================================================= */
  V.inicio = function (main) {
    var ctx = App.ctx;
    main.innerHTML = '<section class="cliente">' +
      '<h1>¿Te ayudamos con tu compra?</h1>' +
      '<p class="contexto">' + esc(nombreTienda(ctx.tienda)) + ' · ' + esc(QR.nombrePunto(ctx.punto)) + '</p>' +
      '<a class="boton-grande primario" href="#reportar">No encontré un producto</a>' +
      '<a class="boton-grande secundario" href="#calificar">Califica la atención</a>' +
      '<a class="enlace-sec" href="#top5">Lo que más nos piden</a>' +
      '<p class="aviso-pago" role="note"><strong>Este código no sirve para pagar.</strong> Paga solo en la caja de la tienda.</p>' +
      '<p class="nota-privacidad">No pedimos tu nombre, teléfono ni correo.</p>' +
      '<p class="acceso-personal"><a href="#panel">Acceso del personal</a></p>' +
      '</section>';
  };

  V.reportar = function (main) {
    var cfg = Store.config(), seleccion = null;
    main.innerHTML = '<section class="cliente">' +
      '<a class="volver" href="#inicio">← Volver</a>' +
      '<h1>¿Qué producto no encontraste?</h1>' +
      '<form id="f-reporte" novalidate>' +
      '<label for="buscar">Busca el producto</label>' +
      '<input id="buscar" type="search" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="sugerencias" placeholder="Ej.: arroz, aceite, leche">' +
      '<ul id="sugerencias" class="sugerencias" role="listbox" aria-label="Productos sugeridos" hidden></ul>' +
      '<p id="elegido" class="elegido" hidden></p>' +
      '<button type="button" id="btn-otro" class="boton-texto" aria-expanded="false" aria-controls="bloque-otro">Otro producto (no está en la lista)</button>' +
      '<div id="bloque-otro" hidden>' +
      '<label for="otro">Escribe el producto</label>' +
      '<input id="otro" type="text" maxlength="40" autocomplete="off">' +
      '<p class="ayuda"><span id="cuenta-otro"></span> · No escribas datos personales.</p>' +
      '</div>' +
      '<p class="error" id="error-reporte" role="alert"></p>' +
      '<button type="submit" class="boton-grande primario">Enviar</button>' +
      '</form>' +
      '<p class="nota-catalogo">Sugerencias: lista de referencia del equipo (supuesto).</p>' +
      '</section>';

    var buscar = $('#buscar'), lista = $('#sugerencias'), elegido = $('#elegido'), err = $('#error-reporte');
    var otro = $('#otro'), bloqueOtro = $('#bloque-otro'), btnOtro = $('#btn-otro');
    contador(otro, $('#cuenta-otro'));

    function coincidencias(q) {
      var n = KPI.normalizar(q);
      if (!n) return [];
      return cfg.catalogo.filter(function (p) { return KPI.normalizar(p.nombre).indexOf(n) >= 0; }).slice(0, 6);
    }
    function elegir(p) {
      seleccion = p;
      buscar.value = p.nombre;
      lista.hidden = true; buscar.setAttribute('aria-expanded', 'false');
      elegido.hidden = false;
      elegido.innerHTML = 'Elegiste: <strong>' + esc(p.nombre) + '</strong> · ' + esc(p.seccion);
      bloqueOtro.hidden = true; btnOtro.setAttribute('aria-expanded', 'false'); otro.value = '';
      err.textContent = '';
    }
    function pintar() {
      var m = coincidencias(buscar.value);
      seleccion = null; elegido.hidden = true;
      lista.innerHTML = m.map(function (p, i) {
        return '<li role="option"><button type="button" data-i="' + i + '">' + esc(p.nombre) + ' <span>' + esc(p.seccion) + '</span></button></li>';
      }).join('') + (buscar.value.trim() && !m.length ? '<li class="sin-coinc">No está en la lista. Usa «Otro producto».</li>' : '');
      lista.hidden = !buscar.value.trim();
      buscar.setAttribute('aria-expanded', String(!lista.hidden));
      $$('button', lista).forEach(function (b) {
        b.addEventListener('click', function () { elegir(m[Number(b.dataset.i)]); });
        b.addEventListener('keydown', function (e) {
          var hermanos = $$('button', lista), i = hermanos.indexOf(b);
          if (e.key === 'ArrowDown' && hermanos[i + 1]) { e.preventDefault(); hermanos[i + 1].focus(); }
          if (e.key === 'ArrowUp') { e.preventDefault(); (hermanos[i - 1] || buscar).focus(); }
        });
      });
    }
    buscar.addEventListener('input', pintar);
    buscar.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { var b = $('button', lista); if (b) { e.preventDefault(); b.focus(); } }
    });
    btnOtro.addEventListener('click', function () {
      bloqueOtro.hidden = !bloqueOtro.hidden;
      btnOtro.setAttribute('aria-expanded', String(!bloqueOtro.hidden));
      if (!bloqueOtro.hidden) { seleccion = null; elegido.hidden = true; lista.hidden = true; otro.focus(); }
    });

    $('#f-reporte').addEventListener('submit', function (e) {
      e.preventDefault();
      var producto = null, seccion = 'Otra';
      if (!bloqueOtro.hidden && U.limpiarTexto(otro.value, 40)) {
        producto = U.limpiarTexto(otro.value, 40);
        var igual = cfg.catalogo.filter(function (p) { return KPI.normalizar(p.nombre) === KPI.normalizar(producto); })[0];
        if (igual) { producto = igual.nombre; seccion = igual.seccion; }
      } else {
        var p = seleccion || coincidencias(buscar.value).filter(function (x, i, a) {
          return a.length === 1 || KPI.normalizar(x.nombre) === KPI.normalizar(buscar.value);
        })[0];
        if (p) { producto = p.nombre; seccion = p.seccion; }
      }
      if (!producto) {
        err.textContent = 'Elige un producto de la lista o usa «Otro producto».';
        buscar.focus();
        return;
      }
      // Antirrebote: el mismo producto desde este dispositivo, máximo una vez cada 10 minutos.
      var mapa = Store.leerLocal('antirrebote') || {}, ahora = Date.now(), clave = KPI.normalizar(producto);
      Object.keys(mapa).forEach(function (k) { if (ahora - mapa[k] > 600000) delete mapa[k]; });
      if (mapa[clave]) {
        err.textContent = 'Ya recibimos tu reporte de «' + producto + '» hace unos minutos. Gracias, no hace falta repetirlo.';
        return;
      }
      mapa[clave] = ahora;
      Store.escribirLocal('antirrebote', mapa);
      Store.agregar('reporte', { tienda: App.ctx.tienda, producto: producto, seccion: seccion, punto: App.ctx.punto,
        estado: 'nuevo', resuelto: null });
      main.innerHTML = '<section class="cliente confirmacion">' +
        '<div class="icono-ok" aria-hidden="true">✓</div>' +
        '<h1 tabindex="-1" id="titulo-ok">Gracias. Revisamos tu reporte en menos de 48 horas.</h1>' +
        '<p>Reportaste: <strong>' + esc(producto) + '</strong></p>' +
        '<p class="sugerencia">Pregunta al anfitrión por un sustituto.</p>' +
        '<a class="boton-grande secundario" href="#top5">Ver lo que más nos piden</a>' +
        '<button type="button" class="boton-texto" id="otro-reporte">Reportar otro producto</button>' +
        '<a class="enlace-sec" href="#inicio">Volver al inicio</a>' +
        '</section>';
      $('#titulo-ok').focus();
      $('#otro-reporte').addEventListener('click', function () { V.reportar(main); $('#buscar').focus(); });
    });
  };

  V.calificar = function (main) {
    var caras = [1, 2, 3, 4, 5].map(function (n) {
      return '<input type="radio" name="nota" id="nota' + n + '" value="' + n + '" class="oculto-visual">' +
        '<label for="nota' + n + '" class="opcion-cara">' + cara(n) + '<span>' + n + ' · ' + NOTAS[n] + '</span></label>';
    }).join('');
    main.innerHTML = '<section class="cliente">' +
      '<a class="volver" href="#inicio">← Volver</a>' +
      '<h1>¿Cómo te atendimos hoy?</h1>' +
      '<form id="f-calificar" novalidate>' +
      '<fieldset><legend>Califica la atención de 1 a 5</legend><div class="caras">' + caras + '</div></fieldset>' +
      '<fieldset id="bloque-motivos" hidden><legend>¿Qué falló? (puedes marcar varias)</legend>' +
      MOTIVOS.map(function (m, i) {
        return '<label class="opcion"><input type="checkbox" name="motivo" value="' + m + '"> ' + m.charAt(0).toUpperCase() + m.slice(1) + '</label>';
      }).join('') + '</fieldset>' +
      '<fieldset><legend>¿Consultaste al anfitrión?</legend><div class="si-no">' +
      '<label class="opcion"><input type="radio" name="consulto" value="si"> Sí</label>' +
      '<label class="opcion"><input type="radio" name="consulto" value="no"> No</label></div></fieldset>' +
      '<fieldset id="bloque-encontro" hidden><legend>¿Encontraste el producto o un sustituto?</legend><div class="si-no">' +
      '<label class="opcion"><input type="radio" name="encontro" value="si"> Sí</label>' +
      '<label class="opcion"><input type="radio" name="encontro" value="no"> No</label></div></fieldset>' +
      '<label for="comentario">Comentario (opcional)</label>' +
      '<textarea id="comentario" maxlength="140" rows="3"></textarea>' +
      '<p class="ayuda"><span id="cuenta-com"></span> · No escribas datos personales.</p>' +
      '<p class="error" id="error-cal" role="alert"></p>' +
      '<button type="submit" class="boton-grande primario">Enviar calificación</button>' +
      '</form></section>';

    var f = $('#f-calificar');
    contador($('#comentario'), $('#cuenta-com'));
    f.addEventListener('change', function () {
      var nota = f.querySelector('input[name=nota]:checked');
      $('#bloque-motivos').hidden = !(nota && Number(nota.value) <= 2);
      var c = f.querySelector('input[name=consulto]:checked');
      $('#bloque-encontro').hidden = !(c && c.value === 'si');
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var nota = f.querySelector('input[name=nota]:checked');
      if (!nota) { $('#error-cal').textContent = 'Elige una calificación de 1 a 5.'; $('#nota1').focus(); return; }
      var n = Number(nota.value);
      var c = f.querySelector('input[name=consulto]:checked');
      var en = f.querySelector('input[name=encontro]:checked');
      var consulto = c ? c.value === 'si' : null;
      Store.agregar('calificacion', {
        tienda: App.ctx.tienda, punto: App.ctx.punto, nota: n,
        motivos: n <= 2 ? $$('input[name=motivo]:checked', f).map(function (x) { return x.value; }) : [],
        consulto: consulto,
        encontro: consulto ? (en ? en.value === 'si' : null) : null,
        comentario: U.limpiarTexto($('#comentario').value, 140)
      });
      main.innerHTML = '<section class="cliente confirmacion">' +
        '<div class="icono-ok" aria-hidden="true">✓</div>' +
        '<h1 tabindex="-1" id="titulo-ok">Gracias por calificar la atención.</h1>' +
        '<p>Tu opinión nos ayuda a mejorar el servicio en la tienda.</p>' +
        '<a class="boton-grande secundario" href="#inicio">Volver al inicio</a>' +
        '</section>';
      $('#titulo-ok').focus();
    });
  };

  V.top5 = function (main) {
    var t = App.ctx.tienda, mes = U.mesClave();
    var resp = Store.lista('respuestaTop').filter(function (r) {
      return r.publicada && r.mes === mes && (r.tienda === t || r.tienda === 'ambas');
    });
    // Si un producto tiene respuesta de la tienda y de ambas, se prefiere la de la tienda.
    var vistos = {};
    resp = resp.sort(function (a, b) { return (a.tienda === 'ambas') - (b.tienda === 'ambas'); }).filter(function (r) {
      var k = KPI.normalizar(r.producto);
      if (vistos[k]) return false;
      vistos[k] = true; return true;
    }).sort(function (a, b) { return (a.posicion || 9) - (b.posicion || 9); });
    main.innerHTML = '<section class="cliente">' +
      '<a class="volver" href="#inicio">← Volver</a>' +
      '<h1>Lo que más nos piden</h1>' +
      '<p class="contexto">' + esc(nombreTienda(t)) + ' · ' + U.mesNombre(mes) + '</p>' +
      (resp.length ? '<ol class="lista-top">' + resp.map(function (r) {
        return '<li><h2>' + esc(r.producto) + rotulo(r) + '</h2><p>' + esc(r.texto) + '</p>' +
          '<p class="meta">Respuesta publicada el ' + U.fecha(r.publicadaEn || r.creado) + '</p></li>';
      }).join('') + '</ol>' : vacio('Este mes aún no hay respuestas publicadas.')) +
      '<p class="ayuda">Cada mes respondemos los 5 productos más reportados: cuándo vuelven o por qué no vuelven.</p>' +
      '<a class="boton-grande primario" href="#reportar">No encontré un producto</a>' +
      '</section>';
  };

  /* =========================================================
   * VISTA DEL PERSONAL
   * ========================================================= */
  V.pin = function (main, destino) {
    main.innerHTML = '<section class="tarjeta pin">' +
      '<h1>Acceso del personal</h1>' +
      '<p class="aviso-demo-acceso">Acceso de demostración, no es seguridad real.</p>' +
      '<form id="f-pin" novalidate>' +
      '<label for="pin">PIN de 4 dígitos</label>' +
      '<input id="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" pattern="[0-9]{4}">' +
      '<p class="error" id="error-pin" role="alert"></p>' +
      '<button type="submit" class="boton primario">Entrar</button>' +
      '</form>' +
      '<p><a href="#inicio">Volver a la vista del cliente</a></p></section>';
    $('#pin').focus();
    $('#f-pin').addEventListener('submit', function (e) {
      e.preventDefault();
      if ($('#pin').value === Store.config().pin) { App.autenticar(); App.render(true); }
      else { $('#error-pin').textContent = 'PIN incorrecto.'; $('#pin').value = ''; $('#pin').focus(); }
    });
  };

  V.panel = function (main) {
    var cfg = Store.config(), f = App.filtros;
    var kpis = calcular(f);
    var reps = filtrar('reporte', f);
    var hayDemo = Store.hayDemo();

    // Tarjetas
    var tarjetas = kpis.map(function (k) {
      var meta = cfg.metas[k.def.id], est = KPI.estado(k.r.valor, meta);
      var textoEst = est === 'verde' ? 'Cumple la meta' : est === 'ambar' ? 'No cumple la meta' : 'Sin datos';
      return '<article class="kpi estado-' + est + '" aria-labelledby="kpi-t' + k.def.id + '">' +
        '<div class="kpi-cab"><span class="kpi-num">' + k.def.id + '</span><span class="kpi-dec">Decisión ' + k.def.decision + '</span></div>' +
        '<h3 id="kpi-t' + k.def.id + '">' + esc(k.def.nombre) + '</h3>' +
        '<p class="kpi-valor' + (k.r.valor === null ? ' sin-datos' : '') + '">' + valorKPI(k.def, k.r.valor) + '</p>' +
        '<p class="kpi-estado"><span class="semaforo" aria-hidden="true"></span>' + textoEst +
        ' · <span class="meta-sup">meta supuesta ' + textoMeta(k.def, meta) + '</span></p>' +
        '<p class="kpi-formula"><span>Fórmula:</span> ' + esc(k.def.formula) + '</p>' +
        '<p class="kpi-calc">' + detalleCalculo(k.def, k.r) + '</p>' +
        '<p class="kpi-reg">Registros usados: ' + esc(k.registros) + '</p>' +
        '</article>';
    }).join('');

    // Gráficos
    var conteoProd = {};
    reps.forEach(function (r) { conteoProd[r.producto] = (conteoProd[r.producto] || 0) + 1; });
    var top10 = Object.keys(conteoProd).map(function (p) { return { etiqueta: p, valor: conteoProd[p] }; })
      .sort(function (a, b) { return b.valor - a.valor || a.etiqueta.localeCompare(b.etiqueta, 'es'); }).slice(0, 10);
    var porHora = []; for (var h = 0; h < 24; h++) porHora.push(0);
    reps.forEach(function (r) { porHora[new Date(r.creado).getHours()] += 1; });
    var dias = [], d = new Date(f.desde + 'T00:00:00'), fin = new Date(f.hasta + 'T00:00:00');
    var porDia = {};
    reps.forEach(function (r) { var k = U.diaISO(r.creado); porDia[k] = (porDia[k] || 0) + 1; });
    for (var guard = 0; d <= fin && guard < 400; guard++) {
      var k = U.diaISO(d); dias.push({ fecha: k + 'T12:00:00', n: porDia[k] || 0 }); d.setDate(d.getDate() + 1);
    }
    var comp = [1, 2, 4, 5, 7].map(function (id) {
      var def = KPI.DEFINICIONES[id - 1];
      var t1 = calcular({ tienda: 'T1', desde: f.desde, hasta: f.hasta })[id - 1].r.valor;
      var t2 = calcular({ tienda: 'T2', desde: f.desde, hasta: f.hasta })[id - 1].r.valor;
      return { nombre: id + ' · ' + def.nombre, t1: t1, t2: t2 };
    });

    // Bandeja
    var ahora = Date.now();
    var bandeja = reps.slice().sort(function (a, b) { return b.creado.localeCompare(a.creado); });
    var atrasados = bandeja.filter(function (r) { return r.estado !== 'resuelto' && ahora - Date.parse(r.creado) > 48 * 3600000; }).length;
    var filas = bandeja.slice(0, 60).map(function (r) {
      var atrasado = r.estado !== 'resuelto' && ahora - Date.parse(r.creado) > 48 * 3600000;
      var horas = Math.floor(((r.resuelto ? Date.parse(r.resuelto) : ahora) - Date.parse(r.creado)) / 3600000);
      return '<tr class="' + (atrasado ? 'atrasado' : '') + '">' +
        '<td>' + U.fechaHora(r.creado) + '</td><td>' + esc(r.tienda) + '</td>' +
        '<td><strong>' + esc(r.producto) + '</strong>' + rotulo(r) + '</td><td>' + esc(r.seccion) + '</td>' +
        '<td>' + esc(QR.nombrePunto(r.punto)) + '</td>' +
        '<td><label class="oculto-visual" for="est-' + r.id + '">Estado de ' + esc(r.producto) + '</label>' +
        '<select id="est-' + r.id + '" data-id="' + r.id + '" class="sel-estado">' +
        ['nuevo', 'en gestión', 'resuelto'].map(function (e) {
          return '<option' + (r.estado === e ? ' selected' : '') + '>' + e + '</option>';
        }).join('') + '</select></td>' +
        '<td>' + (atrasado ? '<span class="alerta-48">Más de 48 h sin resolver (' + horas + ' h)</span>' :
          r.estado === 'resuelto' ? 'Resuelto en ' + horas + ' h' : horas + ' h abierto') + '</td></tr>';
    }).join('');

    // Top 5 del mes
    var top = top5Mes(f.tienda), resp = respuestasMes(f.tienda), mes = U.mesClave();
    var bloquesTop = top.map(function (t, i) {
      var r = resp.filter(function (x) { return KPI.normalizar(x.producto) === KPI.normalizar(t.producto); })[0];
      var clave = f.tienda + '|' + KPI.normalizar(t.producto);
      var texto = App.borradores[clave] !== undefined ? App.borradores[clave] : (r ? r.texto : '');
      return '<li class="top-item">' +
        '<div class="top-cab"><span class="top-pos">' + (i + 1) + '</span><strong>' + esc(t.producto) + '</strong> · ' + pl(t.n, 'reporte', 'reportes') +
        (t.demo ? ' <span class="rotulo-demo">incluye ' + U.ROTULO_DEMO + '</span>' : '') +
        (r && r.publicada ? ' <span class="chip-ok">Publicada</span>' : '') + '</div>' +
        '<label for="resp-' + i + '">Respuesta para el cliente: cuándo vuelve o por qué no vuelve</label>' +
        '<textarea id="resp-' + i + '" maxlength="140" rows="2" data-clave="' + esc(clave) + '">' + esc(texto) + '</textarea>' +
        '<p class="ayuda">Máximo 140 caracteres. No escribas datos personales.</p>' +
        '<div class="acciones"><button type="button" class="boton primario btn-publicar" data-i="' + i + '">' +
        (r && r.publicada ? 'Actualizar publicación' : 'Publicar') + '</button>' +
        (r && r.publicada ? '<button type="button" class="boton btn-retirar" data-id="' + r.id + '">Retirar publicación</button>' : '') +
        '</div></li>';
    }).join('');

    main.innerHTML = '<section class="personal">' +
      '<div class="titulo-fila"><h1>Tablero de control</h1>' + '<p class="sync-estado">' + textoSync() + '</p></div>' +
      '<form class="filtros" id="f-filtros" onsubmit="return false">' +
      '<div><label for="fil-tienda">Tienda</label><select id="fil-tienda">' + opcionesTienda(f.tienda, true) + '</select></div>' +
      '<div><label for="fil-desde">Desde</label><input type="date" id="fil-desde" value="' + f.desde + '"></div>' +
      '<div><label for="fil-hasta">Hasta</label><input type="date" id="fil-hasta" value="' + f.hasta + '"></div>' +
      '<div class="interruptor"><input type="checkbox" id="fil-demo"' + (cfg.incluirDemo ? ' checked' : '') + '>' +
      '<label for="fil-demo">Incluir datos de demostración</label></div>' +
      '</form>' +
      (cfg.incluirDemo && hayDemo ? '<p class="banda-demo">Las cifras incluyen ' + U.ROTULO_DEMO + '. No son resultados reales. Apaga el interruptor para verlas sin ellos.</p>' : '') +
      (!Store.lista('reporte').length && !hayDemo ? '<p class="vacio">Aún no hay reportes. Escanea un QR o carga datos de demostración desde <a href="#ajustes">Ajustes</a>.</p>' : '') +
      '<h2 class="oculto-visual">Indicadores</h2>' +
      '<div class="kpis">' + tarjetas + '</div>' +
      '<div class="graficos">' +
      '<section class="tarjeta"><h2>Reportes por producto (10 más reportados)</h2>' + barrasH(top10, 'Reportes por producto') + '</section>' +
      '<section class="tarjeta"><h2>Reportes por franja horaria</h2>' + barrasHora(porHora, cfg.picos) + '</section>' +
      '<section class="tarjeta"><h2>Reportes por día</h2>' + linea(dias) + '</section>' +
      '<section class="tarjeta"><h2>Comparación T1 y T2 (mismo periodo)</h2>' + comparacion(comp) + '</section>' +
      '</div>' +
      '<section class="tarjeta"><h2>Bandeja de reportes <span class="cuenta">' + bandeja.length + '</span>' +
      (atrasados ? ' <span class="alerta-48">' + atrasados + ' con más de 48 h sin resolver</span>' : '') + '</h2>' +
      (bandeja.length ? '<div class="tabla-envoltura"><table><thead><tr><th>Fecha y hora</th><th>Tienda</th><th>Producto</th><th>Sección</th><th>Punto del QR</th><th>Estado</th><th>Tiempo</th></tr></thead><tbody>' +
        filas + '</tbody></table></div>' + (bandeja.length > 60 ? '<p class="ayuda">Mostrando 60 de ' + bandeja.length + '. Ajusta los filtros para ver otros.</p>' : '') :
        vacio('Aún no hay reportes en este periodo. Escanea un QR o carga datos de demostración desde Ajustes.')) +
      '</section>' +
      '<section class="tarjeta"><h2>Top 5 del mes · ' + U.mesNombre(mes) + ' · ' + esc(nombreTienda(f.tienda)) + '</h2>' +
      '<p class="ayuda">Se calcula solo con los reportes del mes en curso (sin importar el rango de fechas). Al publicar, la respuesta aparece en «Lo que más nos piden» del cliente.</p>' +
      (top.length ? '<ol class="lista-top-panel">' + bloquesTop + '</ol>' : vacio('Aún no hay reportes este mes.')) +
      '<p class="error" id="error-top" role="alert"></p>' +
      '</section></section>';

    // Eventos
    $('#fil-tienda').addEventListener('change', function () { App.filtros.tienda = this.value; App.rerender(); });
    $('#fil-desde').addEventListener('change', function () { if (this.value) { App.filtros.desde = this.value; App.rerender(); } });
    $('#fil-hasta').addEventListener('change', function () { if (this.value) { App.filtros.hasta = this.value; App.rerender(); } });
    $('#fil-demo').addEventListener('change', function () { Store.guardarConfig({ incluirDemo: this.checked }); });
    $$('.sel-estado').forEach(function (s) {
      s.addEventListener('change', function () {
        Store.actualizar('reporte', s.dataset.id, { estado: s.value, resuelto: s.value === 'resuelto' ? new Date().toISOString() : null });
        App.aviso('Estado actualizado: ' + s.value);
      });
    });
    $$('textarea[data-clave]').forEach(function (t) {
      t.addEventListener('input', function () { App.borradores[t.dataset.clave] = t.value; });
    });
    $$('.btn-publicar').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = Number(b.dataset.i), t = top[i], area = $('#resp-' + i);
        var texto = U.limpiarTexto(area.value, 140);
        if (!texto) { $('#error-top').textContent = 'Escribe la respuesta para «' + t.producto + '» antes de publicar.'; area.focus(); return; }
        var existente = Store.lista('respuestaTop').filter(function (x) {
          return x.mes === mes && x.tienda === f.tienda && KPI.normalizar(x.producto) === KPI.normalizar(t.producto);
        })[0];
        delete App.borradores[area.dataset.clave];
        var datos = { texto: texto, publicada: true, publicadaEn: new Date().toISOString(), posicion: i + 1 };
        if (existente) Store.actualizar('respuestaTop', existente.id, datos);
        else {
          datos.mes = mes; datos.producto = t.producto; datos.tienda = f.tienda; datos.demo = t.demo > 0;
          Store.agregar('respuestaTop', datos);
        }
        App.aviso('Respuesta publicada para «' + t.producto + '».');
      });
    });
    $$('.btn-retirar').forEach(function (b) {
      b.addEventListener('click', function () {
        Store.actualizar('respuestaTop', b.dataset.id, { publicada: false });
        App.aviso('Publicación retirada.');
      });
    });
  };

  function textoSync() {
    var s = Store.estadoSync();
    if (s.adaptador !== 'compartido') return 'Almacenamiento: local (este equipo)' + (s.localDisponible ? '' : ' · sin localStorage: los datos se pierden al cerrar');
    return 'Almacenamiento: compartido' + (s.pendientes ? ' · ' + s.pendientes + ' envíos en cola' : '') +
      (s.ultimo ? ' · última sincronización ' + U.hora(s.ultimo) : '') + (s.error ? ' · ' + esc(s.error) : '');
  }

  /* ---------- Auditoría ---------- */
  V.auditoria = function (main) {
    var cfg = Store.config();
    var historial = Store.lista('auditoria').slice().sort(function (a, b) { return b.creado.localeCompare(a.creado); });
    main.innerHTML = '<section class="personal">' +
      '<h1>Auditoría de góndola</h1>' +
      '<p class="ayuda">Marca cada producto clave como presente o ausente en la góndola. Lista de referencia del equipo (supuesto).</p>' +
      '<form id="f-aud" class="tarjeta" novalidate>' +
      '<div class="fila-campos"><div><label for="aud-tienda">Tienda</label><select id="aud-tienda">' + opcionesTienda(App.ctxPersonal.tienda) + '</select></div>' +
      '<div><label for="aud-fecha">Fecha</label><input type="date" id="aud-fecha" value="' + U.diaISO() + '"></div></div>' +
      '<ul class="lista-aud">' + cfg.catalogo.map(function (p, i) {
        return '<li><span>' + esc(p.nombre) + ' <small>' + esc(p.seccion) + '</small></span>' +
          '<span class="interruptor"><input type="checkbox" id="aud-' + i + '" checked data-producto="' + esc(p.nombre) + '">' +
          '<label for="aud-' + i + '"><span class="txt-presente">Presente</span><span class="txt-ausente">Ausente</span></label></span></li>';
      }).join('') + '</ul>' +
      '<p class="resumen-aud" id="resumen-aud" aria-live="polite"></p>' +
      '<button type="submit" class="boton primario">Guardar auditoría</button>' +
      '</form>' +
      '<section class="tarjeta"><h2>Historial de auditorías</h2>' +
      (historial.length ? '<div class="tabla-envoltura"><table><thead><tr><th>Fecha</th><th>Tienda</th><th>Ausentes / auditados</th><th>Tasa de quiebre</th><th>Productos ausentes</th></tr></thead><tbody>' +
        historial.map(function (a) {
          var r = KPI.quiebre([a]);
          return '<tr><td>' + U.fecha(a.fecha ? a.fecha + 'T12:00:00' : a.creado) + rotulo(a) + '</td><td>' + esc(a.tienda) + '</td><td>' + r.numerador + ' / ' + r.denominador + '</td>' +
            '<td>' + (r.valor === null ? 'Sin datos' : U.num(r.valor, 1) + ' %') + '</td><td>' +
            esc(a.items.filter(function (x) { return !x.presente; }).map(function (x) { return x.producto; }).join(', ') || 'Ninguno') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : vacio('Aún no hay auditorías. Guarda la primera arriba.')) +
      '</section></section>';

    var f = $('#f-aud');
    function resumen() {
      var marcas = $$('input[data-producto]', f), aus = marcas.filter(function (x) { return !x.checked; }).length;
      $('#resumen-aud').textContent = 'Ausentes: ' + aus + ' de ' + marcas.length + ' · tasa de quiebre ' + U.num(aus / marcas.length * 100, 1) + ' %';
    }
    f.addEventListener('change', resumen); resumen();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var items = $$('input[data-producto]', f).map(function (x) { return { producto: x.dataset.producto, presente: x.checked }; });
      var fecha = $('#aud-fecha').value || U.diaISO();
      App.ctxPersonal.tienda = $('#aud-tienda').value;
      Store.agregar('auditoria', { tienda: $('#aud-tienda').value, fecha: fecha, items: items, creado: new Date(fecha + 'T' + new Date().toTimeString().slice(0, 8)).toISOString() });
      var r = KPI.quiebre([{ items: items }]);
      V.auditoria(main);
      App.aviso('Auditoría guardada. Tasa de quiebre: ' + U.num(r.valor, 1) + ' %');
    });
  };

  /* ---------- Ronda de pasillos ---------- */
  V.ronda = function (main) {
    var cfg = Store.config(), ahora = new Date(), pico = U.esPico(ahora, cfg.picos);
    var recientes = Store.lista('ronda').slice().sort(function (a, b) { return b.hora.localeCompare(a.hora); }).slice(0, 12);
    var pasillos = '';
    for (var n = 1; n <= cfg.pasillos; n++) {
      pasillos += '<fieldset class="pasillo" data-n="' + n + '"><legend>Pasillo ' + n + '</legend>' +
        '<label class="opcion"><input type="checkbox" name="cajas"> Cajas en el piso</label>' +
        '<label class="opcion"><input type="checkbox" name="obstaculo"> Otro obstáculo</label>' +
        '<div class="contador"><span id="lbl-b' + n + '">Bloqueos de clientes</span>' +
        '<button type="button" class="boton menos" aria-label="Restar un bloqueo en el pasillo ' + n + '">−</button>' +
        '<output aria-labelledby="lbl-b' + n + '" aria-live="polite">0</output>' +
        '<button type="button" class="boton mas" aria-label="Sumar un bloqueo en el pasillo ' + n + '">+</button></div>' +
        '</fieldset>';
    }
    main.innerHTML = '<section class="personal">' +
      '<h1>Ronda de pasillos</h1>' +
      '<form id="f-ronda" class="tarjeta" novalidate>' +
      '<div class="fila-campos"><div><label for="ronda-tienda">Tienda</label><select id="ronda-tienda">' + opcionesTienda(App.ctxPersonal.tienda) + '</select></div>' +
      '<p class="hora-ronda">Hora: <strong id="hora-ronda">' + U.hora(ahora) + '</strong> · Hora pico: <strong id="pico-ronda">' + (pico ? 'sí' : 'no') + '</strong><br><small>Se registra sola al guardar. Franjas pico: ' +
      cfg.picos.map(function (f) { return U.horaTexto(f.desde) + ' a ' + U.horaTexto(f.hasta); }).join(' y ') + '</small></p></div>' +
      '<div class="pasillos">' + pasillos + '</div>' +
      '<button type="submit" class="boton primario">Guardar ronda</button>' +
      '</form>' +
      '<section class="tarjeta"><h2>Últimas rondas</h2>' +
      (recientes.length ? '<div class="tabla-envoltura"><table><thead><tr><th>Fecha y hora</th><th>Tienda</th><th>Hora pico</th><th>Pasillos revisados</th><th>Con cajas u obstáculo</th><th>Bloqueos</th><th>Resultado</th></tr></thead><tbody>' +
        recientes.map(function (r) {
          var malos = r.pasillos.filter(function (p) { return p.cajas || p.obstaculo; }).map(function (p) { return p.n; });
          var bloq = r.pasillos.reduce(function (s, p) { return s + (Number(p.bloqueos) || 0); }, 0);
          return '<tr><td>' + U.fechaHora(r.hora) + rotulo(r) + '</td><td>' + esc(r.tienda) + '</td><td>' + (r.pico ? 'Sí' : 'No') + '</td><td>' + r.pasillos.length + '</td>' +
            '<td>' + (malos.length ? 'Pasillos ' + malos.join(', ') : 'Ninguno') + '</td><td>' + bloq + '</td>' +
            '<td>' + (KPI.rondaDespejada(r) ? '<span class="chip-ok">Despejada</span>' : '<span class="chip-mal">Con obstáculos</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : vacio('Aún no hay rondas. Registra la primera arriba.')) +
      '</section></section>';

    $$('.pasillo').forEach(function (fs) {
      var out = $('output', fs);
      $('.mas', fs).addEventListener('click', function () { out.value = out.textContent = String(Number(out.textContent) + 1); });
      $('.menos', fs).addEventListener('click', function () { out.value = out.textContent = String(Math.max(0, Number(out.textContent) - 1)); });
    });
    App.intervalo(function () {
      var a = new Date(), el = $('#hora-ronda');
      if (el) { el.textContent = U.hora(a); $('#pico-ronda').textContent = U.esPico(a, Store.config().picos) ? 'sí' : 'no'; }
    }, 15000);
    $('#f-ronda').addEventListener('submit', function (e) {
      e.preventDefault();
      var hora = new Date();
      var datos = $$('.pasillo').map(function (fs) {
        return { n: Number(fs.dataset.n), cajas: $('input[name=cajas]', fs).checked, obstaculo: $('input[name=obstaculo]', fs).checked,
          bloqueos: Number($('output', fs).textContent) || 0 };
      });
      App.ctxPersonal.tienda = $('#ronda-tienda').value;
      var r = Store.agregar('ronda', { tienda: $('#ronda-tienda').value, hora: hora.toISOString(), pico: U.esPico(hora, Store.config().picos), pasillos: datos });
      V.ronda(main);
      App.aviso('Ronda guardada a las ' + U.hora(hora) + (r.pico ? ' (hora pico)' : ' (fuera de hora pico)') + '.');
    });
  };

  /* ---------- Recorrido ---------- */
  V.recorrido = function (main) {
    var cfg = Store.config();
    var lista = Store.lista('recorrido').slice().sort(function (a, b) { return b.creado.localeCompare(a.creado); });
    var pico = lista.filter(function (r) { return r.pico && (cfg.incluirDemo || !r.demo); });
    var prom = KPI.tiempoRecorrido(pico);
    var corriendo = App.recorrido.inicio;
    main.innerHTML = '<section class="personal">' +
      '<h1>Tiempo de recorrido</h1>' +
      '<p class="ayuda">Mide de forma anónima el tiempo de un cliente desde la entrada hasta la fila de caja. No se registra quién es.</p>' +
      '<div class="tarjeta cronometro-caja">' +
      '<div class="fila-campos"><div><label for="rec-tienda">Tienda</label><select id="rec-tienda">' + opcionesTienda(App.ctxPersonal.tienda) + '</select></div></div>' +
      '<p class="cronometro" id="crono" aria-live="off">' + U.duracion(corriendo ? (Date.now() - corriendo) / 1000 : 0) + '</p>' +
      '<button type="button" id="btn-crono" class="boton-crono ' + (corriendo ? 'detener' : '') + '">' + (corriendo ? 'Termina' : 'Inicia') + '</button>' +
      '<p class="ayuda" id="estado-crono" aria-live="polite">' + (corriendo ? 'Midiendo… pulsa «Termina» cuando el cliente llegue a la fila de caja.' : 'Pulsa «Inicia» cuando el cliente entre a la tienda.') + '</p>' +
      '</div>' +
      '<section class="tarjeta"><h2>Mediciones <span class="cuenta">' + lista.length + '</span></h2>' +
      '<p>Promedio en hora pico: <strong>' + (prom.valor === null ? 'Sin datos' : U.num(prom.valor, 1) + ' min') + '</strong> (' + prom.denominador + ' recorridos)</p>' +
      (lista.length ? '<div class="tabla-envoltura"><table><thead><tr><th>Fecha y hora</th><th>Tienda</th><th>Duración</th><th>Hora pico</th><th><span class="oculto-visual">Acciones</span></th></tr></thead><tbody>' +
        lista.map(function (r) {
          return '<tr><td>' + U.fechaHora(r.creado) + rotulo(r) + '</td><td>' + esc(r.tienda) + '</td><td>' + U.duracion(r.segundos) + ' (' + U.num(r.segundos / 60, 1) + ' min)</td>' +
            '<td>' + (r.pico ? 'Sí' : 'No') + '</td><td><button type="button" class="boton peligro btn-borrar" data-id="' + r.id + '">Borrar</button></td></tr>';
        }).join('') + '</tbody></table></div>' : vacio('Aún no hay mediciones. Usa el cronómetro de arriba o carga datos de demostración desde Ajustes.')) +
      '</section></section>';

    function tic() { var c = $('#crono'); if (c && App.recorrido.inicio) c.textContent = U.duracion((Date.now() - App.recorrido.inicio) / 1000); }
    if (corriendo) App.intervalo(tic, 250);
    $('#btn-crono').addEventListener('click', function () {
      if (!App.recorrido.inicio) {
        App.recorrido.inicio = Date.now();
        V.recorrido(main);
        $('#btn-crono').focus();
      } else {
        var ini = App.recorrido.inicio, seg = Math.round((Date.now() - ini) / 1000);
        App.recorrido.inicio = null;
        App.ctxPersonal.tienda = $('#rec-tienda').value;
        Store.agregar('recorrido', { tienda: $('#rec-tienda').value, segundos: seg, pico: U.esPico(new Date(ini), Store.config().picos) });
        V.recorrido(main);
        $('#btn-crono').focus();
        App.aviso('Recorrido guardado: ' + U.duracion(seg) + '.');
      }
    });
    $$('.btn-borrar').forEach(function (b) {
      b.addEventListener('click', function () {
        if (root.confirm('¿Borrar esta medición? No se puede deshacer.')) { Store.eliminar('recorrido', b.dataset.id); V.recorrido(main); App.aviso('Medición borrada.'); }
      });
    });
  };

  /* ---------- Modo prueba de usuario ---------- */
  var TAREAS = [
    { id: 1, nombre: 'Escanear el QR y abrir el formulario' },
    { id: 2, nombre: 'Reportar «aceite 1 L»' },
    { id: 3, nombre: 'Calificar la atención' },
    { id: 4, nombre: 'Encontrar «Lo que más nos piden»' },
    { id: 5, nombre: 'Encontrar un producto usando la señalización de la tienda (en tienda; aquí solo se cronometra)' }
  ];
  var RESULTADOS = { solo: 'Lo logró solo', ayuda: 'Con ayuda', no: 'No lo logró' };

  function sesionDe(participante) {
    var s = Store.lista('sesionPrueba').filter(function (x) { return x.participante === participante && !x.demo; })[0];
    if (s) return s;
    return { participante: participante, tareas: TAREAS.map(function (t) {
      return { tarea: t.id, nombre: t.nombre, segundos: null, resultado: '', observacion: '', cambio: '' };
    }) };
  }
  function guardarSesion(s) {
    if (s.id) Store.actualizar('sesionPrueba', s.id, { tareas: s.tareas });
    else { var n = Store.agregar('sesionPrueba', { participante: s.participante, tareas: s.tareas, tienda: 'T1' }); s.id = n.id; }
  }

  V.prueba = function (main) {
    var P = App.prueba, s = sesionDe(P.participante), cfg = Store.config();
    var sesiones = Store.lista('sesionPrueba').filter(function (x) { return !x.demo; });
    var urlPrueba = QR.url(cfg, 'T1', 'general');

    var resumen = TAREAS.map(function (t) {
      var regs = []; sesiones.forEach(function (se) { se.tareas.forEach(function (x) { if (x.tarea === t.id) regs.push(x); }); });
      var tiempos = regs.filter(function (x) { return x.segundos !== null; }).map(function (x) { return x.segundos; });
      var conRes = regs.filter(function (x) { return x.resultado; });
      var solo = conRes.filter(function (x) { return x.resultado === 'solo'; }).length;
      var ayuda = conRes.filter(function (x) { return x.resultado === 'ayuda'; }).length;
      return '<tr><td>' + t.id + '. ' + esc(t.nombre) + '</td><td>' + (tiempos.length ? U.num(tiempos.reduce(function (a, b) { return a + b; }, 0) / tiempos.length, 1) + ' s' : 'Sin datos') + '</td>' +
        '<td>' + (conRes.length ? U.num(solo / conRes.length * 100, 1) + ' %' : 'Sin datos') + '</td>' +
        '<td>' + (conRes.length ? U.num(ayuda / conRes.length * 100, 1) + ' %' : 'Sin datos') + '</td><td>' + conRes.length + '</td></tr>';
    }).join('');
    var cambios = [];
    sesiones.forEach(function (se) { se.tareas.forEach(function (x) { if (x.cambio) cambios.push(se.participante + ' · tarea ' + x.tarea + ': ' + x.cambio); }); });

    main.innerHTML = '<section class="personal">' +
      '<h1>Modo prueba de usuario</h1>' +
      '<p class="ayuda">Para la prueba con 6 adultos voluntarios. No se registran nombres: solo el código del participante.</p>' +
      '<div class="prueba-cab tarjeta">' +
      '<div><label for="participante">Participante</label><select id="participante">' +
      ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(function (p) {
        var tiene = sesiones.some(function (x) { return x.participante === p; });
        return '<option value="' + p + '"' + (p === P.participante ? ' selected' : '') + '>' + p + (tiene ? ' (con registros)' : '') + '</option>';
      }).join('') + '</select></div>' +
      '<div class="qr-prueba"><div>' + QR.svg(urlPrueba, 'QR de prueba para la tarea 1') + '</div><p><strong>QR de prueba (tarea 1)</strong><br>El participante lo escanea con su celular.<br><small>' + esc(urlPrueba) + '</small>' +
      (cfg.urlBase ? '' : '<br><small class="aviso-url">Escribe la URL publicada en Ajustes para que este QR abra en un celular.</small>') + '</p></div>' +
      '</div>' +
      '<ol class="tareas">' + s.tareas.map(function (t, i) {
        var corriendo = P.inicios[t.tarea];
        return '<li class="tarjeta tarea" data-i="' + i + '"><h2>Tarea ' + t.tarea + ': ' + esc(t.nombre) + '</h2>' +
          '<div class="crono-tarea"><span class="crono-peq" id="crono-' + t.tarea + '">' +
          (corriendo ? U.duracion((Date.now() - corriendo) / 1000) : t.segundos !== null ? U.duracion(t.segundos) + ' (' + t.segundos + ' s)' : '0:00') + '</span>' +
          '<button type="button" class="boton primario btn-ini"' + (corriendo ? ' disabled' : '') + '>Iniciar</button>' +
          '<button type="button" class="boton btn-fin"' + (corriendo ? '' : ' disabled') + '>Terminar</button></div>' +
          '<fieldset><legend>Resultado</legend><div class="si-no">' + Object.keys(RESULTADOS).map(function (k) {
            return '<label class="opcion"><input type="radio" name="res-' + i + '" value="' + k + '"' + (t.resultado === k ? ' checked' : '') + '> ' + RESULTADOS[k] + '</label>';
          }).join('') + '</div></fieldset>' +
          '<label for="obs-' + i + '">Observación</label><textarea id="obs-' + i + '" data-campo="observacion" maxlength="140" rows="2">' + esc(t.observacion) + '</textarea>' +
          '<label for="cam-' + i + '">Cambio que genera en el prototipo</label><textarea id="cam-' + i + '" data-campo="cambio" maxlength="140" rows="2">' + esc(t.cambio) + '</textarea>' +
          '<p class="ayuda">Máximo 140 caracteres por campo. No escribas datos personales.</p>' +
          '</li>';
      }).join('') + '</ol>' +
      '<section class="tarjeta"><h2>Resumen de la prueba <span class="cuenta">' + sesiones.length + ' participantes</span></h2>' +
      '<div class="tabla-envoltura"><table><thead><tr><th>Tarea</th><th>Tiempo promedio</th><th>Éxito (lo logró solo)</th><th>Con ayuda</th><th>Registros</th></tr></thead><tbody>' + resumen + '</tbody></table></div>' +
      '<h3>Cambios propuestos</h3>' + (cambios.length ? '<ul>' + cambios.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' : vacio('Aún no hay cambios anotados.')) +
      '<div class="acciones"><button type="button" class="boton primario" id="btn-csv">Exportar CSV de la prueba</button>' +
      '<button type="button" class="boton peligro" id="btn-borrar-sesion"' + (s.id ? '' : ' disabled') + '>Borrar registros de ' + esc(P.participante) + '</button></div>' +
      '<div id="zona-archivos"></div>' +
      '</section></section>';

    $('#participante').addEventListener('change', function () { App.prueba.participante = this.value; App.prueba.inicios = {}; V.prueba(main); });
    $$('.tarea').forEach(function (li) {
      var i = Number(li.dataset.i), t = s.tareas[i];
      $('.btn-ini', li).addEventListener('click', function () { P.inicios[t.tarea] = Date.now(); V.prueba(main); $('.tarea[data-i="' + i + '"] .btn-fin').focus(); });
      $('.btn-fin', li).addEventListener('click', function () {
        t.segundos = Math.round((Date.now() - P.inicios[t.tarea]) / 1000);
        delete P.inicios[t.tarea];
        guardarSesion(s); V.prueba(main);
        App.aviso('Tarea ' + t.tarea + ': ' + t.segundos + ' s.');
      });
      $$('input[type=radio]', li).forEach(function (r) { r.addEventListener('change', function () {
        t.resultado = r.value; guardarSesion(s); V.prueba(main);
        var igual = $('input[name="res-' + i + '"][value="' + r.value + '"]'); if (igual) igual.focus();
      }); });
      $$('textarea', li).forEach(function (a) { a.addEventListener('change', function () { t[a.dataset.campo] = U.limpiarTexto(a.value, 140); guardarSesion(s); }); });
    });
    if (Object.keys(P.inicios).length) {
      App.intervalo(function () {
        Object.keys(P.inicios).forEach(function (k) { var el = $('#crono-' + k); if (el) el.textContent = U.duracion((Date.now() - P.inicios[k]) / 1000); });
      }, 250);
    }
    $('#btn-csv').addEventListener('click', function () {
      // Guarda primero lo que esté escrito y aún no haya disparado «change».
      $$('.tarea textarea').forEach(function (a) { var li = a.closest('.tarea'); s.tareas[Number(li.dataset.i)][a.dataset.campo] = U.limpiarTexto(a.value, 140); });
      if (s.tareas.some(function (t) { return t.segundos !== null || t.resultado || t.observacion || t.cambio; })) guardarSesion(s);
      var filas = [];
      Store.lista('sesionPrueba').filter(function (x) { return !x.demo; })
        .sort(function (a, b) { return a.participante.localeCompare(b.participante); })
        .forEach(function (se) {
          se.tareas.forEach(function (t) {
            filas.push([se.participante, t.tarea + '. ' + t.nombre, t.segundos === null ? '' : t.segundos, RESULTADOS[t.resultado] || '', t.observacion, t.cambio]);
          });
        });
      var csv = App.csv(['participante', 'tarea', 'segundos', 'resultado', 'observacion', 'cambio'], filas);
      V.prueba(main);
      App.archivos($('#zona-archivos'), [{ nombre: 'prueba_usuarios_' + U.diaISO() + '.csv', contenido: csv, tipo: 'text/csv' }], true);
    });
    $('#btn-borrar-sesion').addEventListener('click', function () {
      if (s.id && root.confirm('¿Borrar todos los registros de ' + P.participante + '? No se puede deshacer.')) {
        Store.eliminar('sesionPrueba', s.id); P.inicios = {}; V.prueba(main); App.aviso('Registros borrados.');
      }
    });
  };

  /* ---------- Ajustes ---------- */
  V.ajustes = function (main) {
    var cfg = Store.config(), s = Store.estadoSync();
    var metas = KPI.DEFINICIONES.map(function (d) {
      var m = cfg.metas[d.id];
      return '<tr><td>' + d.id + '. ' + esc(d.nombre) + '</td><td>' + (m.sentido === 'menor' ? '≤' : '≥') + '</td>' +
        '<td><label class="oculto-visual" for="meta-' + d.id + '">Meta del KPI ' + d.id + '</label>' +
        '<input type="number" step="0.1" min="0" id="meta-' + d.id + '" value="' + m.valor + '" class="campo-corto"></td><td>' + esc(d.unidad) + '</td></tr>';
    }).join('');

    main.innerHTML = '<section class="personal ajustes">' +
      '<h1 class="no-imprimir">Ajustes</h1>' +

      '<section class="tarjeta no-imprimir"><h2>Tiendas del piloto</h2><form id="f-tiendas" novalidate><div class="fila-campos">' +
      Object.keys(cfg.tiendas).map(function (t) {
        return '<div><label for="tienda-' + t + '">Nombre de ' + t + '</label><input id="tienda-' + t + '" maxlength="40" value="' + esc(cfg.tiendas[t]) + '"></div>';
      }).join('') + '</div><button class="boton primario">Guardar tiendas</button></form></section>' +

      '<section class="tarjeta no-imprimir"><h2>Catálogo de productos</h2>' +
      '<p class="ayuda">Lista de referencia del equipo (supuesto). Un producto por línea con el formato «Producto | Sección».</p>' +
      '<form id="f-catalogo" novalidate><label for="catalogo">Productos</label>' +
      '<textarea id="catalogo" rows="10">' + esc(cfg.catalogo.map(function (p) { return p.nombre + ' | ' + p.seccion; }).join('\n')) + '</textarea>' +
      '<p class="error" id="error-catalogo" role="alert"></p><button class="boton primario">Guardar catálogo</button></form></section>' +

      '<section class="tarjeta no-imprimir"><h2>Operación</h2><form id="f-operacion" novalidate><div class="fila-campos">' +
      '<div><label for="pasillos">Número de pasillos</label><input type="number" id="pasillos" min="1" max="20" value="' + cfg.pasillos + '" class="campo-corto"></div>' +
      '<div><label for="picos">Franjas de hora pico (una por línea, 24 h: 07:00-09:00)</label><textarea id="picos" rows="3">' +
      esc(cfg.picos.map(function (f) { return f.desde + '-' + f.hasta; }).join('\n')) + '</textarea>' +
      '<p class="ayuda">Actual: ' + cfg.picos.map(function (f) { return U.horaTexto(f.desde) + ' a ' + U.horaTexto(f.hasta); }).join(' y ') + '</p></div>' +
      '</div><p class="error" id="error-operacion" role="alert"></p><button class="boton primario">Guardar operación</button></form></section>' +

      '<section class="tarjeta no-imprimir"><h2>Metas de los KPI <span class="meta-sup">(meta supuesta)</span></h2><form id="f-metas" novalidate>' +
      '<div class="tabla-envoltura"><table><thead><tr><th>KPI</th><th>Sentido</th><th>Meta</th><th>Unidad</th></tr></thead><tbody>' + metas + '</tbody></table></div>' +
      '<button class="boton primario">Guardar metas</button></form></section>' +

      '<section class="tarjeta no-imprimir"><h2>Acceso y almacenamiento</h2>' +
      '<form id="f-pin-nuevo" novalidate><label for="pin-nuevo">PIN del personal (4 dígitos)</label>' +
      '<input id="pin-nuevo" inputmode="numeric" maxlength="4" value="' + esc(cfg.pin) + '" class="campo-corto" autocomplete="off">' +
      '<p class="ayuda">Acceso de demostración, no es seguridad real.</p>' +
      '<p class="error" id="error-pin-nuevo" role="alert"></p><button class="boton primario">Guardar PIN</button></form>' +
      '<form id="f-adaptador" novalidate><fieldset><legend>Adaptador de almacenamiento</legend>' +
      '<label class="opcion"><input type="radio" name="adaptador" value="local"' + (cfg.adaptador === 'local' ? ' checked' : '') + '> Local: este navegador (sincroniza pestañas del mismo equipo)</label>' +
      '<label class="opcion"><input type="radio" name="adaptador" value="compartido"' + (cfg.adaptador === 'compartido' ? ' checked' : '') + '> Compartido: hoja de Google mediante Apps Script</label></fieldset>' +
      '<label for="url-script">URL de la aplicación web de Apps Script</label>' +
      '<input id="url-script" type="url" value="' + esc(cfg.urlScript) + '" placeholder="https://script.google.com/macros/s/…/exec">' +
      '<p class="ayuda">Guía en backend/README.md. ' + textoSync() + '</p>' +
      '<p class="error" id="error-adaptador" role="alert"></p>' +
      '<div class="acciones"><button class="boton primario">Guardar almacenamiento</button>' +
      '<button type="button" class="boton" id="btn-probar">Probar conexión</button></div>' +
      '<p id="res-probar" aria-live="polite"></p></form></section>' +

      '<section class="tarjeta" id="zona-qr"><h2 class="no-imprimir">Generador de QR</h2>' +
      '<form id="f-qr" class="no-imprimir" novalidate><label for="url-base">URL base (el enlace publicado, por ejemplo en GitHub Pages)</label>' +
      '<input id="url-base" type="url" value="' + esc(cfg.urlBase) + '" placeholder="https://usuario.github.io/avisanos/03_Prototipo/index.html">' +
      '<p class="ayuda">Si la dejas vacía se usa la dirección de esta página: ' + esc(QR.urlBase({ urlBase: '' })) + '. ' +
      'Un QR con dirección file:// no abre en un celular; para la tienda usa la URL publicada.</p>' +
      '<div class="acciones"><button class="boton primario">Generar hoja de QR</button>' +
      '<button type="button" class="boton" id="btn-imprimir"' + (App.hojaQR ? '' : ' disabled') + '>Imprimir hoja (carta)</button></div></form>' +
      '<div id="hoja-qr" class="hoja-qr">' + (App.hojaQR ? QR.hoja(cfg) : '') + '</div></section>' +

      '<section class="tarjeta no-imprimir"><h2>Datos</h2>' +
      '<p class="ayuda">Los datos de demostración llevan el rótulo «' + U.ROTULO_DEMO + '» y se exportan en archivos aparte.</p>' +
      '<div class="acciones"><button type="button" class="boton primario" id="btn-demo">Cargar datos de demostración</button>' +
      '<button type="button" class="boton peligro" id="btn-borrar-demo"' + (Store.hayDemo() ? '' : ' disabled') + '>Borrar datos de demostración</button></div>' +
      '<div class="interruptor"><input type="checkbox" id="exp-demo"' + (cfg.incluirDemo ? ' checked' : '') + '>' +
      '<label for="exp-demo">Incluir datos de demostración (en archivos aparte, rotulados)</label></div>' +
      '<div class="acciones"><button type="button" class="boton" id="btn-exportar">Exportar todo</button></div>' +
      '<div id="zona-exportar"></div>' +
      '<h3>Importar respaldo JSON</h3>' +
      '<label for="archivo-json">Archivo .json</label><input type="file" id="archivo-json" accept=".json,application/json">' +
      '<label for="texto-json">o pega el contenido del JSON</label><textarea id="texto-json" rows="3"></textarea>' +
      '<div class="acciones"><button type="button" class="boton" id="btn-importar">Importar texto pegado</button></div>' +
      '<p id="res-importar" role="status"></p>' +
      '</section></section>';

    document.body.classList.toggle('con-hoja-qr', !!App.hojaQR);

    $('#f-tiendas').addEventListener('submit', function (e) {
      e.preventDefault();
      var t = {};
      Object.keys(cfg.tiendas).forEach(function (k) { t[k] = U.limpiarTexto($('#tienda-' + k).value, 40) || k; });
      Store.guardarConfig({ tiendas: t }); App.aviso('Tiendas guardadas.');
    });
    $('#f-catalogo').addEventListener('submit', function (e) {
      e.preventDefault();
      var cat = $('#catalogo').value.split('\n').map(function (l) {
        var p = l.split('|');
        return { nombre: U.limpiarTexto(p[0], 40), seccion: U.limpiarTexto(p[1] || 'General', 30) || 'General' };
      }).filter(function (p) { return p.nombre; });
      if (!cat.length) { $('#error-catalogo').textContent = 'El catálogo necesita al menos un producto.'; return; }
      Store.guardarConfig({ catalogo: cat }); App.aviso('Catálogo guardado: ' + cat.length + ' productos.'); V.ajustes(main);
    });
    $('#f-operacion').addEventListener('submit', function (e) {
      e.preventDefault();
      var n = Math.round(Number($('#pasillos').value));
      var picos = [], malo = false;
      $('#picos').value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (l) {
        var m = l.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
        if (!m || Number(m[1]) > 23 || Number(m[3]) > 24 || Number(m[2]) > 59 || Number(m[4]) > 59) { malo = true; return; }
        var desde = (m[1].length < 2 ? '0' : '') + m[1] + ':' + m[2], hasta = (m[3].length < 2 ? '0' : '') + m[3] + ':' + m[4];
        if (U.minutos(hasta) <= U.minutos(desde)) { malo = true; return; }
        picos.push({ desde: desde, hasta: hasta });
      });
      if (!(n >= 1 && n <= 20)) { $('#error-operacion').textContent = 'El número de pasillos debe estar entre 1 y 20.'; return; }
      if (malo || !picos.length) { $('#error-operacion').textContent = 'Revisa las franjas: usa el formato 07:00-09:00, con la hora final mayor que la inicial.'; return; }
      Store.guardarConfig({ pasillos: n, picos: picos }); App.aviso('Operación guardada.'); V.ajustes(main);
    });
    $('#f-metas').addEventListener('submit', function (e) {
      e.preventDefault();
      var m = U.clon(cfg.metas);
      KPI.DEFINICIONES.forEach(function (d) { var v = Number($('#meta-' + d.id).value); if (!isNaN(v) && v >= 0) m[d.id].valor = v; });
      Store.guardarConfig({ metas: m }); App.aviso('Metas guardadas. El tablero ya usa las nuevas metas.');
    });
    $('#f-pin-nuevo').addEventListener('submit', function (e) {
      e.preventDefault();
      var p = $('#pin-nuevo').value.trim();
      if (!/^\d{4}$/.test(p)) { $('#error-pin-nuevo').textContent = 'El PIN debe tener 4 dígitos.'; return; }
      $('#error-pin-nuevo').textContent = '';
      Store.guardarConfig({ pin: p }); App.aviso('PIN guardado.');
    });
    function leerAdaptador() {
      var a = $('input[name=adaptador]:checked').value, u = $('#url-script').value.trim();
      if (a === 'compartido' && !/^https:\/\/script\.google(usercontent)?\.com\//.test(u)) {
        $('#error-adaptador').textContent = 'Para el modo compartido pega la URL de la aplicación web de Apps Script (empieza por https://script.google.com/).';
        return null;
      }
      $('#error-adaptador').textContent = '';
      return { adaptador: a, urlScript: u };
    }
    $('#f-adaptador').addEventListener('submit', function (e) {
      e.preventDefault();
      var a = leerAdaptador(); if (!a) return;
      Store.guardarConfig(a); App.aviso('Almacenamiento: ' + a.adaptador + '.'); V.ajustes(main);
    });
    $('#btn-probar').addEventListener('click', function () {
      var a = leerAdaptador(); if (!a) return;
      if (a.adaptador !== 'compartido') { $('#res-probar').textContent = 'El modo local no necesita conexión.'; return; }
      Store.guardarConfig(a);
      $('#res-probar').textContent = 'Probando…';
      Store.consultar().then(function (ok) {
        var r = $('#res-probar');
        if (r) r.textContent = ok ? 'Conexión correcta con la hoja compartida.' : 'No hubo respuesta. Revisa la URL y que la aplicación web esté implementada para «Cualquier usuario».';
      });
    });
    $('#f-qr').addEventListener('submit', function (e) {
      e.preventDefault();
      var u = $('#url-base').value.trim();
      Store.guardarConfig({ urlBase: u });
      App.hojaQR = true; V.ajustes(main);
      $('#hoja-qr').scrollIntoView({ behavior: App.movimientoReducido() ? 'auto' : 'smooth' });
      App.aviso('Hoja de QR generada.');
    });
    $('#btn-imprimir').addEventListener('click', function () { root.print(); });
    $('#btn-demo').addEventListener('click', function () {
      if (Store.hayDemo() && !root.confirm('Ya hay datos de demostración. Se reemplazarán por un juego nuevo. ¿Continuar?')) return;
      var n = Demo.cargar(); V.ajustes(main); App.aviso(n + ' registros de demostración cargados (' + U.ROTULO_DEMO + ').');
    });
    $('#btn-borrar-demo').addEventListener('click', function () {
      if (!root.confirm('¿Borrar todos los datos de demostración? Los datos reales no se tocan.')) return;
      Store.borrarDemo(); V.ajustes(main); App.aviso('Datos de demostración borrados.');
    });
    $('#exp-demo').addEventListener('change', function () { Store.guardarConfig({ incluirDemo: this.checked }); });
    $('#btn-exportar').addEventListener('click', function () {
      App.archivos($('#zona-exportar'), App.exportarTodo(Store.config().incluirDemo), false);
    });
    function importarTexto(texto) {
      try {
        var j = JSON.parse(texto);
        var n = Store.importar(j.datos || j);
        $('#res-importar').textContent = n ? 'Importados ' + n + ' registros nuevos.' : 'No había registros nuevos para importar.';
      } catch (err) {
        $('#res-importar').textContent = 'El contenido no es un JSON válido de respaldo.';
      }
    }
    $('#archivo-json').addEventListener('change', function () {
      var f = this.files && this.files[0]; if (!f) return;
      var lector = new FileReader();
      lector.onload = function () { importarTexto(String(lector.result)); };
      lector.onerror = function () { $('#res-importar').textContent = 'No se pudo leer el archivo.'; };
      lector.readAsText(f);
    });
    $('#btn-importar').addEventListener('click', function () { importarTexto($('#texto-json').value); });
  };

  V.TAREAS = TAREAS;
  V.RESULTADOS = RESULTADOS;
  V.textoSync = textoSync;
  root.V = V;
})(this);
