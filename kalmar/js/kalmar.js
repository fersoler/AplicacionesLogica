// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// La prueba de completud de Kalmár, tal como la presentan los Apuntes de Lógica
// (tema 3): el lema de Kalmár para cada fila de la tabla de verdad y el colapso de
// premisas con LEM, eliminando primero la última variable.
//
// Una derivación se construye como una lista de objetos línea que se citan entre sí:
//   { f, prof, tipo: 'premisa' | 'hipotesis' | 'paso', regla, citas, origen, nota }
// donde cada cita es una línea o una caja {desde, hasta}. numerar() la pasa al
// formato numerado del verificador.
// Depende de formulas.js.
(function (raiz) {
  'use strict';
  const F = (typeof module !== 'undefined' && module.exports) ? require('../../comun/js/formulas.js') : raiz.Formulas;
  const { Var, No, BOT, clave, evalua, texto, relativa, interpretaciones, variables } = F;

  class Derivacion {
    constructor() { this.lineas = []; this.premisas = {}; this.conclusion = null; }
    nueva(datos) { const l = Object.assign({ citas: [] }, datos); this.lineas.push(l); return l; }
    premisa(f, variable) {
      const l = this.nueva({ f, prof: 0, tipo: 'premisa', origen: 'premisa' });
      this.premisas[variable] = l;
      return l;
    }
    get ultima() { return this.lineas[this.lineas.length - 1]; }
  }
  const caja = (desde, hasta) => ({ desde, hasta });

  // Formato numerado: citas como números de línea o pares [desde, hasta].
  function numerar(d) {
    const num = new Map(d.lineas.map((l, i) => [l, i + 1]));
    return d.lineas.map((l) => ({
      prof: l.prof, tipo: l.tipo, f: l.f, regla: l.regla,
      citas: l.citas.map((c) => (c.desde ? [num.get(c.desde), num.get(c.hasta)] : num.get(c))),
      origen: l.origen, nota: l.nota, varEliminada: l.varEliminada,
    }));
  }

  // ---- Lema de Kalmár: p1^v, …, pn^v ⊢ A^v ----------------------------------------
  // Sigue al pie de la letra los casos del libro (§3.3.2 y ejercicio 3.6). Las
  // derivaciones de las subfórmulas van en el nivel principal y se reutilizan si
  // una subfórmula se repite.

  function derivacionFila(A, vars, v, fila) {
    const D = new Derivacion();
    const memo = new Map();
    vars.forEach((x) => {
      const p = D.premisa(relativa(Var(x), v), x);
      memo.set(clave(p.f), p);
    });
    const val = (B) => evalua(B, v);
    const paso = (f, prof, regla, citas, nota) => D.nueva({ f, prof, tipo: 'paso', regla, citas, origen: fila, nota });
    const hip = (f, prof) => D.nueva({ f, prof, tipo: 'hipotesis', origen: fila });
    const sv = (B) => texto(B);

    function der(B) {
      const k = clave(relativa(B, v));
      if (memo.has(k)) return memo.get(k);
      let l;
      const a = B.a, b = B.b;
      switch (B.op) {
        case 'bot': {
          const h = hip(BOT, 1);
          l = paso(No(BOT), 0, '¬I', [caja(h, h)], 'Caso base: ⊥ es falsa, y ⊥^v = ¬⊥.');
          break;
        }
        case 'not': {
          if (val(a)) {
            const c = der(a);
            const h = hip(No(a), 1);
            const f = paso(BOT, 1, '¬E', [h, c]);
            l = paso(No(B), 0, '¬I', [caja(h, f)], `Caso de la negación, con v(${sv(a)}) = 1.`);
          } else {
            l = der(a); // a^v = ¬a, que es justamente B^v
          }
          break;
        }
        case 'imp': {
          if (!val(a)) {
            const na = der(a);
            const h = hip(a, 1);
            const f = paso(BOT, 1, '¬E', [na, h]);
            const x = paso(b, 1, 'X', [f]);
            l = paso(B, 0, '→I', [caja(h, x)], `Caso del condicional, subcaso 1: v(${sv(a)}) = 0.`);
          } else if (val(b)) {
            const cb = der(b);
            const h = hip(a, 1);
            const r = paso(b, 1, 'R', [cb]);
            l = paso(B, 0, '→I', [caja(h, r)], `Caso del condicional, subcaso 2: v(${sv(b)}) = 1.`);
          } else {
            const ca = der(a), nb = der(b);
            const h = hip(B, 1);
            const e = paso(b, 1, '→E', [h, ca]);
            const f = paso(BOT, 1, '¬E', [nb, e]);
            l = paso(No(B), 0, '¬I', [caja(h, f)], `Caso del condicional, subcaso 3: v(${sv(a)}) = 1 y v(${sv(b)}) = 0.`);
          }
          break;
        }
        case 'or': {
          if (val(a)) {
            l = paso(B, 0, '∨I', [der(a)], `Caso de la disyunción, subcaso 1: v(${sv(a)}) = 1.`);
          } else if (val(b)) {
            l = paso(B, 0, '∨I', [der(b)], `Caso de la disyunción, subcaso 2: v(${sv(a)}) = 0 y v(${sv(b)}) = 1.`);
          } else {
            const na = der(a), nb = der(b);
            const h = hip(B, 1);
            const h1 = hip(a, 2);
            const f1 = paso(BOT, 2, '¬E', [na, h1]);
            const h2 = hip(b, 2);
            const f2 = paso(BOT, 2, '¬E', [nb, h2]);
            const f = paso(BOT, 1, '∨E', [h, caja(h1, f1), caja(h2, f2)]);
            l = paso(No(B), 0, '¬I', [caja(h, f)], `Caso de la disyunción, subcaso 3: v(${sv(a)}) = 0 y v(${sv(b)}) = 0.`);
          }
          break;
        }
        case 'and': {
          if (val(a) && val(b)) {
            const ca = der(a), cb = der(b);
            l = paso(B, 0, '∧I', [ca, cb], `Caso de la conjunción: v(${sv(a)}) = v(${sv(b)}) = 1.`);
          } else {
            const falsa = val(a) ? b : a;
            const nf = der(falsa);
            const h = hip(B, 1);
            const e = paso(falsa, 1, '∧E', [h]);
            const f = paso(BOT, 1, '¬E', [nf, e]);
            l = paso(No(B), 0, '¬I', [caja(h, f)], `Caso de la conjunción: v(${sv(falsa)}) = 0.`);
          }
          break;
        }
        case 'iff': {
          const va = val(a), vb = val(b);
          if (va && vb) {
            const ca = der(a), cb = der(b);
            const h1 = hip(a, 1);
            const r1 = paso(b, 1, 'R', [cb]);
            const h2 = hip(b, 1);
            const r2 = paso(a, 1, 'R', [ca]);
            l = paso(B, 0, '↔I', [caja(h1, r1), caja(h2, r2)], `Caso del bicondicional: v(${sv(a)}) = v(${sv(b)}) = 1.`);
          } else if (!va && !vb) {
            const na = der(a), nb = der(b);
            const h1 = hip(a, 1);
            const f1 = paso(BOT, 1, '¬E', [na, h1]);
            const x1 = paso(b, 1, 'X', [f1]);
            const h2 = hip(b, 1);
            const f2 = paso(BOT, 1, '¬E', [nb, h2]);
            const x2 = paso(a, 1, 'X', [f2]);
            l = paso(B, 0, '↔I', [caja(h1, x1), caja(h2, x2)], `Caso del bicondicional: v(${sv(a)}) = v(${sv(b)}) = 0.`);
          } else {
            // Uno verdadero y otro falso: de B ↔ C y el verdadero se obtiene el falso.
            const pa = der(a), pb = der(b);
            const verdadera = va ? pa : pb, negada = va ? pb : pa, falsa = va ? b : a;
            const h = hip(B, 1);
            const e = paso(falsa, 1, '↔E', [h, verdadera]);
            const f = paso(BOT, 1, '¬E', [negada, e]);
            l = paso(No(B), 0, '¬I', [caja(h, f)], `Caso del bicondicional: v(${sv(a)}) = ${va}, v(${sv(b)}) = ${vb}.`);
          }
          break;
        }
        default:
          throw new Error('Variable fuera de la lista de premisas: ' + texto(B));
      }
      memo.set(k, l);
      return l;
    }

    D.conclusion = der(A);
    D.fila = fila;
    D.v = v;
    return D;
  }

  // ---- Colapso de premisas -----------------------------------------------------
  // Une dos derivaciones con las mismas premisas salvo la de la variable x (x en la
  // izquierda, ¬x en la derecha) y la misma conclusión: cada una pasa a una caja
  // cuya hipótesis es su premisa x o ¬x, y LEM descarga las dos hipótesis.

  function incrustar(D, Q, x, premisasNuevas) {
    const mapa = new Map();
    const h = D.nueva({ f: Q.premisas[x].f, prof: 1, tipo: 'hipotesis', origen: 'hipotesis', varEliminada: x });
    mapa.set(Q.premisas[x], h);
    Object.keys(Q.premisas).forEach((y) => { if (y !== x) mapa.set(Q.premisas[y], premisasNuevas[y]); });
    Q.lineas.forEach((l) => {
      if (l.tipo === 'premisa') return;
      const citas = l.citas.map((c) => (c.desde ? caja(mapa.get(c.desde), mapa.get(c.hasta)) : mapa.get(c)));
      mapa.set(l, D.nueva(Object.assign({}, l, { prof: l.prof + 1, citas })));
    });
    let fin = mapa.get(Q.conclusion);
    if (fin !== D.ultima) {
      // La conclusión es una premisa exterior (o una línea anterior): se reitera
      // para que la caja termine en ella.
      fin = D.nueva({ f: Q.conclusion.f, prof: 1, tipo: 'paso', regla: 'R', citas: [fin],
        origen: Q.fila !== undefined ? Q.fila : 'lem', nota: 'Se reitera para que la caja termine en la conclusión.' });
    }
    return { h, fin };
  }

  function unir(izq, der, x, vars) {
    const D = new Derivacion();
    const premisasNuevas = {};
    vars.forEach((y) => { if (y !== x && izq.premisas[y]) premisasNuevas[y] = D.premisa(izq.premisas[y].f, y); });
    const ci = incrustar(D, izq, x, premisasNuevas);
    const cd = incrustar(D, der, x, premisasNuevas);
    D.conclusion = D.nueva({ f: izq.conclusion.f, prof: 0, tipo: 'paso', regla: 'LEM',
      citas: [caja(ci.h, ci.fin), caja(cd.h, cd.fin)], origen: 'lem',
      nota: `Se elimina ${x}: LEM descarga las hipótesis ${x} y ¬${x}.` });
    return D;
  }

  // Análisis completo de una fórmula: tabla, derivaciones de las filas y colapso.
  function analizarFormula(A) {
    const vars = variables(A);
    const n = vars.length;
    const vs = interpretaciones(vars);
    const filas = vs.map((v, i) => {
      const d = derivacionFila(A, vars, v, i);
      return { indice: i, v, valor: evalua(A, v), Av: relativa(A, v), derivacion: d };
    });

    // Niveles del colapso: nivel 0 = filas; en el nivel k se elimina vars[n - k].
    const niveles = [filas.map((f) => ({
      nivel: 0, indice: f.indice, estado: 'fila', derivacion: f.derivacion,
      conclusion: f.Av, filas: [f.indice], asignacion: f.v,
    }))];
    const pasos = [];
    for (let k = 1; k <= n; k++) {
      const x = vars[n - k];
      const previo = niveles[k - 1];
      const actual = [];
      for (let i = 0; i < previo.length / 2; i++) {
        const izq = previo[2 * i], der = previo[2 * i + 1];
        const asignacion = {};
        vars.slice(0, n - k).forEach((y) => { asignacion[y] = izq.asignacion[y]; });
        const nodo = { nivel: k, indice: i, variable: x, hijos: [izq, der], filas: izq.filas.concat(der.filas), asignacion };
        const disponibles = izq.derivacion && der.derivacion;
        if (!disponibles) {
          nodo.estado = 'imposible';
          nodo.motivo = 'Falta la derivación de alguna de las dos ramas, porque su colapso se bloqueó antes.';
        } else if (clave(izq.conclusion) !== clave(der.conclusion)) {
          nodo.estado = 'bloqueado';
          nodo.motivo = `Las dos derivaciones no terminan en la misma fórmula (${texto(izq.conclusion)} y ${texto(der.conclusion)}): LEM exige la misma conclusión en las dos cajas.`;
        } else {
          nodo.estado = 'unido';
          nodo.derivacion = unir(izq.derivacion, der.derivacion, x, vars);
          nodo.conclusion = izq.conclusion;
        }
        actual.push(nodo);
        pasos.push(nodo);
      }
      niveles.push(actual);
    }
    const raizNodo = niveles[n][0];
    const tipo = filas.every((f) => f.valor) ? 'tautologia' : filas.every((f) => !f.valor) ? 'contradiccion' : 'contingente';
    return { A, vars, filas, niveles, pasos, raiz: raizNodo, tipo };
  }

  const API = { derivacionFila, unir, analizarFormula, numerar, Derivacion };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.Kalmar = API;
})(typeof window !== 'undefined' ? window : globalThis);
