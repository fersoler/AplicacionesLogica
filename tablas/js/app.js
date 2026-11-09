// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Interfaz de las tablas de verdad.
(function () {
  'use strict';
  const F = window.Formulas, S = window.Semantica, E = window.Ejercicios;
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
  const fo = (t) => el('span', 'fo', t);
  const valor = (x) => el('span', 'valor v' + x, String(x));
  const T = F.textoExplicito;
  const listaY = S.listaY;
  const textoFilas = (rs) => (rs.length === 1 ? 'la fila ' : 'las filas ') + listaY(rs.map((r) => String(r + 1)));
  const mensajeError = (e) => (e.posicion !== undefined ? `${e.message.replace(/\.$/, '')} (posición ${e.posicion + 1}).` : e.message);

  // Lee una lista de fórmulas (una por línea).
  function leerLista(texto, nombre) {
    const lineas = texto.split('\n').map((s) => s.trim()).filter(Boolean);
    const formulas = [];
    for (let i = 0; i < lineas.length; i++) {
      try { formulas.push(F.analizar(lineas[i])); } catch (e) { return { error: `${nombre(i, lineas.length)}: ${mensajeError(e)}` }; }
    }
    return { formulas };
  }
  const demasiadas = (formulas) => {
    const n = new Set(formulas.flatMap(F.variables)).size;
    return n > S.MAX_VARIABLES ? `Hay ${n} variables: la tabla tendría ${2 ** n} filas. Usa como mucho ${S.MAX_VARIABLES}.` : '';
  };

  // ---- Opciones de cada tabla -------------------------------------------------------

  function opcionesTabla(prefijo, alCambiar) {
    const c = document.querySelector(`.opciones-tabla[data-prefijo="${prefijo}"]`);
    const fila = el('div', 'opciones-fila');
    [['ejercicio', 'Rellenarla yo'], ['resuelta', 'Verla resuelta']].forEach(([v, t], i) => {
      const l = el('label');
      const r = el('input');
      r.type = 'radio'; r.name = `modo-${prefijo}`; r.value = v; r.checked = i === 0;
      r.addEventListener('change', alCambiar);
      l.append(r, ' ' + t);
      fila.append(l);
    });
    const casilla = (texto) => {
      const l = el('label');
      const r = el('input');
      r.type = 'checkbox';
      r.addEventListener('change', alCambiar);
      l.append(r, ' ' + texto);
      fila.append(l);
      return r;
    };
    const solo = casilla('Solo las columnas de las fórmulas');
    const vars = casilla('Rellenar también las variables');
    c.append(fila);
    return () => ({
      modo: c.querySelector(`input[name="modo-${prefijo}"]:checked`).value,
      soloPrincipales: solo.checked,
      rellenarVariables: vars.checked,
    });
  }

  // ---- Componente de tabla de verdad ------------------------------------------------
  // op: {modo, soloPrincipales, rellenarVariables, etiquetas (Map columna → texto),
  //      marcarFilas, alCompletar(), alVaciar(), alMarcar()}

  function crearTabla(contenedor, datos, op) {
    contenedor.replaceChildren();
    const cols = datos.columnas;
    const nf = datos.filas.length;
    const visibles = cols.map((_, i) => i).filter((i) => !op.soloPrincipales || cols[i].tipo !== 'compuesta' || cols[i].principal.length);
    const esEjercicio = (i) => op.modo === 'ejercicio' && (cols[i].tipo === 'compuesta' || (op.rellenarVariables && cols[i].tipo === 'var'));
    const ejercicio = visibles.filter(esEjercicio);
    const resp = cols.map((c, i) => (esEjercicio(i) ? Array(nf).fill(null) : c.valores.slice()));
    const celdas = new Map(), botones = new Map(), cabeceras = new Map(), trs = [];
    const marcadas = new Set();
    let resuelta = !ejercicio.length;
    const primeraCompuesta = visibles.findIndex((i) => cols[i].tipo === 'compuesta');
    const clasesColumna = (i, k) => {
      const cl = [];
      if (k === primeraCompuesta) cl.push('sep');
      else if (k > primeraCompuesta && primeraCompuesta >= 0) cl.push('div');
      if (cols[i].principal.length) cl.push('principal');
      return cl.join(' ');
    };

    const tabla = el('table', 'tabla-verdad tabla-ejercicio');
    const thead = el('thead');
    if (op.etiquetas && op.etiquetas.size) {
      const tr = el('tr', 'etiquetas');
      tr.append(el('th', 'n'));
      visibles.forEach((i, k) => tr.append(el('th', clasesColumna(i, k), op.etiquetas.get(i) || '')));
      thead.append(tr);
    }
    const trCab = el('tr');
    trCab.append(el('th', 'n'));
    visibles.forEach((i, k) => {
      const th = el('th', clasesColumna(i, k), cols[i].texto);
      th.scope = 'col';
      cabeceras.set(i, th);
      trCab.append(th);
    });
    thead.append(trCab);
    if (ejercicio.length) {
      const tr = el('tr', 'rellenar');
      tr.append(el('th', 'n'));
      visibles.forEach((i, k) => {
        const th = el('th', clasesColumna(i, k));
        if (esEjercicio(i)) {
          [1, 0].forEach((x) => {
            const b = boton(String(x), 'secundario mini', () => { for (let r = 0; r < nf; r++) poner(i, r, x); });
            b.title = `Poner ${x} en toda la columna ${cols[i].texto}`;
            b.setAttribute('aria-label', b.title);
            th.append(b);
          });
        }
        tr.append(th);
      });
      thead.append(tr);
    }
    tabla.append(thead);

    const tbody = el('tbody');
    for (let r = 0; r < nf; r++) {
      const tr = el('tr');
      trs.push(tr);
      const th = el('th', 'n');
      th.scope = 'row';
      if (op.marcarFilas) {
        const b = boton(String(r + 1), 'fila', () => {
          if (marcadas.has(r)) marcadas.delete(r); else marcadas.add(r);
          b.setAttribute('aria-pressed', String(marcadas.has(r)));
          tr.classList.toggle('marcada', marcadas.has(r));
          if (op.alMarcar) op.alMarcar();
        });
        b.setAttribute('aria-pressed', 'false');
        b.title = 'Marcar o desmarcar esta fila como contraejemplo';
        th.append(b);
      } else th.textContent = String(r + 1);
      tr.append(th);
      visibles.forEach((i, k) => {
        const td = el('td', clasesColumna(i, k));
        td.dataset.c = i;
        td.dataset.r = r;
        celdas.set(i + ',' + r, td);
        if (esEjercicio(i)) {
          const b = boton('', 'celda', () => poner(i, r, resp[i][r] === 1 ? 0 : 1));
          b.setAttribute('aria-label', `Fila ${r + 1}, ${cols[i].texto}`);
          b.addEventListener('keydown', (e) => teclado(e, i, r));
          botones.set(i + ',' + r, b);
          td.append(b);
        } else td.textContent = String(cols[i].valores[r]);
        tr.append(td);
      });
      tbody.append(tr);
    }
    tabla.append(tbody);
    const marco = el('div', 'desplazable');
    marco.append(tabla);
    contenedor.append(marco);

    const mensaje = el('div', 'mensaje');
    if (ejercicio.length) {
      const controles = el('div', 'botones-fila');
      controles.append(boton('Comprobar', '', comprobar), boton('Ver la solución', 'secundario', solucion), boton('Vaciar', 'secundario', vaciar));
      contenedor.append(controles);
    }
    contenedor.append(mensaje);

    function pintar(i, r) {
      const b = botones.get(i + ',' + r);
      const x = resp[i][r];
      b.textContent = x === null ? '' : String(x);
      b.classList.toggle('llena', x !== null);
    }
    function poner(i, r, x) {
      resp[i][r] = x;
      pintar(i, r);
      botones.get(i + ',' + r).classList.remove('mal', 'vacia', 'revelada');
      mensaje.textContent = '';
      mensaje.className = 'mensaje';
      if (!resuelta && ejercicio.every((j) => resp[j].every((y, s) => y === cols[j].valores[s]))) {
        resuelta = true;
        mensaje.className = 'mensaje bien';
        mensaje.textContent = 'La tabla está completa y es correcta.';
        if (op.alCompletar) op.alCompletar();
      }
    }
    function enfocar(i, r) {
      const b = botones.get(i + ',' + r);
      if (b) b.focus();
    }
    function teclado(e, i, r) {
      const k = ejercicio.indexOf(i);
      if (e.key === '1' || e.key === '0') { poner(i, r, Number(e.key)); enfocar(i, Math.min(r + 1, nf - 1)); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { enfocar(i, Math.min(r + 1, nf - 1)); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { enfocar(i, Math.max(r - 1, 0)); e.preventDefault(); }
      else if (e.key === 'ArrowRight' && k < ejercicio.length - 1) { enfocar(ejercicio[k + 1], r); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' && k > 0) { enfocar(ejercicio[k - 1], r); e.preventDefault(); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { poner(i, r, null); e.preventDefault(); }
    }
    function comprobar() {
      let mal = 0, vacias = 0;
      ejercicio.forEach((i) => resp[i].forEach((x, r) => {
        const b = botones.get(i + ',' + r);
        b.classList.remove('mal', 'vacia');
        if (x === null) { vacias++; b.classList.add('vacia'); } else if (x !== cols[i].valores[r]) { mal++; b.classList.add('mal'); }
      }));
      if (!mal && !vacias) {
        mensaje.className = 'mensaje bien';
        mensaje.textContent = 'La tabla está completa y es correcta.';
        if (!resuelta) { resuelta = true; if (op.alCompletar) op.alCompletar(); }
        return;
      }
      const partes = [];
      if (mal) partes.push(`${mal} ${mal > 1 ? 'casillas están mal' : 'casilla está mal'}`);
      if (vacias) partes.push(`${vacias} ${vacias > 1 ? 'casillas están vacías' : 'casilla está vacía'}`);
      mensaje.className = 'mensaje mal';
      mensaje.textContent = `${listaY(partes)}. Las he marcado en la tabla.`.replace(/^./, (c) => c.toUpperCase());
    }
    function solucion() {
      let cambiadas = 0;
      ejercicio.forEach((i) => resp[i].forEach((x, r) => {
        if (x !== cols[i].valores[r]) {
          cambiadas++;
          resp[i][r] = cols[i].valores[r];
          pintar(i, r);
          botones.get(i + ',' + r).classList.remove('mal', 'vacia');
          botones.get(i + ',' + r).classList.add('revelada');
        }
      }));
      mensaje.className = 'mensaje';
      mensaje.textContent = cambiadas ? `He completado la tabla. Las ${cambiadas} casillas resaltadas estaban vacías o mal.` : 'La tabla ya estaba bien.';
      if (!resuelta) { resuelta = true; if (op.alCompletar) op.alCompletar(); }
    }
    function vaciar() {
      ejercicio.forEach((i) => resp[i].forEach((_, r) => {
        resp[i][r] = null;
        pintar(i, r);
        botones.get(i + ',' + r).classList.remove('mal', 'vacia', 'revelada');
      }));
      resuelta = false;
      mensaje.textContent = '';
      mensaje.className = 'mensaje';
      if (op.alVaciar) op.alVaciar();
    }

    // Al pasar por una casilla se marcan las de las columnas de las que depende.
    let dependientes = [];
    const limpiarDependencias = () => { dependientes.forEach((x) => x.classList.remove('dep')); dependientes = []; };
    const marcarDependencias = (e) => {
      const td = e.target.closest('td[data-c]');
      limpiarDependencias();
      if (!td) return;
      const i = Number(td.dataset.c), r = Number(td.dataset.r);
      cols[i].hijos.forEach((h) => {
        [celdas.get(h + ',' + r), cabeceras.get(h)].forEach((x) => { if (x) { x.classList.add('dep'); dependientes.push(x); } });
      });
    };
    tabla.addEventListener('mouseover', marcarDependencias);
    tabla.addEventListener('focusin', marcarDependencias);
    tabla.addEventListener('mouseleave', limpiarDependencias);
    tabla.addEventListener('focusout', limpiarDependencias);

    const quitar = (clase) => trs.forEach((tr) => tr.classList.remove(clase));
    return {
      datos,
      marcadas,
      resuelta: () => resuelta,
      resaltarFilas(filas, clase) { quitar(clase); filas.forEach((r) => trs[r].classList.add(clase)); },
      quitarResaltado: quitar,
      resaltarColumna(i, si) {
        const lista = [cabeceras.get(i)].concat(Array.from({ length: nf }, (_, r) => celdas.get(i + ',' + r)));
        lista.forEach((x) => { if (x) x.classList.toggle('columna-resaltada', si); });
      },
    };
  }

  // Pregunta con botones de respuesta y comentario.
  function pregunta(contenedor, enunciado, opciones, responder, alPasar) {
    const div = el('div', 'pregunta');
    const p = el('p', 'enunciado');
    p.append(...enunciado);
    const botones = el('div', 'botones-fila');
    const msj = el('div', 'mensaje');
    opciones.forEach(([v, t]) => {
      const b = boton(t, 'secundario', () => {
        const r = responder(v);
        msj.className = 'mensaje ' + (r.bien === true ? 'bien' : r.bien === false ? 'mal' : '');
        msj.replaceChildren(...r.contenido);
        botones.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      });
      b.setAttribute('aria-pressed', 'false');
      botones.append(b);
    });
    if (alPasar) {
      div.addEventListener('mouseenter', () => alPasar(true));
      div.addEventListener('mouseleave', () => alPasar(false));
    }
    div.append(p, botones, msj);
    contenedor.append(div);
  }

  // ---- Pestaña «Tabla de verdad» ------------------------------------------------------

  let opcionesT, tablaT = null;
  function construirTabla() {
    const err = $('error-tabla');
    err.textContent = '';
    $('zona-tabla').replaceChildren();
    $('analisis-tabla').replaceChildren();
    tablaT = null;
    const { formulas, error } = leerLista($('formulas-tabla').value, (i, n) => (n > 1 ? `Fórmula ${i + 1}` : 'Fórmula'));
    if (error) { err.textContent = error; return; }
    if (!formulas.length) { err.textContent = 'Escribe al menos una fórmula.'; return; }
    const muchas = demasiadas(formulas);
    if (muchas) { err.textContent = muchas; return; }
    const datos = S.tabla(formulas);
    const op = opcionesT();
    tablaT = crearTabla($('zona-tabla'), datos, Object.assign(op, {
      alCompletar: () => analisisTabla(datos, tablaT),
      alVaciar: () => $('analisis-tabla').replaceChildren(),
    }));
    if (tablaT.resuelta()) analisisTabla(datos, tablaT);
    guardarEstado();
  }

  function analisisTabla(datos, ui) {
    const cont = $('analisis-tabla');
    cont.replaceChildren();
    const det = el('div', 'detalle');
    det.append(el('h3', '', 'Clasificación (§2.3)'));
    cont.append(det);
    const distintas = datos.formulas.map((_, i) => i).filter((i) => datos.formulas.findIndex((g) => F.iguales(g, datos.formulas[i])) === i);
    const col = (i) => datos.columnaDe(i);
    const indiceCol = (i) => datos.columnas.indexOf(col(i));

    distintas.forEach((i) => {
      const f = datos.formulas[i];
      pregunta(det, ['¿Cómo es ', fo(T(f)), '?'], [['tautologia', 'Tautología'], ['contradiccion', 'Contradicción'], ['contingente', 'Contingente']], (resp) => {
        const vals = col(i).valores;
        const clase = S.clasificar(vals);
        const unos = vals.map((x, r) => (x ? r : -1)).filter((r) => r >= 0);
        const ceros = vals.map((x, r) => (x ? -1 : r)).filter((r) => r >= 0);
        if (resp !== clase) {
          const pista = { tautologia: 'Mira su columna: no tiene ningún 0.', contradiccion: 'Mira su columna: no tiene ningún 1.', contingente: 'Mira su columna: tiene unos y ceros.' }[clase];
          return { bien: false, contenido: ['No. ' + pista] };
        }
        if (clase === 'tautologia') return { bien: true, contenido: ['Sí: su columna solo tiene unos. Es verdadera en toda interpretación: ', fo('⊨ ' + T(f)), '. Toda tautología es satisfacible.'] };
        if (clase === 'contradiccion') return { bien: true, contenido: ['Sí: su columna solo tiene ceros. Es falsa en toda interpretación, es decir, insatisfacible.'] };
        return { bien: true, contenido: [`Sí: es verdadera en ${textoFilas(unos)}, y falsa en ${textoFilas(ceros)}. Es satisfacible, pero no es una tautología.`] };
      }, (si) => ui.resaltarColumna(indiceCol(i), si));
    });

    if (distintas.length >= 2) {
      const conjunto = '{' + distintas.map((i) => T(datos.formulas[i])).join(', ') + '}';
      const modelos = S.filasModelo(datos, distintas);
      pregunta(det, ['¿Es satisfacible el conjunto ', fo(conjunto), '?'], [['si', 'Sí'], ['no', 'No']], (resp) => {
        ui.resaltarFilas(modelos, 'modelo');
        const n = modelos.length;
        if (resp === 'si' && n) return { bien: true, contenido: [`Sí: ${textoFilas(modelos)} ${n > 1 ? 'hacen' : 'hace'} verdaderas todas las fórmulas a la vez (§2.3). Las he resaltado.`] };
        if (resp === 'no' && !n) return { bien: true, contenido: ['Sí, es insatisfacible: ninguna fila hace verdaderas todas las fórmulas a la vez.'] };
        if (resp === 'si') return { bien: false, contenido: ['No: no hay ninguna fila en la que todas las fórmulas valgan 1.'] };
        return { bien: false, contenido: [`No: en ${textoFilas(modelos.slice(0, 1))} todas las fórmulas valen 1.`] };
      });
    }
    if (distintas.length === 2) {
      const [f, g] = distintas.map((i) => datos.formulas[i]);
      const eq = S.equivalencia(f, g);
      pregunta(det, ['¿Son lógicamente equivalentes ', fo(T(f)), ' y ', fo(T(g)), '?'], [['si', 'Sí'], ['no', 'No']], (resp) => {
        ui.resaltarFilas(eq.diferencias, 'diferencia');
        const bic = F.Bin('iff', f, g);
        const cargar = boton(`Comprobarlo con la tabla de ${T(bic)}`, 'secundario', () => cargarTabla([T(bic)]));
        if (eq.equivalentes) {
          if (resp === 'si') return { bien: true, contenido: ['Sí: sus columnas coinciden en todas las filas. Por tanto, ', fo(`${T(f)} ≡ ${T(g)}`), ', es decir, ', fo(`⊨ ${T(bic)}`), ' (§2.4). ', cargar] };
          return { bien: false, contenido: ['No: sus columnas coinciden en todas las filas.'] };
        }
        if (resp === 'no') return { bien: true, contenido: [`Sí, no son equivalentes: difieren en ${textoFilas(eq.diferencias)}, que he resaltado. Por tanto, `, fo(`⊭ ${T(bic)}`), '. ', cargar] };
        return { bien: false, contenido: [`No: sus columnas difieren en ${textoFilas(eq.diferencias)}.`] };
      });
    }
  }

  function cargarTabla(lineas) {
    $('formulas-tabla').value = lineas.join('\n');
    elegirPestana('tabla');
    construirTabla();
    $('panel-tabla').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- Pestaña «Consecuencia lógica» -----------------------------------------------

  let opcionesC, tablaC = null, argumentoActual = null;
  function leerArgumento() {
    const { formulas: premisas, error } = leerLista($('premisas').value, (i, n) => (n > 1 ? `Premisa ${i + 1}` : 'Premisa'));
    if (error) return { error };
    const texto = $('conclusion').value.trim();
    if (!texto) return { error: 'Escribe la conclusión.' };
    try { return { premisas, conclusion: F.analizar(texto) }; } catch (e) { return { error: 'Conclusión: ' + mensajeError(e) }; }
  }
  const textoArgumento = (a, signo) => `${a.premisas.map(T).join(', ')}${a.premisas.length ? ' ' : ''}${signo} ${T(a.conclusion)}`;

  function construirConsecuencia() {
    const err = $('error-consecuencia');
    err.textContent = '';
    ['zona-consecuencia', 'pregunta-consecuencia', 'relacionadas', 'pasos-asignacion'].forEach((id) => $(id).replaceChildren());
    $('argumento').textContent = '';
    $('bloque-asignacion').hidden = true;
    tablaC = null;
    argumentoActual = null;
    const a = leerArgumento();
    if (a.error) { err.textContent = a.error; $('b-asignacion').hidden = true; return; }
    argumentoActual = a;
    $('b-asignacion').hidden = false;
    $('argumento').textContent = `¿${textoArgumento(a, '⊨')}?`;
    guardarEstado();
    const todas = [...a.premisas, a.conclusion];
    const muchas = demasiadas(todas);
    if (muchas) { err.textContent = muchas + ' Prueba el método de asignación directa.'; return; }
    const datos = S.tabla(todas);
    const etiquetas = new Map();
    todas.forEach((f, i) => {
      const k = datos.columnas.indexOf(datos.columnaDe(i));
      const nombre = i < a.premisas.length ? (a.premisas.length > 1 ? `premisa ${i + 1}` : 'premisa') : 'conclusión';
      etiquetas.set(k, etiquetas.has(k) ? etiquetas.get(k) + ', ' + nombre : nombre);
    });
    tablaC = crearTabla($('zona-consecuencia'), datos, Object.assign(opcionesC(), {
      etiquetas, marcarFilas: true,
      alMarcar: () => { const m = $('pregunta-consecuencia').querySelector('.mensaje'); if (m) { m.textContent = ''; m.className = 'mensaje'; } },
    }));
    const preg = $('pregunta-consecuencia');
    preg.append(el('p', 'explica', 'Pulsa el número de las filas que sean contraejemplos y responde:'));
    pregunta(preg, ['¿Es válido el argumento?'], [['si', `Sí: ${textoArgumento(a, '⊨')}`], ['no', `No: ${textoArgumento(a, '⊭')}`]], (resp) => responderConsecuencia(a, resp === 'si'));
  }

  function responderConsecuencia(a, diceValido) {
    const k = S.consecuencia(a.premisas, a.conclusion);
    const marc = [...tablaC.marcadas].sort((x, y) => x - y);
    const malMarcadas = marc.filter((r) => !k.contraejemplos.includes(r));
    const faltan = k.contraejemplos.filter((r) => !marc.includes(r));
    const contenido = [];
    let bien;
    if (diceValido !== k.valida) {
      bien = false;
      contenido.push(k.valida
        ? 'No: no hay ninguna fila con todas las premisas verdaderas y la conclusión falsa.'
        : 'No: hay alguna fila con todas las premisas verdaderas y la conclusión falsa. Búscala.');
    } else if (k.valida) {
      bien = !malMarcadas.length;
      contenido.push('Sí: ninguna fila hace verdaderas todas las premisas y falsa la conclusión, así que ', fo(textoArgumento(a, '⊨')), '.');
    } else if (!marc.length) {
      bien = null;
      contenido.push('Sí, no es válido. Marca ahora los contraejemplos: las filas con todas las premisas verdaderas y la conclusión falsa.');
    } else if (!faltan.length && !malMarcadas.length) {
      bien = true;
      contenido.push(`Sí: ${textoFilas(k.contraejemplos)} ${k.contraejemplos.length > 1 ? 'son contraejemplos' : 'es un contraejemplo'}, con las premisas verdaderas y la conclusión falsa. Por tanto, `, fo(textoArgumento(a, '⊭')), '.');
    } else {
      bien = false;
      contenido.push('No es válido, en efecto, pero revisa los contraejemplos.' + (faltan.length ? ` Falta${faltan.length > 1 ? 'n' : ''} ${faltan.length}.` : ''));
    }
    malMarcadas.forEach((r) => contenido.push(` La fila ${r + 1} no es un contraejemplo: ${S.porQueNoContraejemplo(k.tabla, a.premisas.length, r)}.`));
    if (diceValido === k.valida) {
      if (k.premisasVerdaderas.length) contenido.push(' En la tabla he resaltado las filas con todas las premisas verdaderas.');
      tablaC.resaltarFilas(k.premisasVerdaderas, 'premisas-v');
      if (bien) tablaC.resaltarFilas(k.contraejemplos, 'contraejemplo');
      relacionadas(a);
    }
    return { bien, contenido };
  }

  // Teorema de la deducción y principio de refutación (§2.7).
  function relacionadas(a) {
    const cont = $('relacionadas');
    cont.replaceChildren();
    const det = el('div', 'detalle');
    det.append(el('h3', '', 'Otras formas de comprobarlo (§2.7)'));
    const gamma = a.premisas.length ? a.premisas.map(T).join(', ') : '';
    if (a.premisas.length) {
      const conj = a.premisas.reduce((x, y) => F.Bin('and', x, y));
      const cond = F.Bin('imp', conj, a.conclusion);
      const p = el('p');
      p.append('Teorema de la deducción: ', fo(`${gamma} ⊨ ${T(a.conclusion)}`), ' si y solo si ', fo(`⊨ ${T(cond)}`), '. ');
      p.append(boton('Ver la tabla de esa fórmula', 'secundario', () => cargarTabla([T(cond)])));
      det.append(p);
    }
    const neg = F.No(a.conclusion);
    const p = el('p');
    p.append('Principio de refutación (§2.7.1): ', fo(`${gamma}${gamma ? ' ' : ''}⊨ ${T(a.conclusion)}`), ' si y solo si ',
      fo(`{${[...a.premisas.map(T), T(neg)].join(', ')}}`), ' es insatisfacible. ');
    p.append(boton('Ver la tabla de ese conjunto', 'secundario', () => cargarTabla([...a.premisas.map(T), T(neg)])));
    det.append(p);
    cont.append(det);
  }

  // Método de asignación directa, paso a paso.
  let itemsAsignacion = [], mostradosAsignacion = 0;
  function prepararAsignacion() {
    const a = argumentoActual;
    if (!a) return;
    const r = S.asignacionDirecta(a.premisas, a.conclusion);
    const items = [];
    (function recorre(pasos, nivel) {
      pasos.forEach((p) => {
        items.push({ nivel, clase: p.tipo, texto: S.textoPaso(p) });
        if (p.ramas) {
          p.ramas.forEach((ra, j) => {
            const sin = ra.resultado === 'sin examinar';
            items.push({ nivel, clase: 'caso', texto: `Caso ${j + 1}: v(${T(p.miembro)}) = ${ra.valor}.` + (sin ? ' No hace falta examinarlo: ya tenemos un contraejemplo.' : '') });
            recorre(ra.pasos, nivel + 1);
          });
        }
      });
    })(r.pasos, 0);
    const casos = items.some((x) => x.clase === 'casos');
    items.push({
      nivel: 0, clase: r.valida ? 'final-valido' : 'final-invalido',
      texto: r.valida
        ? `${casos ? 'Todos los casos llevan a contradicción' : 'No puede construirse ningún contraejemplo'}, así que ${textoArgumento(a, '⊨')}.`
        : `Por tanto, ${textoArgumento(a, '⊭')}.`,
    });
    itemsAsignacion = items;
    mostradosAsignacion = 1;
    $('bloque-asignacion').hidden = false;
    pintarAsignacion();
    $('bloque-asignacion').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function pintarAsignacion() {
    const ol = $('pasos-asignacion');
    ol.replaceChildren();
    itemsAsignacion.slice(0, mostradosAsignacion).forEach((x) => {
      const li = el('li', x.clase, x.texto);
      li.style.marginLeft = (x.nivel * 1.6) + 'em';
      ol.append(li);
    });
    const fin = mostradosAsignacion >= itemsAsignacion.length;
    $('b-paso').disabled = fin;
    $('b-todos-pasos').disabled = fin;
  }

  // ---- Pestaña «Una interpretación» --------------------------------------------------

  let formulaE = null, w = {}, pasosE = [], kE = 0, respuestasE = [];
  function prepararEvaluar() {
    const err = $('error-evaluar');
    err.textContent = '';
    ['interpretacion', 'pasos-evaluar', 'final-evaluar'].forEach((id) => $(id).replaceChildren());
    formulaE = null;
    const texto = $('formula-evaluar').value.trim();
    if (!texto) return;
    try { formulaE = F.analizar(texto); } catch (e) { err.textContent = mensajeError(e); return; }
    const vars = F.variables(formulaE);
    vars.forEach((x) => { if (w[x] !== 0 && w[x] !== 1) w[x] = 1; });
    const cont = $('interpretacion');
    vars.forEach((x) => {
      const b = boton(`v(${x}) = ${w[x]}`, 'secundario var', () => { w[x] = 1 - w[x]; prepararEvaluar(); guardarEstado(); });
      b.setAttribute('aria-pressed', String(w[x] === 1));
      b.title = 'Pulsa para cambiar el valor';
      cont.append(b);
    });
    if (vars.length) {
      const fila = vars.reduce((acc, x) => acc * 2 + (w[x] ? 0 : 1), 0) + 1;
      cont.append(el('span', 'explica', `Es la fila ${fila} de la tabla de verdad (§2.3).`));
    }
    pasosE = S.pasosEvaluacion(formulaE, w);
    kE = 0;
    respuestasE = [];
    pintarEvaluar();
  }
  function explicacionPaso(p) {
    if (p.f.op === 'not') return `porque v(${T(p.hijos[0].f)}) = ${p.hijos[0].valor} y la negación invierte el valor.`;
    return `porque v(${T(p.hijos[0].f)}) = ${p.hijos[0].valor} y v(${T(p.hijos[1].f)}) = ${p.hijos[1].valor}: ${p.razon}.`;
  }
  function pintarEvaluar() {
    const ol = $('pasos-evaluar'), fin = $('final-evaluar');
    ol.replaceChildren();
    fin.replaceChildren();
    if (!formulaE) return;
    if (!pasosE.length) {
      fin.append(el('p', '', `La fórmula es atómica: su valor es el que le da la interpretación.`));
      return;
    }
    pasosE.forEach((p, i) => {
      if (i > kE) return;
      const li = el('li');
      li.append(fo(`v(${T(p.f)}) = `));
      if (i < kE) {
        li.append(valor(p.valor), ' ', el('span', 'porque', explicacionPaso(p)));
        if (respuestasE[i] !== undefined) {
          const acierto = respuestasE[i] === p.valor;
          li.classList.add(acierto ? 'acierto' : 'fallo');
          if (!acierto) li.append(el('span', 'nota-fallo', ` Habías puesto ${respuestasE[i]}.`));
        }
      } else {
        [1, 0].forEach((x) => li.append(boton(String(x), 'secundario mini', () => { respuestasE[i] = x; kE++; pintarEvaluar(); })));
      }
      ol.append(li);
    });
    $('b-todos-evaluar').disabled = kE >= pasosE.length;
    if (kE >= pasosE.length) {
      const v = F.evalua(formulaE, w);
      const p = el('p', 'resultado-evaluar');
      p.append('Resultado: ', fo(`v(${T(formulaE)}) = `), valor(v), '.');
      const respondidas = respuestasE.filter((x) => x !== undefined).length;
      if (respondidas) {
        const aciertos = pasosE.filter((q, i) => respuestasE[i] === q.valor).length;
        p.append(` Has acertado ${aciertos} de ${respondidas} pasos.`);
      }
      fin.append(p);
    }
  }

  // ---- Pestaña «Formalizar» ----------------------------------------------------------

  function mostrarFrase() {
    const i = Number($('frases').value);
    const fr = E.FRASES[i];
    $('frase').textContent = fr.frase;
    const d = $('diccionario-frase');
    d.replaceChildren(el('span', 'rotulo', 'Diccionario'));
    Object.entries(fr.diccionario).forEach(([x, t]) => {
      const div = el('div');
      div.append(fo(x), `: «${t}»`);
      d.append(div);
    });
    $('formalizacion').value = '';
    $('resultado-formalizacion').replaceChildren();
    $('solucion').hidden = true;
    $('solucion').textContent = fr.solucion;
    $('b-anterior').disabled = i === 0;
    $('b-siguiente').disabled = i === E.FRASES.length - 1;
    guardarEstado();
  }
  function comprobarFormalizacion() {
    const r = $('resultado-formalizacion');
    r.replaceChildren();
    const fr = E.FRASES[Number($('frases').value)];
    const texto = $('formalizacion').value.trim();
    if (!texto) return;
    let f;
    try { f = F.analizar(texto); } catch (e) { r.append(el('div', 'error', mensajeError(e))); return; }
    const res = S.comprobarFormalizacion(f, fr);
    const m = el('div', 'mensaje');
    if (res.estado === 'letras') {
      m.classList.add('mal');
      m.textContent = `${listaY(res.ajenas)} no ${res.ajenas.length > 1 ? 'están' : 'está'} en el diccionario. Usa ${listaY(res.letras)}.`;
    } else if (res.estado === 'bien') {
      const n = Object.keys(fr.diccionario).length;
      m.classList.add('bien');
      m.textContent = `Bien: tu fórmula es equivalente a la formalización correcta. Toman el mismo valor en las ${2 ** n} interpretaciones de las letras del diccionario.`;
    } else {
      m.classList.add('mal');
      const letras = Object.keys(fr.diccionario);
      const caso = listaY(letras.map((x) => `«${fr.diccionario[x]}» es ${res.interpretacion[x] ? 'verdadero' : 'falso'}`));
      m.append(`No dicen lo mismo. Por ejemplo, cuando ${caso} (${S.textoInterpretacion(res.interpretacion, letras)}), tu fórmula vale `,
        valor(res.tuya), ' y la frase ', valor(res.correcta), '.');
      if (res.mensaje) m.append(el('p', 'comentario', res.mensaje));
    }
    r.append(m);
  }

  // ---- Ayuda: tablas de las conectivas -------------------------------------------------

  function tablasConectivas() {
    const cont = $('tablas-conectivas');
    const A = F.Var('A'), B = F.Var('B');
    const hacer = (f, binaria) => {
      const t = el('table', 'tabla-verdad');
      const tr = el('tr');
      tr.append(el('th', '', 'A'));
      if (binaria) tr.append(el('th', '', 'B'));
      tr.append(el('th', 'sep principal', T(f)));
      t.append(tr);
      const filas = binaria ? [[1, 1], [1, 0], [0, 1], [0, 0]] : [[1], [0]];
      filas.forEach(([a, b]) => {
        const fila = el('tr');
        fila.append(el('td', '', String(a)));
        if (binaria) fila.append(el('td', '', String(b)));
        fila.append(el('td', 'sep principal', String(F.evalua(f, { A: a, B: b }))));
        t.append(fila);
      });
      cont.append(t);
    };
    hacer(F.No(A), false);
    ['and', 'or', 'imp', 'iff'].forEach((op) => hacer(F.Bin(op, A, B), true));
  }

  // ---- Símbolos, pestañas y estado -----------------------------------------------------

  const SIMBOLOS = ['¬', '∧', '∨', '→', '↔', '⊥', '(', ')'];
  function botonesSimbolos() {
    document.querySelectorAll('.simbolos-botones').forEach((c) => {
      const destino = $(c.dataset.destino);
      SIMBOLOS.forEach((s) => {
        const b = boton(s, '', () => {
          const i = destino.selectionStart ?? destino.value.length, j = destino.selectionEnd ?? i;
          destino.value = destino.value.slice(0, i) + s + destino.value.slice(j);
          destino.focus();
          destino.setSelectionRange(i + s.length, i + s.length);
          destino.dispatchEvent(new Event('input'));
        });
        b.title = `Escribir ${s}`;
        c.append(b);
      });
    });
  }

  let pestana = 'tabla';
  const PESTANAS = ['tabla', 'consecuencia', 'evaluar', 'formalizar'];
  function elegirPestana(nombre) {
    pestana = nombre;
    document.querySelectorAll('[role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.panel === nombre)));
    document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== 'panel-' + nombre; });
    guardarEstado();
  }

  let iniciado = false;
  function guardarEstado() {
    if (!iniciado) return;
    const p = new URLSearchParams();
    p.set('ver', pestana);
    const pon = (clave, valorTexto) => { if (valorTexto.trim()) p.set(clave, valorTexto.trim()); };
    pon('t', $('formulas-tabla').value);
    pon('p', $('premisas').value);
    pon('c', $('conclusion').value);
    pon('e', $('formula-evaluar').value);
    if (formulaE) p.set('v', F.variables(formulaE).map((x) => w[x]).join(''));
    p.set('frase', $('frases').value || '0');
    history.replaceState(null, '', '#' + p.toString());
  }
  function leerEstado() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (p.has('t')) $('formulas-tabla').value = p.get('t');
    if (p.has('p') || p.has('c')) { $('premisas').value = p.get('p') || ''; $('conclusion').value = p.get('c') || ''; }
    if (p.has('e')) {
      $('formula-evaluar').value = p.get('e');
      try {
        const vars = F.variables(F.analizar(p.get('e')));
        const bits = p.get('v') || '';
        vars.forEach((x, i) => { if (bits[i] === '0' || bits[i] === '1') w[x] = Number(bits[i]); });
      } catch (e) { /* el error se muestra al preparar */ }
    }
    const fr = Number(p.get('frase'));
    if (fr >= 0 && fr < E.FRASES.length) $('frases').value = String(fr);
    return PESTANAS.includes(p.get('ver')) ? p.get('ver') : 'tabla';
  }

  function iniciar() {
    E.EJEMPLOS_TABLA.forEach((e, i) => { const o = el('option', '', e.nombre); o.value = i; $('ejemplos-tabla').append(o); });
    E.EJEMPLOS_CONSECUENCIA.forEach((e, i) => { const o = el('option', '', e.nombre); o.value = i; $('ejemplos-consecuencia').append(o); });
    E.EJEMPLOS_TABLA.filter((e) => e.formulas.length === 1).forEach((e) => { const o = el('option', '', e.nombre); o.value = e.formulas[0]; $('ejemplos-evaluar').append(o); });
    E.FRASES.forEach((e, i) => { const o = el('option', '', `${i + 1}. ${e.frase}`); o.value = i; $('frases').append(o); });
    $('formulas-tabla').value = '(p ∨ q) → (p ∧ q)';
    $('premisas').value = 'p → q\nq';
    $('conclusion').value = 'p';
    $('formula-evaluar').value = '(p ∧ ¬q) → (q ∨ ¬r)';
    w = { p: 1, q: 0, r: 1 };
    botonesSimbolos();
    tablasConectivas();
    opcionesT = opcionesTabla('t', () => { if (tablaT) construirTabla(); });
    opcionesC = opcionesTabla('c', () => { if (tablaC) construirConsecuencia(); });

    $('b-construir-tabla').addEventListener('click', construirTabla);
    $('formulas-tabla').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) construirTabla(); });
    $('ejemplos-tabla').addEventListener('change', (e) => {
      if (e.target.value === '') return;
      $('formulas-tabla').value = E.EJEMPLOS_TABLA[Number(e.target.value)].formulas.join('\n');
      e.target.value = '';
      construirTabla();
    });
    $('b-construir-consecuencia').addEventListener('click', construirConsecuencia);
    $('conclusion').addEventListener('keydown', (e) => { if (e.key === 'Enter') construirConsecuencia(); });
    $('premisas').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) construirConsecuencia(); });
    $('ejemplos-consecuencia').addEventListener('change', (e) => {
      if (e.target.value === '') return;
      const ej = E.EJEMPLOS_CONSECUENCIA[Number(e.target.value)];
      $('premisas').value = ej.premisas.join('\n');
      $('conclusion').value = ej.conclusion;
      e.target.value = '';
      construirConsecuencia();
    });
    $('b-asignacion').addEventListener('click', prepararAsignacion);
    $('b-paso').addEventListener('click', () => { mostradosAsignacion++; pintarAsignacion(); });
    $('b-todos-pasos').addEventListener('click', () => { mostradosAsignacion = itemsAsignacion.length; pintarAsignacion(); });

    $('formula-evaluar').addEventListener('input', () => { prepararEvaluar(); guardarEstado(); });
    $('ejemplos-evaluar').addEventListener('change', (e) => {
      if (e.target.value === '') return;
      $('formula-evaluar').value = e.target.value;
      e.target.value = '';
      prepararEvaluar();
      guardarEstado();
    });
    $('b-todos-evaluar').addEventListener('click', () => { kE = pasosE.length; pintarEvaluar(); });
    $('b-repetir-evaluar').addEventListener('click', () => { kE = 0; respuestasE = []; pintarEvaluar(); });

    $('frases').addEventListener('change', mostrarFrase);
    $('b-anterior').addEventListener('click', () => { $('frases').value = String(Number($('frases').value) - 1); mostrarFrase(); });
    $('b-siguiente').addEventListener('click', () => { $('frases').value = String(Number($('frases').value) + 1); mostrarFrase(); });
    $('b-comprobar').addEventListener('click', comprobarFormalizacion);
    $('formalizacion').addEventListener('keydown', (e) => { if (e.key === 'Enter') comprobarFormalizacion(); });
    $('b-solucion').addEventListener('click', () => { $('solucion').hidden = false; });
    document.querySelectorAll('[role="tab"]').forEach((b) => b.addEventListener('click', () => elegirPestana(b.dataset.panel)));

    const ver = leerEstado();
    construirTabla();
    construirConsecuencia();
    prepararEvaluar();
    mostrarFrase();
    iniciado = true;
    elegirPestana(ver);
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
