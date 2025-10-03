<template>
  <div class="breakout-game">
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
          <span class="value">{{ '🏓'.repeat(lives) }}</span>
        </div>
        <div class="score-item">
          <span class="label">Niveau:</span>
          <span class="value">{{ level }}</span>
        </div>
      </div>

      <div class="game-stats">
        <div class="bricks">Briques: {{ bricksRemaining }}</div>
        <div class="combo">Combo: {{ combo }}x</div>
        <div class="speed">Vitesse: {{ ballSpeed.toFixed(1) }}</div>
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
          @mousemove="handleMouseMove"
      />

      <!-- Overlays -->
      <div v-if="gameState === 'menu'" class="game-overlay">
        <div class="menu">
          <h3>🏓 Breakout</h3>
          <p>Cassez toutes les briques avec votre balle !</p>
          <div class="menu-buttons">
            <button @click="startGame" class="game-button">
              🚀 Commencer à casser
            </button>
            <button @click="showHelp = !showHelp" class="game-button secondary">
              ❓ Contrôles
            </button>
          </div>

          <div v-if="showHelp" class="help-panel">
            <h4>Comment jouer :</h4>
            <ul>
              <li>🏓 Déplacez la raquette avec la souris ou les flèches</li>
              <li>⚽ Lancez la balle avec ESPACE</li>
              <li>🧱 Cassez toutes les briques pour passer au niveau suivant</li>
              <li>🎯 Les briques de couleur donnent plus de points</li>
              <li>⚡ Attrapez les power-ups qui tombent</li>
              <li>🔄 Ne laissez pas la balle tomber !</li>
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
          <h3>💥 Game Over</h3>
          <div class="final-stats">
            <p class="final-score">Score final: {{ formatScore(currentScore) }}</p>
            <p v-if="isNewRecord" class="new-record">🏆 Nouveau record !</p>
            <div class="stats-grid">
              <div class="stat">
                <span class="stat-label">Niveau atteint:</span>
                <span class="stat-value">{{ level }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Briques cassées:</span>
                <span class="stat-value">{{ bricksBroken }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Meilleur combo:</span>
                <span class="stat-value">{{ bestCombo }}</span>
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
          <p>Toutes les briques ont été détruites !</p>
          <p>Bonus de niveau: +{{ levelBonus }} points</p>
          <p>Niveau {{ level }} - Briques plus résistantes...</p>
          <div class="level-progress">
            <div class="progress-bar">
              <div class="progress" :style="{ width: levelProgress + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'serving'" class="game-overlay serving-overlay">
        <div class="serving-message">
          <p>Appuyez sur ESPACE pour lancer la balle</p>
          <p class="serving-countdown">{{ servingCountdown > 0 ? Math.ceil(servingCountdown) : 'GO!' }}</p>
        </div>
      </div>
    </div>

    <!-- Contrôles mobiles -->
    <div class="mobile-controls" v-if="isMobile">
      <div class="paddle-slider">
        <input
            type="range"
            min="0"
            :max="canvasWidth - paddleWidth"
            v-model="paddle.x"
            class="paddle-control"
        >
      </div>

      <div class="action-controls">
        <button @click="launchBall" class="launch-btn">🚀 LANCER</button>
        <button @click="pauseGame" class="pause-btn">⏸️</button>
      </div>
    </div>

    <!-- Instructions -->
    <div class="instructions">
      <p v-if="!isMobile">
        🎮 <strong>Contrôles:</strong> Souris ou ←→ pour bouger • ESPACE pour lancer • P pour pause
      </p>
      <p v-else>
        📱 <strong>Contrôles tactiles:</strong> Slider pour bouger • Bouton pour lancer
      </p>
    </div>
  </div>
</template>
<script setup>
// Import manuel des composables depuis le dossier games/
import { useScore } from '~/composables/games/useScore'
import { useKeyboard } from '~/composables/games/useKeyboard'
import { useGameLoop } from '~/composables/games/useGameLoop'
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// Configuration du jeu
const canvasWidth = 600
const canvasHeight = 500
const paddleWidth = 80
const paddleHeight = 12
const ballRadius = 8
const brickRows = 8
const brickCols = 12
const brickWidth = 45
const brickHeight = 20
const brickPadding = 5

// Couleurs des briques par rangée (du haut vers le bas)
const brickColors = [
  '#ff0000', '#ff8800', '#ffff00', '#88ff00',
  '#00ff00', '#00ff88', '#0088ff', '#8800ff'
]
const brickPoints = [50, 40, 30, 25, 20, 15, 10, 5]

// État du jeu
const gameCanvas = ref(null)
const gameState = ref('menu')
const showHelp = ref(false)
const isMobile = ref(false)
const servingCountdown = ref(0)

// Variables de jeu
const lives = ref(3)
const level = ref(1)
const combo = ref(0)
const bestCombo = ref(0)
const bricksBroken = ref(0)
const bricksRemaining = ref(0)
const levelBonus = ref(0)
const levelProgress = ref(0)
const ballSpeed = ref(4)

// Scores
const currentScore = ref(0)
const highScore = ref(0)
const isNewRecord = ref(false)
const actualFPS = ref(60)

// Entités du jeu
const paddle = ref({
  x: canvasWidth / 2 - paddleWidth / 2,
  y: canvasHeight - 30,
  width: paddleWidth,
  height: paddleHeight,
  speed: 8
})

const ball = ref({
  x: canvasWidth / 2,
  y: canvasHeight - 50,
  velocityX: 4,
  velocityY: -4,
  radius: ballRadius,
  stuck: true
})

const bricks = ref([])
const powerUps = ref([])
const particles = ref([])

// Variables globales
let ctx = null
let lastPaddleMove = 0
let paddleMoveDelay = 16
let levelCompleteTimer = 0
let mouseX = 0
let gameLoop = null
let lastTime = 0

// Power-ups
const powerUpTypes = [
  { type: 'expand', color: '#00ff00', effect: 'Raquette plus large' },
  { type: 'multiball', color: '#ff00ff', effect: 'Balle multiple' },
  { type: 'slow', color: '#00ffff', effect: 'Balle plus lente' },
  { type: 'points', color: '#ffff00', effect: 'Points bonus' },
  { type: 'life', color: '#ff0000', effect: 'Vie supplémentaire' }
]

// Gestion du clavier
const keys = ref({
  left: false,
  right: false,
  space: false,
  escape: false
})

// Fonction principale de mise à jour
function updateGame(deltaTime) {
  // Mise à jour selon l'état
  if (gameState.value === 'playing') {
    handleInput(deltaTime)
    updatePaddle(deltaTime)
    updateBall(deltaTime)
    updatePowerUps(deltaTime)
    updateParticles(deltaTime)
    checkCollisions()
    checkLevelComplete()
  } else if (gameState.value === 'levelComplete') {
    updateLevelComplete(deltaTime)
  } else if (gameState.value === 'serving') {
    handleInput(deltaTime) // Permettre les contrôles pendant le serving
    updateServing(deltaTime)
    updateBall(deltaTime) // Pour maintenir la balle collée à la raquette
  } else if (gameState.value === 'paused') {
    handleInput(deltaTime) // Pour permettre de reprendre le jeu
  }

  // Toujours dessiner, quel que soit l'état
  draw()
}

// Gestion du score
function formatScore(score) {
  return score.toString().padStart(6, '0')
}

function addPoints(points) {
  currentScore.value += points
  if (currentScore.value > highScore.value) {
    highScore.value = currentScore.value
    isNewRecord.value = true
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('breakout-highscore', highScore.value.toString())
    }
  }
}

function resetGame() {
  currentScore.value = 0
  isNewRecord.value = false
}

// Game loop
function startLoop() {
  if (gameLoop) return

  let fpsCount = 0
  let fpsTime = 0

  function animate(currentTime) {
    if (!lastTime) lastTime = currentTime
    const deltaTime = currentTime - lastTime
    lastTime = currentTime

    fpsCount++
    fpsTime += deltaTime
    if (fpsTime >= 1000) {
      actualFPS.value = Math.round((fpsCount * 1000) / fpsTime)
      fpsCount = 0
      fpsTime = 0
    }

    updateGame(deltaTime)
    gameLoop = requestAnimationFrame(animate)
  }

  gameLoop = requestAnimationFrame(animate)
}

function stopLoop() {
  if (gameLoop) {
    cancelAnimationFrame(gameLoop)
    gameLoop = null
    lastTime = 0
  }
}

// Gestion du clavier
function handleKeyDown(event) {
  switch(event.code) {
    case 'ArrowLeft':
      keys.value.left = true
      event.preventDefault()
      break
    case 'ArrowRight':
      keys.value.right = true
      event.preventDefault()
      break
    case 'Space':
      keys.value.space = true
      event.preventDefault()
      break
    case 'Escape':
    case 'KeyP':
      keys.value.escape = true
      event.preventDefault()
      break
  }
}

function handleKeyUp(event) {
  switch(event.code) {
    case 'ArrowLeft':
      keys.value.left = false
      break
    case 'ArrowRight':
      keys.value.right = false
      break
    case 'Space':
      keys.value.space = false
      break
    case 'Escape':
    case 'KeyP':
      keys.value.escape = false
      break
  }
}

// Gestion des contrôles
function handleInput(deltaTime) {
  lastPaddleMove += deltaTime

  if (keys.value.left && lastPaddleMove >= paddleMoveDelay) {
    paddle.value.x = Math.max(0, paddle.value.x - paddle.value.speed)
    lastPaddleMove = 0
  }
  if (keys.value.right && lastPaddleMove >= paddleMoveDelay) {
    paddle.value.x = Math.min(canvasWidth - paddle.value.width, paddle.value.x + paddle.value.speed)
    lastPaddleMove = 0
  }

  if (keys.value.space) {
    if (gameState.value === 'serving' || ball.value.stuck) {
      launchBall()
      keys.value.space = false // Éviter les lancements multiples
    }
  }

  if (keys.value.escape) {
    if (gameState.value === 'playing') {
      pauseGame()
    } else if (gameState.value === 'paused') {
      resumeGame()
    }
    keys.value.escape = false // Éviter les toggles multiples
  }
}

// Contrôle souris
function handleMouseMove(event) {
  if (gameState.value !== 'playing' && gameState.value !== 'serving') return

  const rect = gameCanvas.value.getBoundingClientRect()
  mouseX = event.clientX - rect.left
  paddle.value.x = Math.max(0, Math.min(canvasWidth - paddle.value.width, mouseX - paddle.value.width / 2))
}

// Mise à jour des entités
function updatePaddle(deltaTime) {
  // La raquette est contrôlée directement par les inputs
}

function updateBall(deltaTime) {
  if (ball.value.stuck) {
    ball.value.x = paddle.value.x + paddle.value.width / 2
    ball.value.y = paddle.value.y - ball.value.radius
    return
  }

  ball.value.x += ball.value.velocityX * (deltaTime / 16.67)
  ball.value.y += ball.value.velocityY * (deltaTime / 16.67)

  // Collision avec les murs
  if (ball.value.x <= ball.value.radius || ball.value.x >= canvasWidth - ball.value.radius) {
    ball.value.velocityX = -ball.value.velocityX
    ball.value.x = Math.max(ball.value.radius, Math.min(canvasWidth - ball.value.radius, ball.value.x))
    createImpactParticles(ball.value.x, ball.value.y, '#ffffff')
  }

  if (ball.value.y <= ball.value.radius) {
    ball.value.velocityY = -ball.value.velocityY
    ball.value.y = ball.value.radius
    createImpactParticles(ball.value.x, ball.value.y, '#ffffff')
  }

  // Balle perdue
  if (ball.value.y > canvasHeight + 50) {
    lives.value--
    combo.value = 0

    if (lives.value <= 0) {
      gameState.value = 'gameOver'
      stopLoop()
    } else {
      resetBall()
      gameState.value = 'serving'
      servingCountdown.value = 3
    }
  }
}

// Initialisation des briques
function createBricks() {
  bricks.value = []

  const offsetX = (canvasWidth - (brickCols * (brickWidth + brickPadding) - brickPadding)) / 2
  const offsetY = 60

  for (let row = 0; row < brickRows; row++) {
    for (let col = 0; col < brickCols; col++) {
      bricks.value.push({
        x: offsetX + col * (brickWidth + brickPadding),
        y: offsetY + row * (brickHeight + brickPadding),
        width: brickWidth,
        height: brickHeight,
        color: brickColors[row],
        points: brickPoints[row],
        hits: level.value > 3 ? 2 : 1,
        maxHits: level.value > 3 ? 2 : 1,
        row
      })
    }
  }

  bricksRemaining.value = bricks.value.length
}

// Lancement de la balle
function launchBall() {
  if (ball.value.stuck || gameState.value === 'serving') {
    ball.value.stuck = false
    ball.value.velocityX = (Math.random() - 0.5) * 6 + 2
    ball.value.velocityY = -ballSpeed.value

    if (gameState.value === 'serving') {
      gameState.value = 'playing'
    }
  }
}

function resetBall() {
  ball.value.x = paddle.value.x + paddle.value.width / 2
  ball.value.y = paddle.value.y - ball.value.radius
  ball.value.velocityX = 0
  ball.value.velocityY = 0
  ball.value.stuck = true
}

// Collisions
function checkPaddleCollision() {
  if (ball.value.y + ball.value.radius >= paddle.value.y &&
      ball.value.y - ball.value.radius <= paddle.value.y + paddle.value.height &&
      ball.value.x >= paddle.value.x &&
      ball.value.x <= paddle.value.x + paddle.value.width) {

    const hitPos = (ball.value.x - paddle.value.x) / paddle.value.width
    const angle = (hitPos - 0.5) * Math.PI / 3

    const speed = Math.sqrt(ball.value.velocityX ** 2 + ball.value.velocityY ** 2)
    ball.value.velocityX = Math.sin(angle) * speed
    ball.value.velocityY = -Math.abs(Math.cos(angle) * speed)

    ball.value.y = paddle.value.y - ball.value.radius
    createImpactParticles(ball.value.x, ball.value.y, '#00ff00')
  }
}

function checkBrickCollisions() {
  for (let i = bricks.value.length - 1; i >= 0; i--) {
    const brick = bricks.value[i]

    if (ball.value.x + ball.value.radius >= brick.x &&
        ball.value.x - ball.value.radius <= brick.x + brick.width &&
        ball.value.y + ball.value.radius >= brick.y &&
        ball.value.y - ball.value.radius <= brick.y + brick.height) {

      const overlapLeft = (ball.value.x + ball.value.radius) - brick.x
      const overlapRight = (brick.x + brick.width) - (ball.value.x - ball.value.radius)
      const overlapTop = (ball.value.y + ball.value.radius) - brick.y
      const overlapBottom = (brick.y + brick.height) - (ball.value.y - ball.value.radius)

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom)

      if (minOverlap === overlapLeft || minOverlap === overlapRight) {
        ball.value.velocityX = -ball.value.velocityX
      } else {
        ball.value.velocityY = -ball.value.velocityY
      }

      brick.hits--

      if (brick.hits <= 0) {
        addPoints(brick.points * (combo.value + 1))
        combo.value++
        bestCombo.value = Math.max(bestCombo.value, combo.value)
        bricksBroken.value++
        bricksRemaining.value--

        createBrickExplosion(brick.x + brick.width/2, brick.y + brick.height/2, brick.color)

        if (Math.random() < 0.1) {
          createPowerUp(brick.x + brick.width/2, brick.y + brick.height/2)
        }

        bricks.value.splice(i, 1)
      } else {
        brick.color = darkenColor(brick.color, 50)
        createImpactParticles(ball.value.x, ball.value.y, brick.color)
      }

      const speedIncrease = 1.02
      ball.value.velocityX *= speedIncrease
      ball.value.velocityY *= speedIncrease
      ballSpeed.value = Math.sqrt(ball.value.velocityX ** 2 + ball.value.velocityY ** 2)

      break
    }
  }
}

function checkCollisions() {
  checkPaddleCollision()
  checkBrickCollisions()
}

// Power-ups
function createPowerUp(x, y) {
  const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]

  powerUps.value.push({
    x: x - 15,
    y: y,
    width: 30,
    height: 15,
    velocityY: 2,
    type: powerUpType.type,
    color: powerUpType.color,
    effect: powerUpType.effect
  })
}

function updatePowerUps(deltaTime) {
  for (let i = powerUps.value.length - 1; i >= 0; i--) {
    const powerUp = powerUps.value[i]
    powerUp.y += powerUp.velocityY * (deltaTime / 16.67)

    if (powerUp.y + powerUp.height >= paddle.value.y &&
        powerUp.y <= paddle.value.y + paddle.value.height &&
        powerUp.x + powerUp.width >= paddle.value.x &&
        powerUp.x <= paddle.value.x + paddle.value.width) {

      applyPowerUp(powerUp.type)
      powerUps.value.splice(i, 1)
      continue
    }

    if (powerUp.y > canvasHeight) {
      powerUps.value.splice(i, 1)
    }
  }
}

function applyPowerUp(type) {
  switch (type) {
    case 'expand':
      paddle.value.width = Math.min(150, paddle.value.width + 20)
      setTimeout(() => {
        paddle.value.width = paddleWidth
      }, 10000)
      break
    case 'slow':
      ball.value.velocityX *= 0.7
      ball.value.velocityY *= 0.7
      ballSpeed.value *= 0.7
      break
    case 'points':
      addPoints(500)
      break
    case 'life':
      lives.value++
      break
    case 'multiball':
      addPoints(200)
      break
  }

  createImpactParticles(paddle.value.x + paddle.value.width/2, paddle.value.y, '#ffff00')
}

// Particules
function createImpactParticles(x, y, color) {
  for (let i = 0; i < 5; i++) {
    particles.value.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      velocityX: (Math.random() - 0.5) * 4,
      velocityY: (Math.random() - 0.5) * 4,
      life: 300 + Math.random() * 200,
      maxLife: 500,
      size: 2 + Math.random() * 3,
      color
    })
  }
}

function createBrickExplosion(x, y, color) {
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * Math.PI * 2
    const speed = 2 + Math.random() * 4

    particles.value.push({
      x,
      y,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      life: 500 + Math.random() * 500,
      maxLife: 1000,
      size: 3 + Math.random() * 4,
      color
    })
  }
}

function updateParticles(deltaTime) {
  for (let i = particles.value.length - 1; i >= 0; i--) {
    const particle = particles.value[i]

    particle.x += particle.velocityX * (deltaTime / 16.67)
    particle.y += particle.velocityY * (deltaTime / 16.67)
    particle.life -= deltaTime

    if (particle.life <= 0) {
      particles.value.splice(i, 1)
    }
  }
}

// Niveaux
function checkLevelComplete() {
  if (bricksRemaining.value === 0 && gameState.value === 'playing') {
    levelBonus.value = level.value * 1000 + combo.value * 100
    addPoints(levelBonus.value)
    level.value++
    gameState.value = 'levelComplete'
    levelCompleteTimer = 0
    levelProgress.value = 0
    ballSpeed.value += 0.5
    stopLoop()

    // Redémarrer la boucle pour afficher l'écran de niveau terminé
    startLoop()
  }
}

function updateLevelComplete(deltaTime) {
  levelCompleteTimer += deltaTime
  levelProgress.value = Math.min((levelCompleteTimer / 3000) * 100, 100)

  if (levelCompleteTimer >= 3000) {
    createBricks()
    resetBall()
    combo.value = 0
    gameState.value = 'serving'
    servingCountdown.value = 3
  }
}

function updateServing(deltaTime) {
  if (servingCountdown.value > 0) {
    servingCountdown.value -= deltaTime / 1000
  }
}

// Utilitaires
function darkenColor(color, amount) {
  const num = parseInt(color.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, (num >> 8 & 0x00FF) - amount)
  const b = Math.max(0, (num & 0x0000FF) - amount)
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

function lightenColor(color, amount) {
  const num = parseInt(color.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, (num >> 8 & 0x00FF) + amount)
  const b = Math.min(255, (num & 0x0000FF) + amount)
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

// Rendu
function draw() {
  if (!ctx) return

  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight)
  gradient.addColorStop(0, '#001122')
  gradient.addColorStop(1, '#000000')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Dessiner selon l'état du jeu
  if (gameState.value === 'playing' || gameState.value === 'serving' || gameState.value === 'paused') {
    drawBricks()
    drawPaddle()
    drawBall()
    drawPowerUps()
    drawParticles()

    // Affichage du compte à rebours en mode serving
    if (gameState.value === 'serving' && servingCountdown.value > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      ctx.fillStyle = '#ffffff'
      ctx.font = '48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(Math.ceil(servingCountdown.value).toString(), canvasWidth / 2, canvasHeight / 2)

      ctx.font = '16px Arial'
      ctx.fillText('Appuyez sur ESPACE pour lancer la balle', canvasWidth / 2, canvasHeight / 2 + 60)
    }

    // Affichage du message de pause
    if (gameState.value === 'paused') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      ctx.fillStyle = '#ffffff'
      ctx.font = '32px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('PAUSE', canvasWidth / 2, canvasHeight / 2)

      ctx.font = '16px Arial'
      ctx.fillText('Appuyez sur P ou Échap pour reprendre', canvasWidth / 2, canvasHeight / 2 + 40)
    }
  } else if (gameState.value === 'levelComplete') {
    drawBricks()
    drawPaddle()
    drawBall()

    // Écran de niveau terminé
    ctx.fillStyle = 'rgba(0, 100, 0, 0.8)'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    ctx.fillStyle = '#ffffff'
    ctx.font = '32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`Niveau ${level.value - 1} Terminé !`, canvasWidth / 2, canvasHeight / 2 - 40)

    ctx.font = '18px Arial'
    ctx.fillText(`Bonus : ${levelBonus.value} points`, canvasWidth / 2, canvasHeight / 2)

    // Barre de progression
    const barWidth = 200
    const barHeight = 20
    const barX = (canvasWidth - barWidth) / 2
    const barY = canvasHeight / 2 + 30

    ctx.strokeStyle = '#ffffff'
    ctx.strokeRect(barX, barY, barWidth, barHeight)

    ctx.fillStyle = '#00ff00'
    ctx.fillRect(barX, barY, (barWidth * levelProgress.value) / 100, barHeight)
  } else if (gameState.value === 'gameOver') {
    // Écran de game over
    ctx.fillStyle = 'rgba(100, 0, 0, 0.8)'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    ctx.fillStyle = '#ffffff'
    ctx.font = '32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2 - 40)

    ctx.font = '18px Arial'
    ctx.fillText(`Score Final : ${formatScore(currentScore.value)}`, canvasWidth / 2, canvasHeight / 2)

    if (isNewRecord.value) {
      ctx.fillStyle = '#ffff00'
      ctx.fillText('NOUVEAU RECORD !', canvasWidth / 2, canvasHeight / 2 + 30)
    }

    ctx.fillStyle = '#ffffff'
    ctx.font = '14px Arial'
    ctx.fillText('Cliquez sur "Recommencer" pour rejouer', canvasWidth / 2, canvasHeight / 2 + 60)
  } else if (gameState.value === 'menu') {
    // Écran de menu
    ctx.fillStyle = '#ffffff'
    ctx.font = '48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('🏓 BREAKOUT', canvasWidth / 2, canvasHeight / 2 - 50)

    ctx.font = '18px Arial'
    ctx.fillText('Cliquez sur "Commencer" pour jouer', canvasWidth / 2, canvasHeight / 2 + 20)

    if (highScore.value > 0) {
      ctx.font = '14px Arial'
      ctx.fillText(`Meilleur Score : ${formatScore(highScore.value)}`, canvasWidth / 2, canvasHeight / 2 + 60)
    }
  }
}

function drawBricks() {
  bricks.value.forEach(brick => {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(brick.x + 2, brick.y + 2, brick.width, brick.height)

    ctx.fillStyle = brick.color
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height)

    ctx.strokeStyle = lightenColor(brick.color, 50)
    ctx.lineWidth = 2
    ctx.strokeRect(brick.x, brick.y, brick.width, brick.height)

    if (brick.maxHits > 1) {
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(brick.hits.toString(), brick.x + brick.width/2, brick.y + brick.height/2 + 4)
    }
  })
}

function drawPaddle() {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(paddle.value.x + 2, paddle.value.y + 2, paddle.value.width, paddle.value.height)

  const paddleGradient = ctx.createLinearGradient(0, paddle.value.y, 0, paddle.value.y + paddle.value.height)
  paddleGradient.addColorStop(0, '#00ff00')
  paddleGradient.addColorStop(1, '#008800')

  ctx.fillStyle = paddleGradient
  ctx.fillRect(paddle.value.x, paddle.value.y, paddle.value.width, paddle.value.height)

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.strokeRect(paddle.value.x, paddle.value.y, paddle.value.width, paddle.value.height)
}

function drawBall() {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.arc(ball.value.x + 2, ball.value.y + 2, ball.value.radius, 0, Math.PI * 2)
  ctx.fill()

  const ballGradient = ctx.createRadialGradient(
      ball.value.x - 3, ball.value.y - 3, 0,
      ball.value.x, ball.value.y, ball.value.radius
  )
  ballGradient.addColorStop(0, '#ffffff')
  ballGradient.addColorStop(1, '#cccccc')

  ctx.fillStyle = ballGradient
  ctx.beginPath()
  ctx.arc(ball.value.x, ball.value.y, ball.value.radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawPowerUps() {
  powerUps.value.forEach(powerUp => {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(powerUp.x + 2, powerUp.y + 2, powerUp.width, powerUp.height)

    ctx.fillStyle = powerUp.color
    ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height)

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height)

    ctx.fillStyle = '#000000'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    const iconX = powerUp.x + powerUp.width / 2
    const iconY = powerUp.y + powerUp.height / 2 + 3

    switch (powerUp.type) {
      case 'expand': ctx.fillText('↔', iconX, iconY); break
      case 'slow': ctx.fillText('⌐', iconX, iconY); break
      case 'points': ctx.fillText('★', iconX, iconY); break
      case 'life': ctx.fillText('♥', iconX, iconY); break
      case 'multiball': ctx.fillText('●', iconX, iconY); break
    }
  })
}

function drawParticles() {
  particles.value.forEach(particle => {
    const alpha = particle.life / particle.maxLife
    ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0')

    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawInitialScreen() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight)
  gradient.addColorStop(0, '#001122')
  gradient.addColorStop(1, '#000000')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  ctx.fillStyle = '#ffffff'
  ctx.font = '24px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('🏓 BREAKOUT', canvasWidth / 2, canvasHeight / 2)

  ctx.font = '16px Arial'
  ctx.fillText('Cliquez sur "Commencer" pour jouer', canvasWidth / 2, canvasHeight / 2 + 40)
}

// États de jeu
function startGame() {
  resetGame()
  lives.value = 3
  level.value = 1
  combo.value = 0
  bestCombo.value = 0
  bricksBroken.value = 0
  ballSpeed.value = 4
  levelBonus.value = 0
  levelProgress.value = 0
  lastPaddleMove = 0
  levelCompleteTimer = 0

  paddle.value = {
    x: canvasWidth / 2 - paddleWidth / 2,
    y: canvasHeight - 30,
    width: paddleWidth,
    height: paddleHeight,
    speed: 8
  }

  ball.value = {
    x: canvasWidth / 2,
    y: canvasHeight - 50,
    velocityX: 4,
    velocityY: -4,
    radius: ballRadius,
    stuck: true
  }

  createBricks()
  powerUps.value = []
  particles.value = []

  gameState.value = 'serving'
  servingCountdown.value = 3
  startLoop()

  nextTick(() => {
    gameCanvas.value?.focus()
  })
}

function pauseGame() {
  if (gameState.value === 'playing') {
    gameState.value = 'paused'
  }
}

function resumeGame() {
  if (gameState.value === 'paused') {
    gameState.value = 'playing'
    nextTick(() => {
      gameCanvas.value?.focus()
    })
  }
}

function goToMenu() {
  gameState.value = 'menu'
  stopLoop()
  showHelp.value = false

  nextTick(() => {
    if (ctx) {
      draw()
    }
  })
}

function restartGame() {
  stopLoop()
  startGame()
}

// Gestion des clics sur le canvas
function handleCanvasClick() {
  if (gameState.value === 'menu') {
    startGame()
  } else if (gameState.value === 'gameOver') {
    restartGame()
  } else if (gameState.value === 'serving') {
    launchBall()
  }
}

// Initialisation
onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  ctx = gameCanvas.value.getContext('2d')

  if (typeof localStorage !== 'undefined') {
    highScore.value = parseInt(localStorage.getItem('breakout-highscore') || '0')
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  nextTick(() => {
    if (ctx) {
      draw()
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  stopLoop()
})
</script>
<style scoped>
.breakout-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  max-width: 800px;
  margin: 0 auto;
  font-family: 'Press Start 2P', monospace;
}

/* Interface de jeu */
.game-ui {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 600px;
  flex-wrap: wrap;
  gap: 1rem;
}

.score-panel {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.score-item {
  background: rgba(0, 0, 0, 0.8);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 2px solid #00ff00;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  box-shadow:
      0 0 10px rgba(0, 255, 0, 0.3),
      inset 0 0 10px rgba(0, 255, 0, 0.1);
  transition: all 0.3s ease;
}

.score-item:hover {
  box-shadow:
      0 0 15px rgba(0, 255, 0, 0.5),
      inset 0 0 15px rgba(0, 255, 0, 0.2);
}

.score-item .label {
  opacity: 0.8;
  color: #ffffff;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
}

.score-item .value {
  color: #00ff00;
  margin-left: 0.5rem;
  text-shadow: 0 0 8px #00ff00;
  font-weight: bold;
}

.game-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.7;
  color: #ffffff;
  text-align: right;
}

.game-stats div {
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
}

/* Zone de jeu */
.game-area {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}

.game-canvas {
  border: 3px solid #00ff00;
  border-radius: 8px;
  background: #000000;
  box-shadow:
      0 0 20px rgba(0, 255, 0, 0.4),
      0 0 40px rgba(0, 255, 0, 0.2),
      inset 0 0 20px rgba(0, 255, 0, 0.1);
  transition: all 0.3s ease;
}

.game-canvas:focus {
  outline: none;
  border-color: #ffff00;
  box-shadow:
      0 0 30px rgba(255, 255, 0, 0.6),
      0 0 50px rgba(255, 255, 0, 0.3),
      inset 0 0 20px rgba(255, 255, 0, 0.1);
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
  backdrop-filter: blur(5px);
  z-index: 10;
}

.serving-overlay {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(3px);
}

.menu, .pause-menu, .game-over, .level-complete {
  background: linear-gradient(135deg, rgba(0, 0, 30, 0.95), rgba(0, 0, 0, 0.95));
  padding: 2rem;
  border-radius: 12px;
  border: 2px solid #00ff00;
  text-align: center;
  max-width: 400px;
  color: #ffffff;
  box-shadow:
      0 0 30px rgba(0, 255, 0, 0.3),
      inset 0 0 20px rgba(0, 255, 0, 0.1);
  animation: slideIn 0.4s ease-out;
}

.serving-message {
  background: linear-gradient(135deg, rgba(0, 0, 30, 0.9), rgba(0, 0, 0, 0.8));
  padding: 1.5rem;
  border-radius: 12px;
  border: 2px solid #ffff00;
  text-align: center;
  color: #ffffff;
  box-shadow:
      0 0 20px rgba(255, 255, 0, 0.4),
      inset 0 0 15px rgba(255, 255, 0, 0.1);
  animation: pulse 1s ease-in-out infinite;
}

.serving-countdown {
  font-size: 2rem;
  color: #ffff00;
  font-family: 'Press Start 2P', monospace;
  margin-top: 1rem;
  text-shadow:
      0 0 10px #ffff00,
      0 0 20px #ffff00,
      0 0 30px #ffff00;
  animation: countdownPulse 1s ease-in-out infinite;
}

.menu h3, .pause-menu h3, .game-over h3, .level-complete h3 {
  margin-bottom: 1rem;
  color: #00ff00;
  font-family: 'Press Start 2P', monospace;
  font-size: 1.2rem;
  text-shadow:
      0 0 10px #00ff00,
      0 0 20px #00ff00;
  animation: titleGlow 2s ease-in-out infinite alternate;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

.game-button {
  background: linear-gradient(45deg, #00ff00, #008800);
  border: none;
  color: #000000;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  text-transform: uppercase;
  position: relative;
  overflow: hidden;
  box-shadow:
      0 4px 0 #006600,
      0 8px 15px rgba(0, 0, 0, 0.3);
}

.game-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.game-button:hover::before {
  left: 100%;
}

.game-button:hover {
  transform: translateY(-2px);
  box-shadow:
      0 6px 0 #006600,
      0 12px 20px rgba(0, 0, 0, 0.4),
      0 0 20px rgba(0, 255, 0, 0.3);
}

.game-button:active {
  transform: translateY(2px);
  box-shadow:
      0 2px 0 #006600,
      0 4px 8px rgba(0, 0, 0, 0.3);
}

.game-button.secondary {
  background: linear-gradient(45deg, #ffff00, #ff8800);
  box-shadow:
      0 4px 0 #cc6600,
      0 8px 15px rgba(0, 0, 0, 0.3);
}

.game-button.secondary:hover {
  box-shadow:
      0 6px 0 #cc6600,
      0 12px 20px rgba(0, 0, 0, 0.4),
      0 0 20px rgba(255, 255, 0, 0.3);
}

.game-button.secondary:active {
  box-shadow:
      0 2px 0 #cc6600,
      0 4px 8px rgba(0, 0, 0, 0.3);
}

.help-panel {
  margin-top: 1.5rem;
  text-align: left;
  background: rgba(0, 0, 0, 0.6);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 0, 0.3);
  box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.1);
}

.help-panel h4 {
  color: #00ff00;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 5px #00ff00;
}

.help-panel ul {
  list-style: none;
  padding: 0;
}

.help-panel li {
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  line-height: 1.4;
  opacity: 0.9;
}

.final-stats {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 0, 0.3);
}

.final-score {
  font-size: 1.2rem;
  color: #00ff00;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 10px #00ff00;
}

.new-record {
  color: #ffff00;
  font-weight: bold;
  animation: recordPulse 1s infinite;
  text-shadow:
      0 0 10px #ffff00,
      0 0 20px #ffff00;
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
  padding: 0.3rem 0;
  border-bottom: 1px solid rgba(0, 255, 0, 0.2);
}

.stat-label {
  opacity: 0.7;
}

.stat-value {
  color: #00ff00;
  font-weight: bold;
  text-shadow: 0 0 5px #00ff00;
}

/* Level complete */
.level-complete {
  animation: levelCompleteEntry 0.6s ease-out;
}

.progress-bar {
  background: rgba(255, 255, 255, 0.2);
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 1rem;
  border: 1px solid rgba(0, 255, 0, 0.3);
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
}

.progress {
  background: linear-gradient(90deg, #00ff00, #ffff00, #00ff00);
  height: 100%;
  transition: width 0.1s ease;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
  animation: progressShine 2s linear infinite;
}

/* Contrôles mobiles */
.mobile-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 600px;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(0, 255, 0, 0.3);
}

.paddle-slider {
  width: 100%;
}

.paddle-control {
  width: 100%;
  height: 40px;
  background: linear-gradient(90deg, rgba(0, 255, 0, 0.2), rgba(0, 255, 0, 0.4), rgba(0, 255, 0, 0.2));
  border-radius: 20px;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
  box-shadow:
      inset 0 2px 5px rgba(0, 0, 0, 0.3),
      0 0 10px rgba(0, 255, 0, 0.2);
}

.paddle-control::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 60px;
  height: 40px;
  background: linear-gradient(45deg, #00ff00, #008800);
  border-radius: 20px;
  cursor: pointer;
  box-shadow:
      0 2px 5px rgba(0, 0, 0, 0.3),
      0 0 10px rgba(0, 255, 0, 0.4);
  transition: all 0.2s ease;
}

.paddle-control::-webkit-slider-thumb:hover {
  box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.4),
      0 0 15px rgba(0, 255, 0, 0.6);
}

.action-controls {
  display: flex;
  gap: 1rem;
}

.launch-btn, .pause-btn {
  background: linear-gradient(45deg, #00ff00, #008800);
  border: none;
  color: #000000;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  text-transform: uppercase;
  box-shadow:
      0 4px 0 #006600,
      0 8px 15px rgba(0, 0, 0, 0.3);
}

.pause-btn {
  background: linear-gradient(45deg, #ffff00, #ff8800);
  box-shadow:
      0 4px 0 #cc6600,
      0 8px 15px rgba(0, 0, 0, 0.3);
}

.launch-btn:hover, .pause-btn:hover {
  transform: translateY(-2px);
  box-shadow:
      0 6px 0 #006600,
      0 12px 20px rgba(0, 0, 0, 0.4);
}

.pause-btn:hover {
  box-shadow:
      0 6px 0 #cc6600,
      0 12px 20px rgba(0, 0, 0, 0.4);
}

.launch-btn:active, .pause-btn:active {
  transform: scale(0.95) translateY(2px);
  box-shadow:
      0 2px 0 #006600,
      0 4px 8px rgba(0, 0, 0, 0.3);
}

.pause-btn:active {
  box-shadow:
      0 2px 0 #cc6600,
      0 4px 8px rgba(0, 0, 0, 0.3);
}

/* Instructions */
.instructions {
  text-align: center;
  opacity: 0.8;
  font-size: 0.9rem;
  max-width: 600px;
  color: #ffffff;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 0, 0.2);
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
}

.instructions strong {
  color: #00ff00;
  text-shadow: 0 0 5px #00ff00;
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-50px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
}

@keyframes countdownPulse {
  0%, 100% {
    transform: scale(1);
    text-shadow:
        0 0 10px #ffff00,
        0 0 20px #ffff00,
        0 0 30px #ffff00;
  }
  50% {
    transform: scale(1.1);
    text-shadow:
        0 0 15px #ffff00,
        0 0 30px #ffff00,
        0 0 45px #ffff00;
  }
}

@keyframes titleGlow {
  from {
    text-shadow:
        0 0 10px #00ff00,
        0 0 20px #00ff00;
  }
  to {
    text-shadow:
        0 0 15px #00ff00,
        0 0 30px #00ff00,
        0 0 45px #00ff00;
  }
}

@keyframes recordPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

@keyframes levelCompleteEntry {
  from {
    opacity: 0;
    transform: translateY(-100px) rotate(-10deg) scale(0.5);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotate(0deg) scale(1);
  }
}

@keyframes progressShine {
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 100% 0;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .breakout-game {
    padding: 1rem;
    gap: 1rem;
  }

  .game-canvas {
    width: 100%;
    max-width: 400px;
    height: auto;
    aspect-ratio: 6/5;
  }

  .score-panel {
    justify-content: center;
    font-size: 8px;
  }

  .score-item {
    padding: 0.4rem 0.8rem;
  }

  .game-stats {
    font-size: 0.7rem;
  }

  .mobile-controls {
    max-width: 400px;
  }

  .game-button {
    font-size: 10px;
    padding: 0.8rem 1.5rem;
  }

  .menu, .pause-menu, .game-over, .level-complete {
    padding: 1.5rem;
    max-width: 350px;
  }
}

@media (max-width: 480px) {
  .breakout-game {
    padding: 0.5rem;
    gap: 0.5rem;
  }

  .game-canvas {
    width: 100%;
    max-width: 300px;
    aspect-ratio: 6/5;
  }

  .game-ui {
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .score-panel {
    flex-wrap: wrap;
    justify-content: center;
  }

  .game-button {
    font-size: 9px;
    padding: 0.7rem 1.2rem;
  }

  .launch-btn, .pause-btn {
    font-size: 8px;
    padding: 0.8rem 1.5rem;
  }

  .score-item {
    font-size: 8px;
    padding: 0.3rem 0.6rem;
  }

  .instructions {
    font-size: 0.7rem;
    padding: 0.8rem;
  }

  .menu, .pause-menu, .game-over, .level-complete {
    padding: 1rem;
    max-width: 280px;
  }

  .menu h3, .pause-menu h3, .game-over h3, .level-complete h3 {
    font-size: 1rem;
  }

  .menu-buttons {
    flex-direction: column;
  }
}

/* Effets spéciaux pour une meilleure immersion */
.breakout-game::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:
      radial-gradient(circle at 20% 80%, rgba(0, 255, 0, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 255, 0, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(0, 255, 255, 0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: -1;
  animation: backgroundPulse 10s ease-in-out infinite;
}

@keyframes backgroundPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

/* Scroll personnalisé pour les stats */
.stats-grid::-webkit-scrollbar {
  width: 4px;
}

.stats-grid::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.stats-grid::-webkit-scrollbar-thumb {
  background: #00ff00;
  border-radius: 2px;
  box-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
}
</style>

