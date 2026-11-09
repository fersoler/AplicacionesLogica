// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Ejemplos de la prueba de Kalmár: fórmula (con los símbolos del libro o del teclado) y nombre.
// El contenido es JSON (véase comun/js/datos.js).
Datos.registrar("kalmar", {
  "ejemplos": [
    {
      "formula": "(p → q) ∨ (q → p)",
      "nombre": "Linealidad"
    },
    {
      "formula": "p ∨ ¬p",
      "nombre": "Tercero excluido"
    },
    {
      "formula": "(p → q) → (¬q → ¬p)",
      "nombre": "Contraposición"
    },
    {
      "formula": "p ∧ (q ∨ r) → (p ∧ q) ∨ (p ∧ r)",
      "nombre": "Distributividad"
    },
    {
      "formula": "((p → q) → p) → p",
      "nombre": "Peirce"
    },
    {
      "formula": "(p ∨ q) → ¬p",
      "nombre": "No es tautología"
    },
    {
      "formula": "p ∧ ¬p",
      "nombre": "Contradicción"
    }
  ]
});
