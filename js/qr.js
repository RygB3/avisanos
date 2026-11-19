/*
 * qr.js · Códigos QR en SVG con la librería local vendor/qrcode.js
 * y la hoja imprimible por tienda y por punto.
 */
(function (root) {
  'use strict';

  var PUNTOS = [
    { clave: 'lacteos', nombre: 'Góndola de lácteos' },
    { clave: 'granos', nombre: 'Góndola de granos' },
    { clave: 'caja', nombre: 'Caja' },
    { clave: 'salida', nombre: 'Salida' }
  ];

  function nombrePunto(clave) {
    var p = PUNTOS.filter(function (x) { return x.clave === clave; })[0];
    return p ? p.nombre : (clave === 'general' || !clave ? 'General' : clave);
  }

  // SVG escalable: un <path> con un cuadro por módulo oscuro.
  function svg(texto, etiqueta) {
    var q = root.qrcode(0, 'M');
    q.addData(texto);
    q.make();
    var n = q.getModuleCount(), margen = 4, total = n + margen * 2, d = '';
    for (var f = 0; f < n; f++) {
      for (var c = 0; c < n; c++) {
        if (q.isDark(f, c)) d += 'M' + (c + margen) + ' ' + (f + margen) + 'h1v1h-1z';
      }
    }
    return '<svg class="qr" viewBox="0 0 ' + total + ' ' + total + '" role="img" aria-label="' + U.esc(etiqueta || 'Código QR') +
      '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }

  // URL base: la escrita en Ajustes o la de esta página sin parámetros.
  function urlBase(cfg) {
    var base = (cfg.urlBase || '').trim();
    if (!base) base = root.location.href.split('#')[0].split('?')[0];
    return base;
  }

  function url(cfg, tienda, punto, ruta) {
    var base = urlBase(cfg);
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + 't=' + encodeURIComponent(tienda) +
      '&p=' + encodeURIComponent(punto) + (ruta ? '#' + ruta : '');
  }

  function hoja(cfg) {
    var html = '';
    Object.keys(cfg.tiendas).forEach(function (t) {
      html += '<section class="hoja-tienda"><h2 class="hoja-titulo">' + U.esc(cfg.tiendas[t]) + ' (' + t + ')</h2><div class="hoja-grilla">';
      PUNTOS.forEach(function (p) {
        var u = url(cfg, t, p.clave);
        html += tarjeta(u, '¿No encontraste tu producto? Avísanos', p.nombre + ' · ' + t);
      });
      var uc = url(cfg, t, 'salida', 'calificar');
      html += tarjeta(uc, '¿Cómo te atendimos? Califícanos', 'Salida · calificar la atención · ' + t);
      html += '</div></section>';
    });
    return html;
  }

  function tarjeta(u, titulo, lugar) {
    return '<article class="qr-tarjeta">' +
      '<p class="qr-titulo">' + U.esc(titulo) + '</p>' + svg(u, titulo + ' · ' + lugar) +
      '<p class="qr-lugar">' + U.esc(lugar) + '</p>' +
      '<p class="qr-pago">Este código no sirve para pagar.</p>' +
      '<p class="qr-url">' + U.esc(u) + '</p>' +
      '<p class="qr-leyenda">Propuesta conceptual no oficial · Ejercicio académico Uninorte</p>' +
      '</article>';
  }

  root.QR = { PUNTOS: PUNTOS, nombrePunto: nombrePunto, svg: svg, url: url, urlBase: urlBase, hoja: hoja };
})(this);
