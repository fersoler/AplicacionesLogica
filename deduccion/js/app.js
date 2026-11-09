// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Interfaz del asistente de deducción natural.
(function () {
  'use strict';
  const E = window.Editor, PO = window.PrimerOrden;
  const $ = (id) => document.getElementById(id);
  const el = (etiqueta, clase, texto) => {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  };
  // Botones que actúan sobre la línea activa: no deben quitarle el foco.
  const boton = (texto, clase, accion) => {
    const b = el('button', clase, texto);
    b.type = 'button';
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', accion);
    return b;
  };

  const DATOS = window.Datos.obtener('ejercicios-deduccion');
  const LISTA = [];
  DATOS.temas.forEach((t) => t.niveles.forEach((n) => n.ejercicios.forEach((e) => LISTA.push({ e, tema: t, nivel: n }))));
  const secuente = (e) => `${e.premisas.join(', ')}${e.premisas.length ? ' ' : ''}⊢ ${e.conclusion}`;

  let problema = null;    // {premisas, conclusion, texto}
  let ejercicio = null;   // elemento de LISTA o null
  let lineas = [];        // [{prof, tipo, formula, just}]
  let actual = { i: 0, campo: 'formula' };
  let resultado = null;
  let filas = [];         // por línea: {tr, formula, just, estado, msj, texto}
  let hechos = new Set();

  try { hechos = new Set(JSON.parse(localStorage.getItem('deduccion:hechos') || '[]')); } catch (e) { /* sin almacenamiento */ }

  // ---- Problema y ejercicios -------------------------------------------------------------------

  function llenarEjercicios() {
    const sel = $('ejercicios');
    sel.replaceChildren(el('option', '', 'Elige un ejercicio…'));
    sel.firstChild.value = '';
    let grupo = null, nivelActual = null;
    LISTA.forEach(({ e, tema, nivel }) => {
      if (nivel !== nivelActual) {
        nivelActual = nivel;
        grupo = el('optgroup');
        grupo.label = `Tema ${tema.tema}. ${nivel.titulo}`;
        sel.append(grupo);
      }
      const o = el('option', '', `${hechos.has(e.numero) ? '✓ ' : ''}${e.numero}${e.titulo ? ' ' + e.titulo : ''}: ${secuente(e)}`);
      o.value = e.numero;
      grupo.append(o);
    });
    if (ejercicio) sel.value = ejercicio.e.numero;
  }

  function elegirEjercicio(numero, lineasGuardadas) {
    const x = LISTA.find((y) => y.e.numero === numero);
    if (!x) return;
    ejercicio = x;
    $('premisas').value = x.e.premisas.join('\n');
    $('conclusion').value = x.e.conclusion;
    $('solo-basicas').checked = !!x.e.soloBasicas;
    empezar(lineasGuardadas, true);
  }

  function empezar(lineasGuardadas, desdeEjercicio) {
    const err = $('error-problema');
    err.textContent = '';
    const p = E.leerProblema($('premisas').value, $('conclusion').value);
    if (p.error) { err.textContent = p.error; return; }
    problema = p;
    if (!desdeEjercicio) {
      // Si el argumento es el de un ejercicio, se enlaza con él.
      const clave = (fs, c) => fs.map((f) => PO.clave(f)).sort().join('|') + '⊢' + PO.clave(c);
      const k = clave(p.premisas, p.conclusion);
      ejercicio = LISTA.find((y) => clave(y.e.premisas.map(E.analizar), E.analizar(y.e.conclusion)) === k) || null;
    }
    $('sec-prueba').hidden = false;
    $('argumento').textContent = p.texto;
    mostrarEjercicio();
    let guardada = lineasGuardadas;
    if (!guardada) {
      try { const s = localStorage.getItem(claveGuardado()); if (s) guardada = E.decodificar(problema, s); } catch (e) { /* sin almacenamiento */ }
    }
    lineas = guardada || E.lineasIniciales(problema);
    actual = { i: lineas.findIndex((l) => l.tipo !== 'premisa'), campo: 'formula' };
    $('exportacion').hidden = true;
    $('ejercicios').value = ejercicio ? ejercicio.e.numero : '';
    dibujar();
    if (!lineasGuardadas && guardada && lineas.some((l) => l.tipo !== 'premisa' && l.formula)) {
      avisoTemporal('He recuperado la prueba que tenías guardada en este navegador para este argumento.');
    }
  }
  const claveGuardado = () => 'deduccion:' + problema.texto;

  function mostrarEjercicio() {
    const info = $('info-ejercicio');
    info.hidden = !ejercicio;
    $('b-siguiente').hidden = true;
    if (!ejercicio) return;
    const { e, tema, nivel } = ejercicio;
    $('nivel-ejercicio').textContent = `Ejercicio ${e.numero} · Tema ${tema.tema}. ${nivel.titulo}`;
    const enunciado = [e.titulo, e.enunciado, e.restriccion].filter(Boolean).join('. ');
    $('enunciado-ejercicio').textContent = enunciado;
    $('enunciado-ejercicio').hidden = !enunciado;
    $('b-pista').hidden = !e.pista;
    $('pista-ejercicio').hidden = true;
    $('pista-ejercicio').textContent = e.pista ? `Pista: ${e.pista}` : '';
    $('b-plantilla').hidden = !e.plantilla;
  }

  // ---- Dibujo ------------------------------------------------------------------------------------

  // Barras de Fitch: d barras exteriores y un bloque interior con borde izquierdo.
  function barras(d, contenido, claseUltima = '') {
    const b = el('div', 'barras');
    for (let k = 0; k < d; k++) b.append(el('span', 'barra'));
    const ultima = el('span', 'ultima' + claseUltima);
    ultima.append(contenido);
    b.append(ultima);
    return b;
  }

  function campo(clase, valor, etiqueta, ejemplo) {
    const c = el('input', clase);
    c.type = 'text';
    c.value = valor;
    c.spellcheck = false;
    c.autocomplete = 'off';
    c.setAttribute('aria-label', etiqueta);
    c.placeholder = ejemplo;
    return c;
  }

  function dibujar() {
    const cuerpo = $('prueba').tBodies[0];
    cuerpo.replaceChildren();
    filas = [];
    const ultimaPremisa = lineas.reduce((u, l, i) => (l.tipo === 'premisa' ? i : u), -1);
    lineas.forEach((l, i) => {
      const tr = el('tr', 'linea' + (l.tipo === 'premisa' ? ' premisa' : ''));
      tr.append(el('td', 'num', String(i + 1)));
      const f = el('span', 'f');
      let campoF = null, campoJ = null;
      if (l.tipo === 'premisa') f.textContent = l.formula;
      else {
        campoF = campo('campo-formula', l.formula, `Línea ${i + 1}: fórmula`, l.tipo === 'hipotesis' ? 'hipótesis' : 'fórmula');
        campoF.size = Math.max(8, l.formula.length + 2);
        enlazar(campoF, i, 'formula');
        f.append(campoF);
      }
      const raya = l.tipo === 'hipotesis' || (l.tipo === 'premisa' && i === ultimaPremisa);
      const td = el('td', 'formula');
      td.append(barras(l.prof, f, (l.tipo === 'hipotesis' ? ' inicio' : '') + (raya ? ' raya' : '')));
      tr.append(td);
      const tdJ = el('td', 'just');
      if (l.tipo === 'premisa') tdJ.textContent = 'Prem.';
      else {
        campoJ = campo('campo-just', l.just, `Línea ${i + 1}: justificación`, l.tipo === 'hipotesis' ? 'Hip.' : 'regla y citas');
        enlazar(campoJ, i, 'just');
        tdJ.append(campoJ);
      }
      tr.append(tdJ);
      const estado = el('td', 'estado');
      tr.append(estado);
      const acciones = el('td', 'acciones');
      if (l.tipo !== 'premisa') {
        [['⇤', 'Sacar de su caja la línea', () => sacar(i)], ['⇥', 'Meter en la caja de la línea anterior la línea', () => meter(i)], ['✕', 'Borrar la línea', () => borrarLinea(i)]].forEach(([t, titulo, f2]) => {
          const b = boton(t, 'accion', f2);
          b.title = titulo.replace(/ la línea$/, '');
          b.setAttribute('aria-label', `${titulo} ${i + 1}`);
          b.tabIndex = -1;
          acciones.append(b);
        });
      }
      tr.append(acciones);
      // Fila del mensaje de error, con las barras que siguen hasta la línea siguiente.
      const trM = el('tr', 'mensaje-linea');
      trM.append(el('td', 'num'));
      const tdM = el('td', 'formula');
      tdM.colSpan = 4;
      const sig = lineas[i + 1];
      const texto = el('span', 'texto-mensaje');
      if (sig) {
        const comun = sig.tipo === 'hipotesis' ? Math.min(l.prof, sig.prof - 1) : Math.min(l.prof, sig.prof);
        tdM.append(barras(Math.max(0, comun), texto));
      } else tdM.append(texto);
      trM.append(tdM);
      trM.hidden = true;
      cuerpo.append(tr, trM);
      filas.push({ tr, formula: campoF, just: campoJ, estado, msj: trM, texto });
    });
    comprobar();
    enfocar(actual.i, actual.campo);
  }

  function enlazar(c, i, nombre) {
    c.addEventListener('focus', () => {
      actual = { i, campo: nombre };
      filas.forEach((x, k) => x.tr.classList.toggle('activa', k === i));
      pintarMensajes();
      pintarPaleta();
    });
    c.addEventListener('input', () => {
      lineas[i][nombre] = c.value;
      if (nombre === 'formula') c.size = Math.max(8, c.value.length + 2);
      programarComprobacion();
    });
    c.addEventListener('blur', () => normalizar(i, nombre, c));
    c.addEventListener('keydown', (e) => teclado(e, i, nombre));
  }

  // Al salir de un campo, se reescribe con la notación del libro si se entiende.
  function normalizar(i, nombre, c) {
    const l = lineas[i];
    if (!l) return;
    let nuevo = c.value;
    if (nombre === 'formula' && c.value.trim()) {
      try { nuevo = E.texto(E.analizar(c.value)); } catch (e) { /* se deja como está */ }
    } else if (nombre === 'just' && c.value.trim()) {
      if (l.tipo === 'hipotesis') nuevo = E.leerHipotesis(c.value).etiqueta;
      else { const j = E.leerJustificacion(c.value); if (j.regla) nuevo = E.justificacionTexto(j); }
    }
    if (nuevo !== c.value) {
      c.value = nuevo;
      l[nombre] = nuevo;
      if (nombre === 'formula') c.size = Math.max(8, nuevo.length + 2);
      comprobar();
    }
  }

  // ---- Paleta según el campo activo: símbolos en las fórmulas, reglas en las justificaciones ----

  function pintarPaleta() {
    const p = $('paleta');
    p.replaceChildren();
    const fila = filas[actual.i];
    if (!fila) return;
    const l = lineas[actual.i];
    if (actual.campo === 'formula') {
      p.append(el('span', 'rotulo', 'Símbolos'));
      ['¬', '∧', '∨', '→', '↔', '⊥', '∀', '∃', '=', '≠', '(', ')'].forEach((s) => p.append(boton(s, 'secundario mini', () => escribirEn(fila.formula, s))));
    } else if (l.tipo === 'hipotesis') {
      p.append(el('span', 'rotulo', 'Hipótesis'));
      ['Hip.', 'Hip. IP', 'Hip. testigo '].forEach((s) => p.append(boton(s.trim(), 'secundario mini', () => {
        fila.just.value = s;
        fila.just.focus();
        fila.just.setSelectionRange(s.length, s.length);
        fila.just.dispatchEvent(new Event('input'));
      })));
    } else {
      p.append(el('span', 'rotulo', 'Reglas'));
      // Con «Solo reglas básicas» no se ofrecen las derivadas.
      // y en los ejercicios que prohíben alguna regla (DeM en 1.18 y 1.23), tampoco esa.
      const prohibidas = (ejercicio && ejercicio.e.prohibidas) || [];
      const grupos = [E.PROPOSICIONALES, E.CUANTIFICADORES].concat($('solo-basicas').checked ? [] : [E.DERIVADAS])
        .map((g) => g.filter((r) => !prohibidas.includes(r)));
      grupos.forEach((g, k) => {
        const grupo = el('span', 'grupo-reglas' + (k === 2 ? ' derivadas' : ''));
        g.forEach((r) => grupo.append(boton(r, 'secundario mini', () => escribirEn(fila.just, r, true))));
        p.append(grupo);
      });
    }
  }

  function escribirEn(c, s, reemplazarRegla) {
    if (!c) return;
    if (reemplazarRegla) {
      const citas = (c.value.match(/[\d\s,;–-]*$/) || [''])[0].trim();
      c.value = s + ' ' + citas;
      c.focus();
      c.setSelectionRange(c.value.length, c.value.length);
    } else {
      const i = c.selectionStart ?? c.value.length, j = c.selectionEnd ?? i;
      c.value = c.value.slice(0, i) + s + c.value.slice(j);
      c.focus();
      c.setSelectionRange(i + s.length, i + s.length);
    }
    c.dispatchEvent(new Event('input'));
  }

  // ---- Comprobación -------------------------------------------------------------------------------

  let temporizador = null;
  function programarComprobacion() {
    clearTimeout(temporizador);
    temporizador = setTimeout(comprobar, 150);
  }

  function comprobar() {
    if (!problema) return;
    resultado = E.comprobar(problema, lineas, { soloBasicas: $('solo-basicas').checked, prohibidas: (ejercicio && ejercicio.e.prohibidas) || [] });
    resultado.lineas.forEach((r, i) => {
      const fila = filas[i];
      if (!fila) return;
      fila.estado.className = 'estado ' + r.estado;
      fila.estado.textContent = { bien: '✓', error: '✗', incompleta: '…', vacia: '' }[r.estado];
      fila.estado.title = { bien: 'Correcta', error: 'Con errores', incompleta: 'Incompleta', vacia: '' }[r.estado];
    });
    pintarMensajes();
    pintarEstado();
    if (resultado.completa && ejercicio && !hechos.has(ejercicio.e.numero)) {
      hechos.add(ejercicio.e.numero);
      try { localStorage.setItem('deduccion:hechos', JSON.stringify([...hechos])); } catch (e) { /* sin almacenamiento */ }
      llenarEjercicios();
    }
    const k = ejercicio ? LISTA.indexOf(ejercicio) : -1;
    $('b-siguiente').hidden = !(resultado.completa && k >= 0 && k < LISTA.length - 1);
    guardar();
  }

  function pintarEstado() {
    const est = $('estado');
    est.className = 'mensaje ' + (resultado.completa ? 'bien' : resultado.errores ? 'mal' : '');
    est.textContent = resultado.mensaje;
  }

  // Los errores se muestran siempre; «falta la justificación», solo fuera de la línea activa.
  function pintarMensajes() {
    if (!resultado) return;
    resultado.lineas.forEach((r, i) => {
      const fila = filas[i];
      if (!fila) return;
      const mostrar = r.estado === 'error' || (r.estado === 'incompleta' && i !== actual.i);
      fila.msj.hidden = !mostrar;
      fila.texto.textContent = mostrar ? r.mensajes.join(' ') : '';
      fila.msj.className = 'mensaje-linea ' + r.estado;
    });
  }

  // ---- Edición ----------------------------------------------------------------------------------------

  function enfocar(i, nombre = 'formula') {
    const fila = filas[i];
    if (!fila) return;
    const c = fila[nombre] || fila.formula || fila.just;
    if (c) { c.focus(); const n = c.value.length; c.setSelectionRange(n, n); }
  }
  function insertarDespues(i, nueva) {
    lineas = E.insertar(lineas, i, nueva);
    actual = { i: i + 1, campo: 'formula' };
    dibujar();
  }
  const linea = () => lineas[actual.i] || lineas[lineas.length - 1];
  const vacia = (l) => l.tipo !== 'premisa' && !l.formula.trim() && !l.just.trim();
  function nuevaLinea() { insertarDespues(actual.i, { prof: linea().prof, tipo: 'paso', formula: '', just: '' }); }
  // Sobre una línea vacía, abrir o cerrar la caja la transforma en lugar de añadir otra.
  function abrirCaja() {
    const l = linea();
    if (vacia(l) && l.tipo === 'paso') { l.tipo = 'hipotesis'; l.prof++; dibujar(); return; }
    insertarDespues(actual.i, { prof: l.prof + 1, tipo: 'hipotesis', formula: '', just: '' });
  }
  function cerrarCaja() {
    const l = linea();
    if (vacia(l) && l.prof > 0) { l.prof--; l.tipo = 'paso'; dibujar(); return; }
    insertarDespues(actual.i, { prof: Math.max(0, l.prof - 1), tipo: 'paso', formula: '', just: '' });
  }
  function borrarLinea(i = actual.i) {
    if (lineas[i].tipo === 'premisa') return;
    if (lineas.filter((l) => l.tipo !== 'premisa').length === 1) {
      lineas[i] = { prof: 0, tipo: 'paso', formula: '', just: '' };
      actual = { i, campo: 'formula' };
    } else {
      lineas = E.borrar(lineas, i);
      const anterior = Math.max(0, i - 1);
      actual = { i: lineas[anterior].tipo === 'premisa' ? Math.min(i, lineas.length - 1) : anterior, campo: 'formula' };
    }
    dibujar();
  }
  function sacar(i = actual.i) {
    const l = lineas[i];
    if (l.tipo === 'premisa' || l.prof === 0) return;
    l.prof--;
    if (l.tipo === 'hipotesis' && l.prof === 0) l.tipo = 'paso';
    actual = { i, campo: actual.campo };
    dibujar();
  }
  function meter(i = actual.i) {
    const l = lineas[i];
    if (l.tipo === 'premisa' || i === 0) return;
    const anterior = lineas[i - 1];
    const maximo = l.tipo === 'hipotesis' ? anterior.prof + 1 : anterior.prof;
    if (l.prof >= maximo) { avisoTemporal('Una línea solo puede entrar en una caja abierta justo encima. Para empezar una caja nueva, usa «Abrir caja».'); return; }
    l.prof++;
    actual = { i, campo: actual.campo };
    dibujar();
  }

  function teclado(e, i, nombre) {
    if (e.key === 'Enter') {
      e.preventDefault();
      normalizar(i, nombre, e.target);
      if (e.ctrlKey || e.metaKey) abrirCaja();
      else if (e.shiftKey) cerrarCaja();
      else nuevaLinea();
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const paso = e.key === 'ArrowUp' ? -1 : 1;
      for (let k = i + paso; k >= 0 && k < lineas.length; k += paso) {
        if (lineas[k].tipo !== 'premisa') { enfocar(k, nombre); return; }
      }
      return;
    }
    if (e.key === 'Backspace' && !e.target.value && !lineas[i].formula && !lineas[i].just) {
      e.preventDefault();
      borrarLinea(i);
    }
  }

  // ---- Guardado, exportación, avisos --------------------------------------------------------------

  // Borra del almacenamiento local las pruebas guardadas y las marcas de ejercicios
  // terminados (solo las de esta aplicación). La prueba en pantalla no se toca.
  function borrarGuardado() {
    if (!window.confirm('¿Borrar las pruebas guardadas en este navegador y las marcas de ejercicios terminados?')) return;
    let n = 0;
    try {
      const claves = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('deduccion:')) claves.push(k);
      }
      claves.forEach((k) => localStorage.removeItem(k));
      n = claves.filter((k) => k !== 'deduccion:hechos').length;
    } catch (e) { /* sin almacenamiento */ }
    hechos = new Set();
    llenarEjercicios();
    $('borrado').textContent = `Borrado${n ? ` (${n} prueba${n > 1 ? 's' : ''})` : ''}. La prueba que hay en pantalla se volverá a guardar si la cambias.`;
  }

  function guardar() {
    if (!problema) return;
    const cod = E.codificar(lineas);
    try { localStorage.setItem(claveGuardado(), cod); } catch (e) { /* sin almacenamiento */ }
    const p = new URLSearchParams();
    if (ejercicio) p.set('ej', ejercicio.e.numero);
    else {
      p.set('p', problema.premisas.map(E.texto).join('\n'));
      p.set('c', E.texto(problema.conclusion));
    }
    p.set('prueba', cod);
    if ($('solo-basicas').checked) p.set('basicas', '1');
    history.replaceState(null, '', '#' + p.toString());
  }

  function exportar(texto, latex) {
    $('exportacion').hidden = false;
    $('nota-preambulo').hidden = !latex;
    $('preambulo').value = E.PREAMBULO_LATEX;
    $('exportado').value = texto;
    $('copiado').textContent = '';
    $('exportado').focus();
    $('exportado').select();
  }

  let avisoT = null;
  function avisoTemporal(texto) {
    const est = $('estado');
    est.className = 'mensaje';
    est.textContent = texto;
    clearTimeout(avisoT);
    avisoT = setTimeout(() => { if (resultado) pintarEstado(); }, 4000);
  }

  // ---- Arranque --------------------------------------------------------------------------------------

  function iniciar() {
    llenarEjercicios();
    document.querySelectorAll('.simbolos-botones').forEach((c) => {
      const destino = $(c.dataset.destino);
      ['¬', '∧', '∨', '→', '↔', '⊥', '∀', '∃', '=', '≠', '(', ')'].forEach((s) => c.append(boton(s, '', () => escribirEn(destino, s))));
    });
    $('ejercicios').addEventListener('change', (e) => { if (e.target.value) elegirEjercicio(e.target.value); });
    $('b-empezar').addEventListener('click', () => empezar());
    $('conclusion').addEventListener('keydown', (e) => { if (e.key === 'Enter') empezar(); });
    [['b-linea', nuevaLinea], ['b-abrir', abrirCaja], ['b-cerrar', cerrarCaja]].forEach(([id, f]) => {
      $(id).addEventListener('mousedown', (e) => e.preventDefault());
      $(id).addEventListener('click', f);
    });
    $('solo-basicas').addEventListener('change', () => { pintarPaleta(); comprobar(); });
    $('b-borrar-guardado').addEventListener('click', borrarGuardado);
    $('b-pista').addEventListener('click', () => { $('pista-ejercicio').hidden = !$('pista-ejercicio').hidden; });
    $('b-plantilla').addEventListener('click', () => {
      const escritas = lineas.some((l) => l.tipo !== 'premisa' && (l.formula || l.just));
      if (escritas && !window.confirm('¿Sustituir lo que has escrito por la plantilla del libro?')) return;
      lineas = ejercicio.e.plantilla.map((l) => Object.assign({}, l));
      const hueco = lineas.findIndex((l) => l.tipo === 'paso' && !l.just);
      actual = { i: hueco >= 0 ? hueco : lineas.length - 1, campo: 'just' };
      dibujar();
    });
    $('b-siguiente').addEventListener('click', () => {
      const k = LISTA.indexOf(ejercicio);
      if (k >= 0 && k < LISTA.length - 1) elegirEjercicio(LISTA[k + 1].e.numero);
      $('sec-problema').scrollIntoView({ behavior: 'smooth' });
    });
    $('b-latex').addEventListener('click', () => exportar(E.aLatex(lineas), true));
    $('b-texto').addEventListener('click', () => exportar(`${problema.texto}\n\n${E.aTexto(lineas)}`, false));
    $('b-copiar').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('exportado').value); $('copiado').textContent = 'Copiado.'; }
      catch (e) { $('exportado').select(); $('copiado').textContent = document.execCommand && document.execCommand('copy') ? 'Copiado.' : 'Selecciónalo y cópialo con Ctrl+C.'; }
    });
    $('b-reiniciar').addEventListener('click', () => {
      if (!window.confirm('¿Borrar la prueba y empezar de nuevo?')) return;
      lineas = E.lineasIniciales(problema);
      actual = { i: lineas.length - 1, campo: 'formula' };
      dibujar();
    });

    // Estado inicial: el de la dirección, o el primer ejercicio.
    const p = new URLSearchParams(location.hash.slice(1));
    const decod = (pr) => (p.has('prueba') ? E.decodificar(pr, p.get('prueba')) : undefined);
    const x = p.has('ej') ? LISTA.find((y) => y.e.numero === p.get('ej')) : null;
    if (x) {
      const pr = E.leerProblema(x.e.premisas.join('\n'), x.e.conclusion);
      elegirEjercicio(x.e.numero, decod(pr));
      if (p.has('basicas')) { $('solo-basicas').checked = true; comprobar(); }
    } else if (p.has('c')) {
      $('premisas').value = p.get('p') || '';
      $('conclusion').value = p.get('c');
      $('solo-basicas').checked = p.get('basicas') === '1';
      $('otro-argumento').open = true;
      const leido = E.leerProblema($('premisas').value, $('conclusion').value);
      empezar(leido.error ? undefined : decod(leido));
    } else {
      elegirEjercicio(LISTA[0].e.numero);
    }
  }
  document.addEventListener('DOMContentLoaded', iniciar);
})();
