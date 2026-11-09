// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Pruebas de la ayuda común (comun/js/ayuda.js): lo que dice tiene que ser cierto.
// Cada forma de teclado de la tabla se lee igual que el símbolo del libro, y los
// ejemplos de las convenciones se agrupan como se explica.
// Uso: node pruebas/ayuda.js
'use strict';
const A = require('../comun/js/ayuda.js');
const F = require('../comun/js/formulas.js');
const PO = require('../comun/js/primerorden.js');

let pruebas = 0, fallos = 0;
function ok(c, m) { pruebas++; if (!c) { fallos++; console.log('FALLO: ' + m); } }

const OPC = { atomos: true, compacta: true };
const igualesPO = (x, y, o) => PO.clave(PO.analizar(x, o)) === PO.clave(PO.analizar(y, o));
const igualesF = (x, y) => F.clave(F.analizar(x)) === F.clave(F.analizar(y));

// 1. La tabla: libro y teclado dicen lo mismo.
for (const [nombre, libro, teclado, rasgo] of A.FILAS) {
  if (rasgo === 'cuant') {
    for (const o of [{}, OPC]) ok(igualesPO(`${libro} P(x)`, `${teclado} P(x)`, o), `${nombre}: ${teclado} no se lee como ${libro}`);
  } else if (rasgo === 'igualdad') {
    ok(igualesPO(libro, teclado, {}), `${nombre}: ${teclado} no se lee como ${libro}`);
  } else {
    const plantilla = nombre === 'negación' ? (s) => `${s}p` : nombre === 'contradicción' ? (s) => `${s} -> p` : (s) => `p ${s} q`;
    ok(igualesF(plantilla(libro), plantilla(teclado)), `${nombre}: ${teclado} no se lee como ${libro} (proposicional)`);
    ok(igualesPO(plantilla(libro), plantilla(teclado), OPC), `${nombre}: ${teclado} no se lee como ${libro} (primer orden)`);
  }
}

// 2. Las convenciones.
ok(igualesF('p → q → r', 'p → (q → r)'), 'las binarias se agrupan por la derecha');
ok(igualesF('¬p ∧ q ∨ r → p ↔ q', '((((¬p) ∧ q) ∨ r) → p) ↔ q'), 'precedencia ¬, ∧, ∨, →, ↔');
ok(igualesPO('∀x P(x) → Q(x)', '(∀x P(x)) → Q(x)', {}), 'el cuantificador afecta a la fórmula más breve');
ok(igualesPO('∀x Triángulo(x) → Rojo(x)', '(∀x Triángulo(x)) → Rojo(x)', {}), 'lo mismo con predicados-palabra');
ok(igualesPO('Rxb', 'R(x, b)', OPC) && igualesPO('Ax(Px -> Qx)', '∀x (P(x) → Q(x))', OPC), 'predicados pegados');
ok(igualesPO('p ∧ P(p)', 'p ∧ P(p)', OPC) && PO.constantes(PO.analizar('p ∧ P(p)', OPC)).has('p'), 'una letra en un argumento es una constante');

// 3. Los textos según los rasgos de cada aplicación.
const t = A.textos(['cuant', 'igualdad', 'palabras']);
ok(!t.filas.some((f) => f[0] === 'contradicción') && t.filas.some((f) => f[0] === 'distinto'), 'filas según los rasgos');
ok(!A.textos(['prop', 'bot']).convenciones.some((c) => c.includes('cuantificadores')), 'sin cuantificadores, no se habla de ellos');
// Las fórmulas marcadas con {…} se leen bien en la aplicación correspondiente.
for (const [rasgos, leer] of [[['prop', 'bot'], (x) => F.analizar(x)], [['prop', 'bot', 'cuant', 'igualdad', 'pegados'], (x) => PO.analizar(x, OPC)], [['cuant', 'igualdad', 'palabras'], (x) => PO.analizar(x)]]) {
  const tt = A.textos(rasgos);
  for (const m of [...tt.letras, ...tt.convenciones].join(' ').matchAll(/\{([^}]*)\}/g)) {
    if (m[1].length < 3 || /^[A-C] /.test(m[1]) || /^Ax$|^Ex$/.test(m[1])) continue; // letras sueltas, esquemas con A, B, C y cuantificadores solos
    let bien = true; try { leer(m[1]); } catch (e) { bien = false; }
    ok(bien, `la fórmula de la ayuda «${m[1]}» no se lee con los rasgos ${rasgos.join(' ')}`);
  }
}

console.log(`Pruebas: ${pruebas}. Fallos: ${fallos}.`);
process.exitCode = fallos ? 1 : 0;
