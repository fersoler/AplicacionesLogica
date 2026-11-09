# Aplicaciones de lógica

Este repositorio reúne aplicaciones de apoyo a los *Apuntes de Lógica* (2.º del Grado en Filosofía, Universidad de Sevilla). No forman parte del manual: son material complementario.

- **Usarlas:** https://fersoler.github.io/AplicacionesLogica/
- **El libro:** [fersoler/ApuntesLogica](https://github.com/fersoler/ApuntesLogica), con licencia CC BY-SA 4.0.

| Aplicación | Tema | Contenido |
|---|---|---|
| [`sintaxis/`](sintaxis/README.md) | 1 y 4 | Sintaxis: conectiva principal, subfórmulas, precedencia, alcance, variables libres y ligadas, sustitución |
| [`deduccion/`](deduccion/README.md) | 1 y 4 | Deducción natural: derivaciones Fitch con las reglas del libro, comprobadas línea a línea, y exportación a LaTeX |
| [`tablas/`](tablas/README.md) | 2 | Tablas de verdad: clasificación, equivalencia, consecuencia, asignación directa, evaluación paso a paso y formalización |
| [`kalmar/`](kalmar/README.md) | 3 | La prueba de completud de Kalmár, paso a paso: tabla de verdad, derivación de cada fila y colapso con LEM |
| [`mundo/`](mundo/README.md) | 5 | El mundo de Tarski: estructuras, satisfacción, contramodelos y formalización |
| [`tableaux/`](tableaux/README.md) | 6 | Tableaux semánticos con las reglas del libro, ramas abiertas, contramodelos y exportación a texto y a LaTeX |

## Uso

- Son páginas estáticas, sin dependencias externas ni servidor, en HTML, CSS y JavaScript sin bibliotecas. No cargan nada de otros dominios.
- Para usarlas en local basta abrir `index.html`, la portada.
- Para publicarlas hay que subir la carpeta completa a cualquier alojamiento web (por ejemplo, GitHub Pages), porque las aplicaciones usan los ficheros de `comun/`.
- Todas siguen la notación del libro y admiten también la escritura con el teclado (`~`, `&`, `|`, `->`, `<->`, `Ax`, `Ex`). Salvo el mundo de Tarski, cuyos predicados son palabras, aceptan los predicados con paréntesis, `R(x, b)`, o pegados, `Rxb`, y los muestran con la notación del libro.
- **Unidad entre aplicaciones:**
  - la ayuda sobre cómo escribir las fórmulas sale de `comun/js/ayuda.js`, con la misma tabla (símbolo, libro, teclado) y las mismas frases; cada página indica solo qué admite;
  - la ayuda va siempre en un bloque desplegable al final de la página;
  - los botones de símbolos siguen el mismo orden: ¬ ∧ ∨ → ↔ ⊥ ∀ ∃ = ≠ ( ), con los que admita cada aplicación;
  - el subtítulo de cada página dice el tema del libro: «Semántica de la lógica proposicional (tema 2): …».

## Estructura

| Carpeta | Contenido |
|---|---|
| `comun/css/base.css` | Estilo común (colores, modo oscuro, bloques, botones, tablas, derivaciones) |
| `comun/js/formulas.js` | Fórmulas proposicionales: análisis, impresión (con paréntesis mínimos o explícitos), evaluación |
| `comun/js/verificador.js` | Verificador de derivaciones Fitch con todas las reglas del libro, básicas y derivadas, de lógica proposicional y de primer orden con identidad (∀E, ∀I, ∃I, ∃E, =I, =E, CQ, con las restricciones del apéndice C) |
| `comun/js/fitch.js` | Dibujo de derivaciones Fitch |
| `comun/js/datos.js` | Registro de los datos de las aplicaciones (véase abajo) |
| `comun/js/primerorden.js` | Fórmulas de primer orden con identidad y satisfacción en una estructura; admite letras proposicionales y la forma compacta (`Pa`, `Rxy`) |
| `comun/js/ayuda.js` | Ayuda común «Cómo escribir las fórmulas»: rellena cada elemento con `data-ayuda-sintaxis` según los rasgos de la aplicación (`prop`, `bot`, `cuant`, `igualdad`, `pegados`, `palabras`) |
| `sintaxis/`, `deduccion/`, `tablas/`, `kalmar/`, `mundo/`, `tableaux/` | Cada aplicación, con su `index.html`, `js/`, `css/`, `datos/` y `README.md` |
| `herramientas/libro.js` | Lectura de las derivaciones del libro (fuente LaTeX) para comprobarlas con el verificador |
| `herramientas/ejercicios.js` | Genera `deduccion/datos/ejercicios.js` con los ejercicios de deducción natural del libro |
| `pruebas/` | Pruebas automáticas con Node: `node pruebas/<aplicación>.js` (sintaxis, deduccion, tablas, kalmar, mundo, tableaux), `node pruebas/verificador.js`, `node pruebas/ayuda.js` (lo que dice la ayuda es cierto) y `node pruebas/libro.js` (comprueba todas las derivaciones del libro; necesita el libro en `../ApuntesLogica` o en la ruta de la variable `APUNTES`) |

Los módulos de `comun/js/` funcionan tanto en el navegador (como variables globales) como en Node (con `require`). Así, las pruebas usan el mismo código que las páginas.

## Datos

Los ejemplos, retos, frases y ejercicios de cada aplicación están en su carpeta `datos/`, separados del código.
- **Formato.** Cada fichero es un objeto JSON envuelto en una línea de JavaScript:
  ```js
  Datos.registrar("nombre", {
    … JSON …
  });
  ```
  Se edita como JSON: comillas dobles y sin comas finales.
- **Por qué no son `.json`.** Los navegadores no dejan leer ficheros `.json` cuando la página se abre desde el disco; así, las aplicaciones funcionan igual en local que en un servidor.
- **Comprobación.** Las pruebas leen estos ficheros y comprueban que su contenido es JSON válido.
- **Ejercicios de deducción natural.** Se generan a partir del libro con `node herramientas/ejercicios.js`; si cambian en el libro, conviene volver a generarlos mejor que editarlos a mano.

## Créditos

- **Autor:** Fernando Soler Toscano.
- **Fuentes:**
  - [TruthTables](https://fersoler.github.io/TruthTables/), del mismo autor: la representación de las fórmulas, la impresión con paréntesis mínimos y la idea de rellenar la tabla, que `tablas/` amplía;
  - la aplicación `mundoLogica2.html`, del mismo autor, que es la versión anterior de `mundo/`;
  - el cuaderno de tableaux en Python del mismo autor (proyecto [LogiCoLab](https://github.com/fersoler/LogiCoLab), publicado con licencia MIT), del que `tableaux/` toma el diseño del motor y la regla δ de Boolos;
  - el asistente [ndprover.org](https://ndprover.org/), que sirvió de modelo a `deduccion/` (derivaciones Fitch comprobadas línea a línea) y del que proceden las alternativas de teclado (`~`, `&`, `|`, `->`, `Ax`…).

## Licencia

- **Código:** GNU General Public License, versión 3 o posterior (`LICENSE`). Cada fichero lleva su aviso `SPDX-License-Identifier: GPL-3.0-or-later`.
- **Ejercicios del libro:** `deduccion/datos/ejercicios.js` contiene ejercicios de los *Apuntes de Lógica*, de Fernando Soler Toscano, que se publican con licencia [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Creative Commons declara esa licencia compatible con la GPLv3, así que pueden distribuirse junto con el código.
- **Herramientas:** `herramientas/` y `pruebas/libro.js` leen los fuentes del libro, que están en su propio repositorio. Hay que clonarlo junto a este, como `../ApuntesLogica`, o indicar su ruta en la variable `APUNTES`.
