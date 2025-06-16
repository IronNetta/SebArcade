<template>
  <div class="space-invaders-game">
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
          <span class="label">Vague:</span>
          <span class="value">{{ wave }}</span>
        </div>
        <div class="score-item">
          <span class="label">Vies:</span>
          <span class="value">{{ '💚'.repeat(lives) }}</span>
        </div>
      </div>

      <div class="game-stats">
        <div class="fps">FPS: {{ actualFPS }}</div>
        <div class="aliens">Aliens: {{ aliensCount }}</div>
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
          <h3>👾 Space Invaders</h3>
          <p>Défendez la Terre contre l'invasion alien !</p>
          <div class="menu-buttons">
            <button @click="startGame" class="game-button">
              🚀 Commencer l'invasion
            </button>
            <button @click="showHelp = !showHelp" class="game-button secondary">
              ❓ Contrôles
            </button>
          </div>

          <div v-if="showHelp" class="help-panel">
            <h4>Comment jouer :</h4>
            <ul>
              <li>🔄 Flèches ←→ pour bouger</li>
              <li>🔥 ESPACE pour tirer</li>
              <li>🛡️ Utilisez les abris pour vous protéger</li>
              <li>👾 Détruisez tous les aliens pour passer à la vague suivante</li>
              <li>⚠️ Ne laissez pas les aliens atteindre le sol !</li>
            </ul>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'paused'" class="game-overlay">
        <div class="pause-menu">
          <h3>⏸️ Pause</h3>
          <div class="menu-buttons">
            <button @click="resumeGame" class="game-button">
              ▶️ Reprendre le combat
            </button>
            <button @click="goToMenu" class="game-button secondary">
              🏠 Abandonner
            </button>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'gameOver'" class="game-overlay">
        <div class="game-over">
          <h3>💀 Game Over</h3>
          <div class="final-stats">
            <p class="final-score">Score final: {{ formatScore(currentScore) }}</p>
            <p v-if="isNewRecord" class="new-record">🏆 Nouveau record galactique !</p>
            <div class="stats-grid">
              <div class="stat">
                <span class="stat-label">Vague atteinte:</span>
                <span class="stat-value">{{ wave }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Aliens détruits:</span>
                <span class="stat-value">{{ aliensDestroyed }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Précision:</span>
                <span class="stat-value">{{ accuracy }}%</span>
              </div>
            </div>
          </div>
          <div class="menu-buttons">
            <button @click="startGame" class="game-button">
              🔄 Revanche
            </button>
            <button @click="goToMenu" class="game-button secondary">
              🏠 Retraite
            </button>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'waveComplete'" class="game-overlay">
        <div class="wave-complete">
          <h3>🎉 Vague {{ wave - 1 }} Terminée !</h3>
          <p>Bonus: +{{ waveBonus }} points</p>
          <p>Préparez-vous pour la vague {{ wave }}...</p>
          <div class="wave-progress">
            <div class="progress-bar">
              <div class="progress" :style="{ width: waveProgress + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contrôles mobiles -->
    <div class="mobile-controls" v-if="isMobile">
      <div class="movement-controls">
        <button @touchstart="startMoving('left')" @touchend="stopMoving" class="move-btn">←</button>
        <button @touchstart="startMoving('right')" @touchend="stopMoving" class="move-btn">→</button>
      </div>

      <div class="action-controls">
        <button @click="shoot" class="shoot-btn">🔥 TIR</button>
        <button @click="pauseGame" class="pause-btn">⏸️</button>
      </div>
    </div>

    <!-- Instructions -->
    <div class="instructions">
      <p v-if="!isMobile">
        🎮 <strong>Contrôles:</strong> ←→ pour bouger • ESPACE pour tirer • P pour pause
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
const canvasWidth = 600
const canvasHeight = 500
const playerSpeed = 4
const bulletSpeed = 6
const alienSpeed = 1
const alienDropDistance = 20

// État du jeu
const gameCanvas = ref(null)
const gameState = ref('menu') // 'menu', 'playing', 'paused', 'gameOver', 'waveComplete'
const showHelp = ref(false)
const isMobile = ref(false)

// Variables de jeu
const wave = ref(1)
const lives = ref(3)
const aliensDestroyed = ref(0)
const shotsFired = ref(0)
const waveBonus = ref(0)
const waveProgress = ref(0)

// Entités du jeu
const player = ref({
  x: canvasWidth / 2 - 15,
  y: canvasHeight - 40,
  width: 30,
  height: 20,
  speed: playerSpeed
})

const bullets = ref([])
const aliens = ref([])
const alienBullets = ref([])
const barriers = ref([])
const explosions = ref([])

// Timing et mouvement
let ctx = null
let alienDirection = 1
let alienMoveTimer = 0
let alienShootTimer = 0
let waveCompleteTimer = 0
let mobileMoving = null

// Fonction updateGame définie avant useGameLoop
function updateGame(deltaTime) {
  if (gameState.value !== 'playing') {
    if (gameState.value === 'waveComplete') {
      updateWaveComplete(deltaTime)
    }
    return
  }

  // Gestion des contrôles
  handleInput()

  // Mise à jour des entités
  updatePlayer(deltaTime)
  updateBullets(deltaTime)
  updateAliens(deltaTime)
  // updateAlienBullets(deltaTime) - Cette fonction est déjà incluse dans updateBullets
  updateExplosions(deltaTime)

  // Vérifications
  checkCollisions()
  checkWaveComplete()
  checkGameOver()

  // Rendu
  draw()
}

// Composables
const { currentScore, highScore, level, isNewRecord, addPoints, endGame, resetGame, formatScore } = useScore('space-invaders')
const { arrows, actions, bindToElement } = useKeyboard()
const { start: startLoop, stop: stopLoop, actualFPS } = useGameLoop(updateGame, 60)

// Computed
const aliensCount = computed(() => aliens.value.length)
const accuracy = computed(() => {
  if (shotsFired.value === 0) return 0
  return Math.round((aliensDestroyed.value / shotsFired.value) * 100)
})

// Initialisation
onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  ctx = gameCanvas.value.getContext('2d')

  const unbind = bindToElement(gameCanvas.value)
  setupBarriers()

  onUnmounted(() => {
    unbind?.()
    stopLoop()
  })
})

// Gestion des contrôles
function handleInput() {
  // Mouvement du joueur
  if (arrows.value.left) {
    player.value.x = Math.max(0, player.value.x - player.value.speed)
  }
  if (arrows.value.right) {
    player.value.x = Math.min(canvasWidth - player.value.width, player.value.x + player.value.speed)
  }

  // Tir
  if (actions.value.space) {
    shoot()
  }

  // Pause
  if (actions.value.escape) {
    pauseGame()
  }
}

// Contrôles mobiles
function startMoving(direction) {
  mobileMoving = direction
}

function stopMoving() {
  mobileMoving = null
}

function updatePlayer(deltaTime) {
  if (mobileMoving === 'left') {
    player.value.x = Math.max(0, player.value.x - player.value.speed)
  } else if (mobileMoving === 'right') {
    player.value.x = Math.min(canvasWidth - player.value.width, player.value.x + player.value.speed)
  }
}

// Système de tir
function shoot() {
  // Limite à 1 balle à la fois
  if (bullets.value.length > 0) return

  bullets.value.push({
    x: player.value.x + player.value.width / 2 - 2,
    y: player.value.y,
    width: 4,
    height: 10,
    speed: bulletSpeed
  })

  shotsFired.value++
}

function updateBullets(deltaTime) {
  // Balles du joueur
  for (let i = bullets.value.length - 1; i >= 0; i--) {
    const bullet = bullets.value[i]
    bullet.y -= bullet.speed

    if (bullet.y < 0) {
      bullets.value.splice(i, 1)
    }
  }

  // Balles des aliens
  for (let i = alienBullets.value.length - 1; i >= 0; i--) {
    const bullet = alienBullets.value[i]
    bullet.y += bullet.speed

    if (bullet.y > canvasHeight) {
      alienBullets.value.splice(i, 1)
    }
  }
}

// Système d'aliens
function createAlienWave() {
  aliens.value = []
  const rows = 5
  const cols = 10
  const alienWidth = 30
  const alienHeight = 20
  const spacing = 10

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      aliens.value.push({
        x: 50 + col * (alienWidth + spacing),
        y: 50 + row * (alienHeight + spacing),
        width: alienWidth,
        height: alienHeight,
        type: row < 2 ? 'red' : row < 4 ? 'green' : 'yellow',
        points: row < 2 ? 30 : row < 4 ? 20 : 10
      })
    }
  }
}

function updateAliens(deltaTime) {
  if (aliens.value.length === 0) return

  alienMoveTimer += deltaTime
  alienShootTimer += deltaTime

  // Mouvement des aliens
  if (alienMoveTimer >= 500 - (wave.value * 20)) { // Plus rapide à chaque vague
    let moveDown = false

    // Vérifier si on doit changer de direction
    for (const alien of aliens.value) {
      if ((alien.x <= 0 && alienDirection === -1) ||
          (alien.x >= canvasWidth - alien.width && alienDirection === 1)) {
        moveDown = true
        break
      }
    }

    if (moveDown) {
      alienDirection *= -1
      aliens.value.forEach(alien => {
        alien.y += alienDropDistance
      })
    } else {
      aliens.value.forEach(alien => {
        alien.x += alienDirection * alienSpeed
      })
    }

    alienMoveTimer = 0
  }

  // Tir des aliens
  if (alienShootTimer >= 1000 + Math.random() * 2000) {
    if (aliens.value.length > 0) {
      const shooter = aliens.value[Math.floor(Math.random() * aliens.value.length)]
      alienBullets.value.push({
        x: shooter.x + shooter.width / 2 - 2,
        y: shooter.y + shooter.height,
        width: 4,
        height: 8,
        speed: 3
      })
    }
    alienShootTimer = 0
  }
}

// Système de barrières
function setupBarriers() {
  barriers.value = []
  const barrierCount = 4
  const barrierWidth = 60
  const barrierHeight = 40

  for (let i = 0; i < barrierCount; i++) {
    const x = (canvasWidth / (barrierCount + 1)) * (i + 1) - barrierWidth / 2
    const y = canvasHeight - 150

    // Créer une barrière avec des blocs destructibles
    const barrier = []
    const blockSize = 5
    for (let row = 0; row < barrierHeight / blockSize; row++) {
      for (let col = 0; col < barrierWidth / blockSize; col++) {
        // Forme de la barrière (évidée au centre)
        if (row > 3 && col > 3 && col < (barrierWidth / blockSize) - 4) {
          continue // Trou au centre
        }

        barrier.push({
          x: x + col * blockSize,
          y: y + row * blockSize,
          width: blockSize,
          height: blockSize,
          active: true
        })
      }
    }
    barriers.value.push(barrier)
  }
}

// Système d'explosions
function createExplosion(x, y, type = 'normal') {
  explosions.value.push({
    x,
    y,
    radius: 0,
    maxRadius: type === 'alien' ? 20 : 15,
    life: 0,
    maxLife: 300,
    type
  })
}

function updateExplosions(deltaTime) {
  for (let i = explosions.value.length - 1; i >= 0; i--) {
    const explosion = explosions.value[i]
    explosion.life += deltaTime
    explosion.radius = (explosion.life / explosion.maxLife) * explosion.maxRadius

    if (explosion.life >= explosion.maxLife) {
      explosions.value.splice(i, 1)
    }
  }
}

// Détection de collisions
function checkCollisions() {
  // Balles du joueur vs aliens
  for (let i = bullets.value.length - 1; i >= 0; i--) {
    const bullet = bullets.value[i]

    for (let j = aliens.value.length - 1; j >= 0; j--) {
      const alien = aliens.value[j]

      if (rectCollision(bullet, alien)) {
        // Explosion
        createExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, 'alien')

        // Points
        addPoints(alien.points, { combo: true })
        aliensDestroyed.value++

        // Supprimer
        bullets.value.splice(i, 1)
        aliens.value.splice(j, 1)
        break
      }
    }
  }

  // Balles des aliens vs joueur
  for (let i = alienBullets.value.length - 1; i >= 0; i--) {
    const bullet = alienBullets.value[i]

    if (rectCollision(bullet, player.value)) {
      createExplosion(player.value.x + player.value.width / 2, player.value.y + player.value.height / 2)
      alienBullets.value.splice(i, 1)
      lives.value--

      if (lives.value <= 0) {
        gameState.value = 'gameOver'
      }
      break
    }
  }

  // Balles vs barrières
  checkBarrierCollisions()
}

function checkBarrierCollisions() {
  // Balles du joueur vs barrières
  for (let i = bullets.value.length - 1; i >= 0; i--) {
    const bullet = bullets.value[i]

    for (const barrier of barriers.value) {
      for (let j = barrier.length - 1; j >= 0; j--) {
        const block = barrier[j]

        if (block.active && rectCollision(bullet, block)) {
          block.active = false
          bullets.value.splice(i, 1)
          break
        }
      }
    }
  }

  // Balles des aliens vs barrières
  for (let i = alienBullets.value.length - 1; i >= 0; i--) {
    const bullet = alienBullets.value[i]

    for (const barrier of barriers.value) {
      for (let j = barrier.length - 1; j >= 0; j--) {
        const block = barrier[j]

        if (block.active && rectCollision(bullet, block)) {
          block.active = false
          alienBullets.value.splice(i, 1)
          break
        }
      }
    }
  }
}

function rectCollision(rect1, rect2) {
  return rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
}

// Gestion des vagues
function checkWaveComplete() {
  if (aliens.value.length === 0 && gameState.value === 'playing') {
    waveBonus.value = wave.value * 100
    addPoints(waveBonus.value)
    wave.value++
    gameState.value = 'waveComplete'
    waveCompleteTimer = 0
    waveProgress.value = 0
    stopLoop()
  }
}

function updateWaveComplete(deltaTime) {
  waveCompleteTimer += deltaTime
  waveProgress.value = Math.min((waveCompleteTimer / 3000) * 100, 100)

  if (waveCompleteTimer >= 3000) {
    createAlienWave()
    setupBarriers()
    gameState.value = 'playing'
    startLoop()
  }
}

function checkGameOver() {
  // Aliens atteignent le sol
  for (const alien of aliens.value) {
    if (alien.y + alien.height >= canvasHeight - 50) {
      gameState.value = 'gameOver'
      break
    }
  }
}

// Rendu
function draw() {
  if (!ctx) return

  // Fond
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Étoiles de fond
  drawStars()

  // Joueur
  drawPlayer()

  // Aliens
  drawAliens()

  // Balles
  drawBullets()

  // Barrières
  drawBarriers()

  // Explosions
  drawExplosions()

  // UI
  drawUI()
}

function drawStars() {
  ctx.fillStyle = '#fff'
  for (let i = 0; i < 50; i++) {
    const x = (i * 47) % canvasWidth
    const y = (i * 83) % canvasHeight
    ctx.fillRect(x, y, 1, 1)
  }
}

function drawPlayer() {
  ctx.fillStyle = '#0f0'
  ctx.fillRect(player.value.x, player.value.y, player.value.width, player.value.height)

  // Canon
  ctx.fillStyle = '#0a0'
  ctx.fillRect(player.value.x + 13, player.value.y - 5, 4, 8)
}

function drawAliens() {
  aliens.value.forEach(alien => {
    switch (alien.type) {
      case 'red':
        ctx.fillStyle = '#f00'
        break
      case 'green':
        ctx.fillStyle = '#0f0'
        break
      default:
        ctx.fillStyle = '#ff0'
    }

    ctx.fillRect(alien.x, alien.y, alien.width, alien.height)

    // Détails alien
    ctx.fillStyle = '#fff'
    ctx.fillRect(alien.x + 5, alien.y + 5, 4, 4)
    ctx.fillRect(alien.x + 21, alien.y + 5, 4, 4)
  })
}

function drawBullets() {
  // Balles du joueur
  ctx.fillStyle = '#ff0'
  bullets.value.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
  })

  // Balles des aliens
  ctx.fillStyle = '#f0f'
  alienBullets.value.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
  })
}

function drawBarriers() {
  ctx.fillStyle = '#0f0'
  barriers.value.forEach(barrier => {
    barrier.forEach(block => {
      if (block.active) {
        ctx.fillRect(block.x, block.y, block.width, block.height)
      }
    })
  })
}

function drawExplosions() {
  explosions.value.forEach(explosion => {
    const alpha = 1 - (explosion.life / explosion.maxLife)
    const color = explosion.type === 'alien' ? `rgba(255, 0, 0, ${alpha})` : `rgba(255, 255, 0, ${alpha})`

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawUI() {
  // Ligne de base
  ctx.strokeStyle = '#0f0'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, canvasHeight - 30)
  ctx.lineTo(canvasWidth, canvasHeight - 30)
  ctx.stroke()
}

// Gestion des états de jeu
function startGame() {
  resetGame()

  wave.value = 1
  lives.value = 3
  aliensDestroyed.value = 0
  shotsFired.value = 0
  bullets.value = []
  alienBullets.value = []
  explosions.value = []

  player.value.x = canvasWidth / 2 - 15

  createAlienWave()
  setupBarriers()

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
.space-invaders-game {
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

.menu, .pause-menu, .game-over, .wave-complete {
  background: rgba(0, 20, 0, 0.95);
  padding: 2rem;
  border-radius: 12px;
  border: 2px solid #00ff00;
  text-align: center;
  max-width: 400px;
}

.menu h3, .pause-menu h3, .game-over h3, .wave-complete h3 {
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
  color: #00ff00;
  font-weight: bold;
}

/* Wave complete */
.wave-complete {
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
  background: linear-gradient(90deg, #00ff00, #ffff00);
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

.movement-controls {
  display: flex;
  gap: 1rem;
}

.move-btn {
  background: rgba(0, 255, 0, 0.2);
  border: 2px solid #00ff00;
  color: #00ff00;
  font-size: 2rem;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.move-btn:active {
  background: rgba(0, 255, 0, 0.4);
  transform: scale(0.95);
}

.action-controls {
  display: flex;
  gap: 1rem;
}

.shoot-btn {
  background: rgba(255, 255, 0, 0.2);
  border: 2px solid #ffff00;
  color: #ffff00;
  font-size: 1rem;
  padding: 1rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.shoot-btn:active {
  background: rgba(255, 255, 0, 0.4);
  transform: scale(0.95);
}

.pause-btn {
  background: rgba(255, 0, 255, 0.2);
  border: 2px solid #ff00ff;
  color: #ff00ff;
  font-size: 1.5rem;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.pause-btn:active {
  background: rgba(255, 0, 255, 0.4);
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
  .space-invaders-game {
    padding: 1rem;
    gap: 1rem;
  }

  .game-canvas {
    width: 400px;
    height: 333px;
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

  .movement-controls {
    justify-content: center;
  }

  .action-controls {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .game-canvas {
    width: 300px;
    height: 250px;
  }

  .move-btn {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }

  .pause-btn {
    width: 50px;
    height: 50px;
  }
}
</style>