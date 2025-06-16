<template>
  <div class="snake-game">
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
          <span class="label">Niveau:</span>
          <span class="value">{{ level }}</span>
        </div>
        <div class="score-item" v-if="combo > 0">
          <span class="label">Combo:</span>
          <span class="value combo">{{ combo }}x</span>
        </div>
      </div>

      <div class="game-stats">
        <div class="fps">FPS: {{ actualFPS }}</div>
        <div class="length">Longueur: {{ snake.length }}</div>
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
          <h3>🐍 Snake Game</h3>
          <p>Utilisez les flèches ou WASD pour diriger le serpent</p>
          <div class="menu-buttons">
            <button @click="startGame" class="game-button">
              🚀 Commencer
            </button>
            <button @click="showHelp = !showHelp" class="game-button secondary">
              ❓ Aide
            </button>
          </div>

          <div v-if="showHelp" class="help-panel">
            <h4>Comment jouer :</h4>
            <ul>
              <li>🔄 Dirigez le serpent avec les flèches ou WASD</li>
              <li>🍎 Mangez les pommes rouges pour grandir</li>
              <li>⚡ Plus vous mangez vite, plus vous gagnez de points</li>
              <li>🚫 Évitez les murs et votre propre corps</li>
              <li>⏸️ Appuyez sur ESPACE pour pauser</li>
            </ul>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'paused'" class="game-overlay">
        <div class="pause-menu">
          <h3>⏸️ Pause</h3>
          <div class="menu-buttons">
            <button @click="resumeGame" class="game-button">
              ▶️ Reprendre
            </button>
            <button @click="goToMenu" class="game-button secondary">
              🏠 Menu
            </button>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'gameOver'" class="game-overlay">
        <div class="game-over">
          <h3>💀 Game Over</h3>
          <div class="final-stats">
            <p class="final-score">Score final: {{ formatScore(currentScore) }}</p>
            <p v-if="isNewRecord" class="new-record">🏆 Nouveau record !</p>
            <div class="stats-grid">
              <div class="stat">
                <span class="stat-label">Longueur:</span>
                <span class="stat-value">{{ snake.length }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Niveau:</span>
                <span class="stat-value">{{ level }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Meilleur combo:</span>
                <span class="stat-value">{{ bestCombo }}</span>
              </div>
            </div>
          </div>
          <div class="menu-buttons">
            <button @click="startGame" class="game-button">
              🔄 Rejouer
            </button>
            <button @click="goToMenu" class="game-button secondary">
              🏠 Menu
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Contrôles mobiles -->
    <div class="mobile-controls" v-if="isMobile">
      <div class="dpad">
        <button @touchstart="handleMobileInput('up')" class="dpad-btn dpad-up">↑</button>
        <div class="dpad-middle">
          <button @touchstart="handleMobileInput('left')" class="dpad-btn dpad-left">←</button>
          <button @touchstart="handleMobileInput('right')" class="dpad-btn dpad-right">→</button>
        </div>
        <button @touchstart="handleMobileInput('down')" class="dpad-btn dpad-down">↓</button>
      </div>

      <div class="action-buttons">
        <button @click="pauseGame" class="action-btn">⏸️</button>
      </div>
    </div>

    <!-- Instructions -->
    <div class="instructions">
      <p v-if="!isMobile">
        🎮 <strong>Contrôles:</strong> Flèches ou WASD pour bouger • ESPACE pour pause
      </p>
      <p v-else>
        📱 <strong>Contrôles tactiles:</strong> Utilisez les boutons ci-dessus
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
const canvasWidth = 400
const canvasHeight = 400
const gridSize = 20
const baseSpeed = 150 // ms entre chaque mouvement

// État du jeu
const gameCanvas = ref(null)
const gameState = ref('menu') // 'menu', 'playing', 'paused', 'gameOver'
const showHelp = ref(false)
const isMobile = ref(false)

// Variables du serpent
const snake = ref([{ x: 200, y: 200 }])
const direction = ref({ x: gridSize, y: 0 })
const nextDirection = ref({ x: gridSize, y: 0 })

// Nourriture
const food = ref({ x: 0, y: 0 })
const foodEaten = ref(0)

// Timing
let lastMoveTime = 0
let gameSpeed = baseSpeed
let ctx = null

// Déclaration de la fonction updateGame AVANT d'utiliser useGameLoop
function updateGame(deltaTime) {
  if (gameState.value !== 'playing') return

  // Vérifier les contrôles
  handleInput()

  // Mettre à jour le jeu selon la vitesse
  lastMoveTime += deltaTime
  if (lastMoveTime >= gameSpeed) {
    moveSnake()
    lastMoveTime = 0
  }

  // Dessiner
  draw()
}

// MAINTENANT on peut utiliser les composables
const { currentScore, highScore, level, combo, bestCombo, isNewRecord, addPoints, endGame, resetGame, formatScore } = useScore('snake')
const { getDirection, actions, bindToElement } = useKeyboard()
const { start: startLoop, stop: stopLoop, isRunning, actualFPS } = useGameLoop(updateGame, 60)

// Détection mobile
onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  ctx = gameCanvas.value.getContext('2d')

  // Lier les contrôles au canvas
  const unbind = bindToElement(gameCanvas.value)

  // Générer la première nourriture
  generateFood()

  // Cleanup
  onUnmounted(() => {
    unbind?.()
    stopLoop()
  })
})

// Gestion des contrôles
function handleInput() {
  const dir = getDirection()

  // Pause
  if (actions.value.space) {
    pauseGame()
    return
  }

  // Direction
  if (dir.x !== 0 || dir.y !== 0) {
    const newDir = {
      x: dir.x * gridSize,
      y: dir.y * gridSize
    }

    // Empêcher le demi-tour
    if (newDir.x !== -direction.value.x && newDir.y !== -direction.value.y) {
      nextDirection.value = newDir
    }
  }
}

// Contrôles mobiles
function handleMobileInput(dir) {
  if (gameState.value !== 'playing') return

  const directions = {
    up: { x: 0, y: -gridSize },
    down: { x: 0, y: gridSize },
    left: { x: -gridSize, y: 0 },
    right: { x: gridSize, y: 0 }
  }

  const newDir = directions[dir]
  if (newDir && newDir.x !== -direction.value.x && newDir.y !== -direction.value.y) {
    nextDirection.value = newDir
  }
}

// Déplacer le serpent
function moveSnake() {
  direction.value = { ...nextDirection.value }

  const head = { ...snake.value[0] }
  head.x += direction.value.x
  head.y += direction.value.y

  // Vérifier collisions avec les murs
  if (head.x < 0 || head.x >= canvasWidth || head.y < 0 || head.y >= canvasHeight) {
    gameOver()
    return
  }

  // Vérifier collisions avec le corps
  if (snake.value.some(segment => segment.x === head.x && segment.y === head.y)) {
    gameOver()
    return
  }

  snake.value.unshift(head)

  // Vérifier si on mange la nourriture
  if (head.x === food.value.x && head.y === food.value.y) {
    eatFood()
  } else {
    snake.value.pop()
  }
}

// Manger la nourriture
function eatFood() {
  foodEaten.value++

  // Calculer les points avec combo
  const basePoints = 10
  const speedBonus = Math.max(0, (baseSpeed - gameSpeed) / 10) // Bonus de vitesse
  const lengthBonus = snake.value.length * 2

  const totalPoints = basePoints + speedBonus + lengthBonus
  addPoints(totalPoints, { combo: true })

  // Générer nouvelle nourriture
  generateFood()

  // Augmenter la vitesse
  if (foodEaten.value % 5 === 0) {
    gameSpeed = Math.max(80, gameSpeed - 10) // Plus rapide mais pas trop
  }
}

// Générer de la nourriture
function generateFood() {
  let newFood
  let attempts = 0

  do {
    newFood = {
      x: Math.floor(Math.random() * (canvasWidth / gridSize)) * gridSize,
      y: Math.floor(Math.random() * (canvasHeight / gridSize)) * gridSize
    }
    attempts++
  } while (
      snake.value.some(segment => segment.x === newFood.x && segment.y === newFood.y) &&
      attempts < 100
      )

  food.value = newFood
}

// Dessiner le jeu
function draw() {
  if (!ctx) return

  // Effacer le canvas
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Dessiner la grille
  drawGrid()

  // Dessiner le serpent
  drawSnake()

  // Dessiner la nourriture
  drawFood()
}

function drawGrid() {
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1

  for (let x = 0; x <= canvasWidth; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvasHeight)
    ctx.stroke()
  }

  for (let y = 0; y <= canvasHeight; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasWidth, y)
    ctx.stroke()
  }
}

function drawSnake() {
  snake.value.forEach((segment, index) => {
    if (index === 0) {
      // Tête du serpent
      ctx.fillStyle = '#0f0'
      ctx.fillRect(segment.x + 1, segment.y + 1, gridSize - 2, gridSize - 2)

      // Yeux de la tête
      ctx.fillStyle = '#000'
      ctx.fillRect(segment.x + 4, segment.y + 4, 3, 3)
      ctx.fillRect(segment.x + 13, segment.y + 4, 3, 3)
    } else {
      // Corps du serpent
      const alpha = 1 - (index * 0.05) // Effet de transparence
      ctx.fillStyle = `rgba(0, 255, 0, ${Math.max(alpha, 0.3)})`
      ctx.fillRect(segment.x + 1, segment.y + 1, gridSize - 2, gridSize - 2)
    }
  })
}

function drawFood() {
  // Nourriture qui pulse
  const pulseScale = 0.8 + Math.sin(Date.now() / 200) * 0.2
  const size = (gridSize - 2) * pulseScale
  const offset = (gridSize - size) / 2

  ctx.fillStyle = '#f00'
  ctx.fillRect(
      food.value.x + offset,
      food.value.y + offset,
      size,
      size
  )

  // Effet de brillance
  ctx.fillStyle = '#ff6666'
  ctx.fillRect(
      food.value.x + offset + 2,
      food.value.y + offset + 2,
      size / 3,
      size / 3
  )
}

// Gestion des états de jeu
function startGame() {
  resetGame()

  // Réinitialiser les variables
  snake.value = [{ x: 200, y: 200 }]
  direction.value = { x: gridSize, y: 0 }
  nextDirection.value = { x: gridSize, y: 0 }
  foodEaten.value = 0
  gameSpeed = baseSpeed
  lastMoveTime = 0

  generateFood()
  gameState.value = 'playing'

  // Démarrer la boucle
  startLoop()

  // Focus sur le canvas
  nextTick(() => {
    gameCanvas.value?.focus()
  })
}

function pauseGame() {
  if (gameState.value === 'playing') {
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

function gameOver() {
  gameState.value = 'gameOver'
  stopLoop()
  endGame()
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
.snake-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

/* Interface de jeu */
.game-ui {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 400px;
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
  border: 1px solid #00ff00;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.score-item .label {
  opacity: 0.8;
}

.score-item .value {
  color: #00ff00;
  margin-left: 0.5rem;
}

.score-item .value.combo {
  color: #ff0;
  animation: pulse 0.5s infinite;
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
  border: 3px solid #00ff00;
  border-radius: 8px;
  background: #000;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
}

.game-canvas:focus {
  outline: none;
  border-color: #ff00ff;
  box-shadow: 0 0 30px rgba(255, 0, 255, 0.5);
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

.menu, .pause-menu, .game-over {
  background: rgba(0, 20, 0, 0.95);
  padding: 2rem;
  border-radius: 12px;
  border: 2px solid #00ff00;
  text-align: center;
  max-width: 300px;
}

.menu h3, .pause-menu h3, .game-over h3 {
  margin-bottom: 1rem;
  color: #00ff00;
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
  color: #00ff00;
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
  color: #00ff00;
  margin-bottom: 0.5rem;
}

.new-record {
  color: #ff0;
  font-weight: bold;
  animation: pulse 1s infinite;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
}

.stat-label {
  opacity: 0.7;
}

.stat-value {
  color: #00ff00;
  font-weight: bold;
}

/* Contrôles mobiles */
.mobile-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 400px;
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
  background: rgba(0, 255, 0, 0.2);
  border: 2px solid #00ff00;
  color: #00ff00;
  font-size: 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.dpad-btn:active {
  background: rgba(0, 255, 0, 0.4);
  transform: scale(0.95);
}

.dpad-up { grid-column: 2; grid-row: 1; }
.dpad-middle { grid-column: 1 / 4; grid-row: 2; display: flex; gap: 4px; }
.dpad-left, .dpad-right { flex: 1; }
.dpad-down { grid-column: 2; grid-row: 3; }

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.action-btn {
  width: 60px;
  height: 60px;
  background: rgba(255, 0, 255, 0.2);
  border: 2px solid #ff00ff;
  color: #ff00ff;
  font-size: 1.5rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:active {
  background: rgba(255, 0, 255, 0.4);
  transform: scale(0.95);
}

/* Instructions */
.instructions {
  text-align: center;
  opacity: 0.8;
  font-size: 0.9rem;
  max-width: 400px;
}

/* Responsive */
@media (max-width: 480px) {
  .snake-game {
    padding: 1rem;
    gap: 1rem;
  }

  .game-canvas {
    width: 300px;
    height: 300px;
  }

  .score-panel {
    justify-content: center;
    font-size: 8px;
  }

  .mobile-controls {
    max-width: 300px;
  }

  .dpad {
    width: 100px;
    height: 100px;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}
</style>