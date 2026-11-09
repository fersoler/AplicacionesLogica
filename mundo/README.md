# El mundo de Tarski

Apoyo al tema 5 de los *Apuntes de Lógica* (semántica de primer orden). Es una versión nueva de la aplicación `mundoLogica2.html` del autor, adaptada a la notación del libro.

## Qué se puede hacer

- **El mundo.** Un tablero de 6 × 6 casillas con piezas que pueden ser triángulos, cuadrados o círculos, pequeñas, medianas o grandes, y rojas, verdes o azules.
  - Cada pieza es un objeto del dominio, numerado 1, 2, 3…
  - Las letras de la a a la r son constantes, es decir, nombres de las piezas. Una pieza puede tener varios nombres o ninguno, pero cada constante nombra un solo objeto.
  - El dominio no puede estar vacío (§5.1.1).
- **Evaluar.** Muestra el valor de una fórmula en el mundo y el árbol de la definición de satisfacción (§5.1.3).
  - Cada nodo da su valor y el motivo, por ejemplo «I(a) = 1; (1, 3) ∈ I(IzqDe)», «testigo: y ↦ 2» o «contraejemplo: x ↦ 4».
  - Al pasar el ratón por un nodo, se resaltan en el tablero los objetos que la asignación da a sus variables.
  - Con una fórmula abierta se puede elegir la asignación g. Se muestra entonces la extensión (resaltada en el tablero si hay una sola variable libre) y si la fórmula es verdadera en M, es decir, satisfecha por toda asignación (§5.1.4).
- **Contramodelos** (§5.3). Se escriben las premisas y la conclusión, y la aplicación da su valor en el mundo e indica si el mundo es un contramodelo.
  - Hay 9 retos, con una pista oculta. Dos de ellos son argumentos válidos.
  - «Mostrar un contramodelo» busca uno al azar en mundos de hasta 6 piezas.
- **Formalizar** (§5.2). Contiene 13 frases para formalizar.
  - La fórmula del alumno se compara con una solución en 2400 mundos al azar y en el del tablero. Si en algún mundo dan valores distintos, la aplicación lo enseña y permite cargarlo en el tablero.
  - Avisa de las variables libres, que suelen deberse a paréntesis mal puestos: `∀x Cuadrado(x) → Grande(x)`.
- **La estructura.** Muestra D, I(c) e I(P) del mundo del tablero (§5.1.1).
- **Enlaces.** El estado (mundo, fórmula, argumento, frase y pestaña) se guarda en la dirección de la página, así que se pueden compartir enlaces.

## Sintaxis

Se usa la del libro, que también se puede escribir con el teclado:

| Libro | Teclado |
|---|---|
| ∀x | `Ax` |
| ∃x | `Ex` |
| ¬ | `~` |
| ∧ | `&` |
| ∨ | `\|` |
| → | `->` |
| ↔ | `<->` |
| ⊥ | `#` |
| a ≠ b | `~(a = b)` |

- Las constantes son las letras de la a a la r, y las variables, de la s a la z.
- La precedencia, de más a menos fuerte, es ¬, ∧, ∨, →, ↔. Las conectivas binarias se agrupan por la derecha.
- El alcance de un cuantificador es la fórmula que le sigue, por eso hay que escribir `∀x (Triángulo(x) → Rojo(x))`.

## Diccionario

- **Un argumento:**
  - Triángulo, Cuadrado, Círculo;
  - Pequeño, Mediano, Grande;
  - Rojo, Verde, Azul.
- **Dos argumentos:**
  - IzqDe, DerDe (columnas);
  - AdelanteDe, AtrasDe (filas: adelante es más abajo en el tablero);
  - MismaFila, MismaCol, Adyacente (casillas vecinas, también en diagonal);
  - MismaForma, MismoTam, MismoColor.
- **Identidad:** =.

Los nombres se reconocen sin tildes y sin distinguir mayúsculas. También se admiten los alias de la versión anterior: Tri, Cua, Cir, Peque, MismaColumna y MismoTamaño.

## Ficheros

| Fichero | Contenido |
|---|---|
| `../comun/js/primerorden.js` | Fórmulas de primer orden con identidad: análisis, impresión, variables libres, vocabulario y satisfacción. Es independiente del mundo de piezas: sirve para cualquier estructura que dé `D`, `constante(c)` y `predicado(nombre)`. |
| `datos/mundo.js` | Mundo de ejemplo, fórmulas de ejemplo, retos y frases (JSON) |
| `js/mundo.js` | Diccionario, estructura de un tablero, mundos al azar, búsqueda de contramodelos y diferencias |
| `js/app.js` | Interfaz |
| `css/mundo.css` | Estilos propios (el resto, en `../comun/css/base.css`) |
| `../pruebas/mundo.js` | Pruebas automáticas con Node |

## Pruebas

Desde la carpeta principal se ejecuta `node pruebas/mundo.js`. Se pasan 155 pruebas, sin fallos. Cubren:
- el análisis y la impresión de fórmulas, con sus mensajes de error;
- las leyes semánticas, comprobadas en 3000 mundos al azar;
- que cada reto tiene contramodelo, salvo los válidos;
- que los errores típicos de formalización se detectan y las formulaciones equivalentes se aceptan;
- la codificación del mundo en la dirección de la página.

La idea de un mundo de piezas para practicar la semántica de primer orden procede de *Tarski's World*, de Jon Barwise y John Etchemendy.
