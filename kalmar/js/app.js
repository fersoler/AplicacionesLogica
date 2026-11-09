// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Interfaz: tabla de verdad, derivaciones de las filas y animación del colapso.
(function () {
  'use strict';
  const F = window.Formulas, K = window.Kalmar, V = window.Verificador, Fitch = window.Fitch;
  const MAX_VARIABLES = 3, MAX_CONECTIVAS = 6;
  const EJEMPLOS = window.Datos.obtener('kalmar').ejemplos.map((e) => [e.formula, e.nombre]); // datos/ejemplos.js
  const COLORES = ['--c0', '--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7'];

  const $ = (id) => document.getElementById(id);
  const el = (etiqueta, clase, texto) => {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  };
  const fo = (texto) => el('span', 'fo', texto);

  let r = null;               // análisis de la fórmula (Kalmar.analizarFormula)
  let filaElegida = 0;
  let paso = 0;               // pasos del colapso ya dados
  let nodoDetalle = null;     // nodo cuya derivación se muestra en el detalle
  let plegadas = new Set();
  let reloj = null;

  // ---- Utilidades de presentación ------------------------------------------------

  const literal = (x, asig) => (asig[x] ? x : '¬' + x);
  const literales = (asig) => r.vars.filter((x) => x in asig).map((x) => literal(x, asig));
  const textoSecuente = (prem, concl) => (prem.length ? prem.join(', ') + ' ⊢ ' : '⊢ ') + F.texto(concl);
  function textoFilas(filas) {
    const n = filas.map((i) => i + 1);
    if (n.length === 1) return `la fila ${n[0]}`;
    if (n.length === 2) return `las filas ${n[0]} y ${n[1]}`;
    return `las filas ${n[0]}–${n[n.length - 1]}`;
  }
  const nombreNodo = (nodo) => (nodo.nivel === 0 ? `Fila ${nodo.indice + 1}` : `Se elimina ${nodo.variable}`);

  // ---- Construcción ------------------------------------------------------------------

  function construir(texto) {
    parar();
    $('error').textContent = '';
    let A;
    try {
      A = F.analizar(texto);
    } catch (e) {
      const pos = e.posicion !== undefined ? ` (posición ${e.posicion + 1})` : '';
      $('error').textContent = e.message + pos;
      return;
    }
    const nv = F.variables(A).length, nc = F.conectivas(A);
    if (nv > MAX_VARIABLES) { $('error').textContent = `La fórmula tiene ${nv} variables; el máximo es ${MAX_VARIABLES}.`; return; }
    if (nc > MAX_CONECTIVAS) { $('error').textContent = `La fórmula tiene ${nc} conectivas; el máximo es ${MAX_CONECTIVAS}.`; return; }
    r = K.analizarFormula(A);
    filaElegida = 0;
    paso = 0;
    nodoDetalle = null;
    $('resultado').hidden = false;
    $('sec-filas').hidden = true;
    $('sec-colapso').hidden = true;
    dibujarResumen();
    dibujarTabla();
    dibujarFilas();
    dibujarColapso();
    guardarEstado();
  }

  // El estado va en la dirección (#f=…&ver=…&fila=…&paso=…), para compartir enlaces
  // que abren una fórmula en una fila o en un paso concreto del colapso.
  function guardarEstado() {
    if (!r) return;
    const ver = !$('sec-colapso').hidden ? 'colapso' : !$('sec-filas').hidden ? 'filas' : '';
    const p = new URLSearchParams({ f: $('formula').value.trim() });
    if (ver) p.set('ver', ver);
    if (ver === 'filas') p.set('fila', String(filaElegida + 1));
    if (ver === 'colapso') p.set('paso', String(paso));
    history.replaceState(null, '', '#' + p.toString());
  }

  function leerEstado() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (!p.get('f')) return false;
    $('formula').value = p.get('f');
    construir(p.get('f'));
    if (!r) return true;
    const ver = p.get('ver');
    if (ver === 'filas' || ver === 'colapso') {
      $('sec-filas').hidden = false;
      elegirFila(Math.max(0, Math.min(r.filas.length - 1, Number(p.get('fila') || 1) - 1)));
    }
    if (ver === 'colapso') {
      $('sec-colapso').hidden = false;
      ir(Number(p.get('paso') || 0), false);
    }
    guardarEstado();
    return true;
  }

  function dibujarResumen() {
    const s = $('resumen');
    s.replaceChildren();
    const p = el('p');
    p.append(el('span', 'formula-grande', F.texto(r.A)), ' ');
    const tipo = { tautologia: 'Tautología', contradiccion: 'Contradicción', contingente: 'Ni tautología ni contradicción' }[r.tipo];
    p.append(el('span', 'etiqueta ' + r.tipo, tipo));
    s.append(p);
    const d = el('p', 'explica');
    const n = r.vars.length;
    d.textContent = n
      ? `Variables: ${r.vars.join(', ')} (${2 ** n} filas). Conectivas: ${F.conectivas(r.A)}.`
      : 'La fórmula no tiene variables: la tabla tiene una sola fila y el lema de Kalmár da directamente la derivación, sin premisas.';
    s.append(d);
  }

  // ---- 1. Tabla de verdad -----------------------------------------------------------

  function dibujarTabla() {
    const t = $('tabla');
    t.replaceChildren();
    const subs = F.subformulas(r.A);
    const cab = el('tr');
    cab.append(el('th', '', ''));
    r.vars.forEach((x) => cab.append(el('th', '', x)));
    subs.forEach((g, i) => cab.append(el('th', i === subs.length - 1 ? 'principal' : '', F.texto(g))));
    if (!subs.length) cab.append(el('th', 'principal', F.texto(r.A)));
    r.vars.forEach((x, i) => {
      const th = el('th', i === 0 ? 'sep' : '');
      th.append(x, el('sup', '', 'v'));
      cab.append(th);
    });
    const thA = el('th', r.vars.length ? '' : 'sep');
    thA.append('A', el('sup', '', 'v'));
    cab.append(thA);
    const thead = el('thead');
    thead.append(cab);
    t.append(thead);

    const cuerpo = el('tbody');
    r.filas.forEach((f) => {
      const tr = el('tr', f.indice === filaElegida ? 'elegida' : '');
      tr.append(el('td', 'n', String(f.indice + 1)));
      r.vars.forEach((x) => tr.append(el('td', '', String(f.v[x]))));
      subs.forEach((g, i) => tr.append(el('td', i === subs.length - 1 ? 'principal' : '', String(F.evalua(g, f.v)))));
      if (!subs.length) tr.append(el('td', 'principal', String(F.evalua(r.A, f.v))));
      r.vars.forEach((x, i) => tr.append(el('td', i === 0 ? 'sep' : '', literal(x, f.v))));
      tr.append(el('td', r.vars.length ? '' : 'sep', F.texto(f.Av)));
      tr.addEventListener('click', () => {
        elegirFila(f.indice);
        mostrar('sec-filas');
      });
      cuerpo.append(tr);
    });
    t.append(cuerpo);
  }

  // ---- 2. Derivaciones de las filas ---------------------------------------------------

  function dibujarFilas() {
    const p = $('pestanas');
    p.replaceChildren();
    r.filas.forEach((f) => {
      const b = el('button', '', `Fila ${f.indice + 1}`);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(f.indice === filaElegida));
      b.title = literales(f.v).join(', ') || 'sin variables';
      b.addEventListener('click', () => elegirFila(f.indice));
      p.append(b);
    });
    const f = r.filas[filaElegida];
    const cab = $('cabecera-fila');
    cab.replaceChildren();
    const asig = r.vars.map((x) => `v(${x}) = ${f.v[x]}`).join(', ');
    cab.append(el('div', 'explica', `Fila ${f.indice + 1}${asig ? ': ' + asig : ''}. Por el lema de Kalmár:`));
    const sec = el('div');
    sec.append(textoSecuente(literales(f.v), f.Av));
    const lin = K.numerar(f.derivacion);
    const ver = V.verificarArgumento(lin, literales(f.v).map(F.analizar), f.Av);
    sec.append(el('span', 'verificada' + (ver.correcta ? '' : ' mal'),
      ver.correcta ? '✓ comprobada por el verificador' : '✗ ' + ver.errores.map((e) => e.mensaje).join(' ')));
    cab.append(sec);
    const caja = $('derivacion-fila');
    caja.replaceChildren(Fitch.dibujar(lin, { notas: $('ver-notas').checked }));
    if (lin.every((l) => l.tipo === 'premisa')) {
      caja.append(el('p', 'explica', 'La conclusión es una de las premisas: no hace falta ningún paso.'));
    }
  }

  function elegirFila(i) {
    filaElegida = i;
    dibujarFilas();
    guardarEstado();
    [...$('tabla').tBodies[0].rows].forEach((tr, k) => tr.classList.toggle('elegida', k === i));
  }

  // ---- 3. Colapso -----------------------------------------------------------------

  function dibujarColapso() {
    const n = r.vars.length;
    const ex = $('explica-colapso');
    if (n === 0) {
      ex.textContent = 'Sin variables no hay premisas que eliminar: la derivación de la única fila ya es la derivación final.';
    } else {
      const orden = r.vars.slice().reverse().join(', luego ');
      ex.textContent = `Como en el libro, se eliminan las variables de la última a la primera (${orden}). En cada paso, dos derivaciones que solo difieren en la premisa de la variable que se elimina y terminan en la misma fórmula se unen con LEM: sus premisas ${r.vars[n - 1]} y ¬${r.vars[n - 1]} pasan a ser las hipótesis de dos cajas. Si las conclusiones son distintas, el colapso se bloquea. Pulsa una tarjeta para ver su derivación; cada fila tiene un color, que conservan sus líneas al integrarse en las derivaciones mayores.`;
    }
    actualizarColapso(false);
  }

  function actualizarColapso(animar) {
    const total = r.pasos.length;
    $('contador').textContent = total ? `Paso ${paso} de ${total}` : '';
    $('b-inicio').disabled = $('b-atras').disabled = paso === 0;
    $('b-adelante').disabled = $('b-final').disabled = $('b-play').disabled = paso >= total;
    if (paso >= total) parar();
    dibujarMensaje();
    dibujarArbol(animar);
    const actual = paso > 0 ? r.pasos[paso - 1] : null;
    if (actual) elegirNodo(actual, true);
    else if (!nodoDetalle || (nodoDetalle.nivel > 0 && r.pasos.indexOf(nodoDetalle) >= paso)) {
      elegirNodo(r.niveles[0][Math.min(filaElegida, r.niveles[0].length - 1)], false);
    } else elegirNodo(nodoDetalle, false);
  }

  function dibujarMensaje() {
    const m = $('mensaje-paso');
    m.className = 'mensaje-paso';
    m.replaceChildren();
    const n = r.vars.length, total = r.pasos.length;
    if (n === 0) {
      m.append('Derivación final: ', fo(textoSecuente([], r.raiz.conclusion)), '.');
      return;
    }
    if (paso === 0) {
      m.append(`Punto de partida: las ${2 ** n} derivaciones de las filas. Pulsa «Siguiente» para eliminar ${r.vars[n - 1]} en cada pareja de filas que solo difieren en ella, o «Reproducir» para ver todos los pasos seguidos.`);
      return;
    }
    const nodo = r.pasos[paso - 1];
    const x = nodo.variable;
    const [i, d] = nodo.hijos;
    if (nodo.estado === 'unido') {
      m.append(`Se elimina ${x} en ${textoFilas(nodo.filas)}. Las dos derivaciones terminan en `, fo(F.texto(nodo.conclusion)),
        `. Sus premisas ${x} y ¬${x} pasan a ser las hipótesis de dos cajas, y LEM las descarga. Queda `,
        fo(textoSecuente(literales(nodo.asignacion), nodo.conclusion)), '.');
    } else if (nodo.estado === 'bloqueado') {
      m.classList.add('bloqueo');
      m.append(`No se puede eliminar ${x} en ${textoFilas(nodo.filas)}: una derivación termina en `, fo(F.texto(i.conclusion)),
        ' y la otra en ', fo(F.texto(d.conclusion)), '. LEM exige la misma fórmula al final de las dos cajas, así que el colapso se bloquea aquí.');
    } else {
      m.classList.add('bloqueo');
      m.append(`No se puede eliminar ${x} en ${textoFilas(nodo.filas)}: falta la derivación de una de las dos ramas, porque su colapso ya se bloqueó.`);
    }
    if (paso === total) {
      const fin = el('div');
      fin.style.marginTop = '6px';
      if (r.tipo === 'tautologia') fin.append('Fin: se ha llegado a ', fo(textoSecuente([], r.A)), ' sin premisas. Toda tautología es derivable: es la completud débil.');
      else if (r.tipo === 'contradiccion') fin.append('Fin: todas las filas terminan en ', fo(F.texto(F.No(r.A))), ', y el colapso llega a ', fo(textoSecuente([], F.No(r.A))), '.');
      else fin.append('Fin: la fórmula no es una tautología, y el colapso no puede llegar a una derivación sin premisas.');
      m.append(fin);
    }
  }

  function tarjeta(nodo, visible, actual) {
    const t = el('div', 'tarjeta');
    t.dataset.nivel = nodo.nivel;
    t.dataset.indice = nodo.indice;
    const tit = el('div', 'titulo');
    tit.append(el('span', '', nombreNodo(nodo)));
    if (visible && nodo.derivacion) tit.append(el('span', 'lin', `${nodo.derivacion.lineas.length} lín.`));
    t.append(tit);
    const franja = el('div', 'franja');
    nodo.filas.forEach((k) => {
      const s = el('span');
      s.style.background = `var(${COLORES[k % 8]})`;
      franja.append(s);
    });
    t.append(franja);
    if (!visible) {
      t.classList.add('oculta');
      t.append(el('div', 'chips'), el('div', 'concl', '·'));
      return t;
    }
    if (nodo.estado === 'bloqueado' || nodo.estado === 'imposible') {
      t.classList.add(nodo.estado);
      t.append(el('div', '', nodo.estado === 'bloqueado'
        ? `Bloqueado: ${F.texto(nodo.hijos[0].conclusion)} y ${F.texto(nodo.hijos[1].conclusion)}`
        : 'No se puede: falta una rama'));
      t.addEventListener('click', () => elegirNodo(nodo, true));
      return t;
    }
    const chips = el('div', 'chips');
    const lits = literales(nodo.asignacion);
    if (!lits.length) chips.append(el('span', '', 'sin premisas'));
    const eliminada = actual && actual.hijos.includes(nodo) ? actual.variable : null;
    r.vars.filter((x) => x in nodo.asignacion).forEach((x) => {
      chips.append(el('span', 'chip' + (x === eliminada ? ' eliminada' : ''), literal(x, nodo.asignacion)));
    });
    t.append(chips);
    t.append(el('div', 'concl', '⊢ ' + F.texto(nodo.conclusion)));
    if (nodo === r.raiz && nodo.nivel > 0) t.classList.add('final');
    t.addEventListener('click', () => elegirNodo(nodo, true));
    return t;
  }

  function dibujarArbol(animar) {
    const a = $('arbol');
    a.replaceChildren();
    const n = r.vars.length;
    a.style.gridTemplateColumns = `repeat(${n + 1}, auto)`;
    a.style.gridTemplateRows = `repeat(${2 ** n}, auto)`;
    const actual = paso > 0 ? r.pasos[paso - 1] : null;
    const tarjetas = new Map();
    r.niveles.forEach((nivel, k) => nivel.forEach((nodo) => {
      const visible = k === 0 || r.pasos.indexOf(nodo) < paso;
      const t = tarjeta(nodo, visible, actual);
      t.style.gridColumn = String(k + 1);
      t.style.gridRow = `${nodo.indice * 2 ** k + 1} / span ${2 ** k}`;
      if (actual && actual.hijos.includes(nodo)) t.classList.add('fuente');
      if (nodo === actual && animar) t.classList.add('nueva');
      if (nodo === nodoDetalle) t.classList.add('elegida');
      tarjetas.set(nodo, t);
      a.append(t);
    }));
    // Conectores: se dibujan cuando la cuadrícula ya tiene sus medidas.
    requestAnimationFrame(() => dibujarConectores(a, tarjetas, actual));
  }

  function dibujarConectores(a, tarjetas, actual) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', a.scrollWidth);
    svg.setAttribute('height', a.scrollHeight);
    // Posiciones de maquetación (offset*), relativas a la cuadrícula: no cambian
    // durante la animación de la tarjeta nueva, que la desplaza con transform.
    const medidas = (t) => ({ izq: t.offsetLeft, der: t.offsetLeft + t.offsetWidth, medio: t.offsetTop + t.offsetHeight / 2 });
    r.niveles.forEach((nivel, k) => {
      if (k === 0) return;
      nivel.forEach((nodo) => {
        const visible = r.pasos.indexOf(nodo) < paso;
        const tn = medidas(tarjetas.get(nodo));
        nodo.hijos.forEach((h) => {
          const th = medidas(tarjetas.get(h));
          const x1 = th.der, y1 = th.medio;
          const x2 = tn.izq, y2 = tn.medio;
          const xm = (x1 + x2) / 2;
          const p = document.createElementNS(ns, 'path');
          p.setAttribute('d', `M${x1},${y1} H${xm} V${y2} H${x2}`);
          let clase = visible ? 'hecho' : 'oculto';
          if (visible && nodo.estado !== 'unido') clase = 'roto';
          if (nodo === actual) clase += ' activo';
          p.setAttribute('class', clase);
          svg.append(p);
        });
      });
    });
    a.prepend(svg);
  }

  // ---- Detalle: la derivación de un nodo -------------------------------------------

  function elegirNodo(nodo, reiniciarPliegues) {
    if (!nodo) return;
    nodoDetalle = nodo;
    if (reiniciarPliegues && nodo.derivacion) {
      const lin = K.numerar(nodo.derivacion);
      // Plegadas por defecto: las cajas de LEM más interiores (las de los pasos
      // anteriores), para que se vean las dos cajas recién creadas.
      plegadas = new Set();
      lin.forEach((l, i) => { if (l.tipo === 'hipotesis' && l.varEliminada && l.prof >= 2) plegadas.add(i + 1); });
    }
    document.querySelectorAll('.tarjeta.elegida').forEach((t) => t.classList.remove('elegida'));
    const t = document.querySelector(`.tarjeta[data-nivel="${nodo.nivel}"][data-indice="${nodo.indice}"]`);
    if (t) t.classList.add('elegida');
    dibujarDetalle();
  }

  // Detalle de un paso bloqueado o imposible: en lugar de la derivación, que no
  // existe, se explica por qué y se enlaza con las derivaciones de las ramas.
  function dibujarSinDerivacion(d, nodo) {
    const x = nodo.variable;
    const de = (h) => (h.nivel === 0 ? `la fila ${h.indice + 1}` : textoFilas(h.filas));
    const h3 = el('h3');
    h3.append(`${nombreNodo(nodo)} en ${textoFilas(nodo.filas)}: no hay derivación`);
    d.append(h3);
    const p = el('div', 'mensaje-paso bloqueo');
    if (nodo.estado === 'bloqueado') {
      const [i, dd] = nodo.hijos;
      p.append(`No se puede eliminar ${x}: un bloque anterior prueba `, fo(F.texto(i.conclusion)),
        ` y el otro `, fo(F.texto(dd.conclusion)), '. En concreto, ',
        fo(textoSecuente(literales(i.asignacion), i.conclusion)), ` (${de(i)}) y `,
        fo(textoSecuente(literales(dd.asignacion), dd.conclusion)), ` (${de(dd)}). `,
        `Para descargar las hipótesis ${x} y ¬${x} con LEM, las dos cajas tendrían que terminar en la misma fórmula.`);
    } else {
      const faltan = nodo.hijos.filter((h) => !h.derivacion);
      p.append(`No se puede eliminar ${x}: falta la derivación de ${faltan.map(de).join(' y de ')}, porque su colapso ya se bloqueó. `,
        'Sin las derivaciones de las dos ramas no hay cajas que unir con LEM.');
    }
    d.append(p);
    const b = el('div', 'botones');
    nodo.hijos.forEach((h) => {
      const bt = el('button', 'secundario', `Ver ${h.derivacion ? 'la derivación' : 'el bloqueo'} de ${de(h)}`);
      bt.type = 'button';
      bt.addEventListener('click', () => elegirNodo(h, true));
      b.append(bt);
    });
    d.append(b);
  }

  function dibujarDetalle() {
    const nodo = nodoDetalle;
    const d = $('detalle');
    d.replaceChildren();
    if (!nodo) return;
    if (!nodo.derivacion) { dibujarSinDerivacion(d, nodo); return; }
    const lin = K.numerar(nodo.derivacion);
    const h = el('h3');
    h.append(nombreNodo(nodo) + ': ', fo(textoSecuente(literales(nodo.asignacion), nodo.conclusion)));
    const ver = V.verificarArgumento(lin, literales(nodo.asignacion).map(F.analizar), nodo.conclusion);
    h.append(el('span', 'verificada' + (ver.correcta ? '' : ' mal'), ver.correcta ? '✓ comprobada' : '✗ error'));
    d.append(h);

    const plegables = new Set();
    lin.forEach((l, i) => { if (l.tipo === 'hipotesis' && l.varEliminada) plegables.add(i + 1); });
    if (plegables.size) {
      const b = el('div', 'botones');
      const b1 = el('button', 'secundario', 'Plegarlo todo');
      b1.type = 'button';
      b1.addEventListener('click', () => { plegadas = new Set(plegables); dibujarDetalle(); });
      const b2 = el('button', 'secundario', 'Desplegarlo todo');
      b2.type = 'button';
      b2.addEventListener('click', () => { plegadas = new Set(); dibujarDetalle(); });
      b.append(b1, b2, el('span', 'explica', 'También puedes plegar o desplegar cada caja pulsando su hipótesis.'));
      d.append(b);
    }
    const leyenda = el('div', 'leyenda');
    nodo.filas.forEach((k) => {
      const s = el('span', '', `fila ${k + 1}`);
      s.style.setProperty('--c', `var(--o${k % 8})`);
      s.style.setProperty('--b', `var(${COLORES[k % 8]})`);
      leyenda.append(s);
    });
    if (nodo.nivel > 0) {
      const s = el('span', '', 'colapso (LEM)');
      s.style.setProperty('--c', 'var(--olem)');
      s.style.setProperty('--b', 'var(--clem)');
      leyenda.append(s);
    }
    d.append(leyenda);

    const resaltar = new Set();
    if (nodo.nivel > 0) {
      lin.forEach((l, i) => { if (l.tipo === 'hipotesis' && l.varEliminada === nodo.variable && l.prof === 1) resaltar.add(i + 1); });
      resaltar.add(lin.length);
    }
    const etiqueta = (n, cuantas) => {
      const { cajas } = V.estructura(lin);
      const c = cajas.find((k) => k.inicio === n - 1);
      const filas = new Set();
      for (let i = c.inicio; i <= c.fin; i++) if (typeof lin[i].origen === 'number') filas.add(lin[i].origen + 1);
      const f = [...filas];
      const lista = f.length > 1 ? f.slice(0, -1).join(', ') + ' y ' + f[f.length - 1] : String(f[0]);
      const que = f.length === 1 ? `derivación de la fila ${f[0]}` : `derivaciones de las filas ${lista}`;
      return `${que} (${cuantas} líneas)`;
    };
    const div = el('div', 'desplazable');
    div.append(Fitch.dibujar(lin, {
      colores: true, plegadas, plegables, resaltar, etiquetaPlegado: etiqueta,
      alPlegar: (n) => { if (plegadas.has(n)) plegadas.delete(n); else plegadas.add(n); dibujarDetalle(); },
    }));
    d.append(div);
  }

  // ---- Controles ---------------------------------------------------------------

  function ir(nuevo, animar) {
    paso = Math.max(0, Math.min(r.pasos.length, nuevo));
    actualizarColapso(animar);
    guardarEstado();
  }
  function parar() {
    if (reloj) { clearInterval(reloj); reloj = null; }
    $('b-play').textContent = '▶ Reproducir';
  }
  function reproducir() {
    if (reloj) { parar(); return; }
    if (paso >= r.pasos.length) paso = 0;
    $('b-play').textContent = '⏸ Pausa';
    reloj = setInterval(() => {
      if (paso >= r.pasos.length) { parar(); return; }
      ir(paso + 1, true);
    }, 1800);
  }

  function mostrar(id) {
    $(id).hidden = false;
    if (id === 'sec-colapso') actualizarColapso(false);
    guardarEstado();
    $(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const SIMBOLOS = ['¬', '∧', '∨', '→', '↔', '⊥', '(', ')'];
  function llenarSimbolos(c, destino) {
    SIMBOLOS.forEach((s) => {
      const b = el('button', '', s);
      b.type = 'button';
      b.addEventListener('click', () => {
        const i = destino.selectionStart ?? destino.value.length, j = destino.selectionEnd ?? i;
        destino.value = destino.value.slice(0, i) + s + destino.value.slice(j);
        destino.focus();
        destino.setSelectionRange(i + s.length, i + s.length);
      });
      c.append(b);
    });
  }

  function iniciar() {
    llenarSimbolos(document.querySelector('.simbolos-botones[data-destino="formula"]'), $('formula'));
    const ej = $('ejemplos');
    EJEMPLOS.forEach(([f, nombre]) => {
      const b = el('button', '', nombre);
      b.type = 'button';
      b.title = f;
      b.addEventListener('click', () => { $('formula').value = f; construir(f); });
      ej.append(b);
    });
    $('formulario').addEventListener('submit', (e) => { e.preventDefault(); construir($('formula').value); });
    document.querySelectorAll('button.continuar').forEach((b) => b.addEventListener('click', () => mostrar(b.dataset.destino)));
    $('ver-notas').addEventListener('change', dibujarFilas);
    $('b-inicio').addEventListener('click', () => { parar(); ir(0, false); });
    $('b-atras').addEventListener('click', () => { parar(); ir(paso - 1, false); });
    $('b-adelante').addEventListener('click', () => { parar(); ir(paso + 1, true); });
    $('b-final').addEventListener('click', () => { parar(); ir(r.pasos.length, false); });
    $('b-play').addEventListener('click', reproducir);
    window.addEventListener('resize', () => { if (r && !$('sec-colapso').hidden) dibujarArbol(false); });
    if (!leerEstado()) construir($('formula').value);
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
