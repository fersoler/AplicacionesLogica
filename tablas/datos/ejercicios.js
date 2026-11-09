// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Ejemplos y frases de la aplicación de tablas de verdad.
// ejemplosTabla: nombre y fórmulas; ejemplosConsecuencia: nombre, premisas y conclusión;
// frases: frase, diccionario (letra: enunciado), solución y errores previstos (fórmula y comentario).
// El contenido es JSON (véase comun/js/datos.js).
Datos.registrar("tablas", {
  "ejemplosTabla": [
    {
      "nombre": "Silogismo hipotético (§2.3)",
      "formulas": [
        "((p → q) ∧ (q → r)) → (p → r)"
      ]
    },
    {
      "nombre": "Una fórmula contingente (§2.3)",
      "formulas": [
        "(p ∨ q) → (p ∧ q)"
      ]
    },
    {
      "nombre": "Tercero excluido",
      "formulas": [
        "p ∨ ¬p"
      ]
    },
    {
      "nombre": "Una contradicción",
      "formulas": [
        "p ↔ ¬p"
      ]
    },
    {
      "nombre": "El ejemplo de §2.2",
      "formulas": [
        "(p ∧ ¬q) → (q ∨ ¬r)"
      ]
    },
    {
      "nombre": "Paradoja del condicional (§2.2.2)",
      "formulas": [
        "(p → q) ∨ (q → p)"
      ]
    },
    {
      "nombre": "De Morgan (§2.4.1)",
      "formulas": [
        "¬(p ∧ q)",
        "¬p ∨ ¬q"
      ]
    },
    {
      "nombre": "Definición del condicional (§2.4.1)",
      "formulas": [
        "p → q",
        "¬p ∨ q",
        "¬(p ∧ ¬q)"
      ]
    },
    {
      "nombre": "Contraposición (§2.4.1)",
      "formulas": [
        "p → q",
        "¬q → ¬p"
      ]
    },
    {
      "nombre": "Un condicional y su recíproco",
      "formulas": [
        "p → q",
        "q → p"
      ]
    },
    {
      "nombre": "Distributividad (§2.4.1)",
      "formulas": [
        "p ∧ (q ∨ r)",
        "(p ∧ q) ∨ (p ∧ r)"
      ]
    },
    {
      "nombre": "Un conjunto insatisfacible",
      "formulas": [
        "p → q",
        "p",
        "¬q"
      ]
    },
    {
      "nombre": "Un conjunto satisfacible",
      "formulas": [
        "p ∨ q",
        "¬p",
        "q → r"
      ]
    }
  ],
  "ejemplosConsecuencia": [
    {
      "nombre": "Afirmación del consecuente (§2.6.1)",
      "premisas": [
        "p → q",
        "q"
      ],
      "conclusion": "p"
    },
    {
      "nombre": "Modus tollens (§2.6.1)",
      "premisas": [
        "p → q",
        "¬q"
      ],
      "conclusion": "¬p"
    },
    {
      "nombre": "Silogismo hipotético",
      "premisas": [
        "p → q",
        "q → r"
      ],
      "conclusion": "p → r"
    },
    {
      "nombre": "Dilema constructivo",
      "premisas": [
        "p ∨ q",
        "p → r",
        "q → r"
      ],
      "conclusion": "r"
    },
    {
      "nombre": "Condición conjunta y condiciones separadas",
      "premisas": [
        "p ∧ q → r"
      ],
      "conclusion": "(p → r) ∧ (q → r)"
    },
    {
      "nombre": "Paradoja: q ⊨ p → q (§2.2.2)",
      "premisas": [
        "q"
      ],
      "conclusion": "p → q"
    },
    {
      "nombre": "Paradoja: ¬p ⊨ p → q (§2.2.2)",
      "premisas": [
        "¬p"
      ],
      "conclusion": "p → q"
    },
    {
      "nombre": "Sin premisas: ⊨ (p → q) ∨ (q → p)",
      "premisas": [],
      "conclusion": "(p → q) ∨ (q → p)"
    },
    {
      "nombre": "Premisas insatisfacibles",
      "premisas": [
        "p",
        "¬p"
      ],
      "conclusion": "q"
    }
  ],
  "frases": [
    {
      "frase": "Sócrates es sabio, pero no es rico.",
      "diccionario": {
        "s": "Sócrates es sabio",
        "r": "Sócrates es rico"
      },
      "solucion": "s ∧ ¬r",
      "errores": [
        {
          "formula": "s → ¬r",
          "mensaje": "«Pero» se formaliza con ∧: el matiz de contraste no afecta a la verdad del enunciado (§2.5)."
        }
      ]
    },
    {
      "frase": "Ni Platón ni Aristóteles aceptan el atomismo.",
      "diccionario": {
        "p": "Platón acepta el atomismo",
        "a": "Aristóteles acepta el atomismo"
      },
      "solucion": "¬p ∧ ¬a",
      "errores": [
        {
          "formula": "¬(p ∧ a)",
          "mensaje": "Esa fórmula dice que no lo aceptan los dos a la vez, y permite que lo acepte uno de ellos. «Ni… ni» niega cada uno: ¬p ∧ ¬a."
        }
      ]
    },
    {
      "frase": "No es cierto que el alma sea a la vez mortal y material.",
      "diccionario": {
        "m": "el alma es mortal",
        "t": "el alma es material"
      },
      "solucion": "¬(m ∧ t)",
      "errores": [
        {
          "formula": "¬m ∧ ¬t",
          "mensaje": "Esa fórmula dice que el alma no es mortal ni material. La negación afecta a toda la conjunción: ¬(m ∧ t)."
        },
        {
          "formula": "¬m ∧ t",
          "mensaje": "Revisa el alcance de la negación: aquí afecta a toda la conjunción, no solo a «el alma es mortal»."
        }
      ]
    },
    {
      "frase": "Si llueve, el partido se suspende.",
      "diccionario": {
        "l": "llueve",
        "s": "el partido se suspende"
      },
      "solucion": "l → s",
      "errores": [
        {
          "formula": "s → l",
          "mensaje": "Has invertido el condicional: esa fórmula dice «si el partido se suspende, llueve»."
        }
      ]
    },
    {
      "frase": "El partido se suspende solo si llueve.",
      "diccionario": {
        "s": "el partido se suspende",
        "l": "llueve"
      },
      "solucion": "s → l",
      "errores": [
        {
          "formula": "l → s",
          "mensaje": "«Solo si» introduce la condición necesaria: el partido no se suspende sin que llueva. Esa fórmula dice, en cambio, que basta con que llueva para que se suspenda (§2.5)."
        },
        {
          "formula": "s ↔ l",
          "mensaje": "Esa fórmula dice «si y solo si». «Solo si» da una sola de las dos direcciones."
        }
      ]
    },
    {
      "frase": "Aprobar el examen es condición necesaria para aprobar la asignatura.",
      "diccionario": {
        "e": "apruebas el examen",
        "a": "apruebas la asignatura"
      },
      "solucion": "a → e",
      "errores": [
        {
          "formula": "e → a",
          "mensaje": "Esa fórmula hace del examen una condición suficiente. Si es necesaria, no se aprueba la asignatura sin aprobar el examen: a → e."
        }
      ]
    },
    {
      "frase": "Leer los apuntes es condición suficiente para entender el tema.",
      "diccionario": {
        "l": "lees los apuntes",
        "e": "entiendes el tema"
      },
      "solucion": "l → e",
      "errores": [
        {
          "formula": "e → l",
          "mensaje": "Esa fórmula hace de leer los apuntes una condición necesaria. Si es suficiente, basta con leerlos: l → e."
        }
      ]
    },
    {
      "frase": "Iremos al museo a menos que esté cerrado.",
      "diccionario": {
        "m": "vamos al museo",
        "c": "el museo está cerrado"
      },
      "solucion": "¬c → m",
      "errores": [
        {
          "formula": "m ↔ ¬c",
          "mensaje": "Es la lectura fuerte: añade que, si está cerrado, no iremos. Como esa lectura no siempre es la intencionada, la formalización habitual es la débil: ¬c → m, que equivale a m ∨ c (§2.5)."
        },
        {
          "formula": "c → ¬m",
          "mensaje": "Esa fórmula dice que, si está cerrado, no iremos. La frase dice otra cosa: que, si no está cerrado, iremos."
        }
      ]
    },
    {
      "frase": "Un argumento es válido si y solo si no tiene contraejemplos.",
      "diccionario": {
        "a": "el argumento es válido",
        "c": "el argumento tiene contraejemplos"
      },
      "solucion": "a ↔ ¬c",
      "errores": [
        {
          "formula": "a → ¬c",
          "mensaje": "Falta una dirección: «si y solo si» es un bicondicional."
        },
        {
          "formula": "¬c → a",
          "mensaje": "Falta una dirección: «si y solo si» es un bicondicional."
        }
      ]
    },
    {
      "frase": "O bien Descartes tiene razón, o bien la tiene Hume, pero no los dos.",
      "diccionario": {
        "d": "Descartes tiene razón",
        "h": "Hume tiene razón"
      },
      "solucion": "d ↔ ¬h",
      "errores": [
        {
          "formula": "d ∨ h",
          "mensaje": "Esa es la disyunción inclusiva, que admite que los dos tengan razón. Aquí el contexto lo excluye: d ↔ ¬h, o (d ∨ h) ∧ ¬(d ∧ h)."
        }
      ]
    },
    {
      "frase": "Si estudias y no te distraes, aprobarás.",
      "diccionario": {
        "e": "estudias",
        "d": "te distraes",
        "a": "apruebas"
      },
      "solucion": "e ∧ ¬d → a",
      "errores": [
        {
          "formula": "e ∧ (¬d → a)",
          "mensaje": "El condicional abarca las dos condiciones: (e ∧ ¬d) → a. Esa fórmula afirma, además, que estudias."
        }
      ]
    },
    {
      "frase": "No iré a la fiesta si no me invitan.",
      "diccionario": {
        "f": "voy a la fiesta",
        "i": "me invitan"
      },
      "solucion": "¬i → ¬f",
      "errores": [
        {
          "formula": "i → f",
          "mensaje": "Has invertido el condicional: esa fórmula equivale a «si me invitan, iré». La condición es «no me invitan», y la frase solo dice lo que pasa en ese caso."
        }
      ]
    },
    {
      "frase": "Si no llueve, iremos a la playa, y si llueve, iremos al cine.",
      "diccionario": {
        "l": "llueve",
        "p": "vamos a la playa",
        "c": "vamos al cine"
      },
      "solucion": "(¬l → p) ∧ (l → c)",
      "errores": []
    },
    {
      "frase": "Siempre que llueve hace frío, salvo que sea verano.",
      "diccionario": {
        "l": "llueve",
        "f": "hace frío",
        "e": "es verano"
      },
      "solucion": "¬e → (l → f)",
      "errores": [
        {
          "formula": "l → f",
          "mensaje": "Falta la excepción: «salvo que sea verano» equivale a «si no es verano»."
        }
      ]
    }
  ]
});
