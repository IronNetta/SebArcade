<template>
  <div class="tetris-game">
    <!-- Interface de jeu -->
    <div class="game-ui">
      <div class="left-panel">
        <div class="score-section">
          <h3>Score</h3>
          <div class="score-value">{{ formatScore(currentScore) }}</div>
          <div class="high-score">Record: {{ formatScore(highScore) }}</div>
        </div>

        <div class="stats-section">
          <h3>Statistiques</h3>
          <div class="stat-item">
            <span>Niveau:</span>
            <span>{{ level }}</span>
          </div>
          <div class="stat-item">
            <span>Lignes:</span>
            <span>{{ lines }}</span>
          </div>
          <div class="stat-item">
            <span>Pièces:</span>
            <span>{{ pieces }}</span>
          </div>
          <div class="stat-item">
            <span>Vitesse:</span>
            <span>{{ speed }}ms</span>
          </div>
        </div>
      </div>

      <!-- Zone de jeu principale -->
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
            <h3>🧩 Tetris</h3>
            <p>Alignez les blocs pour faire des lignes complètes !</p>
            <div class="menu-buttons">
              <button @click="startGame" class="game-button">
                🚀 Commencer
              </button>
              <button @click="showHelp = !showHelp" class="game-button secondary">
                ❓ Contrôles
              </button>
            </div>

            <div v-if="showHelp" class="help-panel">
              <h4>Comment jouer :</h4>
              <ul>
                <li>🔄 Flèches ←→ pour déplacer</li>
                <li>↻ Flèche ↑ ou Z pour tourner</li>
                <li>⬇ Flèche ↓ pour descendre</li>
                <li>💨 ESPACE pour chute rapide</li>
                <li>🔄 C pour tenir/échanger</li>
                <li>🎯 Complétez des lignes pour les effacer</li>
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
            <h3>🔚 Game Over</h3>
            <div class="final-stats">
              <p class="final-score">Score final: {{ formatScore(currentScore) }}</p>
              <p v-if="isNewRecord" class="new-record">🏆 Nouveau record !</p>
              <div class="stats-grid">
                <div class="stat">
                  <span class="stat-label">Niveau atteint:</span>
                  <span class="stat-value">{{ level }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Lignes complétées:</span>
                  <span class="stat-value">{{ lines }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Efficacité:</span>
                  <span class="stat-value">{{ efficiency }}%</span>
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

      <!-- Panneau droit -->
      <div class="right-panel">
        <div class="next-piece">
          <h3>Suivant</h3>
          <canvas ref="nextCanvas" width="120" height="80" class="preview-canvas"></canvas>
        </div>

        <div class="hold-piece">
          <h3>Réserve</h3>
          <canvas ref="holdCanvas" width="120" height="80" class="preview-canvas"></canvas>
        </div>

        <div class="level-progress">
          <h3>Niveau {{ level }}</h3>
          <div class="progress-bar">
            <div class="progress" :style="{ width: levelProgress + '%' }"></div>
          </div>
          <div class="progress-text">{{ linesToNextLevel }} lignes restantes</div>
        </div>
      </div>
    </div>

    <!-- Contrôles mobiles -->
    <div class="mobile-controls" v-if="isMobile">
      <div class="movement-row">
        <button @touchstart="startAction('left')" @touchend="stopAction('left')" class="control-btn">←</button>
        <button @click="rotatePiece" class="control-btn rotate">↻</button>
        <button @touchstart="startAction('right')" @touchend="stopAction('right')" class="control-btn">→</button>
      </div>

      <div class="action-row">
        <button @touchstart="startAction('down')" @touchend="stopAction('down')" class="control-btn down">⬇</button>
        <button @click="hardDrop" class="control-btn drop">💨</button>
        <button @click="holdPiece" class="control-btn hold">🔄</button>
      </div>

      <div class="menu-row">
        <button @click="pauseGame" class="control-btn pause">⏸️</button>
      </div>
    </div>

    <!-- Instructions -->
    <div class="instructions">
      <p v-if="!isMobile">
        🎮 <strong>Contrôles:</strong> ←→ déplacer • ↑ tourner • ↓ descendre • ESPACE chute • C réserve • P pause
      </p>
      <p v-else>
        📱 <strong>Contrôles tactiles:</strong> Utilisez les boutons ci-dessous
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
const canvasWidth = 300
const canvasHeight = 600
const blockSize = 30
const gridWidth = 10
const gridHeight = 20

// Définition des pièces Tetris (Tetrominos)
const tetrominos = {
  I: {
    shape: [
      [0,0,0,0],
      [1,1,1,1],
      [0,0,0,0],
      [0,0,0,0]
    ],
    color: '#00ffff'
  },
  O: {
    shape: [
      [1,1],
      [1,1]
    ],
    color: '#ffff00'
  },
  T: {
    shape: [
      [0,1,0],
      [1,1,1],
      [0,0,0]
    ],
    color: '#ff00ff'
  },
  S: {
    shape: [
      [0,1,1],
      [1,1,0],
      [0,0,0]
    ],
    color: '#00ff00'
  },
  Z: {
    shape: [
      [1,1,0],
      [0,1,1],
      [0,0,0]
    ],
    color: '#ff0000'
  },
  J: {
    shape: [
      [1,0,0],
      [1,1,1],
      [0,0,0]
    ],
    color: '#0000ff'
  },
  L: {
    shape: [
      [0,0,1],
      [1,1,1],
      [0,0,0]
    ],
    color: '#ffa500'
  }
}

// État du jeu
const gameCanvas = ref(null)
const nextCanvas = ref(null)
const holdCanvas = ref(null)
const gameState = ref('menu') // 'menu', 'playing', 'paused', 'gameOver'
const showHelp = ref(false)
const isMobile = ref(false)

// Variables de jeu
const level = ref(1)
const lines = ref(0)
const pieces = ref(0)
const speed = ref(1000)
const linesToNextLevel = ref(10)

// Actions mobiles
const activeActions = ref(new Set())

// Grille de jeu
const grid = ref(Array(gridHeight).fill().map(() => Array(gridWidth).fill(0)))

// Pièces
const currentPiece = ref(null)
const nextPiece = ref(null)
const heldPiece = ref(null) // ✅ Renommé pour éviter le conflit
const canHold = ref(true)

// Fonction utilitaire pour formater les scores
const formatScore = (score) => {
  return score?.toLocaleString() || '0'
}

// Timing
let ctx = null
let nextCtx = null
let holdCtx = null
let lastFall = 0
let lastMove = 0
let moveDelay = 150

// Fonction updateGame définie avant useGameLoop
function updateGame(deltaTime) {
  if (gameState.value !== 'playing') return

  // Gestion des contrôles
  handleInput(deltaTime)

  // Chute automatique
  lastFall += deltaTime
  if (lastFall >= speed.value) {
    if (currentPiece.value) {
      if (canMovePiece(currentPiece.value, 0, 1)) {
        currentPiece.value.y++
      } else {
        placePiece()
      }
    }
    lastFall = 0
  }

  // Rendu
  draw()
}

// Composables
const { currentScore, highScore, isNewRecord, addPoints, endGame, resetGame } = useScore('tetris')
const { arrows, actions, isKeyPressed, bindToElement } = useKeyboard()
const { start: startLoop, stop: stopLoop, actualFPS } = useGameLoop(updateGame, 60)

// Computed
const levelProgress = computed(() => {
  const progress = ((10 - linesToNextLevel.value) / 10) * 100
  return Math.max(0, Math.min(100, progress))
})

const efficiency = computed(() => {
  if (pieces.value === 0) return 0
  return Math.round((lines.value * 4 / pieces.value) * 100)
})

// Initialisation
onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  ctx = gameCanvas.value.getContext('2d')
  nextCtx = nextCanvas.value.getContext('2d')
  holdCtx = holdCanvas.value.getContext('2d')

  const unbind = bindToElement(gameCanvas.value)

  onUnmounted(() => {
    unbind?.()
    stopLoop()
  })
})

// Gestion des contrôles
function handleInput(deltaTime) {
  lastMove += deltaTime

  // Déplacement latéral
  if ((arrows.value.left || activeActions.value.has('left')) && lastMove >= moveDelay) {
    if (currentPiece.value && canMovePiece(currentPiece.value, -1, 0)) {
      currentPiece.value.x--
      lastMove = 0
    }
  }

  if ((arrows.value.right || activeActions.value.has('right')) && lastMove >= moveDelay) {
    if (currentPiece.value && canMovePiece(currentPiece.value, 1, 0)) {
      currentPiece.value.x++
      lastMove = 0
    }
  }

  // Chute rapide
  if (arrows.value.down || activeActions.value.has('down')) {
    if (currentPiece.value && canMovePiece(currentPiece.value, 0, 1)) {
      currentPiece.value.y++
      addPoints(1) // Bonus pour la chute rapide
      lastFall = 0
    }
  }

  // Rotation
  if (isKeyPressed('ArrowUp') || isKeyPressed('KeyZ')) {
    rotatePiece()
  }

  // Chute dure
  if (actions.value.space) {
    hardDrop()
  }

  // Hold/Réserve
  if (isKeyPressed('KeyC')) {
    holdPiece()
  }

  // Pause
  if (actions.value.escape || isKeyPressed('KeyP')) {
    pauseGame()
  }
}

// Contrôles mobiles
function startAction(action) {
  activeActions.value.add(action)
}

function stopAction(action) {
  activeActions.value.delete(action)
}

// Génération de pièces
function getRandomPiece() {
  const types = Object.keys(tetrominos)
  const type = types[Math.floor(Math.random() * types.length)]
  const tetromino = tetrominos[type]

  return {
    type,
    shape: tetromino.shape.map(row => [...row]),
    color: tetromino.color,
    x: Math.floor(gridWidth / 2) - Math.floor(tetromino.shape[0].length / 2),
    y: 0
  }
}

function spawnNewPiece() {
  if (!nextPiece.value) {
    nextPiece.value = getRandomPiece()
  }

  currentPiece.value = nextPiece.value
  nextPiece.value = getRandomPiece()
  canHold.value = true
  pieces.value++

  // Vérifier si la partie est terminée
  if (!canMovePiece(currentPiece.value, 0, 0)) {
    gameState.value = 'gameOver'
    stopLoop()
    endGame()
  }
}

// Mouvement et rotation
function canMovePiece(piece, deltaX, deltaY, newShape = null) {
  const shape = newShape || piece.shape
  const newX = piece.x + deltaX
  const newY = piece.y + deltaY

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const boardX = newX + x
        const boardY = newY + y

        // Vérifier les limites
        if (boardX < 0 || boardX >= gridWidth || boardY >= gridHeight) {
          return false
        }

        // Vérifier les collisions avec les blocs placés
        if (boardY >= 0 && grid.value[boardY][boardX]) {
          return false
        }
      }
    }
  }

  return true
}

function rotatePiece() {
  if (!currentPiece.value) return

  const rotated = rotateMatrix(currentPiece.value.shape)

  // Test de base
  if (canMovePiece(currentPiece.value, 0, 0, rotated)) {
    currentPiece.value.shape = rotated
    return
  }

  // Wall kicks (ajustements pour éviter les murs)
  const kicks = [
    [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1]
  ]

  for (const [dx, dy] of kicks) {
    if (canMovePiece(currentPiece.value, dx, dy, rotated)) {
      currentPiece.value.x += dx
      currentPiece.value.y += dy
      currentPiece.value.shape = rotated
      return
    }
  }
}

function rotateMatrix(matrix) {
  const n = matrix.length
  const rotated = Array(n).fill().map(() => Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rotated[j][n - 1 - i] = matrix[i][j]
    }
  }

  return rotated
}

function hardDrop() {
  if (!currentPiece.value) return

  let dropDistance = 0
  while (canMovePiece(currentPiece.value, 0, dropDistance + 1)) {
    dropDistance++
  }

  currentPiece.value.y += dropDistance
  addPoints(dropDistance * 2) // Bonus pour la chute dure
  placePiece()
}

function holdPiece() {
  if (!currentPiece.value || !canHold.value) return

  if (heldPiece.value) {
    // Échanger avec la pièce en réserve
    const temp = heldPiece.value
    heldPiece.value = {
      type: currentPiece.value.type,
      shape: tetrominos[currentPiece.value.type].shape.map(row => [...row]),
      color: currentPiece.value.color,
      x: Math.floor(gridWidth / 2) - Math.floor(tetrominos[currentPiece.value.type].shape[0].length / 2),
      y: 0
    }
    currentPiece.value = temp
    currentPiece.value.x = Math.floor(gridWidth / 2) - Math.floor(currentPiece.value.shape[0].length / 2)
    currentPiece.value.y = 0
  } else {
    // Mettre en réserve et spawn nouvelle pièce
    heldPiece.value = {
      type: currentPiece.value.type,
      shape: tetrominos[currentPiece.value.type].shape.map(row => [...row]),
      color: currentPiece.value.color,
      x: Math.floor(gridWidth / 2) - Math.floor(tetrominos[currentPiece.value.type].shape[0].length / 2),
      y: 0
    }
    spawnNewPiece()
  }

  canHold.value = false
}

// Placement et suppression de lignes
function placePiece() {
  if (!currentPiece.value) return

  // Placer la pièce sur la grille
  for (let y = 0; y < currentPiece.value.shape.length; y++) {
    for (let x = 0; x < currentPiece.value.shape[y].length; x++) {
      if (currentPiece.value.shape[y][x]) {
        const boardX = currentPiece.value.x + x
        const boardY = currentPiece.value.y + y

        if (boardY >= 0) {
          grid.value[boardY][boardX] = currentPiece.value.color
        }
      }
    }
  }

  // Vérifier les lignes complètes
  const completedLines = checkCompletedLines()
  if (completedLines.length > 0) {
    clearLines(completedLines)
  }

  // Spawn nouvelle pièce
  spawnNewPiece()
}

function checkCompletedLines() {
  const completedLines = []

  for (let y = 0; y < gridHeight; y++) {
    if (grid.value[y].every(cell => cell !== 0)) {
      completedLines.push(y)
    }
  }

  return completedLines
}

function clearLines(lineNumbers) {
  // Points selon le nombre de lignes
  const pointsMap = { 1: 100, 2: 300, 3: 500, 4: 800 }
  const basePoints = pointsMap[lineNumbers.length] || 100
  const levelMultiplier = level.value

  addPoints(basePoints * levelMultiplier, { combo: lineNumbers.length > 1 })

  // Supprimer les lignes
  lineNumbers.sort((a, b) => b - a) // Du haut vers le bas

  for (const lineY of lineNumbers) {
    grid.value.splice(lineY, 1)
    grid.value.unshift(Array(gridWidth).fill(0))
  }

  // Mettre à jour les statistiques
  lines.value += lineNumbers.length
  linesToNextLevel.value -= lineNumbers.length

  // Montée de niveau
  if (linesToNextLevel.value <= 0) {
    level.value++
    linesToNextLevel.value = 10
    speed.value = Math.max(50, speed.value - 50) // Plus rapide
  }
}

// Rendu
function draw() {
  if (!ctx) return

  // Effacer le canvas
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Dessiner la grille
  drawGrid()

  // Dessiner les blocs placés
  drawPlacedBlocks()

  // Dessiner la pièce fantôme
  drawGhostPiece()

  // Dessiner la pièce actuelle
  drawCurrentPiece()

  // Dessiner les aperçus
  drawNextPiece()
  drawHoldPiece()
}

function drawGrid() {
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1

  for (let x = 0; x <= gridWidth; x++) {
    ctx.beginPath()
    ctx.moveTo(x * blockSize, 0)
    ctx.lineTo(x * blockSize, canvasHeight)
    ctx.stroke()
  }

  for (let y = 0; y <= gridHeight; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * blockSize)
    ctx.lineTo(canvasWidth, y * blockSize)
    ctx.stroke()
  }
}

function drawPlacedBlocks() {
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      if (grid.value[y][x]) {
        drawBlock(ctx, x * blockSize, y * blockSize, grid.value[y][x])
      }
    }
  }
}

function drawCurrentPiece() {
  if (!currentPiece.value) return

  for (let y = 0; y < currentPiece.value.shape.length; y++) {
    for (let x = 0; x < currentPiece.value.shape[y].length; x++) {
      if (currentPiece.value.shape[y][x]) {
        const drawX = (currentPiece.value.x + x) * blockSize
        const drawY = (currentPiece.value.y + y) * blockSize
        drawBlock(ctx, drawX, drawY, currentPiece.value.color)
      }
    }
  }
}

function drawGhostPiece() {
  if (!currentPiece.value) return

  // Calculer la position de la pièce fantôme
  let ghostY = currentPiece.value.y
  while (canMovePiece(currentPiece.value, 0, ghostY - currentPiece.value.y + 1)) {
    ghostY++
  }

  // Dessiner la pièce fantôme
  ctx.globalAlpha = 0.3
  for (let y = 0; y < currentPiece.value.shape.length; y++) {
    for (let x = 0; x < currentPiece.value.shape[y].length; x++) {
      if (currentPiece.value.shape[y][x]) {
        const drawX = (currentPiece.value.x + x) * blockSize
        const drawY = (ghostY + y) * blockSize
        drawBlock(ctx, drawX, drawY, currentPiece.value.color)
      }
    }
  }
  ctx.globalAlpha = 1
}

function drawNextPiece() {
  if (!nextPiece.value || !nextCtx) return

  nextCtx.fillStyle = '#000'
  nextCtx.fillRect(0, 0, 120, 80)

  const miniBlockSize = 20
  const offsetX = (120 - nextPiece.value.shape[0].length * miniBlockSize) / 2
  const offsetY = (80 - nextPiece.value.shape.length * miniBlockSize) / 2

  for (let y = 0; y < nextPiece.value.shape.length; y++) {
    for (let x = 0; x < nextPiece.value.shape[y].length; x++) {
      if (nextPiece.value.shape[y][x]) {
        const drawX = offsetX + x * miniBlockSize
        const drawY = offsetY + y * miniBlockSize
        drawBlock(nextCtx, drawX, drawY, nextPiece.value.color, miniBlockSize)
      }
    }
  }
}

function drawHoldPiece() {
  if (!holdCtx) return

  holdCtx.fillStyle = '#000'
  holdCtx.fillRect(0, 0, 120, 80)

  if (!heldPiece.value) return

  const miniBlockSize = 20
  const offsetX = (120 - heldPiece.value.shape[0].length * miniBlockSize) / 2
  const offsetY = (80 - heldPiece.value.shape.length * miniBlockSize) / 2

  for (let y = 0; y < heldPiece.value.shape.length; y++) {
    for (let x = 0; x < heldPiece.value.shape[y].length; x++) {
      if (heldPiece.value.shape[y][x]) {
        const drawX = offsetX + x * miniBlockSize
        const drawY = offsetY + y * miniBlockSize
        drawBlock(holdCtx, drawX, drawY, heldPiece.value.color, miniBlockSize)
      }
    }
  }
}

function drawBlock(context, x, y, color, size = blockSize) {
  // Fond du bloc
  context.fillStyle = color
  context.fillRect(x, y, size, size)

  // Bordure claire (haut et gauche)
  context.fillStyle = lightenColor(color, 30)
  context.fillRect(x, y, size, 2)
  context.fillRect(x, y, 2, size)

  // Bordure sombre (bas et droite)
  context.fillStyle = darkenColor(color, 30)
  context.fillRect(x, y + size - 2, size, 2)
  context.fillRect(x + size - 2, y, 2, size)
}

function lightenColor(color, amount) {
  const num = parseInt(color.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, (num >> 8 & 0x00FF) + amount)
  const b = Math.min(255, (num & 0x0000FF) + amount)
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

function darkenColor(color, amount) {
  const num = parseInt(color.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, (num >> 8 & 0x00FF) - amount)
  const b = Math.max(0, (num & 0x0000FF) - amount)
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

// Gestion des états de jeu
function startGame() {
  resetGame()

  // Reset de toutes les variables
  level.value = 1
  lines.value = 0
  pieces.value = 0
  speed.value = 1000
  linesToNextLevel.value = 10

  // Vider la grille
  grid.value = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0))

  // Reset des pièces
  currentPiece.value = null
  nextPiece.value = null
  heldPiece.value = null
  canHold.value = true

  // Variables de timing
  lastFall = 0
  lastMove = 0

  activeActions.value.clear()

  spawnNewPiece()

  gameState.value = 'playing'
  startLoop()

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

function goToMenu() {
  gameState.value = 'menu'
  stopLoop()
  showHelp.value = false
  activeActions.value.clear()
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
.tetris-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
  font-family: 'Press Start 2P', monospace;
}

/* Interface de jeu */
.game-ui {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 150px;
}

.score-section,
.stats-section,
.next-piece,
.hold-piece,
.level-progress {
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid #00ff00;
  border-radius: 8px;
  padding: 1rem;
}

.score-section h3,
.stats-section h3,
.next-piece h3,
.hold-piece h3,
.level-progress h3 {
  color: #00ff00;
  font-size: 10px;
  margin-bottom: 0.5rem;
  text-align: center;
}

.score-value {
  color: #ffff00;
  font-size: 14px;
  text-align: center;
  margin-bottom: 0.5rem;
}

.high-score {
  color: #ff00ff;
  font-size: 8px;
  text-align: center;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 8px;
  margin-bottom: 0.25rem;
}

.stat-item span:first-child {
  opacity: 0.8;
}

.stat-item span:last-child {
  color: #00ff00;
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

.preview-canvas {
  border: 1px solid #333;
  border-radius: 4px;
  background: #000;
  display: block;
  margin: 0 auto;
}

/* Progression de niveau */
.progress-bar {
  background: rgba(255, 255, 255, 0.2);
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin: 0.5rem 0;
}

.progress {
  background: linear-gradient(90deg, #00ff00, #ffff00);
  height: 100%;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 6px;
  text-align: center;
  opacity: 0.8;
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
  max-width: 250px;
}

.menu h3, .pause-menu h3, .game-over h3 {
  margin-bottom: 1rem;
  color: #00ff00;
  font-size: 14px;
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
  font-size: 8px;
}

.help-panel ul {
  list-style: none;
  padding: 0;
}

.help-panel li {
  margin-bottom: 0.5rem;
  font-size: 6px;
}

.final-stats {
  margin: 1rem 0;
}

.final-score {
  font-size: 12px;
  color: #00ff00;
  margin-bottom: 0.5rem;
}

.new-record {
  color: #ff0;
  font-weight: bold;
  animation: pulse 1s infinite;
  font-size: 8px;
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
  font-size: 6px;
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
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 300px;
}

.movement-row,
.action-row,
.menu-row {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.control-btn {
  background: rgba(0, 255, 0, 0.2);
  border: 2px solid #00ff00;
  color: #00ff00;
  font-size: 1.2rem;
  width: 50px;
  height: 50px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:active {
  background: rgba(0, 255, 0, 0.4);
  transform: scale(0.95);
}

.control-btn.rotate {
  background: rgba(255, 255, 0, 0.2);
  border-color: #ffff00;
  color: #ffff00;
}

.control-btn.rotate:active {
  background: rgba(255, 255, 0, 0.4);
}

.control-btn.down {
  background: rgba(0, 255, 255, 0.2);
  border-color: #00ffff;
  color: #00ffff;
}

.control-btn.down:active {
  background: rgba(0, 255, 255, 0.4);
}

.control-btn.drop {
  background: rgba(255, 0, 255, 0.2);
  border-color: #ff00ff;
  color: #ff00ff;
  width: 60px;
}

.control-btn.drop:active {
  background: rgba(255, 0, 255, 0.4);
}

.control-btn.hold {
  background: rgba(255, 165, 0, 0.2);
  border-color: #ffa500;
  color: #ffa500;
}

.control-btn.hold:active {
  background: rgba(255, 165, 0, 0.4);
}

.control-btn.pause {
  background: rgba(255, 0, 0, 0.2);
  border-color: #ff0000;
  color: #ff0000;
}

.control-btn.pause:active {
  background: rgba(255, 0, 0, 0.4);
}

/* Instructions */
.instructions {
  text-align: center;
  opacity: 0.8;
  font-size: 8px;
  max-width: 600px;
}

/* Animations */
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
  .tetris-game {
    padding: 1rem;
    gap: 1rem;
  }

  .game-ui {
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .left-panel,
  .right-panel {
    flex-direction: row;
    min-width: auto;
    justify-content: center;
    flex-wrap: wrap;
  }

  .game-canvas {
    width: 250px;
    height: 500px;
  }

  .preview-canvas {
    width: 80px;
    height: 60px;
  }

  .score-section,
  .stats-section,
  .next-piece,
  .hold-piece,
  .level-progress {
    min-width: 120px;
    padding: 0.5rem;
  }
}

@media (max-width: 480px) {
  .game-canvas {
    width: 200px;
    height: 400px;
  }

  .control-btn {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .control-btn.drop {
    width: 50px;
  }

  .left-panel,
  .right-panel {
    flex-direction: column;
    width: 100%;
  }

  .score-section,
  .stats-section,
  .next-piece,
  .hold-piece,
  .level-progress {
    min-width: auto;
  }
}
</style>