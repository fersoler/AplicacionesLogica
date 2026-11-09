// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Ejemplos de la pestaña «Explorar una fórmula»: fórmula y nombre.
// El contenido es JSON (véase comun/js/datos.js).
Datos.registrar("sintaxis", {
  "ejemplos": [
    {
      "formula": "(p ∧ q) → r",
      "nombre": "El ejemplo de §1.1.1"
    },
    {
      "formula": "¬p ∧ q → r",
      "nombre": "Precedencia de ¬, ∧ y →"
    },
    {
      "formula": "p → q ↔ ¬q → ¬p",
      "nombre": "El bicondicional es la más débil"
    },
    {
      "formula": "p → q → r",
      "nombre": "Agrupación por la derecha"
    },
    {
      "formula": "¬(p ∨ q) ∧ r",
      "nombre": "Alcance de la negación"
    },
    {
      "formula": "P(x) ∧ ∀x Q(x)",
      "nombre": "Una variable libre y ligada (§4.2.1)"
    },
    {
      "formula": "∀x (P(x) → ∃x Q(x))",
      "nombre": "Cuantificadores anidados sobre la misma variable"
    },
    {
      "formula": "∀x P(x) → Q(x)",
      "nombre": "Alcance de un cuantificador"
    },
    {
      "formula": "∀x ∃y R(x, y) ∧ P(y)",
      "nombre": "Una y libre fuera del alcance"
    },
    {
      "formula": "R(x, c) ∧ ∀x P(x)",
      "nombre": "Sustitución (§4.2.3)"
    }
  ]
});
