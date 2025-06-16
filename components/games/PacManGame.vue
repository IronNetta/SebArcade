<template>
  <div class="pacman-game">
    <!-- Interface de jeu -->
    <div class="game-ui">
      <div class="score-panel">
        <div class="score-item">
          <span class="label">Score:</span>
          <span class="value">{{ formatScore(currentScore) }}</span>
        </div>
        <div class="score-item">
          <span class="label">Record:</span>
          <span class="value">{{ formatScore(highScore) }}</span>
        </div>
        <div class="score-item">
          <span class="label">Vies:</span>
          <span class="value">{{ '🟡'.repeat(lives) }}</span>
        </div>
        <div class="score-item">
          <span class="label">Niveau:</span>
          <span class="value">{{ level }}</span>
        </div>
      </div>

      <div class="game-stats">
        <div class="dots">Dots: {{ dotsRemaining }}</div>
        <div class="bonus">Bonus: {{ bonusTimer > 0 ? Math.ceil(bonusTimer / 1000) : 0 }}s</div>
        <div class="fps">FPS: {{ actualFPS }}</div>
      </div>
    </div>

    <!-- Zone de jeu -->
    <div class="game-area">
      <canvas
          ref="gameCanvas"
          :width="canvasWidth"
          :height="canvasHeight"
          class="game-canvas"
          tabindex="0"
      />

      <!-- Overlays -->
      <div v-if="gameState === 'menu'" class="game-overlay">
        <div class="menu">
          <h3>👻 Pac-Man</h3>
          <p>Mangez tous les points en évitant les fantômes !</p>
          <div class="menu-buttons">
            <button @click="startGame" class="game-button">
              🚀 Commencer la chasse
            </button>
            <button @click="showHelp = !showHelp" class="game-button secondary">
              ❓ Contrôles
            </button>
          </div>

          <div v-if="showHelp" class="help-panel">
            <h4>Comment jouer :</h4>
            <ul>
              <li>🔄 Flèches pour diriger Pac-Man</li>
              <li>🟡 Mangez tous les petits points (10 pts)</li>
              <li>🔵 Les gros points donnent des pouvoirs (50 pts)</li>
              <li>👻 Évitez les fantômes (ou mangez-les en mode power)</li>
              <li>🍒 Attrapez les fruits bonus</li>
              <li>🎯 Videz le labyrinthe pour passer au niveau suivant</li>
            </ul>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'paused'" class="game-overlay">
        <div class="pause-menu">
          <h3>⏸️ Pause</h3>
          <div class="menu-buttons">
            <button @click="resumeGame" class="game-button">
              ▶️ Reprendre la chasse
            </button>
            <button @click="goToMenu" class="game-button secondary">
              🏠 Abandonner
            </button>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'gameOver'" class="game-overlay">
        <div class="game-over">
          <h3>👻 Game Over</h3>
          <div class="final-stats">
            <p class="final-score">Score final: {{ formatScore(currentScore) }}</p>
            <p v-if="isNewRecord" class="new-record">🏆 Nouveau record !</p>
            <div class="stats-grid">
              <div class="stat">
                <span class="stat-label">Niveau atteint:</span>
                <span class="stat-value">{{ level }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Fantômes mangés:</span>
                <span class="stat-value">{{ ghostsEaten }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Fruits attrapés:</span>
                <span class="stat-value">{{ fruitsEaten }}</span>
              </div>
            </div>
          </div>
          <div class="menu-buttons">
            <button @click="startGame" class="game-button">
              🔄 Nouvelle partie
            </button>
            <button @click="goToMenu" class="game-button secondary">
              🏠 Menu
            </button>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'levelComplete'" class="game-overlay">
        <div class="level-complete">
          <h3>🎉 Niveau {{ level - 1 }} Terminé !</h3>
          <p>Bonus de niveau: +{{ levelBonus }} points</p>
          <p>Niveau {{ level }} - Les fantômes sont plus rapides...</p>
          <div class="level-progress">
            <div class="progress-bar">
              <div class="progress" :style="{ width: levelProgress + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'powerMode'" class="power-indicator">
        <div class="power-text">🔵 POWER MODE ! 🔵</div>
        <div class="power-timer">{{ Math.ceil(powerModeTimer / 1000) }}s</div>
      </div>
    </div>

    <!-- Contrôles mobiles -->
    <div class="mobile-controls" v-if="isMobile">
      <div class="dpad">
        <button @touchstart="setDirection('up')" class="dpad-btn dpad-up">↑</button>
        <div class="dpad-middle">
          <button @touchstart="setDirection('left')" class="dpad-btn dpad-left">←</button>
          <button @touchstart="setDirection('right')" class="dpad-btn dpad-right">→</button>
        </div>
        <button @touchstart="setDirection('down')" class="dpad-btn dpad-down">↓</button>
      </div>

      <div class="action-controls">
        <button @click="pauseGame" class="action-btn">⏸️</button>
      </div>
    </div>

    <!-- Instructions -->
    <div class="instructions">
      <p v-if="!isMobile">
        🎮 <strong>Contrôles:</strong> Flèches pour bouger • P pour pause
      </p>
      <p v-else">
      📱 <strong>Contrôles tactiles:</strong> Utilisez le D-pad ci-dessus
      </p>
    </div>
  </div>
</template>

<script setup>
// Import manuel des composables depuis le dossier games/
import { useScore } from '~/composables/games/useScore'
import { useKeyboard } from '~/composables/games/useKeyboard'
import { useGameLoop } from '~/composables/games/useGameLoop'

// Configuration du jeu
const canvasWidth = 600
const canvasHeight = 600
const tileSize = 20
const gridWidth = 30
const gridHeight = 30

// Labyrinthe (0 = vide, 1 = mur, 2 = point, 3 = power pellet, 4 = tunnel)
const originalMaze = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,2,1,1,2,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,1,1,1,1,2,1,1,1,1,1,2,2,1,1,2,2,1,1,1,1,1,2,1,1,1,1,3,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,2,1,1,2,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,2,1,1,2,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,1,1,0,0,0,0,0,0,1,1,0,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,1,2,1,1,0,1,1,1,1,0,0,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
  [4,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0,4],
  [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,2,1,1,2,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,3,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,2,1,1,2,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
]

// État du jeu
const gameCanvas = ref(null)
const gameState = ref('menu') // 'menu', 'playing', 'paused', 'gameOver', 'levelComplete', 'powerMode'
const showHelp = ref(false)
const isMobile = ref(false)

// Variables de jeu
const lives = ref(3)
const level = ref(1)
const ghostsEaten = ref(0)
const fruitsEaten = ref(0)
const dotsRemaining = ref(0)
const levelBonus = ref(0)
const levelProgress = ref(0)
const powerModeTimer = ref(0)
const bonusTimer = ref(0)

// Entités
const pacman = ref({
  x: 14,
  y: 23,
  direction: { x: 0, y: 0 },
  nextDirection: { x: 0, y: 0 },
  animation: 0,
  mouthOpen: true
})

const ghosts = ref([
  { x: 14, y: 11, direction: { x: 1, y: 0 }, color: '#ff0000', mode: 'chase', target: { x: 0, y: 0 }, name: 'blinky' },
  { x: 14, y: 13, direction: { x: 0, y: -1 }, color: '#ffb8ff', mode: 'scatter', target: { x: 0, y: 0 }, name: 'pinky' },
  { x: 13, y: 13, direction: { x: 0, y: -1 }, color: '#00ffff', mode: 'scatter', target: { x: 0, y: 0 }, name: 'inky' },
  { x: 15, y: 13, direction: { x: 0, y: -1 }, color: '#ffb852', mode: 'scatter', target: { x: 0, y: 0 }, name: 'clyde' }
])

const maze = ref([])
const fruits = ref([])

// Timing
let ctx = null
let lastMove = 0
let moveDelay = 200
let ghostMoveDelay = 300
let lastGhostMove = 0
let modeTimer = 0
let currentGhostMode = 'scatter'
let levelCompleteTimer = 0

// Fonction updateGame définie avant useGameLoop
function updateGame(deltaTime) {
  if (gameState.value !== 'playing') {
    if (gameState.value === 'levelComplete') {
      updateLevelComplete(deltaTime)
    }
    return
  }

  // Gestion des contrôles
  handleInput()

  // Mise à jour des entités
  updatePacman(deltaTime)
  updateGhosts(deltaTime)
  updateTimers(deltaTime)

  // Vérifications
  checkCollisions()
  checkLevelComplete()

  // Rendu
  draw()
}

// Composables
const { currentScore, highScore, isNewRecord, addPoints, endGame, resetGame, formatScore } = useScore('pacman')
const { arrows, actions, bindToElement } = useKeyboard()
const { start: startLoop, stop: stopLoop, actualFPS } = useGameLoop(updateGame, 60)

// Initialisation
onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  ctx = gameCanvas.value.getContext('2d')

  const unbind = bindToElement(gameCanvas.value)

  // Initialiser le labyrinthe dans nextTick pour s'assurer que tout est prêt
  nextTick(() => {
    initializeMaze()
  })

  onUnmounted(() => {
    unbind?.()
    stopLoop()
  })
})

// Gestion des contrôles
function handleInput() {
  let newDirection = { x: 0, y: 0 }

  if (arrows.value.up) newDirection = { x: 0, y: -1 }
  else if (arrows.value.down) newDirection = { x: 0, y: 1 }
  else if (arrows.value.left) newDirection = { x: -1, y: 0 }
  else if (arrows.value.right) newDirection = { x: 1, y: 0 }

  if (newDirection.x !== 0 || newDirection.y !== 0) {
    pacman.value.nextDirection = newDirection
  }

  if (actions.value.escape) {
    pauseGame()
  }
}

// Contrôles mobiles
function setDirection(dir) {
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  }

  pacman.value.nextDirection = directions[dir]
}

// Initialisation du labyrinthe
function initializeMaze() {
  maze.value = originalMaze.map(row => [...row])
  countDots()
}

function countDots() {
  dotsRemaining.value = 0
  if (!maze.value || maze.value.length === 0) return // ✅ Protection ajoutée

  for (let y = 0; y < maze.value.length; y++) {
    if (!maze.value[y]) continue // ✅ Protection ajoutée
    for (let x = 0; x < maze.value[y].length; x++) {
      if (maze.value[y][x] === 2 || maze.value[y][x] === 3) {
        dotsRemaining.value++
      }
    }
  }
}

// Mise à jour de Pac-Man
function updatePacman(deltaTime) {
  lastMove += deltaTime

  if (lastMove >= moveDelay) {
    // Essayer de changer de direction
    const nextX = pacman.value.x + pacman.value.nextDirection.x
    const nextY = pacman.value.y + pacman.value.nextDirection.y

    if (canMove(nextX, nextY)) {
      pacman.value.direction = { ...pacman.value.nextDirection }
    }

    // Bouger dans la direction actuelle
    const newX = pacman.value.x + pacman.value.direction.x
    const newY = pacman.value.y + pacman.value.direction.y

    if (canMove(newX, newY)) {
      pacman.value.x = newX
      pacman.value.y = newY

      // Gestion des tunnels
      if (pacman.value.x < 0) pacman.value.x = gridWidth - 1
      if (pacman.value.x >= gridWidth) pacman.value.x = 0

      // Manger les points
      if (maze.value && maze.value[pacman.value.y] && maze.value[pacman.value.y][pacman.value.x]) {
        const tile = maze.value[pacman.value.y][pacman.value.x]
        if (tile === 2) {
          maze.value[pacman.value.y][pacman.value.x] = 0
          addPoints(10)
          dotsRemaining.value--
        } else if (tile === 3) {
          maze.value[pacman.value.y][pacman.value.x] = 0
          addPoints(50)
          dotsRemaining.value--
          enterPowerMode()
        }
      }
    }

    // Animation de la bouche
    pacman.value.animation = (pacman.value.animation + 1) % 20
    pacman.value.mouthOpen = pacman.value.animation < 10

    lastMove = 0
  }
}

// Mise à jour des fantômes
function updateGhosts(deltaTime) {
  lastGhostMove += deltaTime

  if (lastGhostMove >= ghostMoveDelay) {
    ghosts.value.forEach(ghost => {
      updateGhostAI(ghost)
      moveGhost(ghost)
    })
    lastGhostMove = 0
  }
}

function updateGhostAI(ghost) {
  // Définir la cible selon le mode
  switch (ghost.mode) {
    case 'chase':
      setChaseTarget(ghost)
      break
    case 'scatter':
      setScatterTarget(ghost)
      break
    case 'frightened':
      // Mouvement aléatoire
      break
  }

  // Choisir la meilleure direction
  if (ghost.mode !== 'frightened') {
    ghost.direction = getBestDirection(ghost)
  } else {
    // Mouvement aléatoire en mode effrayé
    const directions = getValidDirections(ghost.x, ghost.y)
    if (directions.length > 0) {
      ghost.direction = directions[Math.floor(Math.random() * directions.length)]
    }
  }
}

function setChaseTarget(ghost) {
  switch (ghost.name) {
    case 'blinky':
      // Cible directe sur Pac-Man
      ghost.target = { x: pacman.value.x, y: pacman.value.y }
      break
    case 'pinky':
      // 4 cases devant Pac-Man
      ghost.target = {
        x: pacman.value.x + pacman.value.direction.x * 4,
        y: pacman.value.y + pacman.value.direction.y * 4
      }
      break
    case 'inky':
      // Position complexe basée sur Blinky
      const blinky = ghosts.value[0]
      ghost.target = {
        x: pacman.value.x + (pacman.value.x - blinky.x),
        y: pacman.value.y + (pacman.value.y - blinky.y)
      }
      break
    case 'clyde':
      // Si proche de Pac-Man, scatter, sinon chase
      const distance = Math.abs(ghost.x - pacman.value.x) + Math.abs(ghost.y - pacman.value.y)
      if (distance > 8) {
        ghost.target = { x: pacman.value.x, y: pacman.value.y }
      } else {
        ghost.target = { x: 0, y: gridHeight - 1 }
      }
      break
  }
}

function setScatterTarget(ghost) {
  // Coins du labyrinthe
  const corners = {
    blinky: { x: gridWidth - 1, y: 0 },
    pinky: { x: 0, y: 0 },
    inky: { x: gridWidth - 1, y: gridHeight - 1 },
    clyde: { x: 0, y: gridHeight - 1 }
  }
  ghost.target = corners[ghost.name]
}

function getBestDirection(ghost) {
  const directions = getValidDirections(ghost.x, ghost.y)
  let bestDirection = ghost.direction
  let bestDistance = Infinity

  for (const dir of directions) {
    // Éviter le demi-tour sauf si nécessaire
    if (dir.x === -ghost.direction.x && dir.y === -ghost.direction.y && directions.length > 1) {
      continue
    }

    const newX = ghost.x + dir.x
    const newY = ghost.y + dir.y
    const distance = Math.abs(newX - ghost.target.x) + Math.abs(newY - ghost.target.y)

    if (distance < bestDistance) {
      bestDistance = distance
      bestDirection = dir
    }
  }

  return bestDirection
}

function getValidDirections(x, y) {
  const directions = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 }   // right
  ]

  return directions.filter(dir => {
    const newX = x + dir.x
    const newY = y + dir.y
    return canMove(newX, newY)
  })
}

function moveGhost(ghost) {
  const newX = ghost.x + ghost.direction.x
  const newY = ghost.y + ghost.direction.y

  if (canMove(newX, newY)) {
    ghost.x = newX
    ghost.y = newY

    // Gestion des tunnels
    if (ghost.x < 0) ghost.x = gridWidth - 1
    if (ghost.x >= gridWidth) ghost.x = 0
  }
}

// Utilitaires
function canMove(x, y) {
  if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
    return x < 0 || x >= gridWidth // Tunnels latéraux
  }
  if (!maze.value || !maze.value[y]) return false // ✅ Protection ajoutée
  return maze.value[y][x] !== 1
}

// Mode Power
function enterPowerMode() {
  powerModeTimer.value = 8000 // 8 secondes
  ghosts.value.forEach(ghost => {
    ghost.mode = 'frightened'
    // Inverser la direction
    ghost.direction.x *= -1
    ghost.direction.y *= -1
  })

  gameState.value = 'powerMode'
  setTimeout(() => {
    if (gameState.value === 'powerMode') {
      gameState.value = 'playing'
    }
  }, 100)
}

// Mise à jour des timers
function updateTimers(deltaTime) {
  // Power mode
  if (powerModeTimer.value > 0) {
    powerModeTimer.value -= deltaTime
    if (powerModeTimer.value <= 0) {
      ghosts.value.forEach(ghost => {
        ghost.mode = currentGhostMode
      })
    }
  }

  // Mode des fantômes
  modeTimer += deltaTime
  if (modeTimer >= 20000) { // 20 secondes
    currentGhostMode = currentGhostMode === 'scatter' ? 'chase' : 'scatter'
    ghosts.value.forEach(ghost => {
      if (ghost.mode !== 'frightened') {
        ghost.mode = currentGhostMode
      }
    })
    modeTimer = 0
  }

  // Bonus timer
  if (bonusTimer.value > 0) {
    bonusTimer.value -= deltaTime
  }
}

// Détection de collisions
function checkCollisions() {
  ghosts.value.forEach((ghost, index) => {
    if (ghost.x === pacman.value.x && ghost.y === pacman.value.y) {
      if (ghost.mode === 'frightened') {
        // Manger le fantôme
        addPoints(200 * Math.pow(2, ghostsEaten.value))
        ghostsEaten.value++

        // Remettre le fantôme au centre
        ghost.x = 14
        ghost.y = 13
        ghost.mode = currentGhostMode
      } else {
        // Pac-Man touché
        lives.value--
        if (lives.value <= 0) {
          gameState.value = 'gameOver'
          stopLoop()
          endGame()
        } else {
          // Reset positions
          resetPositions()
        }
      }
    }
  })
}

function resetPositions() {
  pacman.value.x = 14
  pacman.value.y = 23
  pacman.value.direction = { x: 0, y: 0 }

  ghosts.value[0] = { ...ghosts.value[0], x: 14, y: 11 }
  ghosts.value[1] = { ...ghosts.value[1], x: 14, y: 13 }
  ghosts.value[2] = { ...ghosts.value[2], x: 13, y: 13 }
  ghosts.value[3] = { ...ghosts.value[3], x: 15, y: 13 }
}

// Gestion des niveaux
function checkLevelComplete() {
  if (dotsRemaining.value === 0 && gameState.value === 'playing') {
    levelBonus.value = level.value * 1000
    addPoints(levelBonus.value)
    level.value++
    gameState.value = 'levelComplete'
    levelCompleteTimer = 0
    levelProgress.value = 0

    // Augmenter la difficulté
    moveDelay = Math.max(100, moveDelay - 10)
    ghostMoveDelay = Math.max(150, ghostMoveDelay - 15)

    stopLoop()
  }
}

function updateLevelComplete(deltaTime) {
  levelCompleteTimer += deltaTime
  levelProgress.value = Math.min((levelCompleteTimer / 3000) * 100, 100)

  if (levelCompleteTimer >= 3000) {
    initializeMaze()
    resetPositions()
    powerModeTimer.value = 0
    gameState.value = 'playing'
    startLoop()
  }
}

// Rendu
function draw() {
  if (!ctx) return

  // Fond
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Dessiner le labyrinthe
  drawMaze()

  // Dessiner les entités
  drawPacman()
  drawGhosts()
  drawFruits()
}

function drawMaze() {
  if (!maze.value || maze.value.length === 0) return // ✅ Protection ajoutée

  for (let y = 0; y < maze.value.length; y++) {
    if (!maze.value[y]) continue // ✅ Protection ajoutée
    for (let x = 0; x < maze.value[y].length; x++) {
      const tile = maze.value[y][x]
      const drawX = x * tileSize
      const drawY = y * tileSize

      switch (tile) {
        case 1: // Mur
          ctx.fillStyle = '#0000ff'
          ctx.fillRect(drawX, drawY, tileSize, tileSize)
          break
        case 2: // Point
          ctx.fillStyle = '#ffff00'
          ctx.beginPath()
          ctx.arc(drawX + tileSize/2, drawY + tileSize/2, 2, 0, Math.PI * 2)
          ctx.fill()
          break
        case 3: // Power pellet
          ctx.fillStyle = '#ffff00'
          ctx.beginPath()
          ctx.arc(drawX + tileSize/2, drawY + tileSize/2, 6, 0, Math.PI * 2)
          ctx.fill()
          break
      }
    }
  }
}

function drawPacman() {
  const drawX = pacman.value.x * tileSize + tileSize/2
  const drawY = pacman.value.y * tileSize + tileSize/2
  const radius = 8

  ctx.fillStyle = '#ffff00'
  ctx.beginPath()

  if (pacman.value.mouthOpen) {
    // Pac-Man avec bouche ouverte
    let startAngle = 0
    let endAngle = 2 * Math.PI

    // Orientation de la bouche selon la direction
    if (pacman.value.direction.x === 1) { // droite
      startAngle = 0.2 * Math.PI
      endAngle = 1.8 * Math.PI
    } else if (pacman.value.direction.x === -1) { // gauche
      startAngle = 1.2 * Math.PI
      endAngle = 0.8 * Math.PI
    } else if (pacman.value.direction.y === 1) { // bas
      startAngle = 1.7 * Math.PI
      endAngle = 1.3 * Math.PI
    } else if (pacman.value.direction.y === -1) { // haut
      startAngle = 0.7 * Math.PI
      endAngle = 0.3 * Math.PI
    }

    ctx.arc(drawX, drawY, radius, startAngle, endAngle)
    ctx.lineTo(drawX, drawY)
  } else {
    // Pac-Man fermé (cercle complet)
    ctx.arc(drawX, drawY, radius, 0, 2 * Math.PI)
  }

  ctx.fill()
}

function drawGhosts() {
  ghosts.value.forEach(ghost => {
    const drawX = ghost.x * tileSize + tileSize/2
    const drawY = ghost.y * tileSize + tileSize/2
    const radius = 8

    // Couleur du fantôme
    if (ghost.mode === 'frightened') {
      if (powerModeTimer.value > 2000) {
        ctx.fillStyle = '#0000ff'
      } else {
        // Clignote en fin de power mode
        ctx.fillStyle = Math.floor(Date.now() / 200) % 2 ? '#0000ff' : '#ffffff'
      }
    } else {
      ctx.fillStyle = ghost.color
    }

    // Corps du fantôme
    ctx.beginPath()
    ctx.arc(drawX, drawY - 2, radius, Math.PI, 0, false)
    ctx.lineTo(drawX + radius, drawY + 6)
    ctx.lineTo(drawX + 4, drawY + 2)
    ctx.lineTo(drawX, drawY + 6)
    ctx.lineTo(drawX - 4, drawY + 2)
    ctx.lineTo(drawX - radius, drawY + 6)
    ctx.closePath()
    ctx.fill()

    // Yeux
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(drawX - 6, drawY - 6, 4, 6)
    ctx.fillRect(drawX + 2, drawY - 6, 4, 6)

    if (ghost.mode !== 'frightened') {
      // Pupilles
      ctx.fillStyle = '#000000'
      ctx.fillRect(drawX - 5 + ghost.direction.x, drawY - 4 + ghost.direction.y, 2, 3)
      ctx.fillRect(drawX + 3 + ghost.direction.x, drawY - 4 + ghost.direction.y, 2, 3)
    }
  })
}

function drawFruits() {
  fruits.value.forEach(fruit => {
    const drawX = fruit.x * tileSize + tileSize/2
    const drawY = fruit.y * tileSize + tileSize/2

    ctx.fillStyle = fruit.color
    ctx.fillRect(drawX - 6, drawY - 6, 12, 12)
  })
}

// Gestion des états de jeu
function startGame() {
  resetGame()

  // Reset des variables
  lives.value = 3
  level.value = 1
  ghostsEaten.value = 0
  fruitsEaten.value = 0
  powerModeTimer.value = 0
  bonusTimer.value = 0
  moveDelay = 200
  ghostMoveDelay = 300

  // Reset timing
  lastMove = 0
  lastGhostMove = 0
  modeTimer = 0
  currentGhostMode = 'scatter'

  // Reset entités
  resetPositions()
  initializeMaze()
  fruits.value = []

  gameState.value = 'playing'
  startLoop()

  nextTick(() => {
    gameCanvas.value?.focus()
  })
}

function pauseGame() {
  if (gameState.value === 'playing' || gameState.value === 'powerMode') {
    gameState.value = 'paused'
    stopLoop()
  }
}

function resumeGame() {
  if (gameState.value === 'paused') {
    gameState.value = 'playing'
    startLoop()
    nextTick(() => {
      gameCanvas.value?.focus()
    })
  }
}

function goToMenu() {
  gameState.value = 'menu'
  stopLoop()
  showHelp.value = false
}

// Dessiner l'état initial
onMounted(() => {
  nextTick(() => {
    if (ctx) {
      draw()
    }
  })
})
</script>

<style scoped>
.pacman-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

/* Interface de jeu */
.game-ui {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 600px;
}

.score-panel {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.score-item {
  background: rgba(0, 0, 0, 0.7);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid #ffff00;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.score-item .label {
  opacity: 0.8;
}

.score-item .value {
  color: #ffff00;
  margin-left: 0.5rem;
}

.game-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.7;
}

/* Zone de jeu */
.game-area {
  position: relative;
}

.game-canvas {
  border: 3px solid #ffff00;
  border-radius: 8px;
  background: #000;
  box-shadow: 0 0 20px rgba(255, 255, 0, 0.3);
}

.game-canvas:focus {
  outline: none;
  border-color: #ff00ff;
  box-shadow: 0 0 30px rgba(255, 0, 255, 0.5);
}

/* Indicateur Power Mode */
.power-indicator {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 255, 0.9);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  animation: pulse 0.5s infinite;
}

.power-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  margin-bottom: 0.5rem;
}

.power-timer {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: #ffff00;
}

/* Overlays */
.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.menu, .pause-menu, .game-over, .level-complete {
  background: rgba(0, 0, 20, 0.95);
  padding: 2rem;
  border-radius: 12px;
  border: 2px solid #ffff00;
  text-align: center;
  max-width: 400px;
}

.menu h3, .pause-menu h3, .game-over h3, .level-complete h3 {
  margin-bottom: 1rem;
  color: #ffff00;
  font-family: 'Press Start 2P', monospace;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

.help-panel {
  margin-top: 1.5rem;
  text-align: left;
  background: rgba(0, 0, 0, 0.5);
  padding: 1rem;
  border-radius: 8px;
}

.help-panel h4 {
  color: #ffff00;
  margin-bottom: 0.5rem;
}

.help-panel ul {
  list-style: none;
  padding: 0;
}

.help-panel li {
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
}

.final-stats {
  margin: 1rem 0;
}

.final-score {
  font-size: 1.2rem;
  color: #ffff00;
  margin-bottom: 0.5rem;
}

.new-record {
  color: #ff0;
  font-weight: bold;
  animation: pulse 1s infinite;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  margin-top: 1rem;
}

.stat {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.stat-label {
  opacity: 0.7;
}

.stat-value {
  color: #ffff00;
  font-weight: bold;
}

/* Level complete */
.level-complete {
  animation: slideIn 0.5s ease-out;
}

.progress-bar {
  background: rgba(255, 255, 255, 0.2);
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 1rem;
}

.progress {
  background: linear-gradient(90deg, #ffff00, #ff0000);
  height: 100%;
  transition: width 0.1s ease;
}

/* Contrôles mobiles */
.mobile-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 600px;
  gap: 2rem;
}

.dpad {
  display: grid;
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
  width: 120px;
  height: 120px;
}

.dpad-btn {
  background: rgba(255, 255, 0, 0.2);
  border: 2px solid #ffff00;
  color: #ffff00;
  font-size: 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.dpad-btn:active {
  background: rgba(255, 255, 0, 0.4);
  transform: scale(0.95);
}

.dpad-up { grid-column: 2; grid-row: 1; }
.dpad-middle { grid-column: 1 / 4; grid-row: 2; display: flex; gap: 4px; }
.dpad-left, .dpad-right { flex: 1; }
.dpad-down { grid-column: 2; grid-row: 3; }

.action-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.action-btn {
  width: 60px;
  height: 60px;
  background: rgba(255, 0, 0, 0.2);
  border: 2px solid #ff0000;
  color: #ff0000;
  font-size: 1.5rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:active {
  background: rgba(255, 0, 0, 0.4);
  transform: scale(0.95);
}

/* Instructions */
.instructions {
  text-align: center;
  opacity: 0.8;
  font-size: 0.9rem;
  max-width: 600px;
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .pacman-game {
    padding: 1rem;
    gap: 1rem;
  }

  .game-canvas {
    width: 400px;
    height: 400px;
  }

  .score-panel {
    justify-content: center;
    font-size: 8px;
  }

  .mobile-controls {
    max-width: 400px;
    flex-direction: column;
    gap: 1rem;
  }

  .dpad {
    width: 100px;
    height: 100px;
  }
}

@media (max-width: 480px) {
  .game-canvas {
    width: 300px;
    height: 300px;
  }

  .dpad-btn {
    font-size: 1.2rem;
  }

  .action-btn {
    width: 50px;
    height: 50px;
  }
}
</style>