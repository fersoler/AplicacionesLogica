// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Sintaxis de las fórmulas (temas 1 y 4 de los Apuntes de Lógica): conectiva
// principal, subfórmulas, árbol de formación, paréntesis y convenciones de
// precedencia (§1.1.1), alcance, ocurrencias libres y ligadas, sentencias y
// sustitución (§4.2). Trabaja con la representación de primerorden.js.
(function (raiz) {
  'use strict';
  const PO = (typeof module !== 'undefined' && module.exports) ? require('../../comun/js/primerorden.js') : raiz.PrimerOrden;
  const OPC = { atomos: true, compacta: true };

  const PREC = { iff: 1, imp: 2, or: 3, and: 4 };
  const SIM = { and: '∧', or: '∨', imp: '→', iff: '↔' };
  const binaria = (f) => f.op in PREC;
  const atomoIgualdad = (f) => f.op === 'eq' || (f.op === 'not' && f.a.op === 'eq');
  const atomica = (f) => f.op === 'pred' || f.op === 'eq' || f.op === 'bot';
  const listaY = (xs) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1]);

  function necesita(padre, hijo, lado) {
    if (!binaria(hijo)) return false;
    const p = PREC[padre], h = PREC[hijo.op];
    if (h < p) return true;
    if ((padre === 'and' && hijo.op === 'or') || (padre === 'or' && hijo.op === 'and')) return true;
    if (h === p) return lado === 'izq' || padre !== 'imp';
    return false;
  }

  // ---- Impresión en piezas -------------------------------------------------------------
  // modo: 'minimo' (convenciones de §1.1.1, como el libro), 'explicito' (paréntesis
  // en todo miembro binario de una binaria) o 'estricto' (la definición inductiva:
  // toda fórmula binaria entre paréntesis, también la exterior, salvo que exterior
  // sea false).
  // Cada pieza: {texto, tipo, nodo (para conectivas, cuantificadores y átomos),
  // libre / ligadaPor (para las variables)}. Además se devuelve el alcance de cada
  // cuantificador (índices de sus piezas).

  function piezas(f, modo = 'minimo', exterior = true) {
    const res = [];
    const ligadas = [];
    const alcances = [];
    const pon = (texto, tipo, extra) => { res.push(Object.assign({ texto, tipo, i: res.length }, extra)); return res.length - 1; };
    function termino(t) {
      if (t.tipo !== 'var') { pon(t.nombre, 'const'); return; }
      let q = null;
      for (let k = ligadas.length - 1; k >= 0; k--) if (ligadas[k].v === t.nombre) { q = ligadas[k].pieza; break; }
      pon(t.nombre, 'var', { libre: q === null, ligadaPor: q });
    }
    const paren = (padre, hijo, lado) => (modo === 'estricto' ? binaria(hijo) : modo === 'explicito' ? binaria(hijo) : necesita(padre, hijo, lado));
    function rec(g, parens) {
      const ini = res.length;
      if (parens) pon('(', 'par');
      switch (g.op) {
        case 'pred':
          pon(g.nombre, 'pred', { nodo: g });
          if (g.args.length) {
            pon('(', 'par', { argumento: true });
            g.args.forEach((t, k) => { if (k) pon(', ', 'coma'); termino(t); });
            pon(')', 'par', { argumento: true });
          }
          break;
        case 'eq': termino(g.a); pon(' = ', 'op', { nodo: g }); termino(g.b); break;
        case 'bot': pon('⊥', 'pred', { nodo: g }); break;
        case 'not':
          if (g.a.op === 'eq' && modo !== 'estricto') { termino(g.a.a); pon(' ≠ ', 'op', { nodo: g }); termino(g.a.b); break; }
          pon('¬', 'op', { nodo: g });
          rec(g.a, binaria(g.a));
          break;
        case 'forall': case 'exists': {
          const q = pon((g.op === 'forall' ? '∀' : '∃') + g.v, 'cuant', { nodo: g });
          pon(' ', 'esp');
          ligadas.push({ v: g.v, pieza: q });
          const desde = res.length;
          rec(g.a, binaria(g.a) || (modo !== 'estricto' && atomoIgualdad(g.a)));
          ligadas.pop();
          alcances.push({ cuantificador: q, desde, hasta: res.length - 1 });
          break;
        }
        default:
          rec(g.a, paren(g.op, g.a, 'izq'));
          pon(' ' + SIM[g.op] + ' ', 'op', { nodo: g });
          rec(g.b, paren(g.op, g.b, 'der'));
      }
      if (parens) pon(')', 'par');
      g.__rango = [ini, res.length - 1];
    }
    rec(f, modo === 'estricto' && exterior && binaria(f));
    return { piezas: res, alcances };
  }
  const texto = (f, modo, exterior) => piezas(f, modo, exterior).piezas.map((p) => p.texto).join('');

  // ---- Conectiva principal, subfórmulas y árbol de formación (§1.1.1) -----------------

  const NOMBRE = {
    not: 'negación', and: 'conjunción', or: 'disyunción', imp: 'condicional', iff: 'bicondicional',
    forall: 'cuantificador universal', exists: 'cuantificador existencial',
  };
  function principal(f) {
    if (atomica(f)) return null;
    if (f.op === 'not' && f.a.op === 'eq') return { simbolo: '¬', nombre: 'negación' };
    if (f.op === 'forall' || f.op === 'exists') return { simbolo: (f.op === 'forall' ? '∀' : '∃') + f.v, nombre: NOMBRE[f.op] };
    return { simbolo: f.op === 'not' ? '¬' : SIM[f.op], nombre: NOMBRE[f.op] };
  }
  const inmediatas = (f) => (atomica(f) ? [] : f.op === 'not' || f.op === 'forall' || f.op === 'exists' ? [f.a] : [f.a, f.b]);

  // Subfórmulas: la propia fórmula, sus subfórmulas inmediatas, las de estas… sin repetir.
  function subformulas(f) {
    const vistas = new Map();
    (function rec(g) {
      const k = PO.clave(g);
      if (!vistas.has(k)) vistas.set(k, g);
      inmediatas(g).forEach(rec);
    })(f);
    return [...vistas.values()];
  }
  function arbol(f) {
    return { f, texto: texto(f), principal: principal(f), hijos: inmediatas(f).map(arbol) };
  }

  // ---- Variables (§4.2) ------------------------------------------------------------------

  function sustituir(f, v, c) {
    const t = (x) => (x.tipo === 'var' && x.nombre === v ? { tipo: 'const', nombre: c } : x);
    switch (f.op) {
      case 'pred': return { op: 'pred', nombre: f.nombre, args: f.args.map(t) };
      case 'eq': return { op: 'eq', a: t(f.a), b: t(f.b) };
      case 'bot': return f;
      case 'not': return { op: 'not', a: sustituir(f.a, v, c) };
      case 'forall': case 'exists': return f.v === v ? f : { op: f.op, v: f.v, a: sustituir(f.a, v, c) };
      default: return { op: f.op, a: sustituir(f.a, v, c), b: sustituir(f.b, v, c) };
    }
  }
  // El error típico: sustituir todas las apariciones, también las ligadas.
  function sustituirTodas(f, v, c) {
    const t = (x) => (x.tipo === 'var' && x.nombre === v ? { tipo: 'const', nombre: c } : x);
    switch (f.op) {
      case 'pred': return { op: 'pred', nombre: f.nombre, args: f.args.map(t) };
      case 'eq': return { op: 'eq', a: t(f.a), b: t(f.b) };
      case 'bot': return f;
      case 'not': return { op: 'not', a: sustituirTodas(f.a, v, c) };
      case 'forall': case 'exists': return { op: f.op, v: f.v, a: sustituirTodas(f.a, v, c) };
      default: return { op: f.op, a: sustituirTodas(f.a, v, c), b: sustituirTodas(f.b, v, c) };
    }
  }

  // ---- Otras lecturas de una misma secuencia de símbolos ----------------------------------
  // Para el ejercicio «¿cómo se agrupa?»: se vuelve a leer la fórmula escrita con
  // convenciones equivocadas (de izquierda a derecha, precedencias al revés, el
  // cuantificador o la negación con el alcance más amplio posible…).

  function unidades(f) {
    const { piezas: ps } = piezas(f, 'minimo');
    const u = [];
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (p.tipo === 'esp' || p.tipo === 'coma') continue;
      if (p.tipo === 'pred' || (p.tipo === 'op' && (p.nodo.op === 'eq' || (p.nodo.op === 'not' && p.nodo.a.op === 'eq')))) {
        // un átomo ocupa varias piezas: hasta el final de su rango
        const nodo = p.nodo;
        const fin = nodo.__rango[1];
        let ini = nodo.__rango[0];
        if (u.length && (p.nodo.op === 'eq' || p.nodo.op === 'not')) u.pop(); // el primer término ya se había añadido
        u.push({ tipo: 'atomo', f: nodo, texto: ps.slice(ini, fin + 1).map((x) => x.texto).join('') });
        i = fin;
        continue;
      }
      if (p.tipo === 'const' || p.tipo === 'var') { u.push({ tipo: 'termino' }); continue; }
      if (p.tipo === 'par') { u.push({ tipo: p.texto }); continue; }
      if (p.tipo === 'cuant') { u.push({ tipo: 'cuant', op: p.nodo.op, v: p.nodo.v }); continue; }
      if (p.nodo.op === 'not') { u.push({ tipo: 'not' }); continue; }
      u.push({ tipo: 'bin', op: p.nodo.op });
    }
    return u;
  }

  const LIBRO = { prec: { iff: 1, imp: 2, or: 3, and: 4 }, asoc: 'der' };
  const LECTURAS = [
    { prec: { iff: 1, imp: 1, or: 1, and: 1 }, asoc: 'izq' },
    { prec: { iff: 1, imp: 1, or: 1, and: 1 }, asoc: 'der' },
    { prec: { iff: 4, imp: 3, or: 2, and: 1 }, asoc: 'der' },
    { prec: { iff: 1, imp: 2, or: 3, and: 4 }, asoc: 'izq' },
    { prec: { iff: 1, imp: 2, or: 3, and: 3 }, asoc: 'izq' },
    { prec: { iff: 1, imp: 2, or: 3, and: 4 }, asoc: 'der', negAncha: true },
    { prec: { iff: 1, imp: 2, or: 3, and: 4 }, asoc: 'der', cuantAncho: true },
    { prec: { iff: 2, imp: 1, or: 3, and: 4 }, asoc: 'der' },
  ];

  function leer(us, cfg) {
    let k = 0;
    function primario() {
      const u = us[k];
      if (!u) throw new Error('incompleta');
      if (u.tipo === 'atomo') { k++; return u.f; }
      if (u.tipo === '(') {
        k++;
        const f = expr(0);
        if (!us[k] || us[k].tipo !== ')') throw new Error('paréntesis');
        k++;
        return f;
      }
      if (u.tipo === 'not') { k++; return { op: 'not', a: cfg.negAncha ? expr(0) : primario() }; }
      if (u.tipo === 'cuant') { k++; return { op: u.op, v: u.v, a: cfg.cuantAncho ? expr(0) : primario() }; }
      throw new Error('inesperado');
    }
    function expr(min) {
      let izq = primario();
      while (k < us.length && us[k].tipo === 'bin' && cfg.prec[us[k].op] >= min) {
        const op = us[k].op, p = cfg.prec[op];
        k++;
        const der = expr(cfg.asoc === 'der' ? p : p + 1);
        izq = { op, a: izq, b: der };
      }
      return izq;
    }
    const f = expr(0);
    if (k !== us.length) throw new Error('sobran símbolos');
    return f;
  }

  // Lecturas distintas de la correcta (como mucho n).
  function otrasLecturas(f, n = 3) {
    const us = unidades(f);
    const buena = PO.clave(f);
    const vistas = new Set([buena]);
    const res = [];
    for (const cfg of LECTURAS) {
      let g;
      try { g = leer(us, cfg); } catch (e) { continue; }
      const k = PO.clave(g);
      if (vistas.has(k)) continue;
      vistas.add(k);
      res.push(g);
    }
    return res.slice(0, n);
  }

  // Trozos de la fórmula escrita que son fórmulas por sí solos: unos son
  // subformulas y otros no (por la precedencia o el alcance).
  function trozos(f) {
    const us = unidades(f);
    const subs = new Set(subformulas(f).map(PO.clave));
    const vistos = new Map();
    for (let i = 0; i < us.length; i++) {
      for (let j = i; j < us.length; j++) {
        if (i === 0 && j === us.length - 1) continue;
        let g;
        try { g = leer(us.slice(i, j + 1), LIBRO); } catch (e) { continue; }
        const k = PO.clave(g);
        if (vistos.has(k)) continue;
        vistos.set(k, { f: g, texto: texto(g), es: subs.has(k), atomica: atomica(g) });
      }
    }
    return [...vistos.values()];
  }

  // ---- Fórmulas al azar para los ejercicios ---------------------------------------------------

  function azar(semilla) {
    let s = (semilla >>> 0) || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  }
  const elige = (xs, rnd) => xs[Math.floor(rnd() * xs.length)];

  function proposicional(rnd, binarias) {
    // binarias: número de conectivas binarias
    if (binarias === 0) {
      const p = { op: 'pred', nombre: elige(['p', 'q', 'r'], rnd), args: [] };
      return rnd() < 0.25 ? { op: 'not', a: p } : p;
    }
    const izq = Math.floor(rnd() * binarias);
    const f = { op: elige(['and', 'or', 'imp', 'iff', 'and', 'or', 'imp'], rnd), a: proposicional(rnd, izq), b: proposicional(rnd, binarias - 1 - izq) };
    return rnd() < 0.15 ? { op: 'not', a: f } : f;
  }

  function primerOrden(rnd, binarias, vars = [], libres = 0.15) {
    const term = () => (vars.length && rnd() > libres ? { tipo: 'var', nombre: elige(vars, rnd) }
      : rnd() < 0.5 ? { tipo: 'const', nombre: elige(['a', 'b', 'c'], rnd) } : { tipo: 'var', nombre: elige(['x', 'y'], rnd) });
    const variableNueva = () => { const libresV = ['x', 'y', 'z'].filter((x) => !vars.includes(x)); return libresV.length ? libresV[0] : elige(['x', 'y'], rnd); };
    if (binarias === 0) {
      if (rnd() < 0.3 && vars.length < 2) {
        const v = rnd() < 0.85 ? variableNueva() : elige(['x', 'y'], rnd);
        return { op: elige(['forall', 'exists'], rnd), v, a: primerOrden(rnd, 0, [...new Set([...vars, v])], libres) };
      }
      const p = elige(['P', 'Q', 'R'], rnd);
      const at = { op: 'pred', nombre: p, args: p === 'R' ? [term(), term()] : [term()] };
      return rnd() < 0.2 ? { op: 'not', a: at } : at;
    }
    if (rnd() < 0.35) {
      const v = rnd() < 0.85 ? variableNueva() : elige(['x', 'y'], rnd);
      return { op: elige(['forall', 'exists'], rnd), v, a: primerOrden(rnd, binarias, [...new Set([...vars, v])], libres) };
    }
    const izq = Math.floor(rnd() * binarias);
    return { op: elige(['and', 'or', 'imp', 'iff', 'and', 'imp'], rnd), a: primerOrden(rnd, izq, vars, libres), b: primerOrden(rnd, binarias - 1 - izq, vars, libres) };
  }

  // Cuantificador vacuo: su variable no aparece libre en su alcance.
  function vacuo(f) {
    switch (f.op) {
      case 'forall': case 'exists': return !PO.libres(f.a).has(f.v) || vacuo(f.a);
      case 'not': return vacuo(f.a);
      case 'pred': case 'eq': case 'bot': return false;
      default: return vacuo(f.a) || vacuo(f.b);
    }
  }
  // Un cuantificador vuelve a cuantificar una variable ya ligada por otro exterior.
  function religa(f, ligadas = new Set()) {
    switch (f.op) {
      case 'forall': case 'exists': return ligadas.has(f.v) || religa(f.a, new Set([...ligadas, f.v]));
      case 'not': return religa(f.a, ligadas);
      case 'pred': case 'eq': case 'bot': return false;
      default: return religa(f.a, ligadas) || religa(f.b, ligadas);
    }
  }

  // Fórmula «interesante» para cada ejercicio.
  function formulaPara(tipo, nivel, rnd) {
    for (let intento = 0; intento < 3000; intento++) {
      const fo = nivel === 'primer';
      const f = fo ? primerOrden(rnd, 2 + Math.floor(rnd() * 2), [], tipo === 'libres' || tipo === 'sustitucion' ? 0.35 : 0.1)
        : proposicional(rnd, 2 + Math.floor(rnd() * 3));
      const s = texto(f);
      if (s.length > 60) continue;
      if (fo && (vacuo(f) || (tipo !== 'libres' && religa(f)))) continue;
      if (tipo === 'principal' || tipo === 'agrupacion') {
        if (otrasLecturas(f).length < (tipo === 'agrupacion' ? 3 : 1)) continue;
        if (fo && !s.includes('∀') && !s.includes('∃')) continue;
        if (fo && PO.libres(f).size) continue;
        return { f };
      }
      if (tipo === 'subformulas') {
        const t = trozos(f).filter((x) => !x.atomica);
        if (t.filter((x) => x.es).length < 2 || t.filter((x) => !x.es).length < 2) continue;
        return { f };
      }
      if (tipo === 'libres') {
        const ps = piezas(f).piezas.filter((p) => p.tipo === 'var');
        if (ps.length < 3 || ps.length > 7 || !ps.some((p) => p.libre) || !ps.some((p) => !p.libre)) continue;
        return { f };
      }
      if (tipo === 'sustitucion') {
        const libres = [...PO.libres(f)];
        if (!libres.length) continue;
        const v = elige(libres, rnd);
        const usadas = PO.constantes(f);
        const c = ['a', 'b', 'c', 'd', 'e'].find((x) => !usadas.has(x));
        const trampa = PO.clave(sustituirTodas(f, v, c)) !== PO.clave(sustituir(f, v, c));
        if (!trampa && rnd() < 0.7) continue;
        return { f, v, c };
      }
    }
    return null;
  }

  const analizar = (s) => PO.analizar(s, OPC);

  const API = {
    OPC, analizar, piezas, texto, principal, inmediatas, subformulas, arbol, sustituir, sustituirTodas,
    unidades, leer, otrasLecturas, trozos, azar, formulaPara, atomica, binaria, listaY, NOMBRE, vacuo, religa,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.Sintaxis = API;
})(typeof window !== 'undefined' ? window : globalThis);
