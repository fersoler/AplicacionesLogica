// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Datos del mundo de Tarski.
// mundoEjemplo: piezas (columna x y fila y de 0 a 5; forma tri | cua | cir; tamano peq | med | gra; color rojo | verde | azul; nombres);
// ejemplos: fórmulas para evaluar; retos: argumentos para buscar contramodelos (valido: true si no lo tienen);
// formalizar: frases con una solución.
// El contenido es JSON (véase comun/js/datos.js).
Datos.registrar("mundo", {
  "mundoEjemplo": [
    {
      "x": 0,
      "y": 0,
      "forma": "cua",
      "color": "rojo",
      "tamano": "gra",
      "nombres": [
        "a"
      ]
    },
    {
      "x": 1,
      "y": 0,
      "forma": "tri",
      "color": "rojo",
      "tamano": "peq",
      "nombres": []
    },
    {
      "x": 3,
      "y": 2,
      "forma": "cir",
      "color": "azul",
      "tamano": "med",
      "nombres": [
        "b"
      ]
    },
    {
      "x": 3,
      "y": 3,
      "forma": "cua",
      "color": "azul",
      "tamano": "gra",
      "nombres": []
    },
    {
      "x": 5,
      "y": 5,
      "forma": "tri",
      "color": "verde",
      "tamano": "peq",
      "nombres": [
        "c"
      ]
    },
    {
      "x": 4,
      "y": 5,
      "forma": "cir",
      "color": "verde",
      "tamano": "gra",
      "nombres": []
    }
  ],
  "ejemplos": [
    {
      "formula": "∀x Rojo(x)",
      "nombre": "Todo es rojo"
    },
    {
      "formula": "∃x (Azul(x) ∧ Grande(x))",
      "nombre": "Hay algo azul y grande"
    },
    {
      "formula": "∀x (Triángulo(x) → Pequeño(x))",
      "nombre": "Todo triángulo es pequeño"
    },
    {
      "formula": "¬∃x (Verde(x) ∧ Cuadrado(x))",
      "nombre": "Nada es verde y cuadrado"
    },
    {
      "formula": "IzqDe(a, b)",
      "nombre": "a está a la izquierda de b"
    },
    {
      "formula": "∃x AtrasDe(c, x)",
      "nombre": "c está más atrás que algo"
    },
    {
      "formula": "∃x ∃y (x ≠ y ∧ MismaForma(x, y))",
      "nombre": "Hay dos objetos con la misma forma"
    },
    {
      "formula": "∀x (Triángulo(x) → ∃y (Cuadrado(y) ∧ MismoColor(x, y)))",
      "nombre": "Cada triángulo tiene el color de algún cuadrado"
    },
    {
      "formula": "∀x ∀y (AdelanteDe(x, y) ↔ AtrasDe(y, x))",
      "nombre": "Adelante y atrás son inversas"
    },
    {
      "formula": "¬∃x Adyacente(x, a)",
      "nombre": "Nada está junto a a"
    },
    {
      "formula": "∃x ∃y (Grande(x) ∧ Grande(y) ∧ x ≠ y)",
      "nombre": "Hay al menos dos objetos grandes"
    },
    {
      "formula": "Rojo(x) ∧ ∃y IzqDe(x, y)",
      "nombre": "Fórmula abierta: x es rojo y tiene algo a su derecha"
    }
  ],
  "retos": [
    {
      "titulo": "Inversión de los cuantificadores",
      "premisas": [
        "∀y ∃x Adyacente(x, y)"
      ],
      "conclusion": "∃x ∀y Adyacente(x, y)",
      "pista": "Que cada objeto tenga algún vecino no obliga a que haya uno que sea vecino de todos."
    },
    {
      "titulo": "Término medio no distribuido",
      "premisas": [
        "∀x (Triángulo(x) → Rojo(x))",
        "∀x (Cuadrado(x) → Rojo(x))"
      ],
      "conclusion": "∀x (Triángulo(x) → Cuadrado(x))",
      "pista": "Basta un triángulo rojo."
    },
    {
      "titulo": "Importación existencial",
      "premisas": [
        "∀x (Triángulo(x) → Rojo(x))"
      ],
      "conclusion": "∃x (Triángulo(x) ∧ Rojo(x))",
      "pista": "Una universal es verdadera si no hay ningún triángulo (§5.4)."
    },
    {
      "titulo": "Dos existenciales no son uno",
      "premisas": [
        "∃x Rojo(x)",
        "∃x Grande(x)"
      ],
      "conclusion": "∃x (Rojo(x) ∧ Grande(x))",
      "pista": "Lo rojo y lo grande pueden ser objetos distintos."
    },
    {
      "titulo": "Distribuir ∀ sobre ∨",
      "premisas": [
        "∀x (Rojo(x) ∨ Azul(x))"
      ],
      "conclusion": "∀x Rojo(x) ∨ ∀x Azul(x)",
      "pista": "Pon objetos de los dos colores."
    },
    {
      "titulo": "Dos nombres, un objeto",
      "premisas": [
        "Grande(a)",
        "Grande(b)"
      ],
      "conclusion": "a ≠ b",
      "pista": "Una misma pieza puede tener dos nombres: escribe «a, b» en sus nombres."
    },
    {
      "titulo": "Contar con la identidad",
      "premisas": [
        "∃x ∃y (Triángulo(x) ∧ Triángulo(y))"
      ],
      "conclusion": "∃x ∃y (Triángulo(x) ∧ Triángulo(y) ∧ x ≠ y)",
      "pista": "Sin x ≠ y, x e y pueden ser el mismo objeto."
    },
    {
      "titulo": "¿Hay contramodelo?",
      "premisas": [
        "∀x (Rojo(x) → Grande(x))",
        "Rojo(a)"
      ],
      "conclusion": "Grande(a)",
      "valido": true,
      "pista": "Intenta construirlo y piensa por qué no lo encuentras: el argumento es válido."
    },
    {
      "titulo": "¿Hay contramodelo?",
      "premisas": [
        "∃x ∀y (Triángulo(y) → IzqDe(x, y))"
      ],
      "conclusion": "∀y (Triángulo(y) → ∃x IzqDe(x, y))",
      "valido": true,
      "pista": "Si algo está a la izquierda de todos los triángulos, cada triángulo tiene algo a su izquierda: es la dirección válida de la inversión de cuantificadores."
    }
  ],
  "formalizar": [
    {
      "frase": "Todo triángulo es rojo.",
      "solucion": "∀x (Triángulo(x) → Rojo(x))"
    },
    {
      "frase": "Algún cuadrado es grande.",
      "solucion": "∃x (Cuadrado(x) ∧ Grande(x))"
    },
    {
      "frase": "Ningún círculo es verde.",
      "solucion": "∀x (Círculo(x) → ¬Verde(x))"
    },
    {
      "frase": "No todos los cuadrados son azules.",
      "solucion": "¬∀x (Cuadrado(x) → Azul(x))"
    },
    {
      "frase": "Solo los triángulos son pequeños.",
      "solucion": "∀x (Pequeño(x) → Triángulo(x))"
    },
    {
      "frase": "Los cuadrados grandes son azules.",
      "solucion": "∀x ((Cuadrado(x) ∧ Grande(x)) → Azul(x))"
    },
    {
      "frase": "a está a la izquierda de todos los círculos.",
      "solucion": "∀x (Círculo(x) → IzqDe(a, x))"
    },
    {
      "frase": "Todo cuadrado tiene a su izquierda algún triángulo.",
      "solucion": "∀x (Cuadrado(x) → ∃y (Triángulo(y) ∧ IzqDe(y, x)))"
    },
    {
      "frase": "Hay un círculo que está más atrás que todos los cuadrados.",
      "solucion": "∃x (Círculo(x) ∧ ∀y (Cuadrado(y) → AtrasDe(x, y)))"
    },
    {
      "frase": "Ningún objeto grande es adyacente a otro objeto grande.",
      "solucion": "∀x ∀y ((Grande(x) ∧ Grande(y)) → ¬Adyacente(x, y))"
    },
    {
      "frase": "Hay al menos dos objetos rojos.",
      "solucion": "∃x ∃y (Rojo(x) ∧ Rojo(y) ∧ x ≠ y)"
    },
    {
      "frase": "Hay exactamente un círculo.",
      "solucion": "∃x (Círculo(x) ∧ ∀y (Círculo(y) → y = x))"
    },
    {
      "frase": "Solo b es azul.",
      "solucion": "Azul(b) ∧ ∀x (Azul(x) → x = b)"
    }
  ]
});
