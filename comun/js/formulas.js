// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Fórmulas de la lógica proposicional: análisis, impresión y evaluación.
//
// Sintaxis de entrada: los símbolos del libro o sus equivalentes de teclado.
//   negación       ~  -  ¬
//   conjunción     &  &&  ^  ∧
//   disyunción     |  ||  +  ∨
//   condicional    ->  =>  >  →
//   bicondicional  <->  <=>  ↔
//   contradicción  #  XX  ⊥
//   variables      una letra (p, q, r…); la v es una variable, no la disyunción
// Precedencia, de más a menos fuerte: ¬, ∧, ∨, →, ↔. Las binarias se agrupan por la
// derecha, como en el libro: p → q → r es p → (q → r).
//
// Representación: {op: 'var', nombre} | {op: 'bot'} | {op: 'not', a} |
//                 {op: 'and' | 'or' | 'imp' | 'iff', a, b}
(function (raiz) {
  'use strict';

  const SIMBOLO = { not: '¬', and: '∧', or: '∨', imp: '→', iff: '↔' };
  const ASCII = { not: '~', and: '&', or: '|', imp: '->', iff: '<->' };
  const PREC = { iff: 1, imp: 2, or: 3, and: 4 };
  const BOT = Object.freeze({ op: 'bot' });

  const Var = (nombre) => ({ op: 'var', nombre });
  const No = (a) => ({ op: 'not', a });
  const Bin = (op, a, b) => ({ op, a, b });

  class ErrorSintaxis extends Error {
    constructor(mensaje, posicion) { super(mensaje); this.posicion = posicion; }
  }

  // ---- Análisis ----------------------------------------------------------------

  function tokenizar(texto) {
    const t = [];
    let i = 0;
    const pon = (tipo, largo, extra) => { t.push(Object.assign({ tipo, pos: i }, extra)); i += largo; };
    while (i < texto.length) {
      const c = texto[i];
      const sig = (s) => texto.startsWith(s, i);
      if (/\s/.test(c)) { i++; continue; }
      if (sig('<->') || sig('<=>')) { pon('iff', 3); continue; }
      if (sig('->') || sig('=>')) { pon('imp', 2); continue; }
      if (sig('&&') || sig('||')) { pon(c === '&' ? 'and' : 'or', 2); continue; }
      if (sig('XX')) { pon('bot', 2); continue; }
      if ('↔⇔≡'.includes(c)) { pon('iff', 1); continue; }
      if ('→⇒⊃>'.includes(c)) { pon('imp', 1); continue; }
      if ('¬~∼-−'.includes(c)) { pon('not', 1); continue; }
      if ('∧&^'.includes(c)) { pon('and', 1); continue; }
      if ('∨|+'.includes(c)) { pon('or', 1); continue; }
      if ('#⊥'.includes(c)) { pon('bot', 1); continue; }
      if (c === '(') { pon('(', 1); continue; }
      if (c === ')') { pon(')', 1); continue; }
      if (/[A-Za-z]/.test(c)) { pon('var', 1, { nombre: c }); continue; }
      throw new ErrorSintaxis(`Símbolo no reconocido: «${c}».`, i);
    }
    return t;
  }

  function analizar(texto) {
    const t = tokenizar(texto);
    if (t.length === 0) throw new ErrorSintaxis('Escribe una fórmula.', 0);
    let k = 0;
    const ver = () => t[k];
    const fin = () => (k < t.length ? t[k].pos : texto.length);

    // Cada nivel se llama a sí mismo por la derecha (asociatividad por la derecha).
    let nivelIff, nivelImp, nivelOr, nivelAnd;
    function unaria() {
      const x = ver();
      if (!x) throw new ErrorSintaxis('La fórmula está incompleta.', fin());
      if (x.tipo === 'not') { k++; return No(unaria()); }
      if (x.tipo === 'var') { k++; return Var(x.nombre); }
      if (x.tipo === 'bot') { k++; return BOT; }
      if (x.tipo === '(') {
        k++;
        const f = nivelIff();
        if (!ver() || ver().tipo !== ')') throw new ErrorSintaxis('Falta un paréntesis de cierre.', fin());
        k++;
        return f;
      }
      throw new ErrorSintaxis('Falta una fórmula antes de este símbolo.', x.pos);
    }
    const nivel = (op, inferior, propio) => () => {
      const a = inferior();
      if (ver() && ver().tipo === op) { k++; return Bin(op, a, propio()); }
      return a;
    };
    nivelAnd = nivel('and', unaria, () => nivelAnd());
    nivelOr = nivel('or', () => nivelAnd(), () => nivelOr());
    nivelImp = nivel('imp', () => nivelOr(), () => nivelImp());
    nivelIff = nivel('iff', () => nivelImp(), () => nivelIff());

    const f = nivelIff();
    if (k < t.length) {
      const x = t[k];
      let msj = x.tipo === ')' ? 'Sobra un paréntesis de cierre.' : 'Falta una conectiva entre dos fórmulas.';
      if (x.tipo === 'var' && (x.nombre === 'v' || x.nombre === 'V')) msj += ' La v es una variable: la disyunción se escribe ∨ o |.';
      throw new ErrorSintaxis(msj, x.pos);
    }
    return f;
  }

  // ---- Impresión ---------------------------------------------------------------
  // Paréntesis mínimos según la precedencia, con dos excepciones para que se lea
  // mejor: se marcan los ∧ dentro de ∨ y al revés, y las cadenas de ∧, ∨ o ↔.
  // Las cadenas de → se dejan sin paréntesis, como en el libro (§1.1.1).

  function necesita(padre, hijo, lado) {
    if (!(hijo.op in PREC)) return false;
    const p = PREC[padre], h = PREC[hijo.op];
    if (h < p) return true;
    if ((padre === 'and' && hijo.op === 'or') || (padre === 'or' && hijo.op === 'and')) return true;
    if (h === p) return lado === 'izq' || padre !== 'imp';
    return false;
  }

  // Con «todos», cada miembro binario de una conectiva binaria va entre paréntesis,
  // como en las tablas del tema 2: (p ∨ q) → (p ∧ q).
  function imprimir(f, sim, todos) {
    switch (f.op) {
      case 'var': return f.nombre;
      case 'bot': return sim.bot;
      case 'not': {
        const s = imprimir(f.a, sim, todos);
        return sim.not + (f.a.op in PREC ? '(' + s + ')' : s);
      }
      default: {
        let a = imprimir(f.a, sim, todos), b = imprimir(f.b, sim, todos);
        if (todos ? f.a.op in PREC : necesita(f.op, f.a, 'izq')) a = '(' + a + ')';
        if (todos ? f.b.op in PREC : necesita(f.op, f.b, 'der')) b = '(' + b + ')';
        return a + ' ' + sim[f.op] + ' ' + b;
      }
    }
  }

  const texto = (f) => imprimir(f, Object.assign({ bot: '⊥' }, SIMBOLO));
  const textoExplicito = (f) => imprimir(f, Object.assign({ bot: '⊥' }, SIMBOLO), true);

  // Clave canónica, con todos los paréntesis: sirve para comparar fórmulas.
  function clave(f) {
    switch (f.op) {
      case 'var': return f.nombre;
      case 'bot': return '#';
      case 'not': return '~' + clave(f.a);
      default: return '(' + clave(f.a) + ASCII[f.op] + clave(f.b) + ')';
    }
  }
  const iguales = (f, g) => clave(f) === clave(g);

  // ---- Semántica y utilidades --------------------------------------------------

  function evalua(f, v) {
    switch (f.op) {
      case 'var': return v[f.nombre] ? 1 : 0;
      case 'bot': return 0;
      case 'not': return 1 - evalua(f.a, v);
      case 'and': return evalua(f.a, v) & evalua(f.b, v);
      case 'or': return evalua(f.a, v) | evalua(f.b, v);
      case 'imp': return (1 - evalua(f.a, v)) | evalua(f.b, v);
      case 'iff': return evalua(f.a, v) === evalua(f.b, v) ? 1 : 0;
    }
    throw new Error('Fórmula mal construida');
  }

  // Variables en orden alfabético (P, Q, R…), que es el orden de la tabla.
  function variables(f) {
    const s = new Set();
    (function rec(g) {
      if (g.op === 'var') s.add(g.nombre);
      else if (g.op === 'not') rec(g.a);
      else if (g.op !== 'bot') { rec(g.a); rec(g.b); }
    })(f);
    return [...s].sort();
  }

  function conectivas(f) {
    if (f.op === 'var' || f.op === 'bot') return 0;
    if (f.op === 'not') return 1 + conectivas(f.a);
    return 1 + conectivas(f.a) + conectivas(f.b);
  }

  // Subfórmulas no atómicas, sin repetir, en el orden en que se construyen.
  function subformulas(f) {
    const vistas = new Map();
    (function rec(g) {
      if (g.op === 'var' || g.op === 'bot') return;
      if (g.op === 'not') rec(g.a); else { rec(g.a); rec(g.b); }
      if (!vistas.has(clave(g))) vistas.set(clave(g), g);
    })(f);
    return [...vistas.values()];
  }

  // Las 2^n interpretaciones en el orden del libro: la primera variable es la que
  // cambia más despacio, y cada una toma primero el valor 1.
  function interpretaciones(vars) {
    const n = vars.length, res = [];
    for (let i = 0; i < (1 << n); i++) {
      const v = {};
      vars.forEach((x, j) => { v[x] = ((i >> (n - 1 - j)) & 1) ? 0 : 1; });
      res.push(v);
    }
    return res;
  }

  // A^v: A si v(A) = 1 y ¬A si v(A) = 0.
  const relativa = (f, v) => (evalua(f, v) ? f : No(f));

  const API = {
    SIMBOLO, ASCII, BOT, Var, No, Bin, ErrorSintaxis,
    analizar, texto, textoExplicito, clave, iguales, evalua, variables,
    conectivas, subformulas, interpretaciones, relativa,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.Formulas = API;
})(typeof window !== 'undefined' ? window : globalThis);
