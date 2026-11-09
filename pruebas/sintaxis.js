// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Pruebas de la aplicación de sintaxis.
// Uso: node pruebas/sintaxis.js [fórmulas al azar] [semilla]
'use strict';
const PO = require('../comun/js/primerorden.js');
const S = require('../sintaxis/js/sintaxis.js');
let fallos = 0, pruebas = 0;
const ok = (cond, msj) => { pruebas++; if (!cond) { fallos++; console.log('FALLO:', msj); } };
const N = Number(process.argv[2] || 5000);
const rnd = S.azar(Number(process.argv[3] || 1));
const A = S.analizar;
const K = PO.clave;

// 1. Ejemplos del libro.
{
  const f = A('(p ∧ q) → r');
  ok(S.principal(f).simbolo === '→' && S.inmediatas(f).map((g) => S.texto(g)).join(' | ') === 'p ∧ q | r', '§1.1.1: conectiva principal e inmediatas');
  ok(S.texto(f, 'estricto') === '((p ∧ q) → r)', 'notación estricta: ' + S.texto(f, 'estricto'));
  ok(S.texto(f) === 'p ∧ q → r', 'paréntesis mínimos: ' + S.texto(f));
  ok(S.subformulas(f).length === 5, 'subfórmulas de ((p ∧ q) → r)');
  ok(K(A('¬p ∧ q')) === K(A('(¬p) ∧ q')), '§1.1.1: ¬p ∧ q es (¬p) ∧ q');
  ok(K(A('p → q ↔ ¬q → ¬p')) === K(A('(p → q) ↔ (¬q → ¬p)')), '§1.1.1: ↔ es la más débil');
  // §4.2.1: en P(x) ∧ ∀x Q(x) la primera x es libre y la segunda ligada.
  const g = S.piezas(A('P(x) ∧ ∀x Q(x)')).piezas.filter((p) => p.tipo === 'var');
  ok(g.length === 2 && g[0].libre && !g[1].libre, '§4.2.1: P(x) ∧ ∀x Q(x)');
  // En ∀x (P(x) → ∃x Q(x)), ∀x solo liga la x de P(x).
  const h = S.piezas(A('∀x (P(x) → ∃x Q(x))'));
  const vs = h.piezas.filter((p) => p.tipo === 'var');
  ok(vs[0].ligadaPor === 0 && vs[1].ligadaPor !== 0 && h.piezas[vs[1].ligadaPor].texto === '∃x', '§4.2.1: ∃x liga la x de Q(x)');
  // §4.2.3: sustituciones del libro.
  ok(S.texto(S.sustituir(A('P(x) ∧ ∀y R(x, y)'), 'x', 'c')) === 'P(c) ∧ ∀y R(c, y)', '§4.2.3, ejemplo 2');
  ok(S.texto(S.sustituir(A('R(x, c) ∧ ∀x P(x)'), 'x', 'b')) === 'R(b, c) ∧ ∀x P(x)', '§4.2.3, ejemplo 3');
  ok(S.texto(S.sustituirTodas(A('R(x, c) ∧ ∀x P(x)'), 'x', 'b')) === 'R(b, c) ∧ ∀x P(b)', 'sustitución errónea');
  // Lecturas equivocadas típicas
  const l = S.otrasLecturas(A('∀x P(x) → Q(a)'), 8).map((x) => S.texto(x, 'explicito'));
  ok(l.includes('∀x (P(x) → Q(a))'), 'lectura con el alcance amplio del cuantificador: ' + l.join(' ; '));
  const l2 = S.otrasLecturas(A('¬p ∧ q'), 8).map((x) => S.texto(x));
  ok(l2.includes('¬(p ∧ q)'), 'lectura con la negación amplia');
  const t = S.trozos(A('¬p ∧ q → r'));
  ok(t.some((x) => x.texto === 'q → r' && !x.es) && t.some((x) => x.texto === '¬p ∧ q' && x.es), 'trozos: q → r no es subfórmula de ¬p ∧ q → r');
}

// 2. Fórmulas al azar: la impresión por piezas coincide con primerorden.js, releer con
// las convenciones del libro devuelve la misma fórmula y las otras lecturas son distintas.
for (let k = 0; k < N; k++) {
  const e = k % 2 === 0 ? S.formulaPara('principal', 'primer', rnd) : S.formulaPara('agrupacion', 'prop', rnd);
  const g = e && e.f;
  if (!g) { ok(false, 'no se ha podido generar una fórmula'); continue; }
  const s = S.texto(g);
  ok(s === PO.texto(g), `impresión mínima: ${s} / ${PO.texto(g)}`);
  ok(S.texto(g, 'explicito') === PO.texto(g, true), `impresión explícita: ${s}`);
  ok(K(A(S.texto(g, 'estricto'))) === K(g), `la notación estricta se lee igual: ${S.texto(g, 'estricto')}`);
  const sinExt = S.texto(g, 'estricto', false), conExt = S.texto(g, 'estricto');
  ok(K(A(sinExt)) === K(g) && (sinExt === conExt || `(${sinExt})` === conExt), `estricta sin paréntesis exteriores: ${sinExt}`);
  ok(K(A(s)) === K(g), `ida y vuelta: ${s}`);
  let releida;
  try { releida = S.leer(S.unidades(g), { prec: { iff: 1, imp: 2, or: 3, and: 4 }, asoc: 'der' }); } catch (e) { ok(false, `releer ${s}: ${e.message}`); continue; }
  ok(K(releida) === K(g), `releer con las convenciones del libro: ${s}`);
  const otras = S.otrasLecturas(g, 8);
  ok(otras.every((x) => K(x) !== K(g)) && new Set(otras.map(K)).size === otras.length, `otras lecturas distintas: ${s}`);
  // Las otras lecturas usan los mismos símbolos en el mismo orden (salvo paréntesis).
  const sinPar = (x) => S.texto(x).replace(/[()\s]/g, '');
  otras.forEach((x) => ok(sinPar(x) === sinPar(g), `misma secuencia de símbolos: ${S.texto(x)} / ${s}`));
  // Subfórmulas: cada trozo marcado como subfórmula lo es.
  const subs = new Set(S.subformulas(g).map(K));
  S.trozos(g).forEach((x) => ok(x.es === subs.has(K(x.f)), `trozo ${x.texto} de ${s}`));
}
// Ejercicios de primer orden: libres y sustitución.
for (let k = 0; k < N / 5; k++) {
  const e = S.formulaPara('libres', 'primer', rnd);
  if (!e) { ok(false, 'ejercicio de libres'); continue; }
  const libres = new Set(S.piezas(e.f).piezas.filter((p) => p.tipo === 'var' && p.libre).map((p) => p.texto));
  ok([...libres].sort().join() === [...PO.libres(e.f)].sort().join(), `libres: ${S.texto(e.f)}`);
  const s = S.formulaPara('sustitucion', 'primer', rnd);
  if (!s) { ok(false, 'ejercicio de sustitución'); continue; }
  const r = S.sustituir(s.f, s.v, s.c);
  ok(!PO.libres(r).has(s.v), `tras sustituir, ${s.v} ya no está libre: ${S.texto(s.f)}`);
}
['principal', 'agrupacion', 'subformulas'].forEach((t) => ['prop', 'primer'].forEach((n) => {
  for (let k = 0; k < 50; k++) {
    const e = S.formulaPara(t, n, rnd);
    ok(e, `generar ${t} / ${n}`);
    if (e && n === 'primer') ok(!S.vacuo(e.f) && !S.religa(e.f), `fórmula natural: ${S.texto(e.f)}`);
  }
}));
['libres', 'sustitucion'].forEach((t) => { for (let k = 0; k < 50; k++) { const e = S.formulaPara(t, 'primer', rnd); ok(e && !S.vacuo(e.f), `generar ${t} sin cuantificadores vacuos`); } });

console.log(`Pruebas: ${pruebas}. Fallos: ${fallos}.`);
process.exitCode = fallos ? 1 : 0;
