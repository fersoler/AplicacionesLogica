// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Ejemplos de los tableaux. modo: consecuencia | validez | satisfacibilidad | equivalencia;
// lista: premisas o fórmulas del conjunto; f1: conclusión, fórmula o A; f2: B (equivalencia).
// El contenido es JSON (véase comun/js/datos.js).
Datos.registrar("tableaux", {
  "ejemplos": [
    {
      "nombre": "Silogismo disyuntivo (§6.3.2)",
      "modo": "consecuencia",
      "lista": [
        "(p ∨ q) ∧ ¬p"
      ],
      "f1": "q"
    },
    {
      "nombre": "Afirmación del consecuente",
      "modo": "consecuencia",
      "lista": [
        "p → q",
        "q"
      ],
      "f1": "p"
    },
    {
      "nombre": "Un conjunto satisfacible",
      "modo": "satisfacibilidad",
      "lista": [
        "p ∨ q",
        "p → r",
        "¬r"
      ]
    },
    {
      "nombre": "Contraposición",
      "modo": "validez",
      "f1": "(p → q) → (¬q → ¬p)"
    },
    {
      "nombre": "De Morgan",
      "modo": "equivalencia",
      "f1": "¬(p ∧ q)",
      "f2": "¬p ∨ ¬q"
    },
    {
      "nombre": "Ejemplo 1 de §6.6 (válido)",
      "modo": "consecuencia",
      "lista": [
        "∀x (P(x) → Q(x))",
        "∃x P(x)"
      ],
      "f1": "∃x Q(x)"
    },
    {
      "nombre": "Ejemplo 2 de §6.6 (inválido)",
      "modo": "consecuencia",
      "lista": [
        "∃x P(x)",
        "∃x Q(x)"
      ],
      "f1": "∃x (P(x) ∧ Q(x))"
    },
    {
      "nombre": "Barbara",
      "modo": "consecuencia",
      "lista": [
        "∀x (M(x) → P(x))",
        "∀x (S(x) → M(x))"
      ],
      "f1": "∀x (S(x) → P(x))"
    },
    {
      "nombre": "Darapti sin importación existencial (§5.4)",
      "modo": "consecuencia",
      "lista": [
        "∀x (M(x) → P(x))",
        "∀x (M(x) → S(x))"
      ],
      "f1": "∃x (S(x) ∧ P(x))"
    },
    {
      "nombre": "Paradoja del bebedor",
      "modo": "validez",
      "f1": "∃x (P(x) → ∀y P(y))"
    },
    {
      "nombre": "Cuantificadores en otro orden",
      "modo": "consecuencia",
      "lista": [
        "∀y ∃x R(x, y)"
      ],
      "f1": "∃x ∀y R(x, y)"
    },
    {
      "nombre": "Rama infinita (§6.9)",
      "modo": "satisfacibilidad",
      "lista": [
        "∀x ∃y R(x, y)",
        "∀x ¬R(x, x)"
      ]
    }
  ]
});
