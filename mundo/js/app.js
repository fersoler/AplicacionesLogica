// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Interfaz del mundo de Tarski.
(function () {
  'use strict';
  const PO = window.PrimerOrden, W = window.Mundo;
  const $ = (id) => document.getElementById(id);
  const el = (etiqueta, clase, texto) => {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  };
  const fo = (t) => el('span', 'fo', t);
  const valor = (v) => el('span', 'valor ' + (v ? 'V' : 'F'), v ? 'V' : 'F');
  const SVGNS = 'http://www.w3.org/2000/svg';

  let piezas = W.MUNDO_EJEMPLO.map((p) => Object.assign({}, p, { nombres: p.nombres.slice() }));
  let seleccion = null;                       // índice de la pieza seleccionada
  const plantilla = { forma: 'cua', tamano: 'med', color: 'rojo' };
  let pestana = 'evaluar';
  let g = {};                                 // asignación elegida para las variables libres
  let resaltadoFijo = new Set();              // objetos que satisfacen la fórmula abierta
  let M = W.estructura(piezas);

  // ---- Utilidades -----------------------------------------------------------------

  // Fórmula con los nombres de los predicados del diccionario (Tri → Triángulo).
  function canonica(f) {
    switch (f.op) {
      case 'pred': { const p = W.buscarPredicado(f.nombre); return Object.assign({}, f, { nombre: p ? p.nombre : f.nombre }); }
      case 'eq': case 'bot': return f;
      case 'not': case 'forall': case 'exists': return Object.assign({}, f, { a: canonica(f.a) });
      default: return Object.assign({}, f, { a: canonica(f.a), b: canonica(f.b) });
    }
  }
  const T = (f) => PO.texto(canonica(f));

  function nombreObjeto(d) {
    const p = piezas[d - 1];
    return p.nombres.length ? `${d} (${p.nombres.join(', ')})` : String(d);
  }
  const descripcion = (p) => `${W.NOMBRE_FORMA[p.forma]} ${p.color} ${W.NOMBRE_TAMANO[p.tamano]}`;

  function dibujoPieza(p) {
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', p.tamano);
    svg.setAttribute('aria-hidden', 'true');
    let s;
    if (p.forma === 'tri') { s = document.createElementNS(SVGNS, 'polygon'); s.setAttribute('points', '50,6 95,90 5,90'); }
    else if (p.forma === 'cua') { s = document.createElementNS(SVGNS, 'rect'); s.setAttribute('x', 8); s.setAttribute('y', 8); s.setAttribute('width', 84); s.setAttribute('height', 84); s.setAttribute('rx', 8); }
    else { s = document.createElementNS(SVGNS, 'circle'); s.setAttribute('cx', 50); s.setAttribute('cy', 50); s.setAttribute('r', 44); }
    s.setAttribute('class', p.color ? 'pieza f-' + p.color : 'pieza silueta');
    svg.append(s);
    return svg;
  }

  function analizarEntrada(texto, errorEl) {
    errorEl.textContent = '';
    if (!texto.trim()) return null;
    try {
      return PO.analizar(texto);
    } catch (e) {
      errorEl.textContent = e.posicion !== undefined ? `${e.message.replace(/\.$/, '')} (posición ${e.posicion + 1}).` : e.message;
      return null;
    }
  }

  function avisoDominioVacio(contenedor) {
    contenedor.append(el('div', 'mensaje mal', 'El dominio está vacío. En una estructura el dominio no puede estar vacío (§5.1.1): pon al menos una pieza.'));
  }

  // ---- Tablero y herramientas ------------------------------------------------------

  function dibujarTablero(resaltar = pestana === 'evaluar' ? resaltadoFijo : new Set()) {
    const t = $('tablero');
    t.replaceChildren();
    const n = W.TAM_TABLERO;
    for (let fila = n - 1; fila >= 0; fila--) {
      for (let col = 0; col < n; col++) {
        const i = piezas.findIndex((p) => p.x === col && p.y === fila);
        const b = el('button', 'casilla' + ((col + fila) % 2 ? ' oscura' : ''));
        b.type = 'button';
        b.setAttribute('role', 'gridcell');
        if (i >= 0) {
          const p = piezas[i];
          b.append(dibujoPieza(p), el('span', 'num', String(i + 1)));
          if (p.nombres.length) b.append(el('span', 'nom', p.nombres.join(',')));
          b.setAttribute('aria-label', `Objeto ${i + 1}: ${descripcion(p)}${p.nombres.length ? ', nombres ' + p.nombres.join(', ') : ''}`);
          if (i === seleccion) b.classList.add('seleccionada');
          if (resaltar.has(i + 1)) b.classList.add('resaltada');
        } else {
          b.setAttribute('aria-label', `Casilla vacía (${col}, ${fila})`);
        }
        b.addEventListener('click', () => pulsarCasilla(col, fila));
        t.append(b);
      }
    }
  }

  function resaltar(conjunto) { dibujarTablero(conjunto); }
  function quitarResaltado() { dibujarTablero(); }

  function pulsarCasilla(x, y) {
    const i = piezas.findIndex((p) => p.x === x && p.y === y);
    $('aviso-pieza').textContent = '';
    if (i >= 0) {
      seleccion = seleccion === i ? null : i;
      dibujarHerramientas();
      dibujarTablero();
      return;
    }
    if (seleccion !== null) {
      piezas[seleccion].x = x;
      piezas[seleccion].y = y;
    } else {
      const nombres = leerNombres(null);
      if (nombres === null) return;
      piezas.push(Object.assign({ x, y, nombres }, plantilla));
      $('nombres').value = '';
    }
    cambioMundo();
  }

  // Lee el campo de nombres. Devuelve la lista o null si hay un error.
  function leerNombres(propia) {
    const texto = $('nombres').value.toLowerCase();
    const letras = texto.match(/[a-zñ]/g) || [];
    const malas = letras.filter((c) => !PO.esConstante(c));
    if (malas.length) {
      $('aviso-pieza').textContent = `Los nombres son letras de la a a la r; ${malas.join(', ')} ${malas.length > 1 ? 'son variables o no valen' : 'es una variable o no vale'}.`;
      return null;
    }
    const nombres = [...new Set(letras)];
    for (const c of nombres) {
      const otra = piezas.findIndex((p, k) => k !== propia && p.nombres.includes(c));
      if (otra >= 0) {
        $('aviso-pieza').textContent = `La constante ${c} ya nombra el objeto ${otra + 1}: una constante nombra un solo objeto.`;
        return null;
      }
    }
    return nombres;
  }

  function dibujarHerramientas() {
    const editando = seleccion !== null;
    const actual = editando ? piezas[seleccion] : plantilla;
    $('titulo-pieza').textContent = editando ? `Objeto ${seleccion + 1}` : 'Nueva pieza';
    $('acciones-pieza').hidden = !editando;
    $('ayuda-tablero').textContent = editando
      ? 'Cambia su forma, tamaño, color o nombres. Pulsa una casilla vacía para moverla, o la propia pieza para deseleccionarla.'
      : 'Pulsa una casilla vacía para poner una pieza con estas características. Pulsa una pieza para seleccionarla.';
    if (editando) $('nombres').value = actual.nombres.join(', ');

    const opciones = (id, valores, propiedad, contenido) => {
      const c = $(id);
      c.replaceChildren();
      valores.forEach((v) => {
        const b = el('button');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(actual[propiedad] === v));
        contenido(b, v);
        b.addEventListener('click', () => {
          if (seleccion !== null) { piezas[seleccion][propiedad] = v; cambioMundo(); }
          else { plantilla[propiedad] = v; dibujarHerramientas(); }
        });
        c.append(b);
      });
    };
    opciones('b-formas', W.FORMAS, 'forma', (b, v) => {
      b.append(dibujoPieza({ forma: v, tamano: 'gra' })); // silueta sin color
      b.title = W.NOMBRE_FORMA[v];
      b.setAttribute('aria-label', W.NOMBRE_FORMA[v]);
    });
    opciones('b-tamanos', W.TAMANOS, 'tamano', (b, v) => { b.textContent = W.NOMBRE_TAMANO[v]; });
    opciones('b-colores', W.COLORES, 'color', (b, v) => {
      b.classList.add('color');
      b.style.background = `var(--${v})`;
      b.title = v;
      b.setAttribute('aria-label', v);
    });
  }

  function cambioMundo() {
    M = W.estructura(piezas);
    dibujarHerramientas();
    evaluar();          // también vuelve a dibujar el tablero
    argumento();
    dibujarEstructura();
    const r = $('resultado-formalizacion');
    if (r.childElementCount) r.replaceChildren(el('p', 'explica', 'El mundo ha cambiado: pulsa «Comprobar» de nuevo.'));
    guardarEstado();
  }

  // ---- Evaluar -------------------------------------------------------------------

  function evaluar() {
    const res = $('resultado');
    const arbol = $('arbol');
    res.replaceChildren();
    arbol.replaceChildren();
    resaltadoFijo = new Set();
    const f = analizarEntrada($('formula').value, $('error-formula'));
    if (!f) { dibujarTablero(); return; }
    if (!M.D.length) { avisoDominioVacio(res); dibujarTablero(); return; }
    const errores = PO.comprobarVocabulario(f, M);
    if (errores.length) { $('error-formula').textContent = errores.join(' '); dibujarTablero(); return; }

    const libres = [...PO.libres(f)].sort();
    if (!libres.length) {
      const v = PO.satisface(f, M);
      const p = el('p', 'resultado-principal');
      p.append(fo(`M ${v ? '⊨' : '⊭'} ${T(f)}`), ': la sentencia es ', valor(v), v ? ' (verdadera) en este mundo.' : ' (falsa) en este mundo.');
      res.append(p);
      arbol.append(nodo(f, {}, '', true));
      dibujarTablero();
      return;
    }

    // Fórmula abierta: asignación elegida, extensión y verdad en M.
    libres.forEach((x) => { if (!M.D.includes(g[x])) g[x] = M.D[0]; });
    const gg = {};
    libres.forEach((x) => { gg[x] = g[x]; });
    const a = el('div', 'asignacion');
    a.append(el('span', '', `La fórmula tiene libre${libres.length > 1 ? 's las variables' : ' la variable'} ${libres.join(', ')}. Asignación g:`));
    libres.forEach((x) => {
      const etq = el('label', 'fo', `g(${x}) = `);
      const s = el('select');
      M.D.forEach((d) => { const o = el('option', '', nombreObjeto(d)); o.value = d; s.append(o); });
      s.value = String(gg[x]);
      s.addEventListener('change', () => { g[x] = Number(s.value); evaluar(); guardarEstado(); });
      etq.append(s);
      a.append(etq);
    });
    res.append(a);
    const v = PO.satisface(f, M, gg);
    const p = el('p', 'resultado-principal');
    p.append(fo(`M, g ⊨ ${T(f)}`), ': ', valor(v));
    res.append(p);

    const todas = PO.asignaciones(libres, M.D);
    const buenas = todas.filter((h) => PO.satisface(f, M, h));
    const ext = el('p');
    if (libres.length === 1) {
      const x = libres[0];
      resaltadoFijo = new Set(buenas.map((h) => h[x]));
      ext.append(`Objetos que la satisfacen cuando g(${x}) es ese objeto (resaltados en el tablero): `,
        fo(buenas.length ? `{${buenas.map((h) => h[x]).join(', ')}}` : '∅'), '.');
    } else if (libres.length === 2) {
      const lista = buenas.slice(0, 40).map((h) => `(${libres.map((x) => h[x]).join(', ')})`).join(', ');
      ext.append(`Pares (${libres.join(', ')}) que la satisfacen: `, fo(buenas.length ? `{${lista}${buenas.length > 40 ? ', …' : ''}}` : '∅'), '.');
    } else {
      ext.append(`La satisfacen ${buenas.length} de las ${todas.length} asignaciones posibles.`);
    }
    res.append(ext);
    const vm = buenas.length === todas.length;
    const q = el('p', 'explica');
    q.append('Verdadera en M (es decir, satisfecha por toda asignación, §5.1.4): ', valor(vm), '.');
    res.append(q);
    arbol.append(nodo(f, gg, '', true));
    dibujarTablero();
  }

  // Un nodo del árbol de evaluación: fórmula, asignación, valor y por qué. Los hijos
  // se construyen al desplegarlo.
  function nodo(f, h, etiqueta, abierto, decisivo) {
    const li = el('li');
    const linea = el('div', 'linea-nodo' + (decisivo ? ' decisivo' : ''));
    const b = el('button', 'desplegar', '▸');
    b.type = 'button';
    const hijos = hijosDe(f, h);
    if (!hijos.length) b.disabled = true;
    linea.append(b);
    if (etiqueta) linea.append(el('span', 'etq', etiqueta));
    const v = PO.satisface(f, M, h);
    linea.append(fo(T(f)), valor(v), el('span', 'porque', porQue(f, h, v)));
    li.append(linea);
    const ul = el('ul');
    ul.hidden = true;
    li.append(ul);
    const abrir = () => {
      if (!ul.childElementCount) hijos.forEach((c) => ul.append(nodo(c.f, c.h, c.etiqueta, false, c.decisivo)));
      ul.hidden = !ul.hidden;
      b.textContent = ul.hidden ? '▸' : '▾';
    };
    b.addEventListener('click', abrir);
    // Al pasar por encima, se resaltan los objetos que la asignación da a las
    // variables libres de esta fórmula.
    linea.addEventListener('mouseenter', () => {
      const objs = new Set([...PO.libres(f)].map((x) => h[x]));
      PO.constantes(f).forEach((c) => objs.add(M.constante(c)));
      resaltar(objs);
    });
    linea.addEventListener('mouseleave', quitarResaltado);
    if (abierto && hijos.length) abrir();
    return li;
  }

  function hijosDe(f, h) {
    switch (f.op) {
      case 'not': return [{ f: f.a, h }];
      case 'and': case 'or': case 'imp': case 'iff': return [{ f: f.a, h }, { f: f.b, h }];
      case 'forall': case 'exists': {
        let marcado = false;
        return M.D.map((d) => {
          const hd = PO.variante(h, f.v, d);
          const vd = PO.satisface(f.a, M, hd);
          const decisivo = !marcado && (f.op === 'forall' ? !vd : vd);
          if (decisivo) marcado = true;
          return { f: f.a, h: hd, etiqueta: `${f.v} ↦ ${nombreObjeto(d)}:`, decisivo };
        });
      }
      default: return [];
    }
  }

  function porQue(f, h, v) {
    const den = (x) => (x.tipo === 'const' ? `I(${x.nombre}) = ${M.constante(x.nombre)}` : `g(${x.nombre}) = ${h[x.nombre]}`);
    switch (f.op) {
      case 'pred': {
        const p = W.buscarPredicado(f.nombre);
        const vals = f.args.map((x) => PO.denotacion(x, M, h));
        const tupla = vals.length === 1 ? String(vals[0]) : `(${vals.join(', ')})`;
        return `${f.args.map(den).join(', ')}; ${tupla} ${v ? '∈' : '∉'} I(${p.nombre})`;
      }
      case 'eq': return `${den(f.a)}, ${den(f.b)}: ${v ? 'el mismo objeto' : 'objetos distintos'}`;
      case 'bot': return '⊥ es falsa en toda estructura';
      case 'not': return f.a.op === 'eq' ? `${den(f.a.a)}, ${den(f.a.b)}: ${v ? 'objetos distintos' : 'el mismo objeto'}` : `la fórmula negada es ${v ? 'F' : 'V'}`;
      case 'and': case 'or': case 'imp': case 'iff': {
        const a = PO.satisface(f.a, M, h), b = PO.satisface(f.b, M, h);
        if (f.op === 'and') return v ? 'las dos son V' : !a && !b ? 'las dos son F' : `la ${a ? 'segunda' : 'primera'} es F`;
        if (f.op === 'or') return !v ? 'las dos son F' : a && b ? 'las dos son V' : `la ${a ? 'primera' : 'segunda'} es V`;
        if (f.op === 'imp') return !v ? 'el antecedente es V y el consecuente F' : !a ? 'el antecedente es F' : 'el consecuente es V';
        return v ? `las dos son ${a ? 'V' : 'F'}` : 'tienen valores distintos';
      }
      case 'forall': {
        if (v) return `V para todos los objetos del dominio (${M.D.length})`;
        const d = M.D.find((e) => !PO.satisface(f.a, M, PO.variante(h, f.v, e)));
        return `contraejemplo: ${f.v} ↦ ${d}`;
      }
      case 'exists': {
        if (!v) return 'ningún objeto la cumple';
        const d = M.D.find((e) => PO.satisface(f.a, M, PO.variante(h, f.v, e)));
        return `testigo: ${f.v} ↦ ${d}`;
      }
    }
    return '';
  }

  // ---- Contramodelos ---------------------------------------------------------------

  function leerArgumento() {
    const lineas = $('premisas').value.split('\n').map((s) => s.trim()).filter(Boolean);
    const errores = [];
    const premisas = [];
    lineas.forEach((s, i) => {
      try { premisas.push(PO.analizar(s)); } catch (e) { errores.push(`Premisa ${i + 1}: ${e.message}`); }
    });
    let conclusion = null;
    if ($('conclusion').value.trim()) {
      try { conclusion = PO.analizar($('conclusion').value); } catch (e) { errores.push(`Conclusión: ${e.message}`); }
    }
    return { premisas, conclusion, errores };
  }

  function argumento() {
    const tabla = $('tabla-argumento'), ver = $('veredicto');
    tabla.replaceChildren();
    ver.replaceChildren();
    ver.className = 'mensaje';
    const { premisas, conclusion, errores } = leerArgumento();
    if (errores.length) { ver.className = 'mensaje mal'; ver.textContent = errores.join(' '); return; }
    if (!conclusion) return;
    if (!M.D.length) { avisoDominioVacio(tabla); return; }
    const todas = [...premisas, conclusion];
    const vocab = [].concat(...todas.map((f) => PO.comprobarVocabulario(f, M)));
    const abiertas = todas.filter((f) => PO.libres(f).size);
    if (vocab.length || abiertas.length) {
      ver.className = 'mensaje mal';
      ver.textContent = [...new Set(vocab)].join(' ') + (abiertas.length ? ` Premisas y conclusión deben ser sentencias: ${abiertas.map(T).join('; ')} tiene variables libres.` : '');
      return;
    }
    const t = el('table', 'argumento');
    const vp = premisas.map((f) => PO.satisface(f, M));
    premisas.forEach((f, i) => {
      const tr = el('tr');
      tr.append(el('td', '', `Premisa ${i + 1}`), el('td', 'fo', T(f)), el('td'));
      tr.lastChild.append(valor(vp[i]));
      t.append(tr);
    });
    const vc = PO.satisface(conclusion, M);
    const tr = el('tr');
    tr.append(el('td', '', 'Conclusión'), el('td', 'fo', T(conclusion)), el('td'));
    tr.lastChild.append(valor(vc));
    t.append(tr);
    tabla.append(t);
    if (vp.every(Boolean) && !vc) {
      ver.className = 'mensaje bien';
      ver.textContent = 'Este mundo es un contramodelo: las premisas son verdaderas y la conclusión falsa. El argumento no es válido.';
    } else if (!vp.every(Boolean)) {
      ver.textContent = 'No es un contramodelo: alguna premisa es falsa en este mundo.';
    } else {
      ver.textContent = 'No es un contramodelo: la conclusión es verdadera en este mundo.';
    }
  }

  function mostrarContramodelo() {
    const nota = $('nota-contramodelo');
    const { premisas, conclusion, errores } = leerArgumento();
    nota.textContent = '';
    if (errores.length || !conclusion) return;
    const prueba = W.estructura(W.mundoAleatorio(1, new Set(), W.azar(1)));
    const vocab = [].concat(...[...premisas, conclusion].map((f) => PO.comprobarVocabulario(f, prueba).filter((m) => !m.includes('no nombra'))));
    if (vocab.length) { nota.textContent = vocab.join(' '); return; }
    const cm = W.buscarContramodelo(premisas, conclusion, { semilla: Date.now() });
    if (cm) {
      piezas = cm;
      seleccion = null;
      cambioMundo();
      nota.textContent = 'He colocado en el tablero un contramodelo encontrado al azar.';
    } else {
      nota.textContent = 'No he encontrado ningún contramodelo en 2400 mundos de hasta 6 piezas. Probablemente el argumento es válido, aunque esto no lo demuestra: para eso hace falta una derivación o un razonamiento sobre una estructura cualquiera.';
    }
  }

  // ---- Formalizar ------------------------------------------------------------------

  function mostrarFrase() {
    const i = Number($('frases').value);
    $('frase').textContent = W.FORMALIZAR[i].frase;
    $('solucion').hidden = true;
    $('solucion').textContent = W.FORMALIZAR[i].solucion;
    $('resultado-formalizacion').replaceChildren();
    $('b-anterior').disabled = i === 0;
    $('b-siguiente').disabled = i === W.FORMALIZAR.length - 1;
    guardarEstado();
  }

  function comprobarFormalizacion() {
    const r = $('resultado-formalizacion');
    r.replaceChildren();
    const i = Number($('frases').value);
    const err = el('div', 'error');
    r.append(err);
    const f = analizarEntrada($('formalizacion').value, err);
    if (!f) return;
    const prueba = W.estructura(W.mundoAleatorio(1, new Set(), W.azar(1)));
    const vocab = PO.comprobarVocabulario(f, prueba).filter((m) => !m.includes('no nombra'));
    if (vocab.length) { err.textContent = vocab.join(' '); return; }
    const malas = PO.atomosConLibres(f);
    if (malas.length) {
      const m = el('div', 'mensaje mal');
      const vars = [...new Set(malas.flatMap((a) => a.variables))];
      m.append(`Tu fórmula tiene libre${vars.length > 1 ? 's las variables' : ' la variable'} ${vars.join(', ')} en `,
        fo(malas.map((a) => T(a.atomo)).join(', ')),
        '. Una frase se formaliza con una sentencia. Si querías cuantificarla, revisa los paréntesis: el alcance de ∀x o ∃x es solo la fórmula que le sigue, así que hay que escribir ∀x (… → …).');
      r.append(m);
      return;
    }
    const sol = PO.analizar(W.FORMALIZAR[i].solucion);
    const consts = new Set([...PO.constantes(f), ...PO.constantes(sol)]);
    const faltan = [...consts].filter((c) => M.constante(c) === undefined);
    const enEste = M.D.length && !faltan.length ? [PO.satisface(f, M), PO.satisface(sol, M)] : null;
    const d = W.buscarDiferencia(f, sol, { semilla: 7 });
    const m = el('div', 'mensaje');
    if (enEste && enEste[0] !== enEste[1]) {
      m.classList.add('mal');
      m.append('En el mundo del tablero tu fórmula es ', valor(enEste[0]), ' y la frase es ', valor(enEste[1]), '. No dicen lo mismo.');
      r.append(m);
      return;
    }
    if (d.piezas) {
      m.classList.add('mal');
      m.append(`No dicen lo mismo: en un mundo de ${d.piezas.length} pieza${d.piezas.length > 1 ? 's' : ''} tu fórmula es `, valor(d.v1),
        ' y la frase es ', valor(d.v2), '. ');
      const b = el('button', 'secundario', 'Ver ese mundo en el tablero');
      b.type = 'button';
      b.addEventListener('click', () => {
        piezas = d.piezas;
        seleccion = null;
        $('formula').value = T(f);
        cambioMundo();
        $('sec-mundo').scrollIntoView({ behavior: 'smooth' });
      });
      m.append(b);
      r.append(m);
      return;
    }
    m.classList.add('bien');
    m.textContent = `Bien: tu fórmula y la formalización correcta toman el mismo valor en los ${d.probados} mundos probados${enEste ? ' y en el del tablero' : ''}. Muy probablemente dicen lo mismo en cualquier mundo de piezas (lo que no siempre significa que sean lógicamente equivalentes: el diccionario impone relaciones, como que nada es a la vez triángulo y cuadrado).`;
    r.append(m);
  }

  // ---- Estructura y diccionario ----------------------------------------------------

  function dibujarEstructura() {
    const e = $('estructura');
    e.replaceChildren();
    if (!M.D.length) { avisoDominioVacio(e); return; }
    const linea = (t) => e.append(el('div', 'linea', t));
    e.append(el('h4', '', 'Dominio'));
    linea(`D = {${M.D.join(', ')}}`);
    const consts = Object.keys(M.constantes).sort();
    e.append(el('h4', '', 'Constantes'));
    linea(consts.length ? consts.map((c) => `I(${c}) = ${M.constantes[c]}`).join(';  ') : 'Ninguna pieza tiene nombre.');
    e.append(el('h4', '', 'Predicados de un argumento'));
    W.PREDICADOS.filter((p) => p.aridad === 1).forEach((p) => {
      const ext = M.extension(p);
      linea(`I(${p.nombre}) = ${ext.length ? '{' + ext.join(', ') + '}' : '∅'}`);
    });
    e.append(el('h4', '', 'Predicados de dos argumentos'));
    W.PREDICADOS.filter((p) => p.aridad === 2).forEach((p) => {
      const ext = M.extension(p);
      linea(`I(${p.nombre}) = ${ext.length ? '{' + ext.map((t) => `(${t.join(', ')})`).join(', ') + '}' : '∅'}`);
    });
  }

  function dibujarDiccionario() {
    const d = $('diccionario');
    W.PREDICADOS.forEach((p) => {
      const args = p.aridad === 1 ? 'x' : 'x, y';
      const div = el('div');
      div.append(el('code', '', `${p.nombre}(${args})`), `: ${p.lee}`);
      d.append(div);
    });
    const div = el('div');
    div.append(el('code', '', 'x = y'), ': x e y son el mismo objeto');
    d.append(div);
  }

  // ---- Símbolos, pestañas y estado ---------------------------------------------------

  const SIMBOLOS = ['¬', '∧', '∨', '→', '↔', '∀', '∃', '=', '≠', '(', ')'];
  function botonesSimbolos() {
    document.querySelectorAll('.simbolos-botones').forEach((c) => {
      const destino = $(c.dataset.destino);
      SIMBOLOS.forEach((s) => {
        const b = el('button', '', s);
        b.type = 'button';
        b.title = `Escribir ${s}`;
        b.addEventListener('click', () => {
          const i = destino.selectionStart ?? destino.value.length, j = destino.selectionEnd ?? i;
          destino.value = destino.value.slice(0, i) + s + destino.value.slice(j);
          destino.focus();
          destino.setSelectionRange(i + s.length, i + s.length);
          destino.dispatchEvent(new Event('input'));
        });
        c.append(b);
      });
    });
  }

  function elegirPestana(nombre) {
    pestana = nombre;
    document.querySelectorAll('[role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.panel === nombre)));
    document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== 'panel-' + nombre; });
    dibujarTablero();
    guardarEstado();
  }

  function guardarEstado() {
    const p = new URLSearchParams();
    p.set('m', W.codificar(piezas));
    p.set('ver', pestana);
    if ($('formula').value.trim()) p.set('f', $('formula').value.trim());
    if ($('premisas').value.trim()) p.set('p', $('premisas').value.trim());
    if ($('conclusion').value.trim()) p.set('c', $('conclusion').value.trim());
    p.set('frase', $('frases').value || '0');
    history.replaceState(null, '', '#' + p.toString());
  }

  function leerEstado() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (p.has('m')) piezas = W.decodificar(p.get('m'));
    if (p.has('f')) $('formula').value = p.get('f');
    if (p.has('p')) $('premisas').value = p.get('p');
    if (p.has('c')) $('conclusion').value = p.get('c');
    const fr = Number(p.get('frase'));
    if (fr >= 0 && fr < W.FORMALIZAR.length) $('frases').value = String(fr);
    return p.get('ver');
  }

  function iniciar() {
    W.EJEMPLOS.forEach(([f, nombre]) => { const o = el('option', '', nombre); o.value = f; $('ejemplos').append(o); });
    W.RETOS.forEach((r, i) => { const o = el('option', '', `${i + 1}. ${r.titulo}`); o.value = i; $('retos').append(o); });
    W.FORMALIZAR.forEach((e, i) => { const o = el('option', '', `${i + 1}. ${e.frase}`); o.value = i; $('frases').append(o); });
    $('formula').value = '∀x (Triángulo(x) → Pequeño(x))';
    botonesSimbolos();
    dibujarDiccionario();

    $('ejemplos').addEventListener('change', (e) => { if (e.target.value) { $('formula').value = e.target.value; e.target.value = ''; evaluar(); guardarEstado(); } });
    $('formula').addEventListener('input', () => { evaluar(); guardarEstado(); });
    $('premisas').addEventListener('input', () => { argumento(); guardarEstado(); });
    $('conclusion').addEventListener('input', () => { argumento(); guardarEstado(); });
    $('retos').addEventListener('change', (e) => {
      if (e.target.value === '') return;
      const r = W.RETOS[Number(e.target.value)];
      $('premisas').value = r.premisas.join('\n');
      $('conclusion').value = r.conclusion;
      const pista = $('pista-reto');
      pista.replaceChildren();
      const d = el('details');
      d.append(el('summary', '', 'Pista'), el('p', '', r.pista));
      pista.append(d);
      $('nota-contramodelo').textContent = '';
      argumento();
      guardarEstado();
    });
    $('b-mostrar-contramodelo').addEventListener('click', mostrarContramodelo);
    $('frases').addEventListener('change', mostrarFrase);
    $('b-anterior').addEventListener('click', () => { $('frases').value = String(Number($('frases').value) - 1); mostrarFrase(); });
    $('b-siguiente').addEventListener('click', () => { $('frases').value = String(Number($('frases').value) + 1); mostrarFrase(); });
    $('b-comprobar').addEventListener('click', comprobarFormalizacion);
    $('formalizacion').addEventListener('keydown', (e) => { if (e.key === 'Enter') comprobarFormalizacion(); });
    $('b-solucion').addEventListener('click', () => { $('solucion').hidden = false; });
    document.querySelectorAll('[role="tab"]').forEach((b) => b.addEventListener('click', () => elegirPestana(b.dataset.panel)));

    $('nombres').addEventListener('change', () => {
      $('aviso-pieza').textContent = '';
      if (seleccion === null) return;
      const n = leerNombres(seleccion);
      if (n !== null) { piezas[seleccion].nombres = n; cambioMundo(); }
    });
    $('b-eliminar').addEventListener('click', () => { piezas.splice(seleccion, 1); seleccion = null; cambioMundo(); });
    $('b-deseleccionar').addEventListener('click', () => { seleccion = null; $('nombres').value = ''; dibujarHerramientas(); dibujarTablero(); });
    $('b-ejemplo').addEventListener('click', () => { piezas = W.MUNDO_EJEMPLO.map((p) => Object.assign({}, p, { nombres: p.nombres.slice() })); seleccion = null; cambioMundo(); });
    $('b-azar').addEventListener('click', () => {
      const rnd = W.azar(Date.now());
      piezas = W.mundoAleatorio(4 + Math.floor(rnd() * 5), new Set(['a', 'b', 'c']), rnd);
      seleccion = null;
      cambioMundo();
    });
    $('b-vaciar').addEventListener('click', () => { piezas = []; seleccion = null; cambioMundo(); });
    document.addEventListener('keydown', (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
      if (e.key === 'Escape' && seleccion !== null) { seleccion = null; dibujarHerramientas(); dibujarTablero(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && seleccion !== null) { piezas.splice(seleccion, 1); seleccion = null; cambioMundo(); }
    });

    const ver = leerEstado();
    mostrarFrase();
    cambioMundo();
    elegirPestana(['evaluar', 'contramodelos', 'formalizar', 'estructura'].includes(ver) ? ver : 'evaluar');
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
