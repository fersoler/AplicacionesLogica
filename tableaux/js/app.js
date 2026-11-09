// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Interfaz de los tableaux semánticos.
(function () {
  'use strict';
  const PO = window.PrimerOrden, TB = window.Tableaux;
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
  const OPC = { atomos: true, compacta: true };
  const T_ = TB.texto;
  const No = (a) => ({ op: 'not', a });
  const lista = (xs) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1]);
  const mensajeError = (e) => (e.posicion !== undefined ? `${e.message.replace(/\.$/, '')} (posición ${e.posicion + 1}).` : e.message);

  const EJEMPLOS = window.Datos.obtener('tableaux').ejemplos; // datos/ejemplos.js

  let T = null;            // el tableau
  let k = 0;               // pasos mostrados en la construcción automática
  let manual = false;
  let acciones = [];       // acciones del alumno, para deshacer
  let datos = null;        // raíces y objetivo
  let opcionesT = null;
  let cierre = null;       // rama que el alumno está cerrando: {hoja, nodos}
  let ultimoMensaje = '';
  let ramaElegida = null;  // rama abierta cuyo modelo se muestra
  let escala = 1;
  let ultimoCampo = 'lista';

  const modo = () => document.querySelector('input[name="modo"]:checked').value;
  const construccion = () => document.querySelector('input[name="construccion"]:checked').value;

  function ajustarCampos() {
    const m = modo();
    $('campo-lista').hidden = !(m === 'consecuencia' || m === 'satisfacibilidad');
    $('campo-f1').hidden = m === 'satisfacibilidad';
    $('campo-f2').hidden = m !== 'equivalencia';
    $('rotulo-lista').textContent = m === 'consecuencia' ? 'Premisas (una por línea; pueden faltar)' : 'Fórmulas del conjunto (una por línea)';
    $('rotulo-f1').textContent = { consecuencia: 'Conclusión', validez: 'Fórmula', equivalencia: 'Fórmula A' }[m] || '';
  }

  // ---- Lectura de la entrada ----------------------------------------------------------

  function analizar(texto, nombre) {
    let f;
    try { f = PO.analizar(texto, OPC); } catch (e) { throw new Error(`${nombre}: ${mensajeError(e)}`); }
    const problema = TB.comprobarFormula(f);
    if (problema) throw new Error(`${nombre}: ${problema}`);
    return f;
  }
  function leer() {
    const m = modo();
    const lineas = $('lista').value.split('\n').map((s) => s.trim()).filter(Boolean);
    const d = { modo: m, raices: [] };
    if (m === 'consecuencia') {
      d.premisas = lineas.map((s, i) => analizar(s, lineas.length > 1 ? `Premisa ${i + 1}` : 'Premisa'));
      if (!$('f1').value.trim()) throw new Error('Escribe la conclusión.');
      d.conclusion = analizar($('f1').value, 'Conclusión');
      d.raices = d.premisas.map((f) => ({ f, papel: 'Premisa' })).concat([{ f: No(d.conclusion), papel: 'Negación de la conclusión' }]);
      d.texto = `¿${d.premisas.map(T_).join(', ')}${d.premisas.length ? ' ' : ''}⊨ ${T_(d.conclusion)}?`;
    } else if (m === 'validez') {
      if (!$('f1').value.trim()) throw new Error('Escribe la fórmula.');
      d.formula = analizar($('f1').value, 'Fórmula');
      d.raices = [{ f: No(d.formula), papel: 'Negación de la fórmula' }];
      d.texto = `¿⊨ ${T_(d.formula)}?`;
    } else if (m === 'satisfacibilidad') {
      if (!lineas.length) throw new Error('Escribe al menos una fórmula.');
      d.conjunto = lineas.map((s, i) => analizar(s, `Fórmula ${i + 1}`));
      d.raices = d.conjunto.map((f) => ({ f, papel: 'Fórmula del conjunto' }));
      d.texto = `¿Es satisfacible {${d.conjunto.map(T_).join(', ')}}?`;
    } else {
      if (!$('f1').value.trim() || !$('f2').value.trim()) throw new Error('Escribe las dos fórmulas.');
      d.A = analizar($('f1').value, 'Fórmula A');
      d.B = analizar($('f2').value, 'Fórmula B');
      d.raices = [{ f: No({ op: 'iff', a: d.A, b: d.B }), papel: 'Negación del bicondicional' }];
      d.texto = `¿${T_(d.A)} ≡ ${T_(d.B)}?`;
    }
    return d;
  }

  // ---- Construcción --------------------------------------------------------------------

  function construir(pasoInicial) {
    $('error').textContent = '';
    try { datos = leer(); } catch (e) { $('error').textContent = e.message; $('sec-arbol').hidden = true; return; }
    manual = construccion() === 'manual';
    opcionesT = { limite: Number($('limite').value), boolos: $('boolos').checked, maxNodos: 400, cierreManual: manual };
    acciones = [];
    cierre = null;
    ramaElegida = null;
    rehacer();
    if (!manual) k = Math.min(Math.max(0, pasoInicial || 0), T.pasos.length);
    $('sec-arbol').hidden = false;
    centrarRaiz = true;
    $('objetivo').textContent = datos.texto;
    $('controles-auto').hidden = manual;
    $('controles-manual').hidden = !manual;
    $('elegir-constante').hidden = true;
    $('exportacion').hidden = true;
    pintar(manual ? 'Construye el tableau: pulsa en una fórmula para aplicarle su regla. Para cerrar una rama, pulsa ⊗ al final de ella y señala sus dos nodos contradictorios: una fórmula y su negación.' : null);
  }

  function rehacer() {
    T = TB.crear(datos.raices, opcionesT);
    if (manual) {
      TB.prepararManual(T);
      acciones.forEach((a) => (a.tipo === 'cierre' ? TB.cerrarManual(T, a.hoja, a.nodos) : TB.aplicarManual(T, a.n, a.c)));
    } else {
      TB.completar(T);
    }
  }

  // ---- Dibujo del árbol ------------------------------------------------------------------

  function justificacion(x) {
    if (x.papel) return x.papel;
    let s = `${x.regla}, ${x.desde}`;
    if (x.regla === 'δ') s += x.fresca ? ` (${x.constante} fresca)` : ` (${x.constante}, ya en la rama)`;
    if (x.regla === 'γ' && x.nueva) s += ` (${x.constante} nueva)`;
    return s;
  }

  function dibujarArbol(kk) {
    const cont = $('arbol');
    cont.replaceChildren();
    cont.style.setProperty('--escala', escala);
    cont.classList.toggle('sin-just', !$('justificaciones').checked);
    const visible = (x) => x.paso < kk;
    const ultimo = kk > 0 ? T.pasos[kk - 1] : null;
    const nuevos = new Set((ultimo && ultimo.nuevos) || []);
    const hojas = new Map(T.ramas.map((r) => [r.hoja, r]));
    const enRama = new Set();
    if (ramaElegida && mostrandoFinal(kk)) TB.camino(ramaElegida.hoja).forEach((x) => enRama.add(x.n));
    const ramaCierre = cierre ? new Set(TB.camino(T.nodos[cierre.hoja - 1]).map((x) => x.n)) : null;

    const nodoDOM = (x) => {
      const d = el('div', 'nodo');
      const f = el('span', 'f', x.texto);
      d.append(el('span', 'num', x.n + '.'), f, el('span', 'just', justificacion(x)));
      if (nuevos.has(x.n)) d.classList.add('nuevo');
      if (ultimo && ultimo.desde === x.n) d.classList.add('origen');
      if (enRama.has(x.n)) d.classList.add('en-rama');
      if (ramaCierre) {
        if (ramaCierre.has(x.n)) {
          d.classList.add('seleccionable');
          if (cierre.nodos.includes(x.n)) d.classList.add('seleccionado');
          f.tabIndex = 0;
          f.setAttribute('role', 'button');
          f.title = 'Señalar este nodo';
          f.addEventListener('click', () => elegirNodoCierre(x.n));
          f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegirNodoCierre(x.n); } });
        } else d.classList.add('fuera');
      } else if (manual && !T.terminado) {
        const o = TB.opcionesNodo(T, x);
        if (o.aplicable) {
          d.classList.add('expandible');
          f.tabIndex = 0;
          f.setAttribute('role', 'button');
          f.title = `Aplicar la regla ${o.tipo}`;
          f.addEventListener('click', () => pulsarNodo(x));
          f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pulsarNodo(x); } });
        }
      }
      return d;
    };
    const finDOM = (r) => {
      if (r.fin === 'cerrada') {
        const d = el('div', 'fin cerrada');
        d.append(el('span', 'simbolo', '⊗'), el('span', 'pares', r.cierre.join(', ')));
        d.title = r.cierre.length > 1 ? `Los nodos ${r.cierre.join(' y ')} son contradictorios` : 'La rama contiene ⊥';
        return d;
      }
      if (r.fin === 'abierta') {
        const d = el('div', 'fin abierta');
        const b = boton('ABIERTA', ramaElegida === r ? 'elegida' : '', () => { ramaElegida = r; pintar(); });
        b.title = 'Ver el modelo de esta rama';
        d.append(b);
        return d;
      }
      const d = el('div', 'fin incompleta', 'INCOMPLETA');
      d.title = 'Se ha llegado al límite de constantes o de nodos: la rama no se ha podido completar (§6.9).';
      return d;
    };
    const segmento = (inicio) => {
      const seg = el('div', 'segmento');
      let x = inicio;
      seg.append(nodoDOM(x));
      for (;;) {
        const hijos = x.hijos.filter(visible);
        if (hijos.length === 1 && x.hijos.length === 1) {
          x = hijos[0];
          seg.append(el('div', 'arista'), nodoDOM(x));
          continue;
        }
        if (hijos.length) {
          const fila = el('div', 'hijos');
          hijos.forEach((h) => { const c = el('div', 'rama-col'); c.append(segmento(h)); fila.append(c); });
          seg.append(el('div', 'arista'), fila);
        } else {
          const r = hojas.get(x);
          if (r && r.fin && r.pasoFin < kk) seg.append(el('div', 'arista corta'), finDOM(r));
          else if (r && !r.fin && manual && !T.terminado) {
            const b = boton('⊗', 'cerrar-rama', () => iniciarCierre(x.n));
            b.title = 'Cerrar esta rama: señala dos nodos contradictorios';
            b.setAttribute('aria-label', `Cerrar la rama que acaba en el nodo ${x.n}`);
            b.setAttribute('aria-pressed', String(!!cierre && cierre.hoja === x.n));
            seg.append(el('div', 'arista corta'), b);
          }
        }
        return seg;
      }
    };
    cont.append(segmento(T.nodos[0]));
    // Si el árbol no cabe, se desplaza para que se vea lo que acaba de cambiar.
    const foco = cont.querySelector('.nodo.nuevo') || (mostrandoFinal(kk) && cont.querySelector('.fin.abierta .elegida')) || (centrarRaiz && cont.querySelector('.nodo'));
    centrarRaiz = false;
    if (foco) {
      const marco = cont.parentElement, c = marco.getBoundingClientRect(), r = foco.getBoundingClientRect();
      if (r.left < c.left || r.right > c.right) marco.scrollLeft += (r.left + r.width / 2) - (c.left + c.width / 2);
    }
  }
  let centrarRaiz = true;

  const mostrandoFinal = (kk) => (manual ? T.terminado : kk >= T.pasos.length);

  function pintar(mensajeExtra) {
    const total = T.pasos.length;
    const kk = manual ? total : k;
    if (mostrandoFinal(kk)) {
      const abiertas = TB.estado(T).abiertas;
      if (!abiertas.includes(ramaElegida)) ramaElegida = abiertas[0] || null;
    }
    dibujarArbol(kk);
    const msj = $('mensaje-paso');
    msj.className = 'mensaje';
    if (mensajeExtra) ultimoMensaje = mensajeExtra;
    else if (!manual) ultimoMensaje = kk === 0 ? textoInicio() : `Paso ${kk}. ${TB.textoPaso(T, T.pasos[kk - 1])}`;
    msj.textContent = ultimoMensaje;
    $('contador').textContent = `Paso ${kk} de ${total}`;
    $('b-inicio').disabled = $('b-atras').disabled = kk === 0;
    $('b-adelante').disabled = $('b-final').disabled = kk >= total;
    $('b-deshacer').disabled = !acciones.length;
    $('b-terminar').disabled = T.terminado;
    if (manual && !T.terminado && !cierre) {
      const n = TB.porCerrar(T).length;
      if (n) msj.textContent += ` En ${n > 1 ? `${n} ramas` : 'una rama'} ya no queda nada que descomponer, pero no ${n > 1 ? 'están cerradas' : 'está cerrada'}: busca la contradicción y ciérra${n > 1 ? 'las' : 'la'} con ⊗.`;
    }
    if (mostrandoFinal(kk)) mostrarResultado(); else $('resultado').replaceChildren();
    guardarEstado();
  }

  function textoInicio() {
    const raiz = {
      consecuencia: 'En la raíz van las premisas y la negación de la conclusión: buscamos una situación en la que las premisas sean verdaderas y la conclusión falsa.',
      validez: 'En la raíz va la negación de la fórmula: buscamos una situación en la que la fórmula sea falsa.',
      satisfacibilidad: 'En la raíz van las fórmulas del conjunto, sin negar: buscamos una situación en la que todas sean verdaderas.',
      equivalencia: 'En la raíz va la negación del bicondicional: buscamos una situación en la que una fórmula sea verdadera y la otra falsa.',
    }[datos.modo];
    const cerrada = T.ramas[0].fin === 'cerrada' && T.ramas[0].pasoFin < 0 ? ' La raíz ya contiene una fórmula y su negación, así que la rama se cierra sin aplicar ninguna regla.' : '';
    return `${raiz}${cerrada} Pulsa «Siguiente».`;
  }

  // ---- Construcción a mano ---------------------------------------------------------------

  function pulsarNodo(x) {
    const o = TB.opcionesNodo(T, x);
    const caja = $('elegir-constante');
    caja.hidden = true;
    if (!o.aplicable) { avisar(o.motivo); return; }
    if (o.tipo === 'γ' && !o.nueva && o.constantes.length > 1) {
      caja.replaceChildren(`Regla γ sobre el nodo ${x.n} (${x.texto}). ¿Con qué constante? `);
      o.constantes.forEach((c) => caja.append(boton(c, 'secundario mini', () => { caja.hidden = true; aplicar(x.n, [c]); })));
      caja.append(boton(`Con todas (${o.constantes.join(', ')})`, 'secundario mini', () => { caja.hidden = true; aplicar(x.n, o.constantes); }));
      caja.append(boton('Cancelar', 'secundario mini', () => { caja.hidden = true; }));
      caja.hidden = false;
      return;
    }
    aplicar(x.n, o.tipo === 'γ' && !o.nueva ? [o.constantes[0]] : [undefined]);
  }

  function aplicar(n, constantes) {
    const textos = [];
    for (const c of constantes) {
      if (T.nodos.length >= opcionesT.maxNodos) { avisar(`El árbol ha llegado a ${opcionesT.maxNodos} nodos.`); break; }
      const r = TB.aplicarManual(T, n, c);
      if (r.error) { avisar(r.error); return; }
      acciones.push({ tipo: 'regla', n, c });
      textos.push(TB.textoPaso(T, r));
      if (r.consejo) textos.push(textoConsejo(r.consejo));
      if (r.contradiccionPrevia && r.contradiccionPrevia.length === 2) {
        textos.push(`Esa rama ya contenía una contradicción (nodos ${r.contradiccionPrevia.join(' y ')}): se podía cerrar sin seguir descomponiendo.`);
      }
    }
    pintar(textos.join(' '));
  }

  // Cierre a mano: el alumno elige la rama (⊗ al final) y señala dos nodos.
  function iniciarCierre(hoja) {
    if (cierre && cierre.hoja === hoja) { cancelarCierre(); return; }
    cierre = { hoja, nodos: [] };
    const caja = $('elegir-constante');
    caja.replaceChildren(`Cerrar la rama que acaba en el nodo ${hoja}: pulsa sus dos nodos contradictorios, una fórmula y su negación (o un nodo ⊥). `);
    caja.append(boton('Cancelar', 'secundario mini', cancelarCierre));
    caja.hidden = false;
    pintar();
  }
  function cancelarCierre() {
    cierre = null;
    $('elegir-constante').hidden = true;
    pintar();
  }
  function elegirNodoCierre(n) {
    const i = cierre.nodos.indexOf(n);
    if (i >= 0) cierre.nodos.splice(i, 1); else cierre.nodos.push(n);
    const esBot = cierre.nodos.length === 1 && T.nodos[n - 1].f.op === 'bot';
    if (cierre.nodos.length < 2 && !esBot) { pintar(); return; }
    const intento = { hoja: cierre.hoja, nodos: cierre.nodos.slice() };
    const r = TB.cerrarManual(T, intento.hoja, intento.nodos);
    if (r.error) {
      cierre.nodos = [];
      pintar();
      avisar(r.error + ' Prueba con otros dos nodos, o cancela.');
      return;
    }
    acciones.push({ tipo: 'cierre', hoja: intento.hoja, nodos: intento.nodos });
    cierre = null;
    $('elegir-constante').hidden = true;
    pintar(TB.textoPaso(T, r));
  }

  function textoConsejo(c) {
    const que = { σ: 'las reglas que no ramifican (α y σ)', α: 'las reglas que no ramifican (α y σ)', δ: 'la regla δ, que introduce las constantes', γ: 'la regla γ' }[c.recomendado];
    const por = c.aplicado === 'β' ? 'Ramificar antes obliga a repetir el trabajo en cada rama.' : 'Así el árbol crece menos.';
    return `Es correcto, pero la prioridad de §6.3.2 aconseja aplicar antes ${que}, como la del nodo ${c.nodo}. ${por}`;
  }

  function avisar(texto) {
    const m = $('mensaje-paso');
    m.className = 'mensaje mal';
    m.textContent = texto;
  }

  // ---- Resultado y modelo ----------------------------------------------------------------

  function mostrarResultado() {
    const cont = $('resultado');
    cont.replaceChildren();
    const e = TB.estado(T);
    const det = el('div', 'detalle');
    cont.append(det);
    det.append(el('h3', '', 'Resultado (§6.5)'));
    const p = el('p');
    const d = datos;
    const gamma = d.premisas ? d.premisas.map(T_).join(', ') : '';
    const conGamma = (signo) => `${gamma}${gamma ? ' ' : ''}${signo} ${T_(d.conclusion)}`;
    if (e.cerrado) {
      if (d.modo === 'consecuencia') p.append('Todas las ramas se cierran: no se pueden hacer verdaderas las premisas y falsa la conclusión. Por tanto, ', fo(conGamma('⊨')), '.');
      else if (d.modo === 'validez') p.append('Todas las ramas se cierran: no hay ninguna estructura en la que la fórmula sea falsa. Por tanto, ', fo(`⊨ ${T_(d.formula)}`), '.');
      else if (d.modo === 'satisfacibilidad') p.append('Todas las ramas se cierran: el conjunto es insatisfacible.');
      else p.append('Todas las ramas se cierran: las dos fórmulas toman el mismo valor en toda estructura. Por tanto, ', fo(`${T_(d.A)} ≡ ${T_(d.B)}`), '.');
      det.append(p);
      return;
    }
    if (!e.abiertas.length) {
      p.textContent = e.sinTerminar.length && manual
        ? 'Quedan ramas por terminar.'
        : `Ninguna rama ha quedado abierta y completa, pero no todas se cierran: ${e.incompletas.length > 1 ? 'hay ramas incompletas' : 'hay una rama incompleta'}, porque se ha llegado al límite de ${T.agotado ? `${opcionesT.maxNodos} nodos` : `${opcionesT.limite} constantes por rama`}. Puede ser una rama infinita (§6.9). Prueba con la regla δ de Boolos o con un límite mayor.`;
      det.append(p);
      return;
    }
    if (d.modo === 'consecuencia') p.append('Hay una rama abierta y completa. Su modelo es un contramodelo: ', fo(conGamma('⊭')), '.');
    else if (d.modo === 'validez') p.append('Hay una rama abierta y completa. Su modelo hace falsa la fórmula: ', fo(`⊭ ${T_(d.formula)}`), '.');
    else if (d.modo === 'satisfacibilidad') p.append('Hay una rama abierta y completa: el conjunto es satisfacible, y la rama da un modelo de todas sus fórmulas.');
    else p.append('Hay una rama abierta y completa: las fórmulas no son equivalentes. En el modelo de la rama, una es verdadera y la otra falsa.');
    det.append(p);
    if (!ramaElegida || !e.abiertas.includes(ramaElegida)) ramaElegida = e.abiertas[0];
    if (e.abiertas.length > 1) {
      const fila = el('div', 'botones-fila');
      fila.append(el('span', 'explica', `Hay ${e.abiertas.length} ramas abiertas. Elige una (o pulsa ABIERTA en el árbol):`));
      e.abiertas.forEach((r, i) => {
        const b = boton(`Rama abierta ${i + 1}`, 'secundario mini', () => { ramaElegida = r; pintar(); });
        b.setAttribute('aria-pressed', String(r === ramaElegida));
        fila.append(b);
      });
      det.append(fila);
    }
    det.append(dibujarModelo(ramaElegida));
  }

  function dibujarModelo(rama) {
    const m = TB.modelo(T, rama);
    const div = el('div', 'modelo');
    const proposicional = !m.extensiones.length && !m.constantes.length;
    div.append(el('h3', '', proposicional ? 'Interpretación de la rama abierta (§6.4)' : 'Modelo de la rama abierta (§6.4)'));
    const nodos = TB.camino(rama.hoja).map((x) => x.n);
    div.append(el('p', 'explica', `Rama de los nodos ${resumirNumeros(nodos)}, resaltada en el árbol.`));
    const linea = (...partes) => { const p = el('p', 'linea'); p.append(...partes); div.append(p); };
    linea('Literales de la rama: ', fo(`Ω = {${m.literales.join(', ')}}`), '.');
    if (proposicional) {
      linea(fo(m.proposicionales.map((x) => `v(${x.nombre}) = ${x.valor}`).join(', ')), ': cada letra vale 1 si está afirmada en la rama y 0 si no.');
    } else {
      linea(fo(`D = {${m.D.join(', ')}}`), m.constantes.length ? ': las constantes de la rama.' : ': la rama no tiene constantes, así que se toma un dominio de un solo elemento.');
      if (m.constantes.length) linea(fo(m.constantes.map((c) => `I(${c}) = ${c}`).join(', ')));
      m.extensiones.forEach((x) => {
        const ext = x.tuplas.length ? `{${x.tuplas.map((t) => (t.length === 1 ? t[0] : `(${t.join(', ')})`)).join(', ')}}` : '∅';
        linea(fo(`I(${x.nombre}) = ${ext}`));
      });
      if (m.proposicionales.length) linea(fo(m.proposicionales.map((x) => `v(${x.nombre}) = ${x.valor}`).join(', ')));
    }
    // Comprobación con las fórmulas de partida.
    const d = datos;
    const filas = d.modo === 'consecuencia' ? d.premisas.map((f, i) => [d.premisas.length > 1 ? `Premisa ${i + 1}` : 'Premisa', f]).concat([['Conclusión', d.conclusion]])
      : d.modo === 'validez' ? [['Fórmula', d.formula]]
        : d.modo === 'satisfacibilidad' ? d.conjunto.map((f, i) => [`Fórmula ${i + 1}`, f])
          : [['A', d.A], ['B', d.B]];
    const t = el('table', 'comprobacion');
    filas.forEach(([nombre, f]) => {
      const v = PO.satisface(f, m.M);
      const tr = el('tr');
      const td = el('td');
      td.append(proposicional ? el('span', 'valor v' + (v ? 1 : 0), v ? '1' : '0') : el('span', 'valor ' + (v ? 'V' : 'F'), v ? 'V' : 'F'));
      tr.append(el('td', '', nombre), el('td', 'fo', T_(f)), td);
      t.append(tr);
    });
    div.append(el('p', 'explica', 'Comprobación:'), t);
    const cierre = {
      consecuencia: 'Las premisas son verdaderas y la conclusión falsa: es un contramodelo.',
      validez: 'La fórmula es falsa en este modelo.',
      satisfacibilidad: 'Todas las fórmulas del conjunto son verdaderas.',
      equivalencia: 'Una fórmula es verdadera y la otra falsa.',
    }[d.modo];
    div.append(el('p', '', cierre));
    return div;
  }

  // 1, 2, 3, 4, 5, 7 → «1–5 y 7»
  function resumirNumeros(ns) {
    const tramos = [];
    ns.forEach((n) => {
      const u = tramos[tramos.length - 1];
      if (u && n === u[1] + 1) u[1] = n; else tramos.push([n, n]);
    });
    return lista(tramos.flatMap(([a, b]) => (a === b ? [String(a)] : b === a + 1 ? [String(a), String(b)] : [`${a}–${b}`])));
  }

  // ---- Estado en la dirección y arranque -------------------------------------------------

  let iniciado = false;
  function guardarEstado() {
    if (!iniciado) return;
    const p = new URLSearchParams();
    p.set('modo', modo());
    if ($('lista').value.trim() && !$('campo-lista').hidden) p.set('l', $('lista').value.trim());
    if ($('f1').value.trim() && !$('campo-f1').hidden) p.set('a', $('f1').value.trim());
    if ($('f2').value.trim() && !$('campo-f2').hidden) p.set('b', $('f2').value.trim());
    p.set('c', construccion());
    p.set('lim', $('limite').value);
    if ($('boolos').checked) p.set('boolos', '1');
    if (T && !manual) p.set('paso', String(k));
    history.replaceState(null, '', '#' + p.toString());
  }
  function leerEstado() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (!p.has('modo')) return null;
    const m = document.querySelector(`input[name="modo"][value="${p.get('modo')}"]`);
    if (m) m.checked = true;
    $('lista').value = p.get('l') || '';
    $('f1').value = p.get('a') || '';
    $('f2').value = p.get('b') || '';
    const c = document.querySelector(`input[name="construccion"][value="${p.get('c')}"]`);
    if (c) c.checked = true;
    if ([...$('limite').options].some((o) => o.value === p.get('lim'))) $('limite').value = p.get('lim');
    $('boolos').checked = p.get('boolos') === '1';
    return Number(p.get('paso')) || 0;
  }
  function cargarEjemplo(e) {
    document.querySelector(`input[name="modo"][value="${e.modo}"]`).checked = true;
    $('lista').value = (e.lista || []).join('\n');
    $('f1').value = e.f1 || '';
    $('f2').value = e.f2 || '';
    ajustarCampos();
  }

  function iniciar() {
    EJEMPLOS.forEach((e, i) => { const o = el('option', '', e.nombre); o.value = i; $('ejemplos').append(o); });
    ['¬', '∧', '∨', '→', '↔', '∀', '∃', '(', ')'].forEach((s) => {
      $('simbolos').append(boton(s, '', () => {
        const destino = $(ultimoCampo);
        const i = destino.selectionStart ?? destino.value.length, j = destino.selectionEnd ?? i;
        destino.value = destino.value.slice(0, i) + s + destino.value.slice(j);
        destino.focus();
        destino.setSelectionRange(i + s.length, i + s.length);
      }));
    });
    ['lista', 'f1', 'f2'].forEach((id) => $(id).addEventListener('focus', () => { ultimoCampo = id; }));
    document.querySelectorAll('input[name="modo"]').forEach((r) => r.addEventListener('change', () => { ajustarCampos(); ultimoCampo = $('campo-lista').hidden ? 'f1' : 'lista'; }));
    $('ejemplos').addEventListener('change', (e) => {
      if (e.target.value === '') return;
      cargarEjemplo(EJEMPLOS[Number(e.target.value)]);
      e.target.value = '';
      construir(0);
    });
    $('b-construir').addEventListener('click', () => construir(0));
    ['f1', 'f2'].forEach((id) => $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') construir(0); }));
    $('lista').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) construir(0); });
    document.querySelectorAll('input[name="construccion"]').forEach((r) => r.addEventListener('change', () => { if (T) construir(0); }));
    $('limite').addEventListener('change', () => { if (T) construir(0); });
    $('boolos').addEventListener('change', () => { if (T) construir(0); });
    $('b-inicio').addEventListener('click', () => { k = 0; pintar(); });
    $('b-atras').addEventListener('click', () => { k = Math.max(0, k - 1); pintar(); });
    $('b-adelante').addEventListener('click', () => { k = Math.min(T.pasos.length, k + 1); pintar(); });
    $('b-final').addEventListener('click', () => { k = T.pasos.length; pintar(); });
    $('b-deshacer').addEventListener('click', () => { cierre = null; $('elegir-constante').hidden = true; acciones.pop(); rehacer(); pintar('Se ha deshecho el último paso.'); });
    $('b-reiniciar').addEventListener('click', () => { cierre = null; $('elegir-constante').hidden = true; acciones = []; rehacer(); pintar('Árbol vacío: empieza de nuevo.'); });
    $('b-terminar').addEventListener('click', () => {
      cierre = null;
      $('elegir-constante').hidden = true;
      const antes = T.pasos.length;
      TB.completar(T);
      pintar(`Se han aplicado automáticamente ${T.pasos.length - antes} pasos más, con la prioridad de §6.3.2.`);
    });
    $('justificaciones').addEventListener('change', () => pintar());
    // Exportación del árbol tal como se ve (hasta el paso mostrado).
    const exportar = (texto, latex) => {
      $('exportacion').hidden = false;
      $('nota-preambulo').hidden = !latex;
      $('exportado').value = texto;
      $('copiado').textContent = '';
      $('exportado').focus();
      $('exportado').select();
    };
    const pasosVistos = () => (manual ? T.pasos.length : k);
    $('b-latex').addEventListener('click', () => exportar(TB.aLatex(T, pasosVistos(), { justificaciones: $('justificaciones').checked }), true));
    $('b-texto').addEventListener('click', () => exportar(`${datos.texto}\n\n${TB.aTexto(T, pasosVistos())}`, false));
    $('b-copiar').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('exportado').value); $('copiado').textContent = 'Copiado.'; }
      catch (e) { $('exportado').select(); $('copiado').textContent = document.execCommand && document.execCommand('copy') ? 'Copiado.' : 'Selecciónalo y cópialo con Ctrl+C.'; }
    });
    $('b-menos').addEventListener('click', () => { escala = Math.max(0.6, escala - 0.1); dibujarArbol(manual ? T.pasos.length : k); });
    $('b-mas').addEventListener('click', () => { escala = Math.min(1.5, escala + 0.1); dibujarArbol(manual ? T.pasos.length : k); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && cierre) { cancelarCierre(); return; }
      if (!T || manual || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight') $('b-adelante').click();
      if (e.key === 'ArrowLeft') $('b-atras').click();
    });

    const paso = leerEstado();
    if (paso === null) cargarEjemplo(EJEMPLOS[6]);
    ajustarCampos();
    iniciado = true;
    construir(paso || 0);
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
