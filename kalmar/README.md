# La prueba de Kalmár, paso a paso

Animación de la prueba de completud de la lógica proposicional de László Kalmár (1935), tal como se presenta en el tema 3 de los *Apuntes de Lógica* (Grado en Filosofía, Universidad de Sevilla).

Tiene tres fases:
1. **Tabla de verdad.** Para cada fila se muestran los literales $p_i^v$ y la fórmula $A^v$.
2. **Derivación de cada fila.** Se construye $p_1^v, \dots, p_n^v \vdash A^v$ siguiendo los casos del lema de Kalmár: §3.3.2 y la solución del ejercicio 3.6. Opcionalmente se indica el caso del lema en cada paso.
3. **Colapso de premisas.** Se eliminan las variables de la última a la primera, como en el libro. Dos derivaciones que solo difieren en la premisa de la variable eliminada y terminan en la misma fórmula se unen con LEM. Si las conclusiones son distintas, el colapso se bloquea.
   - Se ve como un árbol de tarjetas que se va completando paso a paso.
   - Cada fila tiene un color, y sus líneas lo conservan dentro de las derivaciones mayores: fondo claro y, junto al número, una franja del color intenso, como en la leyenda y en las tarjetas.
   - Si la fórmula es una tautología, el colapso llega a $\vdash A$; si es una contradicción, a $\vdash \neg A$; si no es ninguna de las dos, se bloquea.
   - En un paso bloqueado, en lugar de la derivación se explica por qué no la hay: una de las derivaciones anteriores prueba $A$ y la otra $\neg A$. Si falta una rama porque su colapso ya se bloqueó, se dice cuál. Lo mismo aparece al pulsar esas tarjetas, con botones para ver las ramas.

## Uso

- Es una página estática, sin dependencias ni servidor: basta abrir `index.html`. Usa los ficheros de `../comun/`, así que para publicarla hay que subir la carpeta `AplicacionesLogica` completa (véase el `README.md` principal).
- El estado va en la dirección, así que se pueden compartir enlaces a una fórmula, a una fila o a un paso del colapso. Por ejemplo:
  `index.html#f=(p -> q) | (q -> p)&ver=colapso&paso=1`
- Límites: 3 variables y 6 conectivas.

**Sintaxis de entrada**, la del libro:
- variables proposicionales: letras sueltas (p, q, r…), como en el tema 3;
- conectivas: los símbolos ¬ ∧ ∨ → ↔ ⊥, con botones, o con el teclado: `~`, `&`, `|`, `->`, `<->`, `#`. La ayuda de la página lo muestra en una tabla con una fila por conectiva;
- precedencia, de más a menos fuerte: ¬, ∧, ∨, →, ↔. Las conectivas binarias se agrupan por la derecha.

## Estructura

| Fichero | Contenido |
|---|---|
| `../comun/js/formulas.js` | Análisis, impresión y evaluación de fórmulas |
| `../comun/js/verificador.js` | Verificador de derivaciones Fitch con las reglas básicas y derivadas del libro (R, ∧I, ∧E, ∨I, ∨E, →I, →E, ¬I, ¬E, X, IP, ↔I, ↔E, MT, DS, DNE, LEM, DeM y, en primer orden, ∀E, ∀I, ∃I, ∃E, =I, =E, CQ). Comprueba el orden de citas de los esquemas del libro. Es independiente y reutilizable. |
| `js/kalmar.js` | Lema de Kalmár para cada fila y colapso con LEM |
| `../comun/js/fitch.js` | Dibujo de las derivaciones en formato Fitch |
| `js/app.js` | Interfaz |
| `datos/ejemplos.js` | Ejemplos (JSON) |
| `css/kalmar.css` | Estilos propios (el resto, en `../comun/css/base.css`) |
| `../pruebas/kalmar.js` | Pruebas automáticas con Node |

## Pruebas

Desde la carpeta principal:

```
node pruebas/kalmar.js [fórmulas aleatorias] [semilla] [conectivas de la prueba exhaustiva]
```

Las pruebas generan fórmulas y construyen la derivación de cada fila y cada paso del colapso. Cada derivación la comprueba el verificador. Además, se comprueba que las tautologías llegan a $\vdash A$, las contradicciones a $\vdash \neg A$ y las demás se bloquean.
- Con `node pruebas/kalmar.js 50000 7 3`, que prueba todas las fórmulas de hasta 3 conectivas y 50 000 aleatorias de hasta 6, se comprueban 909 776 derivaciones, sin errores.
- La derivación más larga tiene 249 líneas.

Reutiliza ideas de [TruthTables](https://fersoler.github.io/TruthTables/), del mismo autor: la representación de las fórmulas y la impresión con paréntesis mínimos.
