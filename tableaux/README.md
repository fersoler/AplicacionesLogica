# Tableaux semánticos

Apoyo al tema 6 de los *Apuntes de Lógica* (el cálculo de tableaux). Construye los árboles con las reglas del libro y muestra las ramas abiertas y el contramodelo que dan. Esto es lo que no enseña [umsu.de/trees](https://www.umsu.de/trees/): esa página solo dibuja árboles cerrados y saca los contramodelos de un buscador de modelos aparte.

## Qué se puede hacer

- **Comprobar las cuatro cosas de §6.5:**
  - consecuencia (Γ ⊨ A), con Γ y ¬A en la raíz;
  - validez (⊨ A), con ¬A en la raíz;
  - satisfacibilidad de Γ, con Γ en la raíz;
  - equivalencia (A ≡ B), con ¬(A ↔ B) en la raíz.
- **Verlo paso a paso.** El árbol se construye regla a regla con la prioridad de §6.3.2: α y σ, después δ, γ y β. Se expande primero la rama abierta de más a la izquierda, así que los ejemplos del libro salen con la misma numeración y los mismos cierres. Cada paso se explica, y se resaltan el nodo usado y los nodos nuevos.
- **Construirlo uno mismo:**
  - el alumno pulsa la fórmula que quiere descomponer, y la regla se aplica en todas las ramas abiertas que pasan por ella (§6.3);
  - en γ elige la constante, o todas a la vez;
  - si no sigue la prioridad de §6.3.2, se le comenta sin impedírselo;
  - las ramas las cierra el alumno: pulsa ⊗ al final de una rama y señala dos nodos contradictorios (o un nodo ⊥), y la aplicación comprueba que lo sean;
  - si sigue descomponiendo en una rama que ya podía cerrarse, se le avisa;
  - una rama sin nada que descomponer solo se da por abierta si no tiene ninguna contradicción; si la tiene, queda pendiente de cerrar;
  - se puede deshacer, y «Terminarlo automáticamente» completa el árbol y cierra las ramas pendientes.
- **Leer los nodos.** Cada nodo lleva su número y su justificación: «Premisa», «α, 1», «δ, 2 (a fresca)», «γ, 3 (a nueva)». Las ramas acaban en ⊗ con los dos nodos que chocan, en ABIERTA o en INCOMPLETA.
- **Ver el modelo de una rama abierta y completa (§6.4):**
  - los literales Ω;
  - D, formado por las constantes de la rama, o {1} si no hay ninguna;
  - I(c) = c e I(P);
  - en proposicional, la interpretación v.

  El modelo se comprueba además con las fórmulas de partida: con premisas verdaderas y conclusión falsa, es un contramodelo. Si hay varias ramas abiertas, se elige cuál ver.
- **Ramas infinitas (§6.9).** Al llegar al límite de constantes por rama, la rama queda INCOMPLETA, y la aplicación lo explica. Como opción, la regla δ de Boolos ramifica con cada constante que ya hay en la rama y con una nueva. Con ella aparece, por ejemplo, el modelo finito de §6.9: D = {a, b} e I(R) = {(a, b), (b, a)}.
- **Exportar** el árbol tal como se ve en ese momento, como en `deduccion/`:
  - a texto, con las ramas dibujadas con ├── y └── y las justificaciones en columna;
  - a LaTeX, como una figura de TikZ: el número de cada nodo a la izquierda, la justificación a la derecha y ⊗ con los nodos que chocan. Basta `\usepackage{tikz}` en el preámbulo. Un árbol más ancho que la página se reduce entero.
- **Enlaces.** El estado (fórmulas, opciones y paso) va en la dirección de la página.

## Sintaxis

- **La del libro:**
  - cuantificadores ∀x y ∃x; conectivas ¬, ∧, ∨, → y ↔;
  - predicados P(a) y R(x, y);
  - letras proposicionales p, q, r.
- **Con el teclado:** `Ax`, `Ex`, `~`, `&`, `|`, `->`, `<->`.
- **La de umsu.de/trees:** además, predicados de una letra con los argumentos pegados: `Pa`, `Rxy`, `Ax(Px -> Qx)`.
- **Términos:** las constantes van de la a a la r, y las variables, de la s a la z.
- **Lo que no admite:** como en el tema 6, no hay identidad ni funciones, y en la raíz solo van sentencias. Si una variable queda libre, la aplicación explica el problema del alcance.

## Ficheros

| Fichero | Contenido |
|---|---|
| `../comun/js/primerorden.js` | Análisis e impresión de fórmulas (con letras proposicionales y forma compacta) y satisfacción |
| `js/tableaux.js` | Motor: clasificación de Smullyan, reglas, cierres, construcción automática y a mano, modelo de una rama, textos de cada paso y exportación a texto y a LaTeX |
| `js/app.js` | Interfaz: dibujo del árbol, pasos, modo de construcción a mano, resultado y modelo |
| `datos/ejemplos.js` | Ejemplos (JSON) |
| `css/tableaux.css` | Estilos propios (el resto, en `../comun/css/base.css`) |
| `../pruebas/tableaux.js` | Pruebas automáticas con Node |

## Pruebas

Desde la carpeta principal:

```
node pruebas/tableaux.js [conjuntos al azar] [semilla]
```

**Los ejemplos del libro.** Se comprueban nodo a nodo los árboles de §6.3.2 y los dos de §6.6, con sus cierres y su modelo. Se comprueban también §6.9, con y sin la regla de Boolos, y otros casos como Darapti o la paradoja del bebedor.

**Conjuntos al azar.** Son de lógica proposicional y de primer orden; la mitad, insatisfacibles por construcción. En cada uno se comprueba que:
- el modelo de cada rama abierta y completa satisface todas las fórmulas de la raíz;
- ningún árbol cerrado tiene un modelo de uno o dos elementos;
- en proposicional, el árbol se cierra si y solo si el conjunto es insatisfacible;
- lo mismo se cumple cuando el árbol se construye a mano con elecciones al azar;
- la exportación a texto y a LaTeX, del árbol completo y a medias, contiene cada nodo una vez y el final de cada rama, y en LaTeX no queda ningún símbolo sin traducir.

Con dos tandas de 20 000 conjuntos (semillas 42 y 5) no hay fallos. Algunos árboles proposicionales con muchos ↔ llegan al límite de 500 nodos de las pruebas, y se cuentan aparte.

## Créditos

El diseño del motor procede del cuaderno de tableaux en Python del mismo autor (proyecto LogiCoLab):
- la clasificación;
- el registro de las instancias γ por rama;
- el límite de constantes y las ramas incompletas;
- la regla δ de Boolos;
- la extracción del modelo.
