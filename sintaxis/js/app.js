// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Interfaz de la aplicación de sintaxis.
(function () {
  'use strict';
  const PO = window.PrimerOrden, S = window.Sintaxis;
  const $ = (id) => document.getElementById(id);
  const el = (etiqueta, clase, texto) => {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  };
  const boton = (texto, clase, accion) => {
    const b = el('button', clase, texto);
    b.type = 'button';
    if (accion) b.addEventListener('click', accion);
    return b;
  };
  // Fórmula con los paréntesis coloreados por nivel de anidamiento; los que encierran
  // los argumentos de un predicado, P(x, a), van en el color del texto.
  function fo(t) {
    const span = el('span', 'fo');
    const pila = [];
    let nivel = 0, trozo = '';
    const soltar = () => { if (trozo) { span.append(trozo); trozo = ''; } };
    for (let k = 0; k < t.length; k++) {
      const c = t[k];
      if (c === '(') {
        const arg = k > 0 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t[k - 1]);
        soltar();
        pila.push(arg);
        span.append(el('span', arg ? 'par arg' : `par par-${nivel % 4}`, '('));
        if (!arg) nivel++;
      } else if (c === ')') {
        soltar();
        const arg = pila.pop();
        if (!arg) nivel = Math.max(0, nivel - 1);
        span.append(el('span', arg ? 'par arg' : `par par-${nivel % 4}`, ')'));
      } else trozo += c;
    }
    soltar();
    return span;
  }
  // Clase de color de cada paréntesis de una fórmula dibujada en piezas.
  function clasesParentesis(ps) {
    let nivel = 0;
    return ps.map((p) => {
      if (p.tipo !== 'par') return '';
      if (p.argumento) return ' arg';
      if (p.texto === '(') return ` par-${nivel++ % 4}`;
      nivel = Math.max(0, nivel - 1);
      return ` par-${nivel % 4}`;
    });
  }
  const K = PO.clave;
  const mensajeError = (e) => (e.posicion !== undefined ? `${e.message.replace(/\.$/, '')} (posición ${e.posicion + 1}).` : e.message);
  const CONVENCIONES = 'La precedencia, de más a menos fuerte, es ¬, ∧, ∨, →, ↔; las binarias se agrupan por la derecha, y ¬ y los cuantificadores solo afectan a la fórmula más breve que les sigue (§1.1.1).';

  const EJEMPLOS = window.Datos.obtener('sintaxis').ejemplos.map((e) => [e.formula, e.nombre]); // datos/ejemplos.js

  // Dibuja una fórmula pieza a pieza. opciones: {clic(pieza, span), marcarVariables,
  // resaltarAlcances}
  function dibujarPiezas(f, opciones = {}) {
    const { piezas: ps, alcances } = S.piezas(f);
    const colores = clasesParentesis(ps);
    const cont = el('span', 'formula-piezas');
    const spans = ps.map((p, k) => {
      const clickable = opciones.clic && opciones.clicables && opciones.clicables(p);
      const s = el(clickable ? 'button' : 'span', 'pieza ' + p.tipo + colores[k], p.texto);
      if (clickable) { s.type = 'button'; s.addEventListener('click', () => opciones.clic(p, s)); }
      if (p.tipo === 'var' && opciones.marcarVariables) s.classList.add(p.libre ? 'libre' : 'ligada');
      cont.append(s);
      return s;
    });
    if (opciones.resaltarAlcances) {
      const limpiar = () => spans.forEach((s) => s.classList.remove('alcance', 'activo', 'enlazada'));
      const marcarCuant = (q) => {
        const a = alcances.find((x) => x.cuantificador === q);
        spans[q].classList.add('activo');
        for (let i = a.desde; i <= a.hasta; i++) spans[i].classList.add('alcance');
        ps.forEach((p, i) => { if (p.tipo === 'var' && p.ligadaPor === q) spans[i].classList.add('enlazada'); });
      };
      ps.forEach((p, i) => {
        if (p.tipo === 'cuant') {
          spans[i].addEventListener('mouseenter', () => marcarCuant(i));
          spans[i].addEventListener('mouseleave', limpiar);
          spans[i].title = 'Su alcance y las variables que liga';
        }
        if (p.tipo === 'var' && !p.libre) {
          spans[i].addEventListener('mouseenter', () => marcarCuant(p.ligadaPor));
          spans[i].addEventListener('mouseleave', limpiar);
        }
      });
    }
    return { cont, spans, piezas: ps };
  }

  // ---- Explorar ---------------------------------------------------------------------------

  function explorar() {
    const err = $('error'), cont = $('analisis');
    err.textContent = '';
    cont.replaceChildren();
    const texto = $('formula').value.trim();
    if (!texto) return;
    let f;
    try { f = S.analizar(texto); } catch (e) { err.textContent = mensajeError(e); return; }
    const pr = S.principal(f);
    const p1 = el('p');
    if (pr) {
      const inm = S.inmediatas(f).map((g) => S.texto(g));
      p1.append('Conectiva principal: ', fo(pr.simbolo), ` (${pr.nombre}). `,
        inm.length > 1 ? 'Subfórmulas inmediatas: ' : 'Subfórmula inmediata: ');
      inm.forEach((s, i) => { if (i) p1.append(' y '); p1.append(fo(s)); });
      p1.append('.');
    } else p1.append('Es una fórmula atómica: no tiene conectiva principal.');
    cont.append(p1);
    const p2 = el('p');
    const primerOrden = /[∀∃(]/.test(S.texto(f).replace(/\([a-z, ]*\)/g, '')) || S.piezas(f).piezas.some((x) => x.tipo === 'cuant' || x.tipo === 'var' || x.tipo === 'const');
    p2.append(`Con todos los paréntesis (la definición inductiva de ${primerOrden ? '§4.2.1' : '§1.1.1'}): `, fo(S.texto(f, 'estricto')));
    const p3 = el('p');
    p3.append('Con las convenciones de precedencia: ', fo(S.texto(f)));
    cont.append(p2, p3);

    const vars = S.piezas(f).piezas.filter((p) => p.tipo === 'var');
    const cuants = S.piezas(f).piezas.filter((p) => p.tipo === 'cuant');
    if (vars.length || cuants.length) {
      const det = el('div', 'detalle');
      det.append(el('h3', '', 'Alcance y variables (§4.2)'));
      const d = dibujarPiezas(f, { marcarVariables: true, resaltarAlcances: true });
      const p = el('p', 'grande');
      p.append(d.cont);
      det.append(p);
      det.append(el('p', 'explica leyenda-vars', 'En rojo, las apariciones libres; en azul, las ligadas. Pasa el ratón por un cuantificador (o por una variable ligada) para ver su alcance y las apariciones que liga.'));
      const libres = [...PO.libres(f)].sort();
      const ps = el('p');
      if (libres.length) {
        ps.append(`Variable${libres.length > 1 ? 's' : ''} libre${libres.length > 1 ? 's' : ''}: `, fo(libres.join(', ')), '. Es una fórmula abierta (§4.2.2).');
      } else ps.append('No tiene variables libres: es una sentencia (§4.2.2).');
      det.append(ps);
      if (libres.length) det.append(bloqueSustitucion(f, libres));
      cont.append(det);
    }

    const detA = el('div', 'detalle');
    detA.append(el('h3', '', 'Árbol de formación'));
    detA.append(el('p', 'explica', 'Cada nodo es una subfórmula; debajo, sus subfórmulas inmediatas. En azul, la conectiva principal de cada una.'));
    const marco = el('div', 'desplazable marco-arbol');
    marco.append(dibujarArbol(S.arbol(f)));
    detA.append(marco);
    cont.append(detA);

    const subs = S.subformulas(f);
    const detS = el('div', 'detalle');
    detS.append(el('h3', '', `Subfórmulas (${subs.length})`));
    const ul = el('ul', 'lista-subformulas');
    subs.forEach((g) => { const li = el('li'); li.append(fo(S.texto(g))); ul.append(li); });
    detS.append(ul);
    cont.append(detS);
  }

  function dibujarArbol(nodo) {
    const seg = el('div', 'segmento');
    const caja = el('div', 'nodo-formacion');
    if (nodo.principal) {
      const { piezas: ps } = S.piezas(nodo.f);
      const colores = clasesParentesis(ps);
      ps.forEach((p, k) => {
        const s = el('span', p.tipo === 'par' ? 'par' + colores[k] : '', p.texto);
        if (p.nodo === nodo.f && (p.tipo === 'op' || p.tipo === 'cuant')) s.className = 'marca-principal';
        caja.append(s);
      });
    } else caja.textContent = nodo.texto;
    seg.append(caja);
    if (nodo.hijos.length === 1) seg.append(el('div', 'arista'), dibujarArbol(nodo.hijos[0]));
    else if (nodo.hijos.length === 2) {
      const fila = el('div', 'hijos');
      nodo.hijos.forEach((h) => { const c = el('div', 'rama-col'); c.append(dibujarArbol(h)); fila.append(c); });
      seg.append(el('div', 'arista'), fila);
    }
    return seg;
  }

  // Sustitución de variables libres por constantes (§4.2.3). Con una variable libre se
  // escribe A(c); con varias, A[a/x, b/y], y se puede sustituir solo alguna.
  function bloqueSustitucion(f, libres) {
    const div = el('div', 'sustitucion');
    const usadas = PO.constantes(f);
    const libre = 'abcdefghijklmnopqr'.split('').filter((c) => !usadas.has(c));
    const campos = libres.map((v, k) => {
      const inp = el('input');
      inp.type = 'text';
      inp.value = k === 0 ? (libre[0] || 'a') : '';
      inp.maxLength = 1;
      inp.className = 'constante';
      inp.placeholder = '–';
      inp.setAttribute('aria-label', `Constante para ${v}`);
      return { v, inp };
    });
    const res = el('p');
    const varias = libres.length > 1;
    const calcular = () => {
      res.replaceChildren();
      const elegidas = campos.map(({ v, inp }) => ({ v, c: inp.value.trim() })).filter((x) => x.c);
      const mal = elegidas.find((x) => !/^[a-r]$/.test(x.c));
      if (mal) { res.append(el('span', 'error', `«${mal.c}» no es una constante: las constantes son letras de la a a la r.`)); return; }
      if (!elegidas.length) { res.append(varias ? 'Escribe una constante para alguna de las variables libres.' : 'Escribe una constante.'); return; }
      let g = f;
      elegidas.forEach(({ v, c }) => { g = S.sustituir(g, v, c); });
      const nombre = varias ? `A[${elegidas.map(({ v, c }) => `${c}/${v}`).join(', ')}]` : `A(${elegidas[0].c})`;
      res.append(fo(`${nombre} = ${S.texto(g)}`), '.');
      const notas = [];
      elegidas.forEach(({ v }) => {
        const n = S.piezas(f).piezas.filter((p) => p.tipo === 'var' && p.texto === v && !p.libre).length;
        if (n) notas.push(n > 1 ? `las ${n} apariciones ligadas de ${v} no cambian` : `la aparición ligada de ${v} no cambia`);
      });
      if (notas.length) res.append(' ' + notas.join('; ').replace(/^./, (x) => x.toUpperCase()) + ': solo se sustituyen las libres.');
      if (varias) {
        const quedan = libres.filter((v) => !elegidas.some((x) => x.v === v));
        res.append(' ', quedan.length
          ? `${quedan.length > 1 ? 'Siguen libres' : 'Sigue libre'} ${quedan.join(' y ')}: la fórmula sigue siendo abierta.`
          : 'Ya no quedan variables libres: es una sentencia.');
      }
    };
    const fila = el('p');
    fila.append(`Sustitución (§4.2.3): en A(${libres.join(', ')}) = `, fo(S.texto(f)), varias ? ', sustituye las variables libres que quieras: ' : ', pon la constante ');
    campos.forEach(({ v, inp }, k) => {
      if (varias) fila.append(k ? ', ' : '', fo(v), ' por ');
      fila.append(inp);
      inp.addEventListener('input', calcular);
    });
    fila.append(varias ? '. Deja en blanco las que no quieras sustituir.' : ':');
    div.append(fila, res);
    calcular();
    return div;
  }

  // ---- Practicar ----------------------------------------------------------------------------

  let aciertos = 0, intentos = 0, respondido = false;
  const rnd = S.azar(Date.now());
  function puntuar(bien) {
    if (respondido) return;
    respondido = true;
    intentos++;
    if (bien) aciertos++;
    $('marcador').textContent = `Aciertos: ${aciertos} de ${intentos}`;
  }
  const mensaje = (bien, ...partes) => { const m = el('div', 'mensaje ' + (bien ? 'bien' : 'mal')); m.append(...partes); return m; };

  function nuevoEjercicio() {
    const tipo = $('tipo').value;
    const soloPrimer = tipo === 'libres' || tipo === 'sustitucion';
    $('nivel').disabled = soloPrimer;
    if (soloPrimer) $('nivel').value = 'primer';
    const nivel = $('nivel').value;
    const e = S.formulaPara(tipo, nivel, rnd);
    const cont = $('ejercicio');
    cont.replaceChildren();
    respondido = false;
    if (!e) { cont.append(el('p', 'error', 'No he podido generar un ejercicio; prueba otra vez.')); return; }
    ({ principal: ejPrincipal, agrupacion: ejAgrupacion, subformulas: ejSubformulas, libres: ejLibres, sustitucion: ejSustitucion })[tipo](cont, e);
  }

  function ejPrincipal(cont, { f }) {
    cont.append(el('p', '', 'Pulsa la conectiva principal de esta fórmula (o su cuantificador, si es lo último que se aplica):'));
    const res = el('div');
    const d = dibujarPiezas(f, {
      clicables: (p) => p.tipo === 'op' || p.tipo === 'cuant',
      clic: (p, span) => {
        res.replaceChildren();
        d.spans.forEach((s) => s.classList.remove('elegida-mal'));
        const bien = p.nodo === f;
        puntuar(bien);
        const estricta = fo(S.texto(f, 'estricto'));
        if (bien) {
          span.classList.add('elegida-bien');
          res.append(mensaje(true, `Sí: ${p.texto.trim()} es la conectiva principal. Con todos los paréntesis: `, estricta, '.'));
        } else {
          span.classList.add('elegida-mal');
          const pr = S.principal(f);
          res.append(mensaje(false, 'No: esa es la conectiva principal de ', fo(S.texto(p.nodo)), `, que es solo una parte. La principal es ${pr.simbolo}. Con todos los paréntesis: `, estricta, '. ', CONVENCIONES));
        }
      },
    });
    const p = el('p', 'grande');
    p.append(d.cont);
    cont.append(p, res);
  }

  function ejAgrupacion(cont, { f }) {
    cont.append(el('p', '', '¿Cómo se lee esta fórmula con las convenciones del libro?'));
    const p = el('p', 'grande');
    p.append(fo(S.texto(f)));
    cont.append(p);
    const opciones = S.otrasLecturas(f, 3).concat([f]).sort(() => rnd() - 0.5);
    const lista = el('div', 'opciones-lectura');
    const res = el('div');
    const botones = opciones.map((g) => {
      const b = boton('', 'secundario lectura', () => {
        const bien = K(g) === K(f);
        puntuar(bien);
        botones.forEach((x, i) => { x.disabled = true; if (K(opciones[i]) === K(f)) x.classList.add('correcta'); });
        if (!bien) b.classList.add('incorrecta');
        res.replaceChildren(mensaje(bien, bien ? 'Sí. ' : 'No. ', CONVENCIONES));
      });
      b.append(fo(S.texto(g, 'estricto', false)));
      lista.append(b);
      return b;
    });
    cont.append(lista, res);
  }

  function ejSubformulas(cont, { f }) {
    cont.append(el('p', '', 'Marca los trozos que son subfórmulas de esta fórmula:'));
    const p = el('p', 'grande');
    p.append(fo(S.texto(f)));
    cont.append(p);
    const t = S.trozos(f).filter((x) => !x.atomica);
    const si = t.filter((x) => x.es).sort(() => rnd() - 0.5).slice(0, 4);
    const no = t.filter((x) => !x.es).sort(() => rnd() - 0.5).slice(0, 4);
    const candidatos = si.concat(no).sort(() => rnd() - 0.5);
    const lista = el('div', 'candidatos');
    const casillas = candidatos.map((c) => {
      const l = el('label', 'candidato');
      const x = el('input');
      x.type = 'checkbox';
      l.append(x, ' ', fo(c.texto));
      lista.append(l);
      return { c, x, l };
    });
    const res = el('div');
    const b = boton('Comprobar', '', () => {
      let errores = 0;
      const notas = [];
      casillas.forEach(({ c, x, l }) => {
        l.classList.remove('bien', 'mal');
        const ok = x.checked === c.es;
        l.classList.add(ok ? 'bien' : 'mal');
        if (!ok) {
          errores++;
          notas.push(c.es ? `${c.texto} sí es subfórmula.` : `${c.texto} no es subfórmula: sus símbolos aparecen seguidos, pero no forman una unidad.`);
        }
      });
      puntuar(!errores);
      res.replaceChildren(mensaje(!errores, errores ? `Hay ${errores} ${errores > 1 ? 'errores' : 'error'}. ${notas.join(' ')} Con todos los paréntesis se ve mejor: ` : 'Bien. Con todos los paréntesis: ',
        fo(S.texto(f, 'estricto')), '.'));
    });
    cont.append(lista, b, res);
  }

  function ejLibres(cont, { f }) {
    cont.append(el('p', '', 'Pulsa cada aparición de una variable para marcarla como libre (L) o ligada (G), y comprueba:'));
    const marcas = new Map();
    const d = dibujarPiezas(f, {
      clicables: (p) => p.tipo === 'var',
      clic: (p, span) => {
        const m = marcas.get(p.i) === 'libre' ? 'ligada' : 'libre';
        marcas.set(p.i, m);
        span.dataset.marca = m === 'libre' ? 'L' : 'G';
        span.classList.remove('bien', 'mal');
      },
    });
    const p = el('p', 'grande');
    p.append(d.cont);
    const res = el('div');
    const b = boton('Comprobar', '', () => {
      let errores = 0, sin = 0;
      d.piezas.forEach((x, i) => {
        if (x.tipo !== 'var') return;
        const m = marcas.get(i);
        d.spans[i].classList.remove('bien', 'mal');
        if (!m) { sin++; return; }
        const ok = (m === 'libre') === x.libre;
        d.spans[i].classList.add(ok ? 'bien' : 'mal');
        if (!ok) errores++;
      });
      if (sin) { res.replaceChildren(mensaje(false, `Faltan ${sin} ${sin > 1 ? 'apariciones' : 'aparición'} por marcar.`)); return; }
      puntuar(!errores);
      const libres = [...PO.libres(f)].sort();
      const fin = libres.length ? ` Variables libres: ${libres.join(', ')}; es una fórmula abierta.` : ' No hay variables libres: es una sentencia.';
      const solucion = dibujarPiezas(f, { marcarVariables: true, resaltarAlcances: true });
      res.replaceChildren(mensaje(!errores, errores ? `Hay ${errores} ${errores > 1 ? 'errores' : 'error'}.` : 'Bien.', fin,
        ' Una aparición es ligada si está dentro del alcance de un cuantificador con su misma variable (§4.2.1). Aquí está la solución; pasa el ratón por los cuantificadores para ver su alcance: '),
      (() => { const q = el('p', 'grande'); q.append(solucion.cont); return q; })());
    });
    cont.append(p, b, res);
  }

  function ejSustitucion(cont, { f, v, c }) {
    const p = el('p');
    p.append('Sea A(', fo(v), ') la fórmula ', fo(S.texto(f)), '. Escribe la instancia A(', fo(c), '), que resulta de sustituir ', fo(v), ' por ', fo(c), ' (§4.2.3).');
    cont.append(p);
    const sim = el('div', 'simbolos-botones');
    const fila = el('div', 'fila-entrada');
    const inp = el('input');
    inp.type = 'text';
    inp.spellcheck = false;
    inp.setAttribute('aria-label', `A(${c})`);
    inp.value = S.texto(f);
    const res = el('div');
    const comprobar = () => {
      let g;
      try { g = S.analizar(inp.value); } catch (e) { res.replaceChildren(el('div', 'error', mensajeError(e))); return; }
      const bien = K(g) === K(S.sustituir(f, v, c));
      puntuar(bien);
      if (bien) res.replaceChildren(mensaje(true, 'Bien: solo se sustituyen las apariciones libres de ', fo(v), '.'));
      else if (K(g) === K(S.sustituirTodas(f, v, c))) {
        res.replaceChildren(mensaje(false, 'Has sustituido también las apariciones de ', fo(v), ' ligadas por un cuantificador. Solo se sustituyen las libres: ', fo(`A(${c}) = ${S.texto(S.sustituir(f, v, c))}`), '.'));
      } else res.replaceChildren(mensaje(false, 'No. La instancia es ', fo(`A(${c}) = ${S.texto(S.sustituir(f, v, c))}`), ': se sustituyen todas las apariciones libres de ', fo(v), ', y solo ellas.'));
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') comprobar(); });
    fila.append(inp, boton('Comprobar', '', comprobar));
    cont.append(sim, fila, res);
    llenarSimbolos(sim, inp);
  }

  // ---- Símbolos, pestañas, estado ---------------------------------------------------------------

  const SIMBOLOS = ['¬', '∧', '∨', '→', '↔', '⊥', '∀', '∃', '=', '≠', '(', ')'];
  function llenarSimbolos(c, destino) {
    SIMBOLOS.forEach((s) => c.append(boton(s, '', () => {
      const i = destino.selectionStart ?? destino.value.length, j = destino.selectionEnd ?? i;
      destino.value = destino.value.slice(0, i) + s + destino.value.slice(j);
      destino.focus();
      destino.setSelectionRange(i + s.length, i + s.length);
      destino.dispatchEvent(new Event('input'));
    })));
  }

  let pestana = 'explorar';
  function elegirPestana(nombre) {
    pestana = nombre;
    document.querySelectorAll('[role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.panel === nombre)));
    document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== 'panel-' + nombre; });
    if (nombre === 'practicar' && !$('ejercicio').childElementCount) nuevoEjercicio();
    guardarEstado();
  }
  function guardarEstado() {
    const p = new URLSearchParams();
    p.set('ver', pestana);
    if ($('formula').value.trim()) p.set('f', $('formula').value.trim());
    p.set('tipo', $('tipo').value);
    p.set('nivel', $('nivel').value);
    history.replaceState(null, '', '#' + p.toString());
  }

  function iniciar() {
    EJEMPLOS.forEach(([f, n]) => { const o = el('option', '', n); o.value = f; $('ejemplos').append(o); });
    llenarSimbolos(document.querySelector('.simbolos-botones[data-destino="formula"]'), $('formula'));
    const p = new URLSearchParams(location.hash.slice(1));
    $('formula').value = p.get('f') || '∀x (P(x) → ∃x Q(x))';
    if ([...$('tipo').options].some((o) => o.value === p.get('tipo'))) $('tipo').value = p.get('tipo');
    if (p.get('nivel') === 'primer' || p.get('nivel') === 'prop') $('nivel').value = p.get('nivel');
    $('formula').addEventListener('input', () => { explorar(); guardarEstado(); });
    $('ejemplos').addEventListener('change', (e) => { if (e.target.value) { $('formula').value = e.target.value; e.target.value = ''; explorar(); guardarEstado(); } });
    $('b-otro').addEventListener('click', nuevoEjercicio);
    $('tipo').addEventListener('change', () => { nuevoEjercicio(); guardarEstado(); });
    $('nivel').addEventListener('change', () => { nuevoEjercicio(); guardarEstado(); });
    document.querySelectorAll('[role="tab"]').forEach((b) => b.addEventListener('click', () => elegirPestana(b.dataset.panel)));
    explorar();
    elegirPestana(p.get('ver') === 'practicar' ? 'practicar' : 'explorar');
  }
  document.addEventListener('DOMContentLoaded', iniciar);
})();
