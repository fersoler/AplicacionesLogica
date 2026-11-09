// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Dibujo de derivaciones en formato Fitch (HTML), con el estilo de los Apuntes de
// Lógica: barra vertical para el nivel principal y para cada caja, raya bajo las
// premisas y bajo cada hipótesis, y justificaciones a la derecha.
// Depende de formulas.js y verificador.js (para localizar las cajas).
(function (raiz) {
  'use strict';
  const F = raiz.Formulas, V = raiz.Verificador;

  function el(etiqueta, clase, texto) {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  const justificacion = (l) => {
    if (l.tipo === 'premisa') return 'Prem.';
    if (l.tipo === 'hipotesis') return 'Hip.';
    const citas = l.citas.map((c) => (Array.isArray(c) ? `${c[0]}–${c[1]}` : String(c))).join(', ');
    return citas ? `${l.regla} ${citas}` : l.regla;
  };

  const claseOrigen = (o) => (typeof o === 'number' ? `origen-${o % 8}` : o ? `origen-${o}` : '');

  // lineas: formato numerado (Kalmar.numerar).
  // opciones: { notas, colores, plegadas: Set de números de hipótesis plegadas,
  //             plegables: Set de números de hipótesis que se pueden plegar,
  //             alPlegar(n), resaltar: Set de números, etiquetaPlegado(n, cuantas) }
  function dibujar(lineas, opciones = {}) {
    const { cajas } = V.estructura(lineas);
    const finCaja = new Map(cajas.map((c) => [c.inicio + 1, c.fin + 1]));
    const plegadas = opciones.plegadas || new Set();
    const plegables = opciones.plegables || new Set();
    const resaltar = opciones.resaltar || new Set();
    const ultimaPremisa = lineas.reduce((u, l, i) => (l.tipo === 'premisa' ? i + 1 : u), 0);

    const tabla = el('table', 'fitch');
    const cuerpo = el('tbody');
    tabla.appendChild(cuerpo);

    function fila(n, l, contenido, extraClase) {
      const tr = el('tr', [extraClase, opciones.colores ? claseOrigen(l.origen) : '', resaltar.has(n) ? 'resaltada' : '']
        .filter(Boolean).join(' '));
      tr.appendChild(el('td', 'num', contenido.num));
      const td = el('td', 'formula');
      const caja = el('div', 'barras');
      for (let d = 0; d < contenido.prof; d++) caja.appendChild(el('span', 'barra'));
      // La barra más interior es el borde izquierdo de este bloque, y la raya de
      // premisas e hipótesis su borde inferior: así las dos líneas se tocan.
      const ultima = el('span', 'ultima' + (contenido.inicio && contenido.prof > 0 ? ' inicio' : '') + (contenido.raya ? ' raya' : ''));
      const f = el('span', 'f');
      if (contenido.nodo) f.appendChild(contenido.nodo); else f.textContent = contenido.texto;
      ultima.appendChild(f);
      caja.appendChild(ultima);
      td.appendChild(caja);
      tr.appendChild(td);
      tr.appendChild(el('td', 'just', contenido.just || ''));
      if (opciones.notas) tr.appendChild(el('td', 'nota', contenido.nota || ''));
      cuerpo.appendChild(tr);
      return tr;
    }

    for (let i = 0; i < lineas.length; i++) {
      const n = i + 1, l = lineas[i];
      const tr = fila(n, l, {
        num: String(n), prof: l.prof, texto: F.texto(l.f), just: justificacion(l), nota: l.nota,
        inicio: l.tipo === 'hipotesis',
        raya: l.tipo === 'hipotesis' || (l.tipo === 'premisa' && n === ultimaPremisa),
      }, l.tipo === 'hipotesis' && l.varEliminada ? 'hip-eliminada' : '');
      if (plegables.has(n) && opciones.alPlegar) {
        tr.classList.add('plegable');
        tr.title = plegadas.has(n) ? 'Desplegar la caja' : 'Plegar la caja';
        tr.addEventListener('click', () => opciones.alPlegar(n));
      }
      if (plegadas.has(n) && finCaja.has(n)) {
        const fin = finCaja.get(n);
        const ocultas = fin - n - 1;
        if (ocultas > 0) {
          const etiqueta = opciones.etiquetaPlegado ? opciones.etiquetaPlegado(n, ocultas) : `${ocultas} líneas`;
          const nodo = el('span', 'plegado', `⋮  ${etiqueta}`);
          const tp = fila(n, l, { num: '', prof: l.prof, nodo, just: '' }, 'fila-plegada');
          if (opciones.alPlegar) tp.addEventListener('click', () => opciones.alPlegar(n));
          tp.title = 'Desplegar la caja';
          i = fin - 2; // la siguiente vuelta dibuja la última línea de la caja
        }
      }
    }
    return tabla;
  }

  raiz.Fitch = { dibujar, justificacion };
})(window);
