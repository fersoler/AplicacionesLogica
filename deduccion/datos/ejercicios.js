// SPDX-License-Identifier: CC-BY-SA-4.0
// Tomados de: Fernando Soler Toscano, Apuntes de Lógica (Grado en Filosofía, Universidad de Sevilla), CC BY-SA 4.0.
// Ejercicios de deducción natural de los Apuntes de Lógica (temas 1 y 4), sin soluciones.
// Generado a partir del fuente del libro con «node herramientas/ejercicios.js»: si
// cambian los ejercicios del libro, vuelve a generarlo en lugar de editarlo a mano.
// El contenido es JSON (véase comun/js/datos.js).
Datos.registrar("ejercicios-deduccion", {
  "fuente": "Apuntes de Lógica (Grado en Filosofía, Universidad de Sevilla), ejercicios de deducción natural de los temas 1 y 4.",
  "temas": [
    {
      "tema": 1,
      "titulo": "Deducción natural en lógica proposicional",
      "niveles": [
        {
          "titulo": "Nivel 1: reglas directas sin cajas (∧, →E, ∨I)",
          "descripcion": "Objetivo: aplicar reglas básicas de descomposición y composición sin abrir supuestos provisionales.",
          "ejercicios": [
            {
              "numero": "1.1",
              "etiqueta": "e1-1",
              "titulo": "Conmutatividad de la conjunción",
              "enunciado": "",
              "premisas": [
                "p ∧ q"
              ],
              "conclusion": "q ∧ p"
            },
            {
              "numero": "1.2",
              "etiqueta": "e1-2",
              "titulo": "Encadenamiento de modus ponens",
              "enunciado": "",
              "premisas": [
                "p",
                "p → q",
                "q → r"
              ],
              "conclusion": "r"
            },
            {
              "numero": "1.3",
              "etiqueta": "e1-3",
              "titulo": "Asociatividad de la conjunción",
              "enunciado": "",
              "premisas": [
                "p ∧ (q ∧ r)"
              ],
              "conclusion": "(p ∧ q) ∧ r"
            },
            {
              "numero": "1.4",
              "etiqueta": "e1-4",
              "titulo": "",
              "enunciado": "",
              "premisas": [
                "p ∧ q",
                "p → r",
                "q → s"
              ],
              "conclusion": "r ∧ s"
            },
            {
              "numero": "1.5",
              "etiqueta": "e1-5",
              "titulo": "Introducción de la disyunción",
              "enunciado": "",
              "premisas": [
                "p"
              ],
              "conclusion": "(p ∨ q) ∧ (r ∨ p)"
            },
            {
              "numero": "1.6",
              "etiqueta": "e1-6",
              "titulo": "",
              "enunciado": "",
              "premisas": [
                "(p → q) ∧ p",
                "(q → r) ∧ s"
              ],
              "conclusion": "r ∧ s"
            }
          ]
        },
        {
          "titulo": "Nivel 2: cajas simples e introducción del condicional (→I)",
          "descripcion": "Objetivo: abrir una hipótesis provisional para alcanzar una meta, cerrar la caja y justificar con →I a la derecha.",
          "ejercicios": [
            {
              "numero": "1.7",
              "etiqueta": "e1-7",
              "titulo": "Monotonía condicional con conjunción",
              "enunciado": "",
              "premisas": [
                "p → q"
              ],
              "conclusion": "(p ∧ r) → (q ∧ r)",
              "plantilla": [
                {
                  "prof": 0,
                  "tipo": "premisa",
                  "formula": "p → q",
                  "just": "Prem."
                },
                {
                  "prof": 1,
                  "tipo": "hipotesis",
                  "formula": "p ∧ r",
                  "just": "Hip."
                },
                {
                  "prof": 1,
                  "tipo": "paso",
                  "formula": "p",
                  "just": "∧E 2"
                },
                {
                  "prof": 1,
                  "tipo": "paso",
                  "formula": "r",
                  "just": ""
                },
                {
                  "prof": 1,
                  "tipo": "paso",
                  "formula": "q",
                  "just": ""
                },
                {
                  "prof": 1,
                  "tipo": "paso",
                  "formula": "q ∧ r",
                  "just": "∧I 5, 4"
                },
                {
                  "prof": 0,
                  "tipo": "paso",
                  "formula": "(p ∧ r) → (q ∧ r)",
                  "just": "→I 2-6"
                }
              ]
            },
            {
              "numero": "1.8",
              "etiqueta": "e1-8",
              "titulo": "",
              "enunciado": "",
              "premisas": [
                "p"
              ],
              "conclusion": "q → (p ∧ q)"
            },
            {
              "numero": "1.9",
              "etiqueta": "e1-9",
              "titulo": "Distributividad condicional",
              "enunciado": "",
              "premisas": [
                "(p → q) ∧ (p → r)"
              ],
              "conclusion": "p → (q ∧ r)"
            },
            {
              "numero": "1.10",
              "etiqueta": "e1-10",
              "titulo": "Exportación: cajas anidadas",
              "enunciado": "",
              "premisas": [
                "(p ∧ q) → r"
              ],
              "conclusion": "p → (q → r)"
            },
            {
              "numero": "1.11",
              "etiqueta": "e1-11",
              "titulo": "Teorema sin premisas",
              "enunciado": "",
              "premisas": [],
              "conclusion": "p → p"
            },
            {
              "numero": "1.12",
              "etiqueta": "e1-12",
              "titulo": "Verum ex quolibet",
              "enunciado": "",
              "premisas": [],
              "conclusion": "p → (q → p)"
            }
          ]
        },
        {
          "titulo": "Nivel 3: negación, contradicción y razonamiento por casos (¬I, ∨E, DS)",
          "descripcion": "Objetivo: manejar la contradicción (⊥), la introducción de la negación (¬I) y la prueba por casos con dos cajas paralelas.",
          "ejercicios": [
            {
              "numero": "1.13",
              "etiqueta": "e1-13",
              "titulo": "Equivalencia del condicional",
              "enunciado": "",
              "premisas": [
                "p → q"
              ],
              "conclusion": "¬(p ∧ ¬q)",
              "plantilla": [
                {
                  "prof": 0,
                  "tipo": "premisa",
                  "formula": "p → q",
                  "just": "Prem."
                },
                {
                  "prof": 1,
                  "tipo": "hipotesis",
                  "formula": "p ∧ ¬q",
                  "just": "Hip."
                },
                {
                  "prof": 1,
                  "tipo": "paso",
                  "formula": "p",
                  "just": "∧E 2"
                },
                {
                  "prof": 1,
                  "tipo": "paso",
                  "formula": "¬q",
                  "just": "∧E 2"
                },
                {
                  "prof": 1,
                  "tipo": "paso",
                  "formula": "q",
                  "just": "→E 1, 3"
                },
                {
                  "prof": 1,
                  "tipo": "paso",
                  "formula": "⊥",
                  "just": ""
                },
                {
                  "prof": 0,
                  "tipo": "paso",
                  "formula": "¬(p ∧ ¬q)",
                  "just": "¬I 2-6"
                }
              ]
            },
            {
              "numero": "1.14",
              "etiqueta": "e1-14",
              "titulo": "Razonamiento disyuntivo por casos",
              "enunciado": "",
              "premisas": [
                "p ∨ q",
                "p → r"
              ],
              "conclusion": "r ∨ q"
            },
            {
              "numero": "1.15",
              "etiqueta": "e1-15",
              "titulo": "Derivación del silogismo disyuntivo mediante casos y X",
              "enunciado": "",
              "premisas": [
                "p ∨ q",
                "¬p"
              ],
              "conclusion": "q",
              "soloBasicas": true,
              "restriccion": "Según las instrucciones del tema, usa solo reglas básicas."
            },
            {
              "numero": "1.16",
              "etiqueta": "e1-16",
              "titulo": "Esquema de la paradoja del mentiroso",
              "enunciado": "",
              "premisas": [
                "p ↔ ¬p"
              ],
              "conclusion": "⊥"
            },
            {
              "numero": "1.17",
              "etiqueta": "e1-17",
              "titulo": "Conmutatividad de la disyunción",
              "enunciado": "",
              "premisas": [
                "p ∨ q"
              ],
              "conclusion": "q ∨ p"
            },
            {
              "numero": "1.18",
              "etiqueta": "e1-18",
              "titulo": "Ley de De Morgan",
              "enunciado": "",
              "premisas": [
                "¬(p ∨ q)"
              ],
              "conclusion": "¬p ∧ ¬q",
              "prohibidas": [
                "DeM"
              ],
              "restriccion": "Según las instrucciones del tema, no uses DeM."
            },
            {
              "numero": "1.19",
              "etiqueta": "e1-19",
              "titulo": "Principio de explosión",
              "enunciado": "",
              "premisas": [
                "p ∧ ¬p"
              ],
              "conclusion": "q"
            },
            {
              "numero": "1.20",
              "etiqueta": "e1-20",
              "titulo": "",
              "enunciado": "",
              "premisas": [
                "p → (q ∨ r)",
                "¬q"
              ],
              "conclusion": "p → r"
            }
          ]
        },
        {
          "titulo": "Nivel 4: reducción al absurdo clásica (IP) y teoremas avanzados",
          "descripcion": "Objetivo: dominar la prueba indirecta clásica (suponer ¬A para deducir A), la doble negación y los teoremas con supuestos múltiples.",
          "ejercicios": [
            {
              "numero": "1.21",
              "etiqueta": "e1-21",
              "titulo": "Principio de no contradicción",
              "enunciado": "",
              "premisas": [],
              "conclusion": "¬(p ∧ ¬p)"
            },
            {
              "numero": "1.22",
              "etiqueta": "e1-22",
              "titulo": "Principio del tercero excluido",
              "enunciado": "",
              "premisas": [],
              "conclusion": "p ∨ ¬p",
              "soloBasicas": true,
              "restriccion": "Según las instrucciones del tema, usa solo reglas básicas."
            },
            {
              "numero": "1.23",
              "etiqueta": "e1-23",
              "titulo": "Ley de De Morgan clásica",
              "enunciado": "",
              "premisas": [
                "¬(p ∧ q)"
              ],
              "conclusion": "¬p ∨ ¬q",
              "prohibidas": [
                "DeM"
              ],
              "restriccion": "Según las instrucciones del tema, no uses DeM."
            },
            {
              "numero": "1.24",
              "etiqueta": "e1-24",
              "titulo": "Ley de Peirce",
              "enunciado": "",
              "premisas": [
                "(p → q) → p"
              ],
              "conclusion": "p"
            },
            {
              "numero": "1.25",
              "etiqueta": "e1-25",
              "titulo": "",
              "enunciado": "",
              "premisas": [],
              "conclusion": "((p → q) → p) → p"
            },
            {
              "numero": "1.26",
              "etiqueta": "e1-26",
              "titulo": "Contraposición clásica",
              "enunciado": "",
              "premisas": [
                "¬p → ¬q"
              ],
              "conclusion": "q → p"
            },
            {
              "numero": "1.27",
              "etiqueta": "e1-27",
              "titulo": "Definición clásica del condicional",
              "enunciado": "",
              "premisas": [
                "p → q"
              ],
              "conclusion": "¬p ∨ q"
            },
            {
              "numero": "1.28",
              "etiqueta": "e1-28",
              "titulo": "",
              "enunciado": "",
              "premisas": [
                "¬p ∨ q"
              ],
              "conclusion": "p → q"
            },
            {
              "numero": "1.29",
              "etiqueta": "e1-29",
              "titulo": "Ley de linealidad o de Dummett",
              "enunciado": "",
              "premisas": [],
              "conclusion": "(p → q) ∨ (q → p)"
            },
            {
              "numero": "1.30",
              "etiqueta": "e1-30",
              "titulo": "",
              "enunciado": "",
              "premisas": [
                "p ↔ q"
              ],
              "conclusion": "(p ∧ q) ∨ (¬p ∧ ¬q)"
            }
          ]
        }
      ]
    },
    {
      "tema": 4,
      "titulo": "Deducción natural en lógica de primer orden",
      "niveles": [
        {
          "titulo": "Nivel 1: cuantificador universal y silogística clásica",
          "descripcion": "En este nivel practicamos la eliminación del universal (∀E, instanciando en las constantes relevantes) y la introducción del universal (∀I sobre parámetros arbitrarios que no aparecen en premisas).",
          "ejercicios": [
            {
              "numero": "4.1",
              "etiqueta": "e4-1",
              "titulo": "",
              "enunciado": "Demuestra el modo silogístico Celarent (ningún M es P, y todo S es M; por tanto, ningún S es P):",
              "premisas": [
                "∀x (M(x) → ¬P(x))",
                "∀x (S(x) → M(x))"
              ],
              "conclusion": "∀x (S(x) → ¬P(x))",
              "pista": "Abre una caja con hipótesis S(c) para un parámetro arbitrario c. Instancia las dos premisas sobre c mediante ∀E y encadena los condicionales con →E para derivar ¬P(c). Cierra la subprueba con →I y concluye con ∀I."
            },
            {
              "numero": "4.2",
              "etiqueta": "e4-2",
              "titulo": "",
              "enunciado": "Demuestra el modo silogístico Cesare (ningún P es M, y todo S es M; por tanto, ningún S es P):",
              "premisas": [
                "∀x (P(x) → ¬M(x))",
                "∀x (S(x) → M(x))"
              ],
              "conclusion": "∀x (S(x) → ¬P(x))",
              "pista": "Abre una caja con S(c) y una subcaja con P(c) para buscar contradicción con M(c) y ¬M(c)."
            },
            {
              "numero": "4.3",
              "etiqueta": "e4-3",
              "titulo": "",
              "enunciado": "Demuestra la distributividad del cuantificador universal respecto a la conjunción:",
              "premisas": [
                "∀x P(x) ∧ ∀x Q(x)"
              ],
              "conclusion": "∀x (P(x) ∧ Q(x))",
              "pista": "Extrae ∀x P(x) y ∀x Q(x) por ∧E, instáncialos a la misma constante arbitraria c, junta por ∧I y aplica ∀I."
            },
            {
              "numero": "4.4",
              "etiqueta": "e4-4",
              "titulo": "",
              "enunciado": "Demuestra el siguiente argumento, en el que el consecuente del condicional no contiene la variable x:",
              "premisas": [
                "∀x (P(x) → Q(a))",
                "P(b)"
              ],
              "conclusion": "Q(a)",
              "pista": "Como el universal afirma la implicación para cualquier individuo, basta instanciarlo mediante ∀E sobre la constante b de la segunda premisa y aplicar →E."
            },
            {
              "numero": "4.5",
              "etiqueta": "e4-5",
              "titulo": "",
              "enunciado": "Demuestra la siguiente combinación de ∀E y ↔E:",
              "premisas": [
                "∀x (P(x) ↔ Q(x))",
                "P(c)"
              ],
              "conclusion": "Q(c)",
              "pista": "Aplica ∀E sobre la constante c y luego la eliminación del bicondicional (↔E) junto con la premisa P(c)."
            }
          ]
        },
        {
          "titulo": "Nivel 2: cuantificador existencial y gestión de testigos",
          "descripcion": "En este nivel introducimos la caja de hipótesis con testigo provisional (∃E). Recuerda: conviene abrir pronto las cajas de los existenciales con una constante fresca y asegurarse de que el testigo no aparezca en la conclusión.",
          "ejercicios": [
            {
              "numero": "4.6",
              "etiqueta": "e4-6",
              "titulo": "",
              "enunciado": "Demuestra el modo silogístico Ferio (ningún M es P, y algún S es M; por tanto, algún S no es P):",
              "premisas": [
                "∀x (M(x) → ¬P(x))",
                "∃x (S(x) ∧ M(x))"
              ],
              "conclusion": "∃x (S(x) ∧ ¬P(x))",
              "pista": "Abre una caja de ∃E con un testigo fresco c asumiendo S(c) ∧ M(c). Descompón la conjunción con ∧E, instancia la premisa universal sobre c para obtener ¬P(c), forma S(c) ∧ ¬P(c) por ∧I, generaliza con ∃I y cierra la caja de ∃E."
            },
            {
              "numero": "4.7",
              "etiqueta": "e4-7",
              "titulo": "",
              "enunciado": "Demuestra el modo silogístico Datisi (todo M es P, y algún M es S; por tanto, algún S es P):",
              "premisas": [
                "∀x (M(x) → P(x))",
                "∃x (M(x) ∧ S(x))"
              ],
              "conclusion": "∃x (S(x) ∧ P(x))",
              "pista": "Abre una caja de ∃E con testigo fresco c (M(c) ∧ S(c)), extrae las partes, usa ∀E sobre la primera premisa y →E para obtener P(c) y recombina como S(c) ∧ P(c) para aplicar ∃I."
            },
            {
              "numero": "4.8",
              "etiqueta": "e4-8",
              "titulo": "",
              "enunciado": "Demuestra la distributividad del existencial respecto a la disyunción:",
              "premisas": [
                "∃x (P(x) ∨ Q(x))"
              ],
              "conclusion": "∃x P(x) ∨ ∃x Q(x)",
              "pista": "Abre la caja de testigo para el existencial (P(c) ∨ Q(c)). Dentro de la caja, haz una prueba por casos sobre la disyunción (∨E) para deducir ∃x P(x) ∨ ∃x Q(x)."
            },
            {
              "numero": "4.9",
              "etiqueta": "e4-9",
              "titulo": "",
              "enunciado": "Demuestra que un universal y un existencial se combinan existencialmente:",
              "premisas": [
                "∀x P(x)",
                "∃x Q(x)"
              ],
              "conclusion": "∃x (P(x) ∧ Q(x))",
              "pista": "Abre la caja de ∃E para la premisa existencial con testigo c asumiendo Q(c). Dentro de ella, aplica ∀E sobre c a la primera premisa, construye la conjunción por ∧I, aplica ∃I y cierra la caja."
            },
            {
              "numero": "4.10",
              "etiqueta": "e4-10",
              "titulo": "",
              "enunciado": "Demuestra la independencia de dos existenciales con cajas anidadas:",
              "premisas": [
                "∃x P(x)",
                "∃y Q(y)"
              ],
              "conclusion": "∃x ∃y (P(x) ∧ Q(y))"
            }
          ]
        },
        {
          "titulo": "Nivel 3: relaciones binarias y cuantificadores múltiples",
          "descripcion": "En este nivel trabajamos con predicados diádicos (relaciones entre individuos R(x, y)). Presta especial atención al orden de eliminación e introducción de los cuantificadores.",
          "ejercicios": [
            {
              "numero": "4.11",
              "etiqueta": "e4-11",
              "titulo": "",
              "enunciado": "Demuestra la transmisión existencial de una relación universalmente implicada:",
              "premisas": [
                "∀x ∀y (R(x, y) → S(x, y))",
                "∃x ∀y R(x, y)"
              ],
              "conclusion": "∀y ∃x S(x, y)",
              "pista": "Abre una subprueba de ∃E para la segunda premisa con testigo fresco c asumiendo ∀y R(c, y). Dentro de la subprueba, toma un parámetro arbitrario d para alcanzar la meta universal; instancia las premisas sobre c y d para derivar S(c, d) por →E, aplica ∃I sobre c para obtener ∃x S(x, d) y luego ∀I sobre d para obtener ∀y ∃x S(x, y). Por último, cierra la caja de ∃E."
            },
            {
              "numero": "4.12",
              "etiqueta": "e4-12",
              "titulo": "",
              "enunciado": "Demuestra que si una relación R es simétrica, transitiva y serial (todo individuo se relaciona con al menos uno), entonces R es reflexiva:",
              "premisas": [
                "∀x ∀y (R(x, y) → R(y, x))",
                "∀x ∀y ∀z ((R(x, y) ∧ R(y, z)) → R(x, z))",
                "∀x ∃y R(x, y)"
              ],
              "conclusion": "∀x R(x, x)",
              "pista": "Para probar la meta universal ∀x R(x, x), fija un parámetro arbitrario a. Instancia la premisa de serialidad sobre a para obtener ∃y R(a, y) y abre una subprueba de ∃E con un testigo fresco b asumiendo R(a, b). Aplica la simetría sobre a y b para obtener R(b, a), forma la conjunción R(a, b) ∧ R(b, a) y aplica la transitividad sobre a, b, a para derivar R(a, a). Cierra la subprueba de ∃E (el testigo b no escapa) y concluye con ∀I sobre a."
            },
            {
              "numero": "4.13",
              "etiqueta": "e4-13",
              "titulo": "",
              "enunciado": "Demuestra que si una relación es asimétrica, entonces es irreflexiva (nadie se relaciona consigo mismo):",
              "premisas": [
                "∀x ∀y (R(x, y) → ¬R(y, x))"
              ],
              "conclusion": "∀x ¬R(x, x)",
              "pista": "Abre una caja con la hipótesis R(c, c) y busca una contradicción."
            },
            {
              "numero": "4.14",
              "etiqueta": "e4-14",
              "titulo": "",
              "enunciado": "Demuestra el paso de existencial condicional a antecedente universal:",
              "premisas": [
                "∃x (P(x) → Q(a))"
              ],
              "conclusion": "∀x P(x) → Q(a)",
              "pista": "Abre una caja para la introducción del condicional (→I) asumiendo ∀x P(x). Dentro de ella, abre la caja de ∃E para la premisa con un testigo fresco c asumiendo P(c) → Q(a). Instancia el supuesto ∀x P(x) sobre c para obtener P(c), deduce Q(a) por →E, cierra la caja de ∃E (ya que Q(a) no contiene a c) y finalmente cierra la caja de →I."
            },
            {
              "numero": "4.15",
              "etiqueta": "e4-15",
              "titulo": "",
              "enunciado": "Demuestra la conmutatividad del doble cuantificador existencial mediante cajas anidadas:",
              "premisas": [
                "∃x ∃y R(x, y)"
              ],
              "conclusion": "∃y ∃x R(x, y)",
              "pista": "Abre una caja de ∃E con testigo c para ∃x; dentro de ella, abre otra caja de ∃E con testigo d para ∃y. A partir de R(c, d), aplica dos veces ∃I para obtener ∃y ∃x R(x, y) y cierra ambas cajas en orden inverso."
            }
          ]
        },
        {
          "titulo": "Nivel 4: cuantificadores con negación, CQ y reducción al absurdo",
          "descripcion": "En este nivel combinamos cuantificadores con negación utilizando la regla de conversión de cuantificadores (CQ) y demostraciones clásicas por reducción al absurdo (IP).",
          "ejercicios": [
            {
              "numero": "4.16",
              "etiqueta": "e4-16",
              "titulo": "",
              "enunciado": "Demuestra mediante reglas básicas (sin usar la regla derivada CQ) que:",
              "premisas": [
                "¬∃x P(x)"
              ],
              "conclusion": "∀x ¬P(x)",
              "soloBasicas": true,
              "pista": "Para una constante arbitraria c, abre una hipótesis P(c) con el fin de derivar ¬P(c) por ¬I. Dentro de ella, aplica ∃I sobre c para obtener ∃x P(x), lo que genera contradicción inmediata (⊥) con la premisa ¬∃x P(x). Cierra la subprueba con ¬I y concluye con ∀I sobre c."
            },
            {
              "numero": "4.17",
              "etiqueta": "e4-17",
              "titulo": "",
              "enunciado": "Demuestra el paso recíproco, también con reglas básicas:",
              "premisas": [
                "∀x ¬P(x)"
              ],
              "conclusion": "¬∃x P(x)",
              "soloBasicas": true,
              "pista": "Procede por introducción de la negación (¬I) abriendo la hipótesis ∃x P(x). Dentro de esa caja, abre una subprueba de ∃E con testigo fresco c asumiendo P(c). Instancia la premisa universal sobre c mediante ∀E para obtener ¬P(c) y obtén ⊥; cierra la caja de ∃E (pues ⊥ no contiene a c) y después la de ¬I."
            },
            {
              "numero": "4.18",
              "etiqueta": "e4-18",
              "titulo": "",
              "enunciado": "Demuestra el siguiente argumento (basta usar modus tollens dentro de una caja de ∃E; no hace falta CQ):",
              "premisas": [
                "∀x (P(x) → Q(x))",
                "∃x ¬Q(x)"
              ],
              "conclusion": "∃x ¬P(x)"
            },
            {
              "numero": "4.19",
              "etiqueta": "e4-19",
              "titulo": "",
              "enunciado": "Demuestra, mediante introducción de la negación (¬I):",
              "premisas": [
                "¬∃x (P(x) ∧ Q(x))",
                "P(a)"
              ],
              "conclusion": "¬Q(a)"
            },
            {
              "numero": "4.20",
              "etiqueta": "e4-20",
              "titulo": "",
              "enunciado": "Demuestra el principio clásico conocido como la paradoja del bebedor (en todo bar hay alguien tal que, si él bebe, todos beben):",
              "premisas": [],
              "conclusion": "∃x (B(x) → ∀y B(y))",
              "pista": "Aplica la regla LEM con las hipótesis ∀y B(y) y ¬∀y B(y). En la primera caja, para cualquier constante c, supón B(c), reitera ∀y B(y), cierra con →I y aplica ∃I. En la segunda, obtén ∃y ¬B(y) por CQ y abre una caja de ∃E con testigo d y ¬B(d); supón B(d), obtén ⊥ y, por X, ∀y B(y); cierra con →I para obtener B(d) → ∀y B(y) y aplica ∃I antes de cerrar la caja de ∃E. (Obsérvese que la validez de este principio depende de que el dominio no sea vacío: en un bar vacío no hay nadie que cumpla la condición)."
            }
          ]
        },
        {
          "titulo": "Nivel 6: identidad",
          "descripcion": "En este nivel usamos las reglas =I y =E (sección 4.8). Recuerda que =E permite sustituir una, varias o todas las apariciones de un término por otro idéntico, en cualquiera de los dos sentidos.",
          "ejercicios": [
            {
              "numero": "4.25",
              "etiqueta": "e4-25",
              "titulo": "Transitividad y simetría",
              "enunciado": "",
              "premisas": [
                "a = b",
                "b = c"
              ],
              "conclusion": "c = a",
              "pista": "Obtén primero a = c con =E y después aplica la simetría como en el ejemplo de la simetría de la identidad (sección 4.8)."
            },
            {
              "numero": "4.26",
              "etiqueta": "e4-26",
              "titulo": "",
              "enunciado": "",
              "premisas": [
                "∀x (x = a → P(x))"
              ],
              "conclusion": "P(a)"
            },
            {
              "numero": "4.27",
              "etiqueta": "e4-27",
              "titulo": "Unicidad",
              "enunciado": "Si hay exactamente un individuo con la propiedad P, y tanto a como b la tienen, entonces a y b son el mismo individuo:",
              "premisas": [
                "∃x (P(x) ∧ ∀y (P(y) → y = x))",
                "P(a)",
                "P(b)"
              ],
              "conclusion": "a = b",
              "pista": "Abre una caja de ∃E con un testigo fresco c, obtén a = c y b = c, y combínalas con =E."
            },
            {
              "numero": "4.28",
              "etiqueta": "e4-28",
              "titulo": "Simetría como teorema",
              "enunciado": "",
              "premisas": [],
              "conclusion": "∀x ∀y (x = y → y = x)"
            }
          ]
        }
      ]
    }
  ]
});
