// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Tableaux semánticos con las reglas de los Apuntes de Lógica (tema 6).
//
// Clasificación uniforme de Smullyan (§6.2): σ, α, β, γ, δ y literales. Reglas
// (§6.3): α, σ y δ alargan la rama; β la bifurca; γ se instancia con cada constante
// de la rama (con una nueva si no hay ninguna) y se vuelve a usar cuando aparecen
// constantes nuevas. Una rama se cierra (⊗) en cuanto contiene una fórmula y su
// negación. Orden de expansión (§6.3.2): α y σ, δ, γ, β.
//
// La construcción automática expande primero la rama abierta más a la izquierda, de
// modo que la numeración coincide con la de los ejemplos del libro. Como opción, la
// regla δ de Boolos (§6.9): la rama se bifurca con cada constante que ya hay en ella
// y con una nueva, lo que permite encontrar modelos finitos.
//
// Una rama sin nada que expandir es abierta y completa, y de ella se lee un modelo
// (§6.4). Si se alcanza el límite de constantes de una rama, la rama queda incompleta.
(function (raiz) {
  'use strict';
  const PO = (typeof module !== 'undefined' && module.exports) ? require('../../comun/js/primerorden.js') : raiz.PrimerOrden;

  const No = (a) => ({ op: 'not', a });
  const Y = (a, b) => ({ op: 'and', a, b });
  const texto = (f) => PO.texto(f, true);
  const CONSTANTES = 'abcdefghijklmnopqr'.split('');
  const PRIORIDAD = ['σα', 'δ', 'γ', 'β'];
  const NOMBRE_REGLA = { σ: 'σ (doble negación)', α: 'α', β: 'β', γ: 'γ', δ: 'δ' };
  const listaY = (xs) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1]);

  // ---- Clasificación uniforme (§6.2) ----------------------------------------------

  function clasificar(f) {
    switch (f.op) {
      case 'and': return { tipo: 'α', partes: [f.a, f.b] };
      case 'or': return { tipo: 'β', partes: [f.a, f.b] };
      case 'imp': return { tipo: 'β', partes: [No(f.a), f.b] };
      case 'iff': return { tipo: 'β', partes: [Y(f.a, f.b), Y(No(f.a), No(f.b))] };
      case 'forall': return { tipo: 'γ', v: f.v, cuerpo: f.a };
      case 'exists': return { tipo: 'δ', v: f.v, cuerpo: f.a };
      case 'not': {
        const g = f.a;
        switch (g.op) {
          case 'not': return { tipo: 'σ', partes: [g.a] };
          case 'or': return { tipo: 'α', partes: [No(g.a), No(g.b)] };
          case 'imp': return { tipo: 'α', partes: [g.a, No(g.b)] };
          case 'and': return { tipo: 'β', partes: [No(g.a), No(g.b)] };
          case 'iff': return { tipo: 'β', partes: [Y(g.a, No(g.b)), Y(No(g.a), g.b)] };
          case 'exists': return { tipo: 'γ', v: g.v, cuerpo: No(g.a) };
          case 'forall': return { tipo: 'δ', v: g.v, cuerpo: No(g.a) };
        }
        return { tipo: 'literal' };
      }
    }
    return { tipo: 'literal' };
  }

  function sustituir(f, v, c) {
    const t = (x) => (x.tipo === 'var' && x.nombre === v ? { tipo: 'const', nombre: c } : x);
    switch (f.op) {
      case 'pred': return { op: 'pred', nombre: f.nombre, args: f.args.map(t) };
      case 'eq': return { op: 'eq', a: t(f.a), b: t(f.b) };
      case 'bot': return f;
      case 'not': return No(sustituir(f.a, v, c));
      case 'forall': case 'exists': return f.v === v ? f : { op: f.op, v: f.v, a: sustituir(f.a, v, c) };
      default: return { op: f.op, a: sustituir(f.a, v, c), b: sustituir(f.b, v, c) };
    }
  }

  // Comprueba que una fórmula sirve para un tableau del tema 6: sentencia sin
  // identidad. Devuelve un mensaje de error o null.
  function comprobarFormula(f) {
    let igualdad = false;
    (function rec(g) {
      if (g.op === 'eq') igualdad = true;
      else if (g.op === 'not' || g.op === 'forall' || g.op === 'exists') rec(g.a);
      else if (g.a && g.b) { rec(g.a); rec(g.b); }
    })(f);
    if (igualdad) return 'Los tableaux del tema 6 no tratan la identidad (=).';
    const libres = PO.atomosConLibres(f);
    if (libres.length) {
      const vars = [...new Set(libres.flatMap((x) => x.variables))];
      return `La variable ${vars.join(', ')} está libre en ${texto(libres[0].atomo)}: en la raíz de un tableau van sentencias. Revisa el alcance de los cuantificadores (∀x (… → …)).`;
    }
    return null;
  }

  // ---- Construcción ---------------------------------------------------------------

  function nuevoNodo(T, f, padre, datos) {
    const nodo = Object.assign({ n: T.nodos.length + 1, f, clave: PO.clave(f), texto: texto(f), padre, hijos: [], paso: T.pasos.length }, datos);
    nodo.clase = clasificar(f);
    T.nodos.push(nodo);
    if (padre) padre.hijos.push(nodo);
    return nodo;
  }

  const camino = (hoja) => { const c = []; for (let x = hoja; x; x = x.padre) c.push(x); return c.reverse(); };
  const pasaPor = (rama, nodo) => { for (let x = rama.hoja; x; x = x.padre) if (x === nodo) return true; return false; };

  // Cierre: el nodo choca con uno anterior de su rama (o es ⊥).
  function buscarCierre(nodo) {
    if (nodo.f.op === 'bot') return [nodo.n];
    const neg = PO.clave(No(nodo.f));
    const pos = nodo.f.op === 'not' ? PO.clave(nodo.f.a) : null;
    for (let a = nodo.padre; a; a = a.padre) if (a.clave === neg || a.clave === pos) return [a.n, nodo.n];
    return null;
  }

  function crear(raices, opciones = {}) {
    const T = {
      nodos: [], ramas: [], pasos: [],
      opciones: { limite: opciones.limite || 6, boolos: !!opciones.boolos, maxNodos: opciones.maxNodos || 500, cierreManual: !!opciones.cierreManual },
    };
    let hoja = null;
    raices.forEach((r) => { hoja = nuevoNodo(T, r.f, hoja, { papel: r.papel, paso: -1 }); });
    const constantes = new Set();
    T.nodos.forEach((x) => PO.constantes(x.f, constantes));
    const rama = { id: 0, hoja, usados: new Set(), gamma: new Map(), constantes, cierre: null, fin: null, bloqueada: false };
    T.ramas.push(rama);
    if (!T.opciones.cierreManual) {
      const c = contradiccion(rama);
      if (c) { rama.cierre = c; rama.fin = 'cerrada'; rama.pasoFin = -1; }
    }
    return T;
  }

  // Lo que queda por hacer en una rama, por tipo de regla.
  function pendientes(T, rama) {
    const res = { σα: [], δ: [], γ: [], β: [] };
    let bloqueada = false;
    for (const nodo of camino(rama.hoja)) {
      const c = nodo.clase;
      if (c.tipo === 'literal') continue;
      if (c.tipo === 'γ') {
        const hechas = rama.gamma.get(nodo.n) || new Set();
        let faltan = [...rama.constantes].filter((k) => !hechas.has(k)).sort();
        let nueva = false;
        if (!rama.constantes.size && !hechas.size) { faltan = [CONSTANTES[0]]; nueva = true; }
        if (faltan.length) res.γ.push({ nodo, tipo: 'γ', constantes: faltan, nueva });
      } else if (!rama.usados.has(nodo.n)) {
        if (c.tipo === 'δ' && rama.constantes.size >= T.opciones.limite) { bloqueada = true; continue; }
        res[c.tipo === 'σ' || c.tipo === 'α' ? 'σα' : c.tipo].push({ nodo, tipo: c.tipo });
      }
    }
    rama.bloqueada = bloqueada;
    return res;
  }

  function elegir(T, rama) {
    const p = pendientes(T, rama);
    for (const k of PRIORIDAD) if (p[k].length) return p[k][0];
    return null;
  }

  const fresca = (rama) => CONSTANTES.find((c) => !rama.constantes.has(c));

  // Aplica una acción a una rama. Devuelve las ramas resultantes (la misma o, si se
  // bifurca, varias) con los nodos añadidos a cada una.
  function aplicarEnRama(T, rama, accion, constanteElegida, cerrarSolas = true) {
    const { nodo, tipo } = accion;
    const c = nodo.clase;
    const desde = nodo.n;
    const añadir = (f, padre, datos) => nuevoNodo(T, f, padre, Object.assign({ regla: tipo, desde }, datos));
    const resultado = [];
    if (tipo === 'σ' || tipo === 'α') {
      rama.usados.add(desde);
      let hoja = rama.hoja;
      const nuevos = c.partes.map((f) => (hoja = añadir(f, hoja)));
      rama.hoja = hoja;
      resultado.push({ rama, nuevos });
    } else if (tipo === 'γ') {
      const hechas = rama.gamma.get(desde) || new Set();
      rama.gamma.set(desde, hechas);
      const lista = constanteElegida ? [constanteElegida] : accion.constantes;
      let hoja = rama.hoja;
      const nuevos = lista.map((k) => {
        const nueva = !rama.constantes.has(k);
        hechas.add(k);
        rama.constantes.add(k);
        return (hoja = añadir(sustituir(c.cuerpo, c.v, k), hoja, { constante: k, nueva }));
      });
      rama.hoja = hoja;
      resultado.push({ rama, nuevos });
    } else if (tipo === 'δ') {
      rama.usados.add(desde);
      const nuevaC = fresca(rama);
      const viejas = T.opciones.boolos ? [...rama.constantes].sort() : [];
      if (!viejas.length) {
        rama.constantes.add(nuevaC);
        const nodoN = añadir(sustituir(c.cuerpo, c.v, nuevaC), rama.hoja, { constante: nuevaC, fresca: true });
        rama.hoja = nodoN;
        resultado.push({ rama, nuevos: [nodoN] });
      } else {
        // Regla de Boolos: una rama por cada constante de la rama y otra con una nueva.
        const hoja = rama.hoja;
        const opciones = viejas.map((k) => ({ k, fresca: false })).concat([{ k: nuevaC, fresca: true }]);
        opciones.forEach((o, i) => {
          const nodoN = añadir(sustituir(c.cuerpo, c.v, o.k), hoja, { constante: o.k, fresca: o.fresca, boolos: true });
          const r = i === 0 ? rama : copiarRama(rama);
          r.hoja = nodoN;
          if (o.fresca) r.constantes.add(o.k);
          resultado.push({ rama: r, nuevos: [nodoN] });
        });
      }
    } else if (tipo === 'β') {
      rama.usados.add(desde);
      const hoja = rama.hoja;
      c.partes.forEach((f, i) => {
        const nodoN = añadir(f, hoja);
        const r = i === 0 ? rama : copiarRama(rama);
        r.hoja = nodoN;
        resultado.push({ rama: r, nuevos: [nodoN] });
      });
    }
    // Las ramas nuevas van a la derecha de la original.
    const pos = T.ramas.indexOf(rama);
    const nuevas = resultado.map((x) => x.rama).filter((r) => r !== rama);
    T.ramas.splice(pos + 1, 0, ...nuevas);
    T.ramas.forEach((r, i) => { r.id = i; });
    // Cierres (en el modo a mano con cierre manual, los hace el alumno)
    if (cerrarSolas) resultado.forEach((x) => {
      for (const nodoN of x.nuevos) {
        const cierre = buscarCierre(nodoN);
        if (cierre) { x.rama.cierre = cierre; x.rama.fin = 'cerrada'; x.rama.pasoFin = T.pasos.length; x.cierre = cierre; break; }
      }
    });
    return resultado;
  }

  function copiarRama(r) {
    const g = new Map();
    r.gamma.forEach((v, k) => g.set(k, new Set(v)));
    return { id: -1, hoja: r.hoja, usados: new Set(r.usados), gamma: g, constantes: new Set(r.constantes), cierre: null, fin: null, bloqueada: r.bloqueada };
  }

  // Marca como terminadas las ramas abiertas sin nada pendiente.
  function cerrarCompletas(T, ramas) {
    const fines = [];
    ramas.forEach((r) => {
      if (r.fin) return;
      if (!elegir(T, r)) {
        if (T.opciones.cierreManual && contradiccion(r)) return;
        r.fin = r.bloqueada ? 'incompleta' : 'abierta';
        r.pasoFin = T.pasos.length;
        fines.push({ rama: r, estado: r.fin });
      }
    });
    return fines;
  }

  function registrar(T, paso) {
    paso.indice = T.pasos.length;
    T.pasos.push(paso);
    return paso;
  }

  // Un paso de la construcción automática: una regla en la rama abierta más a la
  // izquierda, o la constatación de que esa rama está terminada.
  function siguiente(T) {
    if (T.terminado) return null;
    const rama = T.ramas.find((r) => !r.fin);
    if (!rama) { T.terminado = true; return null; }
    if (T.nodos.length >= T.opciones.maxNodos) {
      const fines = T.ramas.filter((r) => !r.fin);
      fines.forEach((r) => { r.fin = 'incompleta'; r.pasoFin = T.pasos.length; });
      T.agotado = true;
      T.terminado = true;
      return registrar(T, { tipo: 'agotado', fines: fines.map((r) => ({ rama: r, estado: 'incompleta' })) });
    }
    const pendiente = contradiccion(rama);
    if (pendiente) {
      rama.cierre = pendiente; rama.fin = 'cerrada'; rama.pasoFin = T.pasos.length;
      return registrar(T, { tipo: 'cierre', par: pendiente, hoja: rama.hoja.n });
    }
    const accion = elegir(T, rama);
    if (!accion) {
      const fines = cerrarCompletas(T, [rama]);
      return registrar(T, { tipo: 'fin', fines });
    }
    const res = aplicarEnRama(T, rama, accion);
    return registrar(T, describir(accion, res));
  }

  function completar(T) {
    let p;
    do { p = siguiente(T); } while (p);
    return T;
  }

  function describir(accion, res) {
    return {
      tipo: 'regla', regla: accion.tipo, desde: accion.nodo.n,
      nuevos: res.flatMap((x) => x.nuevos.map((n) => n.n)),
      constantes: [...new Set(res.flatMap((x) => x.nuevos.map((n) => n.constante).filter(Boolean)))],
      cierres: res.filter((x) => x.cierre).map((x) => x.cierre),
      ramas: res.length,
    };
  }

  // ---- Construcción a mano (modo ejercicio) -----------------------------------------
  // El alumno elige un nodo (y, para γ, una constante) y la regla se aplica en todas
  // las ramas abiertas que pasan por él y en las que está pendiente.

  function opcionesNodo(T, nodo) {
    if (nodo.clase.tipo === 'literal') return { aplicable: false, motivo: 'Es un literal: no se descompone.' };
    const ramas = T.ramas.filter((r) => !r.fin && pasaPor(r, nodo));
    if (!ramas.length) return { aplicable: false, motivo: 'Todas las ramas que pasan por este nodo están cerradas o terminadas.' };
    const constantes = new Set();
    let nueva = null;
    let alguna = false;
    ramas.forEach((r) => {
      const p = pendientes(T, r);
      const lista = [].concat(...Object.values(p)).filter((x) => x.nodo === nodo);
      if (!lista.length) return;
      alguna = true;
      if (nodo.clase.tipo === 'γ') {
        if (lista[0].nueva) nueva = lista[0].constantes[0];
        else lista[0].constantes.forEach((k) => constantes.add(k));
      }
    });
    if (!alguna) {
      if (nodo.clase.tipo === 'δ' && ramas.some((r) => r.constantes.size >= T.opciones.limite)) {
        return { aplicable: false, motivo: `Se ha alcanzado el límite de ${T.opciones.limite} constantes por rama.` };
      }
      return { aplicable: false, motivo: 'Ya se ha aplicado en todas las ramas abiertas que pasan por aquí.' };
    }
    return { aplicable: true, tipo: nodo.clase.tipo, constantes: [...constantes].sort(), nueva };
  }

  function aplicarManual(T, nodoN, constante) {
    const nodo = T.nodos[nodoN - 1];
    const op = opcionesNodo(T, nodo);
    if (!op.aplicable) return { error: op.motivo };
    const ramas = T.ramas.filter((r) => !r.fin && pasaPor(r, nodo));
    let consejo = null;
    let previa = null;
    const res = [];
    let constUsada = null;
    for (const r of ramas) {
      const p = pendientes(T, r);
      const accion = [].concat(...Object.values(p)).find((x) => x.nodo === nodo);
      if (!accion) continue;
      if (!previa && T.opciones.cierreManual) previa = contradiccion(r);
      if (!consejo) {
        const mejor = elegir(T, r);
        const rango = (t) => PRIORIDAD.findIndex((k) => k.includes(t));
        if (mejor && rango(mejor.tipo) < rango(accion.tipo)) consejo = { recomendado: mejor.tipo, nodo: mejor.nodo.n, aplicado: accion.tipo };
      }
      let k = null;
      if (accion.tipo === 'γ') {
        k = accion.nueva ? accion.constantes[0] : constante;
        if (!accion.constantes.includes(k)) continue;
        constUsada = k;
      }
      res.push(...aplicarEnRama(T, r, accion, k, !T.opciones.cierreManual));
    }
    if (!res.length) return { error: `La constante ${constante} ya se ha usado con este nodo en todas las ramas, o no aparece en ellas.` };
    const paso = describir({ tipo: nodo.clase.tipo, nodo }, res);
    paso.consejo = consejo;
    paso.contradiccionPrevia = previa;
    paso.constanteElegida = constUsada;
    paso.fines = cerrarCompletas(T, T.ramas);
    if (!T.ramas.some((r) => !r.fin)) T.terminado = true;
    return registrar(T, paso);
  }

  // Primera contradicción de una rama: [m, n] (o [n] si hay ⊥), o null.
  function contradiccion(rama) {
    for (const x of camino(rama.hoja)) {
      const c = buscarCierre(x);
      if (c) return c;
    }
    return null;
  }

  // El alumno cierra la rama que acaba en la hoja indicada señalando dos nodos
  // contradictorios de ella (o un nodo ⊥).
  function cerrarManual(T, hojaN, nodos) {
    const rama = T.ramas.find((r) => r.hoja.n === hojaN && !r.fin);
    if (!rama) return { error: 'Esa rama ya está terminada.' };
    const enRama = new Set(camino(rama.hoja).map((x) => x.n));
    const fuera = nodos.find((n) => !enRama.has(n));
    if (fuera) return { error: `El nodo ${fuera} no está en esta rama.` };
    const [a, b] = nodos.map((n) => T.nodos[n - 1]);
    let par = null;
    if (nodos.length === 1) {
      if (a.f.op !== 'bot') return { error: 'Señala dos nodos, una fórmula y su negación, o un nodo con ⊥.' };
      par = [a.n];
    } else {
      if (a.n === b.n) return { error: 'Señala dos nodos distintos.' };
      if (a.clave !== PO.clave(No(b.f)) && b.clave !== PO.clave(No(a.f))) {
        return { error: `${a.texto} (nodo ${a.n}) y ${b.texto} (nodo ${b.n}) no son contradictorios: una fórmula tiene que ser la negación de la otra.` };
      }
      par = [a.n, b.n].sort((x, y) => x - y);
    }
    rama.cierre = par;
    rama.fin = 'cerrada';
    rama.pasoFin = T.pasos.length;
    const paso = registrar(T, { tipo: 'cierre', par, hoja: hojaN });
    if (!T.ramas.some((r) => !r.fin)) T.terminado = true;
    return paso;
  }

  // Ramas sin nada que descomponer que el alumno aún no ha cerrado.
  const porCerrar = (T) => T.ramas.filter((r) => !r.fin && !elegir(T, r));

  // Situación inicial en modo ejercicio: ramas ya terminadas en la raíz.
  function prepararManual(T) {
    const fines = cerrarCompletas(T, T.ramas);
    if (!T.ramas.some((r) => !r.fin)) T.terminado = true;
    return fines;
  }

  // ---- Resultado y modelo (§6.4, §6.5) ---------------------------------------------

  function estado(T) {
    const abiertas = T.ramas.filter((r) => r.fin === 'abierta');
    const incompletas = T.ramas.filter((r) => r.fin === 'incompleta');
    const sinTerminar = T.ramas.filter((r) => !r.fin);
    const cerrado = T.ramas.every((r) => r.fin === 'cerrada');
    return { cerrado, abiertas, incompletas, sinTerminar, decidido: cerrado || abiertas.length > 0 };
  }

  function vocabulario(T) {
    const preds = new Map();
    T.nodos.filter((x) => x.papel).forEach((x) => PO.predicados(x.f).forEach((p) => preds.set(p.nombre, p.args.length)));
    return preds;
  }

  // Modelo de una rama abierta: D son las constantes de la rama (o {1} si no hay
  // ninguna), I(c) = c, y cada predicado tiene por extensión las tuplas de sus
  // literales afirmados en la rama.
  function modelo(T, rama) {
    const nodos = camino(rama.hoja);
    const literales = nodos.filter((x) => x.clase.tipo === 'literal' && x.f.op !== 'bot' && !(x.f.op === 'not' && x.f.a.op === 'bot'));
    const consts = [...rama.constantes].sort();
    const D = consts.length ? consts : ['1'];
    const afirmados = new Set(literales.filter((x) => x.f.op === 'pred').map((x) => x.clave));
    const preds = vocabulario(T);
    literales.forEach((x) => { const p = x.f.op === 'pred' ? x.f : x.f.a; if (p.op === 'pred') preds.set(p.nombre, p.args.length); });
    const atomo = (nombre, ds) => PO.clave({ op: 'pred', nombre, args: ds.map((d) => ({ tipo: 'const', nombre: d })) });
    const M = {
      D,
      constante: (c) => (consts.includes(c) ? c : undefined),
      predicado: (nombre) => (preds.has(nombre) ? { nombre, aridad: preds.get(nombre), ext: (...ds) => afirmados.has(atomo(nombre, ds)) } : null),
    };
    const nombres = [...preds.keys()].sort((x, y) => (preds.get(x) === 0) - (preds.get(y) === 0) || x.localeCompare(y));
    const extensiones = nombres.filter((p) => preds.get(p) > 0).map((p) => {
      const ar = preds.get(p);
      let tuplas = [[]];
      for (let i = 0; i < ar; i++) tuplas = tuplas.flatMap((t) => D.map((d) => t.concat([d])));
      return { nombre: p, aridad: ar, tuplas: tuplas.filter((t) => afirmados.has(atomo(p, t))) };
    });
    const proposicionales = nombres.filter((p) => preds.get(p) === 0).map((p) => ({ nombre: p, valor: afirmados.has(atomo(p, [])) ? 1 : 0 }));
    return { D, constantes: consts, literales: literales.map((x) => x.texto), extensiones, proposicionales, M };
  }

  // ---- Textos -------------------------------------------------------------------------

  function textoPaso(T, p) {
    if (!p) return '';
    if (p.tipo === 'agotado') return `Se ha llegado al límite de ${T.opciones.maxNodos} nodos: las ramas sin terminar quedan incompletas.`;
    if (p.tipo === 'fin') return textoFines(p.fines);
    if (p.tipo === 'cierre') {
      if (p.par.length === 1) return `Se cierra la rama: el nodo ${p.par[0]} es ⊥.`;
      return `Se cierra la rama: los nodos ${p.par[0]} (${T.nodos[p.par[0] - 1].texto}) y ${p.par[1]} (${T.nodos[p.par[1] - 1].texto}) son contradictorios.`;
    }
    const n = p.desde, f = T.nodos[n - 1].texto;
    let s;
    switch (p.regla) {
      case 'σ': s = `Regla σ sobre el nodo ${n} (${f}): se añade la fórmula sin la doble negación.`; break;
      case 'α': s = `Regla α sobre el nodo ${n} (${f}): sus dos componentes se añaden a la misma rama.`; break;
      case 'β': s = `Regla β sobre el nodo ${n} (${f}): la rama se bifurca, con un componente en cada rama.`; break;
      case 'δ':
        s = p.ramas > 1
          ? `Regla δ de Boolos sobre el nodo ${n} (${f}): una rama por cada constante que ya hay (${listaY(p.constantes.slice(0, -1))}) y otra con la constante nueva ${p.constantes[p.constantes.length - 1]}.`
          : `Regla δ sobre el nodo ${n} (${f}): se introduce la constante fresca ${p.constantes[0]}.`;
        break;
      case 'γ': {
        const nueva = T.nodos[p.nuevos[0] - 1].nueva;
        s = `Regla γ sobre el nodo ${n} (${f}): se instancia con ${p.constantes.length > 1 ? 'las constantes' : 'la constante'} ${listaY(p.constantes)}` +
          (nueva ? ', nueva porque en la rama no había ninguna.' : '.');
        break;
      }
    }
    p.cierres.forEach((c) => {
      s += c.length === 1 ? ` La rama se cierra: contiene ⊥ (nodo ${c[0]}).` : ` La rama se cierra: los nodos ${c[0]} y ${c[1]} son contradictorios.`;
    });
    if (p.fines && p.fines.length) s += ' ' + textoFines(p.fines);
    return s;
  }

  function textoFines(fines) {
    return fines.map((x) => (x.estado === 'abierta'
      ? 'No queda ninguna regla por aplicar en esta rama: está abierta y completa.'
      : `Esta rama no se puede completar sin pasar del límite de constantes (la regla δ pide una constante nueva): queda incompleta (§6.9).`)).join(' ');
  }

  // ---- Exportación ---------------------------------------------------------------------
  // Del árbol tal como se ve hasta el paso kk (todo, si no se indica).

  function justificacion(x) {
    if (x.papel) return x.papel;
    let s = `${x.regla}, ${x.desde}`;
    if (x.regla === 'δ') s += x.fresca ? ` (${x.constante} fresca)` : ` (${x.constante}, ya en la rama)`;
    if (x.regla === 'γ' && x.nueva) s += ` (${x.constante} nueva)`;
    return s;
  }
  const finDeRama = (r) => (r.fin === 'cerrada' ? `⊗ ${r.cierre.join(', ')}` : r.fin === 'abierta' ? 'ABIERTA' : 'INCOMPLETA');

  // Segmentos: cadenas de nodos; cada una acaba en una bifurcación o en el final de una rama.
  function segmentos(T, kk = Infinity) {
    const visible = (x) => x.paso < kk;
    const hojas = new Map(T.ramas.map((r) => [r.hoja, r]));
    const seg = (inicio) => {
      const nodos = [inicio];
      let x = inicio;
      for (;;) {
        const hijos = x.hijos.filter(visible);
        if (hijos.length === 1 && x.hijos.length === 1) { x = hijos[0]; nodos.push(x); continue; }
        if (hijos.length) return { nodos, hijos: hijos.map(seg) };
        const r = hojas.get(x);
        return { nodos, hijos: [], fin: r && r.fin && r.pasoFin < kk ? finDeRama(r) : null };
      }
    };
    return seg(T.nodos[0]);
  }

  // Texto: las ramas con ├── y └──, y las justificaciones en una columna.
  function aTexto(T, kk) {
    const filas = [];
    (function rec(s, primero, resto) {
      s.nodos.forEach((x, i) => filas.push([`${i === 0 ? primero : resto}${x.n}. ${x.texto}`, justificacion(x)]));
      if (s.fin) filas.push([`${resto}${s.fin}`, '']);
      s.hijos.forEach((h, k) => {
        const ultimo = k === s.hijos.length - 1;
        rec(h, resto + (ultimo ? '└── ' : '├── '), resto + (ultimo ? '    ' : '│   '));
      });
    })(segmentos(T, kk), '', '');
    const ancho = Math.max(...filas.map(([a]) => [...a].length)) + 3;
    return filas.map(([a, b]) => (b ? a + ' '.repeat(ancho - [...a].length) + b : a)).join('\n');
  }

  const LATEX = [[/¬/g, '\\neg '], [/∧/g, '\\land'], [/∨/g, '\\lor'], [/↔/g, '\\leftrightarrow'], [/→/g, '\\to'],
    [/⊥/g, '\\bot'], [/∀/g, '\\forall '], [/∃/g, '\\exists '], [/≠/g, '\\neq']];
  const formulaLatex = (t) => LATEX.reduce((s, [re, r]) => s.replace(re, r), t).replace(/ +/g, ' ');
  const GRIEGAS = { α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', σ: 'sigma' };
  const etiquetaLatex = (t) => t.replace(/[αβγδσ]/g, (c) => `$\\${GRIEGAS[c]}$`)
    .replace(/\(([a-r])( fresca| nueva|, ya en la rama)\)/, (_, c, resto) => `($${c}$${resto})`);

  // TikZ con el aspecto de los árboles del libro: número a la izquierda, justificación a
  // la derecha y ⊗ con los nodos que chocan. Las posiciones se calculan aquí, a partir
  // del ancho de cada rama, para que las ramas no se solapen.
  function aLatex(T, kk, opciones = {}) {
    const conJust = opciones.justificaciones !== false;
    const raiz = segmentos(T, kk);
    // Medidas aproximadas en cm: carácter de fórmula, carácter de etiqueta (scriptsize),
    // altura de fila, separación entre ramas y bajada extra en cada bifurcación.
    const CM_CAR = 0.2, CM_ETQ = 0.13, FILA = 0.9, HUECO = 0.5, BAJADA = 0.4, ANCHO_PAGINA = 16;
    const anchoNodo = (x) => {
      const f = [...x.texto].length * CM_CAR + 0.3;
      const izq = (String(x.n).length + 1) * CM_ETQ + 0.15;
      const der = conJust ? [...justificacion(x)].length * CM_ETQ + 0.15 : 0;
      return 2 * Math.max(f / 2 + izq, f / 2 + der);
    };
    const anchoSeg = (s) => {
      const propio = Math.max(...s.nodos.map(anchoNodo), s.fin ? 1.8 : 0);
      const hijos = s.hijos.length ? s.hijos.reduce((a, h) => a + anchoSeg(h), 0) + HUECO * (s.hijos.length - 1) : 0;
      s.ancho = Math.max(propio, hijos);
      return s.ancho;
    };
    anchoSeg(raiz);
    const nodos = [], aristas = [];
    const num = (v) => (Math.round(v * 100) / 100).toString();
    let fin = 0;
    (function colocar(s, x, y, padre) {
      let anterior = padre;
      s.nodos.forEach((n) => {
        const id = `n${n.n}`;
        const etiquetas = [`label={[font=\\scriptsize]left:{${n.n}.}}`];
        if (conJust) etiquetas.push(`label={[font=\\scriptsize]right:{${etiquetaLatex(justificacion(n))}}}`);
        nodos.push(`  \\node[${etiquetas.join(', ')}] (${id}) at (${num(x)}, ${num(y)}) {$${formulaLatex(n.texto)}$};`);
        if (anterior) aristas.push(`  \\draw (${anterior}.south) -- (${id}.north);`);
        anterior = id;
        y -= FILA;
      });
      if (s.fin) {
        const id = `f${++fin}`;
        const cierre = /^⊗ (.*)$/.exec(s.fin);
        nodos.push(cierre
          ? `  \\node[label={[font=\\scriptsize]below:{${cierre[1]}}}] (${id}) at (${num(x)}, ${num(y + 0.2)}) {$\\bigotimes$};`
          : `  \\node (${id}) at (${num(x)}, ${num(y + 0.2)}) {\\textbf{${s.fin}}};`);
        aristas.push(`  \\draw (${anterior}.south) -- (${id}.north);`);
      }
      let inicio = x - (s.hijos.reduce((a, h) => a + h.ancho, 0) + HUECO * (s.hijos.length - 1)) / 2;
      s.hijos.forEach((h) => {
        colocar(h, inicio + h.ancho / 2, y - BAJADA, anterior);
        inicio += h.ancho + HUECO;
      });
    })(raiz, 0, 0, null);
    // Un árbol más ancho que la página se reduce entero, con el texto.
    const escala = raiz.ancho > ANCHO_PAGINA ? `, scale=${num(ANCHO_PAGINA / raiz.ancho)}, every node/.style={transform shape}` : '';
    return [`\\begin{tikzpicture}[thick${escala}]`, ...nodos, ...aristas, '\\end{tikzpicture}'].join('\n');
  }
  const PREAMBULO_LATEX = '\\usepackage{tikz}';

  const API = {
    clasificar, sustituir, comprobarFormula, crear, siguiente, completar, elegir, pendientes,
    opcionesNodo, aplicarManual, prepararManual, estado, modelo, textoPaso, camino, texto, NOMBRE_REGLA,
    contradiccion, cerrarManual, porCerrar,
    justificacion, segmentos, aTexto, aLatex, PREAMBULO_LATEX,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.Tableaux = API;
})(typeof window !== 'undefined' ? window : globalThis);
