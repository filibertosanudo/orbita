# ÓRBITA

**Juego arcade espacial de un solo botón** con estética synthwave/neón. Salta de planeta en planeta aprovechando la órbita gravitacional, encadena combos, recoge estrellas y esquiva asteroides para superar tu récord.

### 🎮 [Jugar en línea](https://filibertosanudo.github.io/orbita/)

Proyecto individual de la materia **Creación de Videojuegos**, Universidad Tecnológica de Hermosillo (UTH).
Alumno: **Filiberto Sañudo** · Profesor: M.C. Iván Rogelio Chenoweth Chenoweth.

---

## 1. Propuesta del juego

### Concepto
La nave del jugador gira en órbita alrededor de un planeta. Al presionar el botón, la nave se suelta y sale disparada en línea recta, en la dirección tangente a la órbita. Si cruza la zona de captura de otro planeta, queda atrapada en su órbita y suma puntos. Si se pierde en el espacio o choca con un asteroide, termina la partida.

El reto es elegir el momento exacto para soltarse: el juego se controla con un solo botón, pero exige precisión y ritmo.

| | |
|---|---|
| **Género** | Arcade / habilidad, de un solo botón |
| **Plataforma** | Navegador web (computadora y celular) |
| **Público** | Todo público, partidas cortas de 1 a 3 minutos |
| **Estilo visual** | Synthwave / neón espacial, todo dibujado con código en Canvas 2D |
| **Tecnología** | HTML5, CSS3 y JavaScript puro (sin frameworks ni librerías) |

### Objetivo
Llegar lo más alto posible saltando entre planetas y conseguir la puntuación más alta. El récord se guarda en el navegador.

### Controles

| Acción | Teclado | Mouse / táctil |
|---|---|---|
| Soltarse de la órbita (saltar) | `Espacio` | Clic / toque en la pantalla |
| Iniciar o reiniciar partida | `Espacio` / `Enter` | Botón en pantalla |
| Pausa | `P` / `Esc` | Botón ⏸ |
| Silenciar sonido | `M` | Botón 🔊 |

## 2. Mecánicas

- **Órbita y lanzamiento tangencial:** la nave gira alrededor del planeta y, al soltarse, sale disparada por la tangente de su órbita. Cada planeta gira en sentido horario o antihorario, y unas flechas en su anillo indican hacia dónde.
- **Captura:** cada planeta tiene una zona de captura (anillo punteado). Si la nave la cruza, queda en órbita alrededor de ese planeta.
- **Combo:** si el jugador se suelta en menos de 1 segundo después de ser capturado y alcanza un planeta nuevo, el combo sube (x2, x3, x4…). Un arco amarillo alrededor del planeta muestra cuánto tiempo queda para lograrlo.
- **Estrellas:** aparecen entre planetas y dan puntos extra.
- **Niveles:** el nivel sube cada 3 planetas alcanzados. Con cada nivel los planetas son más pequeños, giran más rápido y están más separados.
- **Planetas móviles:** desde cierto nivel, algunos planetas se mueven de lado a lado.
- **Asteroides:** desde cierta puntuación o nivel, aparecen asteroides que cruzan la pantalla. Chocar con uno termina la partida.
- **Game Over:** chocar con un asteroide o salirse de la pantalla mientras la nave vuela.

### Modos de dificultad

| Modo | Velocidad de órbita | Zona de captura | Planetas móviles desde | Asteroides desde |
|---|---|---|---|---|
| Fácil | ×0.82 | ×1.14 (más grande) | Nivel 4 o 6 pts | 22 pts o nivel 7 |
| Normal | ×1.00 | ×1.00 | Nivel 3 o 6 pts | 15 pts o nivel 5 |
| Difícil | ×1.24 | ×0.90 (más chica) | Nivel 2 o 6 pts | 10 pts o nivel 3 |

## 3. Puntuación

| Evento | Puntos |
|---|---|
| Alcanzar un planeta nuevo | `1 × combo` |
| Recoger una estrella | `5 × combo` |
| Completar un desafío diario de puntos | +20 a +35 |

Ejemplo: con combo x4, cada planeta vale 4 puntos y cada estrella 20.

### Desafíos diarios y estelas
Cada día se generan **3 desafíos** a partir de la fecha (todos los jugadores tienen los mismos ese día), por ejemplo "Alcanza 10 planetas" o "Consigue un Combo x3". Algunos dan puntos extra y otros desbloquean una **estela de color para la nave** (Solar, Esmeralda, Prisma o Carmesí), que solo dura ese día. Los desafíos y las estelas se reinician a medianoche.

### Bitácora de vuelo
Al terminar la partida, la pantalla de Game Over muestra los logros conseguidos en ese vuelo: primer salto, primera órbita, Combo x3 y x5, niveles superados, estrellas, desafíos y nuevo récord.

## 4. Audio

Todo el audio se genera en tiempo real con la **Web Audio API**, sin archivos de sonido:

- **Música ambiental:** un pad de tres osciladores con filtro pasa-bajos que avanza lentamente por una progresión de acordes (Am9 – Fmaj7 – Cmaj7 – G6). Su volumen baja en pausa y en Game Over.
- **Salto:** un barrido corto ascendente.
- **Captura:** un tono que sube de altura conforme aumenta el combo.
- **Estrella:** una campanita de dos notas.
- **Choque:** un tono grave descendente.

El sonido se puede silenciar con `M` y la preferencia se guarda.

## 5. Técnicas de rendimiento

| Técnica | Dónde | Qué hace |
|---|---|---|
| **SpatialGrid** (rejilla espacial) | Clase `SpatialGrid` | Divide el mundo en celdas de 220 px. En cada cuadro se insertan planetas, estrellas y asteroides en sus celdas, y solo se revisan las colisiones de las entidades que están en las celdas cercanas a la nave, en lugar de compararla con todas. |
| **Doble buffering** | `Game.render()` | Toda la escena se dibuja primero en un canvas fuera de pantalla (back buffer) y al final se copia de una sola vez al canvas visible. Así nunca se ve un cuadro a medio dibujar. |
| **Bloom Buffer** | `Game._renderBloomBuffer()` | Las fuentes de luz (planetas, estrellas y nave) se dibujan en un canvas al 25 % de la resolución, que luego se estira y se mezcla con modo aditivo (`lighter`). Se obtiene un resplandor neón sin usar `shadowBlur`, que es muy costoso. |
| **Pool de partículas** | Clase `Particle` | Se crean 260 partículas una sola vez y se reutilizan en ciclo. No se crean objetos nuevos durante el juego, así el recolector de basura no provoca tirones. |
| **Sprites pre-renderizados** | `Game._crearNebulosas()` | Las nebulosas del fondo se dibujan una vez en pequeños canvas y después solo se copian, en lugar de calcular sus degradados en cada cuadro. |
| **Delta time limitado** | `Game.update()` | El movimiento depende del tiempo real entre cuadros (máximo 0.05 s), así el juego va a la misma velocidad en pantallas de 60 Hz o 144 Hz y no da saltos si la pestaña se congela. |
| **Render bajo demanda** | `Game.startLoop()` | En pausa y en Game Over solo se vuelve a dibujar cuando algo cambia. |
| **Densidad de píxeles limitada** | `Game.resize()` | La resolución interna se limita a 2× en pantallas de alta densidad para no dibujar más píxeles de los necesarios. |
| **Limpieza de entidades** | `Game.update()` | Los planetas, estrellas y asteroides que quedan fuera de la cámara se eliminan, y los nuevos se generan solo cuando hacen falta. |

## 6. Estructura del código

```
orbita/
├── index.html   # Estructura: canvas, HUD y pantallas (inicio, pausa, game over)
├── style.css    # Estilos neón, HUD, botones, modales y diseño responsivo
└── game.js      # Lógica completa del juego
```

Clases de `game.js`:

| Clase | Responsabilidad |
|---|---|
| `SpatialGrid` | Rejilla espacial para consultas de colisión |
| `AudioManager` | Música y efectos con Web Audio API |
| `Camera` | Seguimiento suave, zoom al capturar y sacudida de pantalla |
| `Particle` | Partícula reutilizable para estelas y explosiones |
| `Star` | Estrella coleccionable |
| `Asteroid` | Obstáculo móvil |
| `Planet` | Planeta con zona de captura, sentido de giro y movimiento opcional |
| `Player` | Nave: física orbital, lanzamiento y captura |
| `Game` | Controlador principal: estados, generación de niveles, puntuación, UI y bucle de juego |

### Datos guardados en el navegador (`localStorage`)
- Récord de puntuación.
- Dificultad elegida.
- Preferencia de sonido.
- Desafíos y estelas del día.

## 7. Cómo ejecutarlo localmente

No necesita instalación. Basta con descargar el repositorio y abrir `index.html` en el navegador, o servirlo con un servidor local:

```bash
python -m http.server 8000
```

y abrir `http://localhost:8000`.

## 8. Video explicativo del código

_Próximamente._
