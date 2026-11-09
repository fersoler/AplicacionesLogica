// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Pruebas del módulo de primer orden y del mundo de Tarski.
// Uso: node pruebas/mundo.js
'use strict';
const PO = require('../comun/js/primerorden.js');
const W = require('../mundo/js/mundo.js');
let fallos = 0, pruebas = 0;
const ok = (cond, msj) => { pruebas++; if (!cond) { fallos++; console.log('FALLO:', msj); } };

// 1. Análisis e impresión: imprimir y volver a analizar da la misma fórmula.
const textos = [...W.EJEMPLOS.map((e) => e[0]), ...W.RETOS.flatMap((r) => [...r.premisas, r.conclusion]),
  ...W.FORMALIZAR.map((e) => e.solucion), 'Ax (Tri(x) -> Peque(x))', 'AxEy (IzqDe(x,y) | x = y)', '~(a = b) <-> a != b',
  'forall x exists y Adyacente(x, y)', '∀x ∀y ∀z (IzqDe(x, y) ∧ IzqDe(y, z) → IzqDe(x, z))', 'A(a) -> B(b) -> C(c)'];
for (const s of textos) {
  try {
    const f = PO.analizar(s);
    const g = PO.analizar(PO.texto(f));
    ok(PO.clave(f) === PO.clave(g), `ida y vuelta: ${s} -> ${PO.texto(f)}`);
  } catch (e) { ok(false, `${s}: ${e.message}`); }
}
ok(PO.texto(PO.analizar('A(a) -> B(b) -> C(c)')) === 'A(a) → B(b) → C(c)', 'agrupación por la derecha');
ok(PO.analizar('A(a) -> B(b) -> C(c)').b.op === 'imp', '→ por la derecha');
ok(PO.texto(PO.analizar('~(a=b)')) === 'a ≠ b', 'a ≠ b');
// Errores de sintaxis
for (const [s, trozo] of [['∀a Rojo(a)', 'variable'], ['Rojo(x', 'paréntesis'], ['Rojo x', 'paréntesis'], ['a', 'sola'], ['Rojo(ab)', 'una sola letra'], ['∀x', 'incompleta']]) {
  try { PO.analizar(s); ok(false, `debería fallar: ${s}`); } catch (e) { ok(e.message.includes(trozo), `${s}: ${e.message}`); }
}
// Alcance del cuantificador
const mal = PO.analizar('∀x Triángulo(x) → Rojo(x)');
ok([...PO.libres(mal)].join() === 'x' && PO.texto(PO.atomosConLibres(mal)[0].atomo) === 'Rojo(x)', 'variable libre fuera del alcance');

// 2. Vocabulario
const todas = W.estructura(W.mundoAleatorio(4, new Set('abcdefghijklmnopqr'.split('')), W.azar(3)));
for (const s of textos.slice(0, -1)) ok(PO.comprobarVocabulario(PO.analizar(s), todas).length === 0, `vocabulario: ${s}`);
ok(PO.comprobarVocabulario(PO.analizar('Rojo(a, b)'), todas)[0].includes('1 argumento'), 'aridad');
ok(PO.comprobarVocabulario(PO.analizar('Morado(a)'), todas)[0].includes('diccionario'), 'predicado desconocido');
ok(PO.comprobarVocabulario(PO.analizar('Rojo(a)'), W.estructura([]))[0].includes('no nombra'), 'constante sin denotación');

// 3. Leyes semánticas en mundos al azar
const leyes = ['∀x Rojo(x) ↔ ¬∃x ¬Rojo(x)', '∀x ∀y (IzqDe(x, y) ↔ DerDe(y, x))', '∀x ∀y (AdelanteDe(x, y) ↔ AtrasDe(y, x))',
  '∀x ¬Adyacente(x, x)', '∀x ∀y (Adyacente(x, y) → Adyacente(y, x))', '∀x (Triángulo(x) ∨ Cuadrado(x) ∨ Círculo(x))',
  '∀x ∀y (x = y → MismaFila(x, y))', '∀x ∀y ∀z (IzqDe(x, y) ∧ IzqDe(y, z) → IzqDe(x, z))', '∃x ∀y (x = y) ∨ ∃x ∃y x ≠ y',
  '∃x ∀y Adyacente(x, y) → ⊥'].map(PO.analizar);
const rnd = W.azar(99);
for (let i = 0; i < 3000; i++) {
  const M = W.estructura(W.mundoAleatorio(1 + (i % 6), new Set(), rnd));
  for (const f of leyes) if (!PO.satisface(f, M)) { ok(false, 'ley: ' + PO.texto(f)); break; }
}
pruebas++;

// 4. Retos: los no válidos tienen contramodelo; los válidos, no.
for (const r of W.RETOS) {
  const ps = r.premisas.map(PO.analizar), c = PO.analizar(r.conclusion);
  const cm = W.buscarContramodelo(ps, c);
  if (r.valido) ok(cm === null, `reto válido con contramodelo: ${r.titulo}`);
  else {
    ok(cm !== null, `reto sin contramodelo: ${r.titulo}`);
    if (cm) { const M = W.estructura(cm); ok(ps.every((p) => PO.satisface(p, M)) && !PO.satisface(c, M), 'contramodelo falso'); }
  }
}

// 5. Formalización: se detectan errores típicos y se aceptan formulaciones equivalentes.
const sol = (i) => PO.analizar(W.FORMALIZAR[i].solucion);
const errores = [[0, '∀x (Triángulo(x) ∧ Rojo(x))'], [1, '∃x (Cuadrado(x) → Grande(x))'], [2, '¬∀x (Círculo(x) → Verde(x))'],
  [3, '∀x (Cuadrado(x) → ¬Azul(x))'], [4, '∀x (Triángulo(x) → Pequeño(x))'], [5, '∀x (Cuadrado(x) ∧ Grande(x) ∧ Azul(x))'],
  [6, '∃x (Círculo(x) ∧ IzqDe(a, x))'], [7, '∀x (Cuadrado(x) → ∃y (Triángulo(y) ∧ IzqDe(x, y)))'], [9, '∀x ∀y (Grande(x) ∧ Grande(y) → Adyacente(x, y))'],
  [10, '∃x ∃y (Rojo(x) ∧ Rojo(y))'], [11, '∃x Círculo(x)'], [12, 'Azul(b)']];
for (const [i, s] of errores) {
  const d = W.buscarDiferencia(PO.analizar(s), sol(i));
  ok(d.piezas !== null, `no detecta el error en ${W.FORMALIZAR[i].frase}: ${s}`);
}
const equivalentes = [[7, '∃y ∀x (Cuadrado(x) → Triángulo(y) ∧ IzqDe(y, x))'], [0, '¬∃x (Triángulo(x) ∧ ¬Rojo(x))'], [2, '¬∃x (Círculo(x) ∧ Verde(x))'], [3, '∃x (Cuadrado(x) ∧ ¬Azul(x))'],
  [5, '∀x (Cuadrado(x) → (Grande(x) → Azul(x)))'], [11, '∃x ∀y (Círculo(y) ↔ y = x)'], [12, '∀x (Azul(x) ↔ x = b)']];
for (const [i, s] of equivalentes) {
  const d = W.buscarDiferencia(PO.analizar(s), sol(i));
  ok(d.piezas === null, `rechaza una formulación equivalente en ${W.FORMALIZAR[i].frase}: ${s}`);
}

// 6. Codificación del mundo
const m = W.mundoAleatorio(6, new Set(['a', 'b', 'c']), W.azar(5));
ok(W.codificar(W.decodificar(W.codificar(m))) === W.codificar(m), 'codificación');

console.log(`Pruebas: ${pruebas}. Fallos: ${fallos}.`);
process.exit(fallos ? 1 : 0);
