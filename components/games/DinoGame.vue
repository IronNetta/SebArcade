<template>
  <div class="dino-game">
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
          <span class="label">Distance:</span>
          <span class="value">{{ Math.floor(distance) }}m</span>
        </div>
        <div class="score-item" v-if="speed > baseSpeed">
          <span class="label">Vitesse:</span>
          <span class="value">{{ Math.round((speed / baseSpeed) * 100) }}%</span>
        </div>
      </div>

      <div class="game-stats">
        <div class="fps">FPS: {{ actualFPS }}</div>
        <div class="obstacles">Obstacles évités: {{ obstaclesAvoided }}</div>
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
          <h3>🦕 Dino Runner</h3>
          <p>Le T-Rex de Google Chrome dans sa course infinie !</p>
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
              <li>🦕 Appuyez sur ESPACE ou ↑ pour sauter</li>
              <li>🦆 Appuyez sur ↓ pour vous baisser (contre les ptérodactyles)</li>
              <li>🌵 Évitez les cactus au sol</li>
              <li>🦅 Évitez les ptérodactyles dans les airs</li>
              <li>⚡ Plus vous allez loin, plus la vitesse augmente</li>
              <li>🏆 Battez votre record personnel !</li>
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
            <p class="final-score">Score: {{ formatScore(currentScore) }}</p>
            <p v-if="isNewRecord" class="new-record">🏆 Nouveau record !</p>
            <div class="stats-grid">
              <div class="stat">
                <span class="stat-label">Distance:</span>
                <span class="stat-value">{{ Math.floor(distance) }}m</span>
              </div>
              <div class="stat">
                <span class="stat-label">Obstacles évités:</span>
                <span class="stat-value">{{ obstaclesAvoided }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Vitesse max:</span>
                <span class="stat-value">{{ Math.round((maxSpeed / baseSpeed) * 100) }}%</span>
              </div>
              <div class="stat">
                <span class="stat-label">Temps de survie:</span>
                <span class="stat-value">{{ Math.floor(gameTime / 1000) }}s</span>
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
      <div class="jump-controls">
        <button @touchstart="handleMobileInput('jump')" @mousedown="handleMobileInput('jump')" class="control-btn jump-btn">
          🦕 SAUT
        </button>
        <button @touchstart="handleMobileInput('duck')" @touchend="stopDucking" @mousedown="handleMobileInput('duck')" @mouseup="stopDucking" @mouseleave="stopDucking" class="control-btn duck-btn">
          🦆 BAISSER
        </button>
      </div>
      <div class="action-buttons">
        <button @click="toggleFullscreen" class="action-btn">⛶</button>
        <button @click="pauseGame" class="action-btn">⏸️</button>
      </div>
    </div>

    <!-- Instructions -->
    <div class="instructions">
      <p v-if="!isMobile">
        🎮 <strong>Contrôles:</strong> ESPACE ou ↑ pour sauter • ↓ pour se baisser • ESPACE pour pause
      </p>
      <p v-else>
        📱 <strong>Contrôles tactiles:</strong> Utilisez les boutons ci-dessus
      </p>
    </div>
  </div>
</template>

<script setup>
// Import des composables
import { useScore } from '~/composables/games/useScore'
import { useKeyboard } from '~/composables/games/useKeyboard'
import { useGameLoop } from '~/composables/games/useGameLoop'

// Configuration du jeu
const canvasWidth = 800
const canvasHeight = 200
const groundHeight = 20
const dinoWidth = 30
const dinoHeight = 40
const baseSpeed = 6
const gravity = 0.8
const jumpForce = -18

// État du jeu
const gameCanvas = ref(null)
const gameState = ref('menu')
const showHelp = ref(false)
const isMobile = ref(false)

// Fonction utilitaire pour formater les scores
const formatScore = (score) => {
  return score?.toLocaleString() || '0'
}

// Variables du jeu
const distance = ref(0)
const speed = ref(baseSpeed)
const maxSpeed = ref(baseSpeed)
const obstaclesAvoided = ref(0)
const gameTime = ref(0)

// Dinosaure
const dino = ref({
  x: 80,
  y: canvasHeight - groundHeight - dinoHeight,
  width: dinoWidth,
  height: dinoHeight,
  velocityY: 0,
  isJumping: false,
  isDucking: false,
  animationFrame: 0
})

// Obstacles
const obstacles = ref([])
const cloudPositions = ref([])

// Variables de contrôle
const keys = ref({ space: false, up: false, down: false })
let lastObstacleSpawn = 0
let lastCloudSpawn = 0
let animationCounter = 0
let ctx = null

// Déclaration de la fonction updateGame
function updateGame(deltaTime) {
  if (gameState.value !== 'playing') return

  handleInput()
  updateDino(deltaTime)
  updateObstacles(deltaTime)
  updateClouds(deltaTime)
  spawnObstacles()
  spawnClouds()
  checkCollisions()
  updateGameSpeed(deltaTime)
  draw()

  // Mettre à jour les stats
  distance.value += speed.value * deltaTime / 16
  gameTime.value += deltaTime
  animationCounter += deltaTime
}

// Utilisation des composables
const { currentScore, highScore, isNewRecord, addPoints, endGame, startGame: resetGame } = useScore('dino')
const { getDirection, actions, bindToElement } = useKeyboard()
const { start: startLoop, stop: stopLoop, isRunning, actualFPS } = useGameLoop(updateGame, 60)

// Détection mobile et initialisation
onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  ctx = gameCanvas.value.getContext('2d')

  // Lier les contrôles
  const unbind = bindToElement(gameCanvas.value)

  // Initialiser les nuages
  for (let i = 0; i < 5; i++) {
    cloudPositions.value.push({
      x: Math.random() * canvasWidth * 2,
      y: Math.random() * 80 + 20,
      speed: Math.random() * 0.5 + 0.5
    })
  }

  onUnmounted(() => {
    unbind?.()
    stopLoop()
  })
})

// Gestion des contrôles
function handleInput() {
  const dir = getDirection()

  // Mise à jour des touches
  keys.value.space = actions.value.space
  keys.value.up = dir.y < 0 || actions.value.space
  keys.value.down = dir.y > 0

  // Pause
  if (keys.value.space && !dino.value.isJumping) {
    // Si le dino est au sol, sauter au lieu de pauser
    if (dino.value.y >= canvasHeight - groundHeight - dinoHeight) {
      jump()
    }
  }

  // Saut
  if (keys.value.up && !dino.value.isJumping && dino.value.y >= canvasHeight - groundHeight - dinoHeight) {
    jump()
  }

  // Se baisser
  dino.value.isDucking = keys.value.down && !dino.value.isJumping
}

function handleMobileInput(action) {
  if (action === 'jump' && !dino.value.isJumping && dino.value.y >= canvasHeight - groundHeight - dinoHeight) {
    jump()
  } else if (action === 'duck') {
    dino.value.isDucking = true
  }
}

function stopDucking() {
  dino.value.isDucking = false
}

// Saut du dinosaure
function jump() {
  if (!dino.value.isJumping && dino.value.y >= canvasHeight - groundHeight - dinoHeight) {
    dino.value.velocityY = jumpForce
    dino.value.isJumping = true
  }
}

// Mise à jour du dinosaure
function updateDino(deltaTime) {
  // Physique du saut
  if (dino.value.isJumping || dino.value.y < canvasHeight - groundHeight - dinoHeight) {
    dino.value.velocityY += gravity
    dino.value.y += dino.value.velocityY

    // Atterrissage
    if (dino.value.y >= canvasHeight - groundHeight - dinoHeight) {
      dino.value.y = canvasHeight - groundHeight - dinoHeight
      dino.value.velocityY = 0
      dino.value.isJumping = false
    }
  }

  // Animation de course
  if (!dino.value.isJumping && animationCounter % 200 < 100) {
    dino.value.animationFrame = (dino.value.animationFrame + 1) % 2
  }
}

// Génération d'obstacles
function spawnObstacles() {
  const now = Date.now()
  const minSpawnDelay = Math.max(800, 2000 - (speed.value - baseSpeed) * 50)

  if (now - lastObstacleSpawn > minSpawnDelay) {
    const obstacleType = Math.random()
    let obstacle

    if (obstacleType < 0.7) {
      // Cactus au sol
      obstacle = {
        type: 'cactus',
        x: canvasWidth,
        y: canvasHeight - groundHeight - 25,
        width: 20,
        height: 25,
        passed: false
      }
    } else {
      // Ptérodactyle volant
      const flyHeight = Math.random() < 0.5 ? 50 : 25 // Hauteur variable
      obstacle = {
        type: 'bird',
        x: canvasWidth,
        y: canvasHeight - groundHeight - dinoHeight - flyHeight,
        width: 30,
        height: 20,
        passed: false,
        wingFrame: 0
      }
    }

    obstacles.value.push(obstacle)
    lastObstacleSpawn = now
  }
}

// Génération de nuages
function spawnClouds() {
  const now = Date.now()
  if (now - lastCloudSpawn > 3000) {
    cloudPositions.value.push({
      x: canvasWidth,
      y: Math.random() * 80 + 20,
      speed: Math.random() * 0.5 + 0.5
    })
    lastCloudSpawn = now
  }
}

// Mise à jour des obstacles
function updateObstacles(deltaTime) {
  obstacles.value.forEach((obstacle, index) => {
    obstacle.x -= speed.value

    // Animation des ptérodactyles
    if (obstacle.type === 'bird') {
      obstacle.wingFrame = (obstacle.wingFrame + deltaTime * 0.01) % (Math.PI * 2)
    }

    // Marquer comme évité si passé
    if (!obstacle.passed && obstacle.x + obstacle.width < dino.value.x) {
      obstacle.passed = true
      obstaclesAvoided.value++
      addPoints(10)
    }

    // Supprimer si hors écran
    if (obstacle.x + obstacle.width < 0) {
      obstacles.value.splice(index, 1)
    }
  })
}

// Mise à jour des nuages
function updateClouds(deltaTime) {
  cloudPositions.value.forEach((cloud, index) => {
    cloud.x -= cloud.speed

    if (cloud.x < -50) {
      cloudPositions.value.splice(index, 1)
    }
  })
}

// Vérification des collisions
function checkCollisions() {
  const dinoRect = {
    x: dino.value.x + 5,
    y: dino.value.y + (dino.value.isDucking ? 15 : 5),
    width: dino.value.width - 10,
    height: dino.value.height - (dino.value.isDucking ? 20 : 10)
  }

  for (const obstacle of obstacles.value) {
    const obstacleRect = {
      x: obstacle.x + 2,
      y: obstacle.y + 2,
      width: obstacle.width - 4,
      height: obstacle.height - 4
    }

    if (dinoRect.x < obstacleRect.x + obstacleRect.width &&
        dinoRect.x + dinoRect.width > obstacleRect.x &&
        dinoRect.y < obstacleRect.y + obstacleRect.height &&
        dinoRect.y + dinoRect.height > obstacleRect.y) {
      gameOver()
      return
    }
  }
}

// Mise à jour de la vitesse
function updateGameSpeed(deltaTime) {
  // Augmenter la vitesse progressivement
  const speedIncrease = deltaTime * 0.001
  speed.value = Math.min(speed.value + speedIncrease, baseSpeed * 3)
  maxSpeed.value = Math.max(maxSpeed.value, speed.value)
}

// Dessiner le jeu
function draw() {
  if (!ctx) return

  // Ciel
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight)
  gradient.addColorStop(0, '#87CEEB')
  gradient.addColorStop(1, '#E0F6FF')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Nuages
  drawClouds()

  // Sol
  ctx.fillStyle = '#C2B280'
  ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight)

  // Ligne du sol
  ctx.strokeStyle = '#8B7355'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, canvasHeight - groundHeight)
  ctx.lineTo(canvasWidth, canvasHeight - groundHeight)
  ctx.stroke()

  // Dessiner le motif de sol
  drawGroundPattern()

  // Dinosaure
  drawDino()

  // Obstacles
  drawObstacles()
}

function drawClouds() {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  cloudPositions.value.forEach(cloud => {
    // Nuage simple avec plusieurs cercles
    ctx.beginPath()
    ctx.arc(cloud.x, cloud.y, 15, 0, Math.PI * 2)
    ctx.arc(cloud.x + 15, cloud.y, 20, 0, Math.PI * 2)
    ctx.arc(cloud.x + 30, cloud.y, 15, 0, Math.PI * 2)
    ctx.arc(cloud.x + 15, cloud.y - 10, 15, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawGroundPattern() {
  ctx.strokeStyle = '#A0935B'
  ctx.lineWidth = 1
  const offset = (distance.value * 2) % 40

  for (let x = -offset; x < canvasWidth; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, canvasHeight - groundHeight + 5)
    ctx.lineTo(x + 20, canvasHeight - groundHeight + 5)
    ctx.stroke()
  }
}

function drawDino() {
  ctx.fillStyle = '#228B22'

  if (dino.value.isDucking) {
    // Dinosaure baissé
    ctx.fillRect(dino.value.x, dino.value.y + 15, dino.value.width, dino.value.height - 15)

    // Tête
    ctx.fillRect(dino.value.x + 25, dino.value.y + 10, 15, 15)
  } else {
    // Corps
    ctx.fillRect(dino.value.x, dino.value.y, dino.value.width, dino.value.height)

    // Tête
    ctx.fillRect(dino.value.x + 25, dino.value.y - 10, 20, 20)

    // Pattes (animation de course)
    if (!dino.value.isJumping) {
      const legOffset = dino.value.animationFrame === 0 ? 0 : 5
      ctx.fillRect(dino.value.x + 5 + legOffset, dino.value.y + dino.value.height - 5, 8, 8)
      ctx.fillRect(dino.value.x + 15 - legOffset, dino.value.y + dino.value.height - 5, 8, 8)
    }
  }

  // Œil
  ctx.fillStyle = '#000'
  ctx.fillRect(dino.value.x + 35, dino.value.y - 5, 4, 4)

  // Queue
  ctx.fillStyle = '#228B22'
  ctx.fillRect(dino.value.x - 10, dino.value.y + 10, 15, 8)
}

function drawObstacles() {
  obstacles.value.forEach(obstacle => {
    if (obstacle.type === 'cactus') {
      // Cactus
      ctx.fillStyle = '#006400'
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)

      // Épines
      ctx.fillStyle = '#004000'
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(obstacle.x + 2 + i * 3, obstacle.y + 2, 2, obstacle.height - 4)
      }
    } else if (obstacle.type === 'bird') {
      // Ptérodactyle
      ctx.fillStyle = '#8B4513'

      // Corps
      ctx.fillRect(obstacle.x + 10, obstacle.y + 8, 10, 8)

      // Ailes (animation)
      const wingOffset = Math.sin(obstacle.wingFrame) * 3
      ctx.fillRect(obstacle.x, obstacle.y + wingOffset, 12, 4)
      ctx.fillRect(obstacle.x + 18, obstacle.y + wingOffset, 12, 4)

      // Tête
      ctx.fillRect(obstacle.x + 20, obstacle.y + 6, 8, 6)

      // Bec
      ctx.fillStyle = '#DAA520'
      ctx.fillRect(obstacle.x + 28, obstacle.y + 8, 4, 2)
    }
  })
}

// Gestion des états de jeu
function startGame() {
  resetGame()

  // Réinitialiser les variables
  distance.value = 0
  speed.value = baseSpeed
  maxSpeed.value = baseSpeed
  obstaclesAvoided.value = 0
  gameTime.value = 0

  // Réinitialiser le dinosaure
  dino.value.y = canvasHeight - groundHeight - dinoHeight
  dino.value.velocityY = 0
  dino.value.isJumping = false
  dino.value.isDucking = false
  dino.value.animationFrame = 0

  // Vider les obstacles
  obstacles.value = []
  lastObstacleSpawn = Date.now()
  lastCloudSpawn = Date.now()
  animationCounter = 0

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

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log(`Erreur lors du passage en plein écran: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
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
.dino-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

/* Interface de jeu */
.game-ui {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 800px;
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
  border: 1px solid #228B22;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.score-item .label {
  opacity: 0.8;
}

.score-item .value {
  color: #228B22;
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
  border: 3px solid #228B22;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(34, 139, 34, 0.3);
}

.game-canvas:focus {
  outline: none;
  border-color: #32CD32;
  box-shadow: 0 0 30px rgba(50, 205, 50, 0.5);
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
  background: rgba(20, 20, 0, 0.95);
  padding: 2rem;
  border-radius: 12px;
  border: 2px solid #228B22;
  text-align: center;
  max-width: 400px;
}

.menu h3, .pause-menu h3, .game-over h3 {
  margin-bottom: 1rem;
  color: #228B22;
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
  color: #228B22;
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
  color: #228B22;
  margin-bottom: 0.5rem;
}

.new-record {
  color: #FFD700;
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
  color: #228B22;
  font-weight: bold;
}

/* Contrôles mobiles */
.mobile-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 800px;
  gap: 2rem;
}

.jump-controls {
  display: flex;
  gap: 1rem;
}

.control-btn {
  background: rgba(34, 139, 34, 0.2);
  border: 2px solid #228B22;
  color: #228B22;
  padding: 1rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  font-weight: bold;
}

.control-btn:active {
  background: rgba(34, 139, 34, 0.4);
  transform: scale(0.95);
}

.jump-btn {
  background: rgba(255, 215, 0, 0.2);
  border-color: #FFD700;
  color: #FFD700;
}

.jump-btn:active {
  background: rgba(255, 215, 0, 0.4);
}

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
  max-width: 800px;
}

/* Responsive */
@media (max-width: 900px) {
  .dino-game {
    padding: 1rem;
    gap: 1rem;
  }

  .game-canvas {
    width: 100%;
    max-width: 600px;
    height: auto;
    aspect-ratio: 4/1;
  }

  .score-panel {
    justify-content: center;
    font-size: 8px;
  }

  .mobile-controls {
    max-width: 600px;
  }
}

@media (max-width: 680px) {
  .dino-game {
    padding: 0.5rem;
    gap: 0.5rem;
  }

  .game-canvas {
    width: 100%;
    max-width: 400px;
    aspect-ratio: 4/1;
  }

  .game-ui {
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .score-panel {
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }

  .mobile-controls {
    max-width: 400px;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .jump-controls {
    flex-direction: column;
  }

  .instructions {
    font-size: 0.7rem;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}
</style>