// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Pruebas automáticas: genera fórmulas, construye las derivaciones de Kalmár y el
// colapso, y comprueba cada derivación con el verificador.
// Uso: node pruebas/kalmar.js [fórmulas aleatorias] [semilla] [conectivas de la prueba exhaustiva]
'use strict';
const F = require('../comun/js/formulas.js');
const V = require('../comun/js/verificador.js');
const K = require('../kalmar/js/kalmar.js');

const ATOMOS = [F.Var('P'), F.Var('Q'), F.Var('R'), F.BOT];
const BIN = ['and', 'or', 'imp', 'iff'];

// Todas las fórmulas con exactamente c conectivas.
const cache = new Map();
function todas(c) {
  if (cache.has(c)) return cache.get(c);
  let res = [];
  if (c === 0) res = ATOMOS.slice();
  else {
    todas(c - 1).forEach((a) => res.push(F.No(a)));
    for (let i = 0; i <= c - 1; i++) {
      for (const a of todas(i)) for (const b of todas(c - 1 - i)) for (const op of BIN) res.push(F.Bin(op, a, b));
    }
  }
  cache.set(c, res);
  return res;
}

// Generador pseudoaleatorio reproducible.
function azar(semilla) {
  let s = semilla >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}
function aleatoria(c, rnd) {
  if (c === 0) return ATOMOS[Math.floor(rnd() * ATOMOS.length)];
  if (rnd() < 0.25) return F.No(aleatoria(c - 1, rnd));
  const i = Math.floor(rnd() * c);
  return F.Bin(BIN[Math.floor(rnd() * 4)], aleatoria(i, rnd), aleatoria(c - 1 - i, rnd));
}

let formulas = 0, derivaciones = 0, fallos = 0, maxLineas = 0, maxFormula = '';
const tipos = { tautologia: 0, contradiccion: 0, contingente: 0 };

function comprobar(A) {
  formulas++;
  const r = K.analizarFormula(A);
  tipos[r.tipo]++;
  const fallo = (msj) => { fallos++; if (fallos <= 10) console.log('FALLO', F.texto(A), '—', msj); };
  const literales = (asig) => Object.keys(asig).sort().map((x) => F.relativa(F.Var(x), asig));

  // Filas: p1^v, …, pn^v ⊢ A^v
  r.filas.forEach((f) => {
    derivaciones++;
    const res = V.verificarArgumento(K.numerar(f.derivacion), literales(f.v), f.Av);
    if (!res.correcta) fallo(`fila ${f.indice + 1}: ${JSON.stringify(res.errores)}`);
  });
  // Colapso: cada unión es una derivación correcta con una premisa menos.
  r.pasos.forEach((nodo) => {
    const [i, d] = nodo.hijos;
    const iOk = i.derivacion && true, dOk = d.derivacion && true;
    if (nodo.estado === 'unido') {
      derivaciones++;
      const lin = K.numerar(nodo.derivacion);
      if (lin.length > maxLineas) { maxLineas = lin.length; maxFormula = F.texto(A); }
      const res = V.verificarArgumento(lin, literales(nodo.asignacion), nodo.conclusion);
      if (!res.correcta) fallo(`nivel ${nodo.nivel}, nodo ${nodo.indice}: ${JSON.stringify(res.errores)}`);
      if (!(iOk && dOk && F.iguales(i.conclusion, d.conclusion))) fallo('unión indebida');
    } else if (nodo.estado === 'bloqueado') {
      if (!(iOk && dOk) || F.iguales(i.conclusion, d.conclusion)) fallo('bloqueo indebido');
    } else if (iOk && dOk) fallo('nodo imposible con las dos ramas disponibles');
  });
  // Resultado final: tautología ⇒ ⊢ A; contradicción ⇒ ⊢ ¬A; si no, no se llega.
  const raiz = r.raiz;
  const completo = raiz.estado === 'unido' || raiz.estado === 'fila';
  if (r.tipo === 'tautologia' && !(completo && F.iguales(raiz.conclusion, A))) fallo('tautología sin ⊢ A');
  if (r.tipo === 'contradiccion' && !(completo && F.iguales(raiz.conclusion, F.No(A)))) fallo('contradicción sin ⊢ ¬A');
  if (r.tipo === 'contingente' && completo) fallo('contingente que colapsa del todo');
}

const nAleatorias = Number(process.argv[2] || 3000);
const rnd = azar(Number(process.argv[3] || 20261106));
const maxExh = Number(process.argv[4] || 2);
for (let c = 0; c <= maxExh; c++) todas(c).forEach(comprobar);
const exhaustivas = formulas;
for (let i = 0; i < nAleatorias; i++) comprobar(aleatoria(3 + (i % 4), rnd)); // de 3 a 6 conectivas

// Fórmulas de los ejemplos y ejercicios del tema 3.
['P | ~P', '(P -> Q) | (Q -> P)', 'P & (Q | R) -> (P & Q) | (P & R)', '(P | Q) -> ~P',
  '~((P | Q) -> ~P)', 'P & ~P', '(P -> Q) -> (~Q -> ~P)', '((P -> Q) -> P) -> P'].forEach((s) => comprobar(F.analizar(s)));

console.log(`Fórmulas: ${formulas} (${exhaustivas} exhaustivas, hasta ${maxExh} conectivas; ${nAleatorias} aleatorias, de 3 a 6; 8 de ejemplo).`);
console.log(`Tipos: ${JSON.stringify(tipos)}. Derivaciones comprobadas: ${derivaciones}. Fallos: ${fallos}.`);
console.log(`Derivación más larga: ${maxLineas} líneas (${maxFormula}).`);
process.exit(fallos ? 1 : 0);
