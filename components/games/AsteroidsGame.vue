<template>
  <div class="asteroids-game">
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
          <span class="value">{{ '🚀'.repeat(lives) }}</span>
        </div>
        <div class="score-item">
          <span class="label">Niveau:</span>
          <span class="value">{{ level }}</span>
        </div>
      </div>

      <div class="game-stats">
        <div class="fps">FPS: {{ actualFPS }}</div>
        <div class="asteroids">Astéroïdes: {{ asteroidsCount }}</div>
        <div class="fuel">Carburant: {{ Math.round(fuel) }}%</div>
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
          <h3>🚀 Asteroids</h3>
          <p>Survivez dans l'espace en détruisant les astéroïdes !</p>
          <div class="menu-buttons">
            <button @click="startGame" class="game-button">
              🚀 Lancer dans l'espace
            </button>
            <button @click="showHelp = !showHelp" class="game-button secondary">
              ❓ Contrôles
            </button>
          </div>

          <div v-if="showHelp" class="help-panel">
            <h4>Comment jouer :</h4>
            <ul>
              <li>🔄 Flèches ←→ pour tourner</li>
              <li>🚀 Flèche ↑ pour propulser</li>
              <li>🔥 ESPACE pour tirer</li>
              <li>💨 Les grands astéroïdes se divisent en petits</li>
              <li>⚡ Attention au carburant limité !</li>
              <li>🌌 Les bords de l'écran sont connectés</li>
            </ul>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'paused'" class="game-overlay">
        <div class="pause-menu">
          <h3>⏸️ Mission en pause</h3>
          <div class="menu-buttons">
            <button @click="resumeGame" class="game-button">
              ▶️ Reprendre la mission
            </button>
            <button @click="goToMenu" class="game-button secondary">
              🏠 Abandonner la mission
            </button>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'gameOver'" class="game-overlay">
        <div class="game-over">
          <h3>💥 Vaisseau détruit</h3>
          <div class="final-stats">
            <p class="final-score">Score final: {{ formatScore(currentScore) }}</p>
            <p v-if="isNewRecord" class="new-record">🏆 Nouveau record spatial !</p>
            <div class="stats-grid">
              <div class="stat">
                <span class="stat-label">Niveau atteint:</span>
                <span class="stat-value">{{ level }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Astéroïdes détruits:</span>
                <span class="stat-value">{{ asteroidsDestroyed }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Temps de survie:</span>
                <span class="stat-value">{{ formatTime(survivalTime) }}</span>
              </div>
            </div>
          </div>
          <div class="menu-buttons">
            <button @click="startGame" class="game-button">
              🔄 Nouvelle mission
            </button>
            <button @click="goToMenu" class="game-button secondary">
              🏠 Retour à la base
            </button>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'levelComplete'" class="game-overlay">
        <div class="level-complete">
          <h3>🎉 Niveau {{ level - 1 }} Terminé !</h3>
          <p>Bonus de survie: +{{ levelBonus }} points</p>
          <p>Carburant rechargé à 100%</p>
          <p>Niveau {{ level }} - Plus d'astéroïdes vous attendent...</p>
          <div class="level-progress">
            <div class="progress-bar">
              <div class="progress" :style="{ width: levelProgress + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contrôles mobiles -->
    <div class="mobile-controls" v-if="isMobile">
      <div class="movement-controls">
        <button @touchstart="startAction('turnLeft')" @touchend="stopAction('turnLeft')" class="control-btn rotate-left">↻</button>
        <button @touchstart="startAction('thrust')" @touchend="stopAction('thrust')" class="control-btn thrust">🚀</button>
        <button @touchstart="startAction('turnRight')" @touchend="stopAction('turnRight')" class="control-btn rotate-right">↺</button>
      </div>

      <div class="action-controls">
        <button @click="shoot" class="shoot-btn">🔥 TIR</button>
        <button @click="pauseGame" class="pause-btn">⏸️</button>
      </div>
    </div>

    <!-- Instructions -->
    <div class="instructions">
      <p v-if="!isMobile">
        🎮 <strong>Contrôles:</strong> ←→ tourner • ↑ propulser • ESPACE tirer • P pause
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
const shipSize = 8
const bulletSpeed = 8
const asteroidSpeeds = { large: 1.5, medium: 2.5, small: 4 }
const asteroidSizes = { large: 40, medium: 25, small: 15 }
const asteroidPoints = { large: 20, medium: 50, small: 100 }

// Fonction utilitaire pour formater les scores
const formatScore = (score) => {
  return score?.toLocaleString() || '0'
}

// État du jeu
const gameCanvas = ref(null)
const gameState = ref('menu') // 'menu', 'playing', 'paused', 'gameOver', 'levelComplete'
const showHelp = ref(false)
const isMobile = ref(false)

// Variables de jeu
const lives = ref(3)
const level = ref(1)
const fuel = ref(100)
const asteroidsDestroyed = ref(0)
const survivalTime = ref(0)
const levelBonus = ref(0)
const levelProgress = ref(0)

// Actions mobiles actives
const activeActions = ref(new Set())

// Entités du jeu
const ship = ref({
  x: canvasWidth / 2,
  y: canvasHeight / 2,
  rotation: 0,
  velocityX: 0,
  velocityY: 0,
  thrust: false,
  invulnerable: 0,
  size: shipSize
})

const bullets = ref([])
const asteroids = ref([])
const particles = ref([])

// Timing
let ctx = null
let gameStartTime = 0
let levelCompleteTimer = 0
let thrustParticleTimer = 0

// Fonction updateGame définie avant useGameLoop
function updateGame(deltaTime) {
  if (gameState.value !== 'playing') {
    if (gameState.value === 'levelComplete') {
      updateLevelComplete(deltaTime)
    }
    return
  }

  // Gestion des contrôles
  handleInput(deltaTime)

  // Mise à jour des entités
  updateShip(deltaTime)
  updateBullets(deltaTime)
  updateAsteroids(deltaTime)
  updateParticles(deltaTime)

  // Vérifications
  checkCollisions()
  checkLevelComplete()

  // Mise à jour des stats
  survivalTime.value = Date.now() - gameStartTime

  // Rendu
  draw()
}

// Composables
const { currentScore, highScore, level: scoreLevel, isNewRecord, addPoints, endGame, startGame: resetGame } = useScore('asteroids')
const { arrows, actions, bindToElement } = useKeyboard()
const { start: startLoop, stop: stopLoop, actualFPS } = useGameLoop(updateGame, 60)

// Computed
const asteroidsCount = computed(() => asteroids.value.length)

// Initialisation
onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  ctx = gameCanvas.value.getContext('2d')

  const unbind = bindToElement(gameCanvas.value)

  onUnmounted(() => {
    unbind?.()
    stopLoop()
  })
})

// Gestion des contrôles
function handleInput(deltaTime) {
  // Rotation
  if (arrows.value.left || activeActions.value.has('turnLeft')) {
    ship.value.rotation -= 5 * (deltaTime / 16.67) // Normaliser pour 60fps
  }
  if (arrows.value.right || activeActions.value.has('turnRight')) {
    ship.value.rotation += 5 * (deltaTime / 16.67)
  }

  // Propulsion
  if (arrows.value.up || activeActions.value.has('thrust')) {
    if (fuel.value > 0) {
      const thrustPower = 0.3
      const angle = (ship.value.rotation - 90) * Math.PI / 180

      ship.value.velocityX += Math.cos(angle) * thrustPower
      ship.value.velocityY += Math.sin(angle) * thrustPower

      // Consommer du carburant
      fuel.value -= 0.5 * (deltaTime / 16.67)
      fuel.value = Math.max(0, fuel.value)

      ship.value.thrust = true

      // Particules de propulsion
      thrustParticleTimer += deltaTime
      if (thrustParticleTimer >= 50) {
        createThrustParticles()
        thrustParticleTimer = 0
      }
    }
  } else {
    ship.value.thrust = false
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
function startAction(action) {
  activeActions.value.add(action)
}

function stopAction(action) {
  activeActions.value.delete(action)
}

// Système de tir
function shoot() {
  // Limite de balles
  if (bullets.value.length >= 4) return

  const angle = (ship.value.rotation - 90) * Math.PI / 180

  bullets.value.push({
    x: ship.value.x + Math.cos(angle) * ship.value.size,
    y: ship.value.y + Math.sin(angle) * ship.value.size,
    velocityX: Math.cos(angle) * bulletSpeed + ship.value.velocityX,
    velocityY: Math.sin(angle) * bulletSpeed + ship.value.velocityY,
    life: 1000 // 1 seconde de vie
  })
}

// Mise à jour du vaisseau
function updateShip(deltaTime) {
  // Appliquer la friction
  ship.value.velocityX *= 0.99
  ship.value.velocityY *= 0.99

  // Limiter la vitesse maximum
  const maxSpeed = 8
  const speed = Math.sqrt(ship.value.velocityX ** 2 + ship.value.velocityY ** 2)
  if (speed > maxSpeed) {
    ship.value.velocityX = (ship.value.velocityX / speed) * maxSpeed
    ship.value.velocityY = (ship.value.velocityY / speed) * maxSpeed
  }

  // Mettre à jour la position
  ship.value.x += ship.value.velocityX * (deltaTime / 16.67)
  ship.value.y += ship.value.velocityY * (deltaTime / 16.67)

  // Wrap around (téléportation aux bords)
  ship.value.x = wrapCoordinate(ship.value.x, canvasWidth)
  ship.value.y = wrapCoordinate(ship.value.y, canvasHeight)

  // Diminuer l'invulnérabilité
  if (ship.value.invulnerable > 0) {
    ship.value.invulnerable -= deltaTime
  }

  // Régénération lente du carburant
  if (fuel.value < 100) {
    fuel.value += 0.1 * (deltaTime / 16.67)
    fuel.value = Math.min(100, fuel.value)
  }
}

// Mise à jour des balles
function updateBullets(deltaTime) {
  for (let i = bullets.value.length - 1; i >= 0; i--) {
    const bullet = bullets.value[i]

    bullet.x += bullet.velocityX * (deltaTime / 16.67)
    bullet.y += bullet.velocityY * (deltaTime / 16.67)
    bullet.life -= deltaTime

    // Wrap around
    bullet.x = wrapCoordinate(bullet.x, canvasWidth)
    bullet.y = wrapCoordinate(bullet.y, canvasHeight)

    // Supprimer si expirée
    if (bullet.life <= 0) {
      bullets.value.splice(i, 1)
    }
  }
}

// Système d'astéroïdes
function createAsteroids(count = null) {
  asteroids.value = []
  const asteroidCount = count || (3 + level.value)

  for (let i = 0; i < asteroidCount; i++) {
    createAsteroid('large')
  }
}

function createAsteroid(size, x = null, y = null) {
  // Position aléatoire loin du vaisseau
  let asteroidX, asteroidY

  if (x !== null && y !== null) {
    asteroidX = x
    asteroidY = y
  } else {
    do {
      asteroidX = Math.random() * canvasWidth
      asteroidY = Math.random() * canvasHeight
    } while (distanceBetween(asteroidX, asteroidY, ship.value.x, ship.value.y) < 100)
  }

  asteroids.value.push({
    x: asteroidX,
    y: asteroidY,
    velocityX: (Math.random() - 0.5) * asteroidSpeeds[size],
    velocityY: (Math.random() - 0.5) * asteroidSpeeds[size],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 4,
    size: asteroidSizes[size],
    type: size,
    vertices: generateAsteroidVertices(asteroidSizes[size])
  })
}

function generateAsteroidVertices(size) {
  const vertices = []
  const numVertices = 8 + Math.floor(Math.random() * 4)

  for (let i = 0; i < numVertices; i++) {
    const angle = (i / numVertices) * Math.PI * 2
    const radius = size * (0.8 + Math.random() * 0.4)
    vertices.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    })
  }

  return vertices
}

function updateAsteroids(deltaTime) {
  asteroids.value.forEach(asteroid => {
    asteroid.x += asteroid.velocityX * (deltaTime / 16.67)
    asteroid.y += asteroid.velocityY * (deltaTime / 16.67)
    asteroid.rotation += asteroid.rotationSpeed * (deltaTime / 16.67)

    // Wrap around
    asteroid.x = wrapCoordinate(asteroid.x, canvasWidth)
    asteroid.y = wrapCoordinate(asteroid.y, canvasHeight)
  })
}

// Système de particules
function createThrustParticles() {
  const angle = (ship.value.rotation - 90) * Math.PI / 180
  const thrustAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5

  for (let i = 0; i < 3; i++) {
    particles.value.push({
      x: ship.value.x - Math.cos(angle) * ship.value.size,
      y: ship.value.y - Math.sin(angle) * ship.value.size,
      velocityX: Math.cos(thrustAngle) * (2 + Math.random() * 3) + ship.value.velocityX * 0.5,
      velocityY: Math.sin(thrustAngle) * (2 + Math.random() * 3) + ship.value.velocityY * 0.5,
      life: 200 + Math.random() * 300,
      maxLife: 500,
      size: 1 + Math.random() * 2,
      color: Math.random() > 0.5 ? '#ff4444' : '#ffaa00'
    })
  }
}

function createExplosionParticles(x, y, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 6

    particles.value.push({
      x,
      y,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      life: 500 + Math.random() * 1000,
      maxLife: 1500,
      size: 2 + Math.random() * 4,
      color: ['#ff4444', '#ffaa00', '#ffffff'][Math.floor(Math.random() * 3)]
    })
  }
}

function updateParticles(deltaTime) {
  for (let i = particles.value.length - 1; i >= 0; i--) {
    const particle = particles.value[i]

    particle.x += particle.velocityX * (deltaTime / 16.67)
    particle.y += particle.velocityY * (deltaTime / 16.67)
    particle.life -= deltaTime

    // Wrap around
    particle.x = wrapCoordinate(particle.x, canvasWidth)
    particle.y = wrapCoordinate(particle.y, canvasHeight)

    if (particle.life <= 0) {
      particles.value.splice(i, 1)
    }
  }
}

// Détection de collisions
function checkCollisions() {
  // Balles vs Astéroïdes
  for (let i = bullets.value.length - 1; i >= 0; i--) {
    const bullet = bullets.value[i]

    for (let j = asteroids.value.length - 1; j >= 0; j--) {
      const asteroid = asteroids.value[j]

      if (distanceBetween(bullet.x, bullet.y, asteroid.x, asteroid.y) < asteroid.size / 2) {
        // Explosion
        createExplosionParticles(asteroid.x, asteroid.y, 8)

        // Points
        addPoints(asteroidPoints[asteroid.type], { combo: true })
        asteroidsDestroyed.value++

        // Diviser l'astéroïde
        if (asteroid.type === 'large') {
          createAsteroid('medium', asteroid.x, asteroid.y)
          createAsteroid('medium', asteroid.x, asteroid.y)
        } else if (asteroid.type === 'medium') {
          createAsteroid('small', asteroid.x, asteroid.y)
          createAsteroid('small', asteroid.x, asteroid.y)
        }

        // Supprimer
        bullets.value.splice(i, 1)
        asteroids.value.splice(j, 1)
        break
      }
    }
  }

  // Vaisseau vs Astéroïdes
  if (ship.value.invulnerable <= 0) {
    for (const asteroid of asteroids.value) {
      if (distanceBetween(ship.value.x, ship.value.y, asteroid.x, asteroid.y) < asteroid.size / 2 + ship.value.size) {
        // Explosion du vaisseau
        createExplosionParticles(ship.value.x, ship.value.y, 15)

        lives.value--
        ship.value.invulnerable = 2000 // 2 secondes d'invulnérabilité

        // Reset du vaisseau
        ship.value.x = canvasWidth / 2
        ship.value.y = canvasHeight / 2
        ship.value.velocityX = 0
        ship.value.velocityY = 0
        ship.value.rotation = 0

        if (lives.value <= 0) {
          gameState.value = 'gameOver'
          stopLoop()
          endGame()
        }
        break
      }
    }
  }
}

// Gestion des niveaux
function checkLevelComplete() {
  if (asteroids.value.length === 0 && gameState.value === 'playing') {
    levelBonus.value = level.value * 500
    addPoints(levelBonus.value)
    level.value++
    gameState.value = 'levelComplete'
    levelCompleteTimer = 0
    levelProgress.value = 0
    fuel.value = 100 // Recharger le carburant
    stopLoop()
  }
}

function updateLevelComplete(deltaTime) {
  levelCompleteTimer += deltaTime
  levelProgress.value = Math.min((levelCompleteTimer / 3000) * 100, 100)

  if (levelCompleteTimer >= 3000) {
    createAsteroids()
    gameState.value = 'playing'
    startLoop()
  }
}

// Utilitaires
function wrapCoordinate(coord, max) {
  if (coord < 0) return max
  if (coord > max) return 0
  return coord
}

function distanceBetween(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Rendu
function draw() {
  if (!ctx) return

  // Fond étoilé
  ctx.fillStyle = '#000011'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Étoiles
  drawStars()

  // Particules
  drawParticles()

  // Vaisseau
  drawShip()

  // Balles
  drawBullets()

  // Astéroïdes
  drawAsteroids()
}

function drawStars() {
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 100; i++) {
    const x = (i * 137) % canvasWidth
    const y = (i * 193) % canvasHeight
    const size = (i % 3) + 1
    ctx.fillRect(x, y, size, size)
  }
}

function drawShip() {
  ctx.save()
  ctx.translate(ship.value.x, ship.value.y)
  ctx.rotate(ship.value.rotation * Math.PI / 180)

  // Clignotement si invulnérable
  if (ship.value.invulnerable > 0 && Math.floor(Date.now() / 100) % 2) {
    ctx.restore()
    return
  }

  // Corps du vaisseau
  ctx.beginPath()
  ctx.moveTo(0, -ship.value.size)
  ctx.lineTo(-ship.value.size / 2, ship.value.size)
  ctx.lineTo(0, ship.value.size / 2)
  ctx.lineTo(ship.value.size / 2, ship.value.size)
  ctx.closePath()

  ctx.strokeStyle = '#00ff00'
  ctx.lineWidth = 2
  ctx.stroke()

  // Propulsion
  if (ship.value.thrust && fuel.value > 0) {
    ctx.beginPath()
    ctx.moveTo(-ship.value.size / 3, ship.value.size)
    ctx.lineTo(0, ship.value.size * 1.5)
    ctx.lineTo(ship.value.size / 3, ship.value.size)
    ctx.strokeStyle = '#ff4444'
    ctx.stroke()
  }

  ctx.restore()
}

function drawBullets() {
  ctx.fillStyle = '#ffff00'
  bullets.value.forEach(bullet => {
    ctx.beginPath()
    ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawAsteroids() {
  asteroids.value.forEach(asteroid => {
    ctx.save()
    ctx.translate(asteroid.x, asteroid.y)
    ctx.rotate(asteroid.rotation * Math.PI / 180)

    ctx.beginPath()
    asteroid.vertices.forEach((vertex, i) => {
      if (i === 0) {
        ctx.moveTo(vertex.x, vertex.y)
      } else {
        ctx.lineTo(vertex.x, vertex.y)
      }
    })
    ctx.closePath()

    ctx.strokeStyle = '#aaaaaa'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.restore()
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

// Gestion des états de jeu
function startGame() {
  resetGame()

  lives.value = 3
  level.value = 1
  fuel.value = 100
  asteroidsDestroyed.value = 0
  survivalTime.value = 0
  gameStartTime = Date.now()

  // Reset du vaisseau
  ship.value.x = canvasWidth / 2
  ship.value.y = canvasHeight / 2
  ship.value.rotation = 0
  ship.value.velocityX = 0
  ship.value.velocityY = 0
  ship.value.invulnerable = 0

  // Vider les arrays
  bullets.value = []
  asteroids.value = []
  particles.value = []
  activeActions.value.clear()

  createAsteroids()

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
.asteroids-game {
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
  background: #000011;
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

.menu, .pause-menu, .game-over, .level-complete {
  background: rgba(0, 20, 0, 0.95);
  padding: 2rem;
  border-radius: 12px;
  border: 2px solid #00ff00;
  text-align: center;
  max-width: 400px;
}

.menu h3, .pause-menu h3, .game-over h3, .level-complete h3 {
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
  background: linear-gradient(90deg, #00ff00, #ffff00);
  height: 100%;
  transition: width 0.1s ease;
}

/* Contrôles mobiles */
.mobile-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 600px;
  gap: 2rem;
}

.movement-controls {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.control-btn {
  background: rgba(0, 255, 0, 0.2);
  border: 2px solid #00ff00;
  color: #00ff00;
  font-size: 1.5rem;
  width: 60px;
  height: 60px;
  border-radius: 50%;
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

.thrust {
  background: rgba(255, 165, 0, 0.2);
  border-color: #ffa500;
  color: #ffa500;
  width: 80px;
  height: 80px;
}

.thrust:active {
  background: rgba(255, 165, 0, 0.4);
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
  .asteroids-game {
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
  }

  .movement-controls {
    gap: 1rem;
  }

  .control-btn {
    width: 50px;
    height: 50px;
    font-size: 1.2rem;
  }

  .thrust {
    width: 60px;
    height: 60px;
  }
}

@media (max-width: 480px) {
  .game-canvas {
    width: 300px;
    height: 250px;
  }

  .control-btn {
    width: 45px;
    height: 45px;
    font-size: 1rem;
  }

  .thrust {
    width: 55px;
    height: 55px;
  }
}
</style>