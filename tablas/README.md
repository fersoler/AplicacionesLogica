# Tablas de verdad

Apoyo al tema 2 de los *Apuntes de Lógica* (semántica de la lógica proposicional). 

## Qué se puede hacer

- **Tabla de verdad (§2.3)** de una fórmula o de varias, que se puede rellenar o ver resuelta.
  - **Rellenar.** Cada pulsación en una casilla la cambia entre 1 y 0. Los botones 1 y 0 de cada columna la llenan entera. Con el teclado, 1 y 0 escriben y bajan a la fila siguiente, y las flechas mueven.
  - **Ayuda al rellenar.** Al pasar por una casilla se resaltan las de las columnas de las que depende.
  - **Corregir.** «Comprobar» marca las casillas que están mal o vacías, sin dar la solución. «Ver la solución» completa la tabla y resalta lo que faltaba.
  - **Opciones.** Se pueden mostrar solo las columnas de las fórmulas, sin las subfórmulas intermedias, o rellenar también las columnas de las variables.
  - **Preguntas.** Con la tabla completa, la aplicación pregunta por cada fórmula si es tautología, contradicción o contingente. Con varias fórmulas pregunta si el conjunto es satisfacible, y con dos, si son equivalentes (§2.4); en este caso ofrece comprobarlo con la tabla de A ↔ B.
- **Consecuencia lógica (§2.6).** Muestra la tabla conjunta de premisas y conclusión, con cada columna rotulada.
  - El alumno marca los contraejemplos pulsando el número de su fila y dice si el argumento es válido. La aplicación corrige las dos cosas y explica por qué una fila no es contraejemplo.
  - **Asignación directa (§2.6.1).** La resolución se ve paso a paso:
    - se fuerza la conclusión como falsa y las premisas como verdaderas;
    - se sacan los valores obligados;
    - cuando una condición admite varias posibilidades, se examina cada caso por separado;
    - el proceso termina en contradicción o en un contraejemplo.
  - **Enlaces a §2.7.** El teorema de la deducción y el principio de refutación llevan a la tabla de la fórmula o del conjunto correspondiente.
- **Una interpretación (§2.2).** El alumno elige v y calcula el valor de la fórmula de dentro afuera, decidiendo en cada paso si la subfórmula vale 1 o 0. La aplicación explica cada paso como en el ejemplo del libro y dice a qué fila de la tabla corresponde la interpretación.
- **Formalizar (§2.5).** Contiene 14 frases con su diccionario.
  - La fórmula del alumno se compara con una solución en todas las interpretaciones, así que se acepta cualquier formulación equivalente.
  - Si no son equivalentes, se da una interpretación en la que difieren, descrita con el diccionario.
  - Para los errores habituales hay un comentario: «solo si», condición necesaria o suficiente, «ni… ni», «a menos que», alcance de la negación…
- **Ayuda.** Explica la sintaxis y da las tablas características de las conectivas (§2.2.1).
- **Enlaces.** El estado (pestaña, fórmulas, argumento, interpretación y frase) va en la dirección de la página.

## Sintaxis

- **Conectivas.** Valen los símbolos del libro o sus equivalentes de teclado:
  - ¬ (`~`), ∧ (`&`), ∨ (`|`);
  - → (`->`), ↔ (`<->`), ⊥ (`#`).
- **Variables.** Son letras sueltas. La v también es una variable: si alguien escribe `p v q`, la aplicación le avisa de que la disyunción es ∨ o `|`.
- **Agrupación.** La precedencia, de más a menos fuerte, es ¬, ∧, ∨, →, ↔ (§1.1.1). Las conectivas binarias se agrupan por la derecha.
- **Paréntesis.** Las fórmulas se muestran con paréntesis en todo miembro binario de una conectiva binaria, como en las tablas del tema 2: `(p ∨ q) → (p ∧ q)`. Así se ve cómo se ha agrupado lo que se escribió.
- **Orden de las filas.** Es el del libro: la primera variable cambia más despacio, y cada una toma primero el valor 1.
- **Tamaño.** Como mucho, 6 variables (64 filas).

## Ficheros

| Fichero | Contenido |
|---|---|
| `../comun/js/formulas.js` | Análisis, impresión y evaluación de fórmulas (compartido con Kalmár) |
| `js/semantica.js` | Tabla conjunta, clasificación, equivalencia, consecuencia, evaluación paso a paso, asignación directa y comprobación de formalizaciones |
| `datos/ejercicios.js` | Ejemplos y frases para formalizar (JSON) |
| `js/ejercicios.js` | Ofrece esos datos al resto del código |
| `js/app.js` | Interfaz |
| `css/tablas.css` | Estilos propios (el resto, en `../comun/css/base.css`) |
| `../pruebas/tablas.js` | Pruebas automáticas con Node |

## Pruebas

Desde la carpeta principal:

```
node pruebas/tablas.js [argumentos al azar] [semilla]
```

Las pruebas comprueban:
- los ejemplos del libro: las columnas y valores del silogismo hipotético, la evaluación de §2.2 y los ejemplos de §2.6.1, con el mismo orden de pasos que el libro;
- que, en 20 000 argumentos al azar, el método de asignación directa da el mismo veredicto que la tabla, y que cada contraejemplo que encuentra lo es de verdad;
- que se detectan los errores previstos de formalización y se aceptan las formulaciones equivalentes.
