<template>
  <div class="pong-game">
    <!-- Interface de jeu -->
    <div class="game-ui">
      <div class="score-panel">
        <div class="player-score">
          <span class="label">Joueur</span>
          <span class="value">{{ playerScore }}</span>
        </div>
        <div class="game-info">
          <span class="level">Niveau {{ level }}</span>
          <span class="speed">Vitesse: {{ Math.round(ballSpeed * 10) / 10 }}</span>
        </div>
        <div class="ai-score">
          <span class="label">IA</span>
          <span class="value">{{ aiScore }}</span>
        </div>
      </div>

      <div class="game-stats">
        <div class="fps">FPS: {{ actualFPS }}</div>
        <div class="rallies">Échanges: {{ currentRally }}</div>
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
          <h3>🏓 Pong Classic</h3>
          <p>Le premier jeu vidéo de l'histoire !</p>
          <div class="difficulty-selector">
            <h4>Choisissez la difficulté :</h4>
            <div class="difficulty-buttons">
              <button
                  @click="setDifficulty('easy')"
                  :class="['difficulty-btn', { active: difficulty === 'easy' }]"
              >
                😊 Facile
              </button>
              <button
                  @click="setDifficulty('normal')"
                  :class="['difficulty-btn', { active: difficulty === 'normal' }]"
              >
                😐 Normal
              </button>
              <button
                  @click="setDifficulty('hard')"
                  :class="['difficulty-btn', { active: difficulty === 'hard' }]"
              >
                😈 Difficile
              </button>
            </div>
          </div>
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
              <li>🎮 Utilisez les flèches ↑↓ ou votre souris pour bouger</li>
              <li>🏓 Renvoyez la balle vers l'adversaire</li>
              <li>⚡ Plus l'échange est long, plus la balle accélère</li>
              <li>🎯 Premier à {{ winningScore }} points gagne</li>
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
          <h3 v-if="playerScore >= winningScore">🏆 Victoire !</h3>
          <h3 v-else>💀 Défaite</h3>
          <div class="final-stats">
            <p class="final-score">{{ playerScore }} - {{ aiScore }}</p>
            <div class="stats-grid">
              <div class="stat">
                <span class="stat-label">Plus long échange:</span>
                <span class="stat-value">{{ bestRally }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Vitesse max:</span>
                <span class="stat-value">{{ Math.round(maxSpeed * 10) / 10 }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Niveau atteint:</span>
                <span class="stat-value">{{ level }}</span>
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

    <!-- Zones tactiles améliorées -->
    <div class="touch-zones" v-if="isMobile">
      <div class="left-zone" 
           @touchstart="handleTouchStart" 
           @touchend="handleTouchEnd"
           @touchmove="handleTouchMove"
           @mousedown="handleTouchStart"
           @mouseup="handleTouchEnd"
           @mousemove="handleTouchMove"
           @mouseleave="handleTouchEnd"></div>
      <div class="right-zone" 
           @touchstart="handleTouchStart" 
           @touchend="handleTouchEnd"
           @touchmove="handleTouchMove"
           @mousedown="handleTouchStart"
           @mouseup="handleTouchEnd"
           @mousemove="handleTouchMove"
           @mouseleave="handleTouchEnd"></div>
    </div>
    
    <!-- Contrôles mobiles -->
    <div class="mobile-controls" v-if="isMobile">
      <div class="action-buttons">
        <button @click="toggleFullscreen" class="action-btn">⛶</button>
        <button @click="pauseGame" class="action-btn">⏸️</button>
      </div>
    </div>

    <!-- Instructions -->
    <div class="instructions">
      <p v-if="!isMobile">
        🎮 <strong>Contrôles:</strong> Flèches ↑↓ ou souris • ESPACE pour pause
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
const canvasWidth = 600
const canvasHeight = 400
const paddleWidth = 15
const paddleHeight = 80
const ballSize = 15
const winningScore = 7


// Fonction utilitaire pour formater les scores
const formatScore = (score) => {
  return score?.toLocaleString() || '0'
}

// État du jeu
const gameCanvas = ref(null)
const gameState = ref('menu')
const showHelp = ref(false)
const isMobile = ref(false)
const difficulty = ref('normal')

// Scores et stats
const playerScore = ref(0)
const aiScore = ref(0)
const currentRally = ref(0)
const bestRally = ref(0)
const level = ref(1)

// Objets du jeu
const playerPaddle = ref({
  x: 30,
  y: canvasHeight / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  speed: 6
})

const aiPaddle = ref({
  x: canvasWidth - 30 - paddleWidth,
  y: canvasHeight / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  speed: 4
})

const ball = ref({
  x: canvasWidth / 2,
  y: canvasHeight / 2,
  dx: 0,
  dy: 0,
  size: ballSize,
  speed: 0
})

// Variables de contrôle
const ballSpeed = ref(4)
const maxSpeed = ref(4)
const keys = ref({ up: false, down: false })
const mouseY = ref(0)
const useMouseControl = ref(false)
let ctx = null

// Déclaration de la fonction updateGame
function updateGame(deltaTime) {
  if (gameState.value !== 'playing') return

  handleInput()
  updatePaddles()
  updateBall()
  checkCollisions()
  updateAI()
  draw()
}

// Utilisation des composables
const { currentScore, highScore, addPoints, endGame, startGame: resetGame } = useScore('pong')
const { getDirection, actions, bindToElement } = useKeyboard()
const { start: startLoop, stop: stopLoop, isRunning, actualFPS } = useGameLoop(updateGame, 60)

// Détection mobile et initialisation
onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  ctx = gameCanvas.value.getContext('2d')

  // Lier les contrôles
  const unbind = bindToElement(gameCanvas.value)

  // Contrôle souris
  gameCanvas.value.addEventListener('mousemove', handleMouseMove)
  gameCanvas.value.addEventListener('mouseenter', () => { useMouseControl.value = true })
  gameCanvas.value.addEventListener('mouseleave', () => { useMouseControl.value = false })

  onUnmounted(() => {
    unbind?.()
    stopLoop()
    gameCanvas.value?.removeEventListener('mousemove', handleMouseMove)
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

  // Contrôles clavier
  keys.value.up = dir.y < 0
  keys.value.down = dir.y > 0
}

function handleMouseMove(event) {
  const rect = gameCanvas.value.getBoundingClientRect()
  mouseY.value = event.clientY - rect.top
  useMouseControl.value = true
}

function handleMobileInput(direction) {
  keys.value.up = direction === 'up'
  keys.value.down = direction === 'down'
}

function stopMobileInput() {
  keys.value.up = false
  keys.value.down = false
}

// Mise à jour des raquettes
function updatePaddles() {
  // Raquette du joueur
  if (useMouseControl.value) {
    const targetY = mouseY.value - paddleHeight / 2
    playerPaddle.value.y = Math.max(0, Math.min(canvasHeight - paddleHeight, targetY))
  } else {
    if (keys.value.up) {
      playerPaddle.value.y = Math.max(0, playerPaddle.value.y - playerPaddle.value.speed)
    }
    if (keys.value.down) {
      playerPaddle.value.y = Math.min(canvasHeight - paddleHeight, playerPaddle.value.y + playerPaddle.value.speed)
    }
  }
}

// IA pour la raquette adverse
function updateAI() {
  const aiCenter = aiPaddle.value.y + paddleHeight / 2
  const ballCenter = ball.value.y + ball.value.size / 2

  const diff = ballCenter - aiCenter
  let aiSpeed = aiPaddle.value.speed

  // Ajuster selon la difficulté
  switch (difficulty.value) {
    case 'easy':
      aiSpeed *= 0.7
      break
    case 'hard':
      aiSpeed *= 1.3
      break
  }

  // Ajouter un peu d'erreur pour rendre l'IA moins parfaite
  const error = (Math.random() - 0.5) * 20
  const targetY = ballCenter - paddleHeight / 2 + error

  if (Math.abs(diff) > 5) {
    if (diff > 0) {
      aiPaddle.value.y = Math.min(canvasHeight - paddleHeight, aiPaddle.value.y + aiSpeed)
    } else {
      aiPaddle.value.y = Math.max(0, aiPaddle.value.y - aiSpeed)
    }
  }
}

// Mise à jour de la balle
function updateBall() {
  ball.value.x += ball.value.dx
  ball.value.y += ball.value.dy

  // Collision avec le haut/bas
  if (ball.value.y <= 0 || ball.value.y >= canvasHeight - ball.value.size) {
    ball.value.dy = -ball.value.dy
  }

  // Point marqué
  if (ball.value.x < 0) {
    aiScore.value++
    resetBall()
    if (aiScore.value >= winningScore) {
      gameOver()
    }
  } else if (ball.value.x > canvasWidth) {
    playerScore.value++
    addPoints(100 + currentRally.value * 10)
    resetBall()
    if (playerScore.value >= winningScore) {
      gameOver()
    }
  }
}

// Vérification des collisions
function checkCollisions() {
  // Collision avec raquette joueur
  if (ball.value.x <= playerPaddle.value.x + playerPaddle.value.width &&
      ball.value.x >= playerPaddle.value.x &&
      ball.value.y + ball.value.size >= playerPaddle.value.y &&
      ball.value.y <= playerPaddle.value.y + playerPaddle.value.height) {

    ball.value.dx = Math.abs(ball.value.dx)

    // Angle selon la position sur la raquette
    const relativeIntersectY = (ball.value.y + ball.value.size/2) - (playerPaddle.value.y + paddleHeight/2)
    const normalizedIntersectY = relativeIntersectY / (paddleHeight/2)
    ball.value.dy = normalizedIntersectY * ballSpeed.value * 0.7

    increaseDifficulty()
  }

  // Collision avec raquette IA
  if (ball.value.x + ball.value.size >= aiPaddle.value.x &&
      ball.value.x <= aiPaddle.value.x + aiPaddle.value.width &&
      ball.value.y + ball.value.size >= aiPaddle.value.y &&
      ball.value.y <= aiPaddle.value.y + aiPaddle.value.height) {

    ball.value.dx = -Math.abs(ball.value.dx)

    const relativeIntersectY = (ball.value.y + ball.value.size/2) - (aiPaddle.value.y + paddleHeight/2)
    const normalizedIntersectY = relativeIntersectY / (paddleHeight/2)
    ball.value.dy = normalizedIntersectY * ballSpeed.value * 0.7

    increaseDifficulty()
  }
}

// Augmenter la difficulté
function increaseDifficulty() {
  currentRally.value++
  bestRally.value = Math.max(bestRally.value, currentRally.value)

  // Augmenter la vitesse progressivement
  ballSpeed.value = Math.min(ballSpeed.value + 0.1, 12)
  maxSpeed.value = Math.max(maxSpeed.value, ballSpeed.value)

  // Augmenter le niveau
  if (currentRally.value % 5 === 0) {
    level.value++
  }
}

// Réinitialiser la balle
function resetBall() {
  ball.value.x = canvasWidth / 2
  ball.value.y = canvasHeight / 2

  // Direction aléatoire
  const angle = (Math.random() - 0.5) * Math.PI / 3 // ±30 degrés
  const direction = Math.random() > 0.5 ? 1 : -1

  ball.value.dx = Math.cos(angle) * ballSpeed.value * direction
  ball.value.dy = Math.sin(angle) * ballSpeed.value

  currentRally.value = 0
}

// Configuration de difficulté
function setDifficulty(level) {
  difficulty.value = level

  switch (level) {
    case 'easy':
      aiPaddle.value.speed = 3
      ballSpeed.value = 3
      break
    case 'normal':
      aiPaddle.value.speed = 4
      ballSpeed.value = 4
      break
    case 'hard':
      aiPaddle.value.speed = 5
      ballSpeed.value = 5
      break
  }
}

// Dessiner le jeu
function draw() {
  if (!ctx) return

  // Effacer le canvas
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Ligne centrale
  ctx.setLineDash([10, 10])
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(canvasWidth / 2, 0)
  ctx.lineTo(canvasWidth / 2, canvasHeight)
  ctx.stroke()
  ctx.setLineDash([])

  // Raquettes
  ctx.fillStyle = '#0f0'
  ctx.fillRect(playerPaddle.value.x, playerPaddle.value.y, playerPaddle.value.width, playerPaddle.value.height)

  ctx.fillStyle = '#f0f'
  ctx.fillRect(aiPaddle.value.x, aiPaddle.value.y, aiPaddle.value.width, aiPaddle.value.height)

  // Balle
  ctx.fillStyle = '#fff'
  ctx.fillRect(ball.value.x, ball.value.y, ball.value.size, ball.value.size)

  // Effet de traînée pour la balle
  ctx.shadowColor = '#fff'
  ctx.shadowBlur = 10
  ctx.fillRect(ball.value.x, ball.value.y, ball.value.size, ball.value.size)
  ctx.shadowBlur = 0
}

// Gestion des états de jeu
function startGame() {
  resetGame()

  // Réinitialiser les scores et stats
  playerScore.value = 0
  aiScore.value = 0
  currentRally.value = 0
  bestRally.value = 0
  level.value = 1
  maxSpeed.value = ballSpeed.value

  // Réinitialiser les positions
  playerPaddle.value.y = canvasHeight / 2 - paddleHeight / 2
  aiPaddle.value.y = canvasHeight / 2 - paddleHeight / 2

  resetBall()
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

// Fonctions de gestion des zones tactiles améliorées
let touchStartY = 0;
let currentTouchY = 0;

function handleTouchStart(event) {
  if (gameState.value !== 'playing') return;
  
  let clientY;
  if (event.type.includes('touch')) {
    clientY = event.touches[0].clientY;
  } else {
    clientY = event.clientY;
  }
  
  touchStartY = clientY;
  currentTouchY = clientY;
}

function handleTouchMove(event) {
  if (gameState.value !== 'playing' || touchStartY === 0) return;
  
  let clientY;
  if (event.type.includes('touch')) {
    clientY = event.touches[0].clientY;
  } else {
    clientY = event.clientY;
  }
  
  currentTouchY = clientY;
  
  // Déterminer si le mouvement est sur la gauche ou la droite de l'écran
  const touchX = event.type.includes('touch') ? event.touches[0].clientX : event.clientX;
  const screenWidth = window.innerWidth;
  
  if (touchX < screenWidth / 2) {
    // Côté gauche - déplacer la raquette du joueur vers le haut ou le bas
    if (currentTouchY < touchStartY) {
      // Mouvement vers le haut
      keys.value.up = true;
      keys.value.down = false;
    } else if (currentTouchY > touchStartY) {
      // Mouvement vers le bas
      keys.value.up = false;
      keys.value.down = true;
    }
  } else {
    // Côté droit - déplacer la raquette IA (dans une version étendue) ou gérer autrement
    // Pour l'instant, on utilise aussi ça pour le joueur pour un contrôle plus naturel
    if (currentTouchY < touchStartY) {
      // Mouvement vers le haut
      keys.value.up = true;
      keys.value.down = false;
    } else if (currentTouchY > touchStartY) {
      // Mouvement vers le bas
      keys.value.up = false;
      keys.value.down = true;
    }
  }
  
  touchStartY = currentTouchY; // Mettre à jour la position de départ pour le prochain mouvement
}

function handleTouchEnd(event) {
  keys.value.up = false;
  keys.value.down = false;
  touchStartY = 0;
  currentTouchY = 0;
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
.pong-game {
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
  align-items: center;
  gap: 2rem;
  width: 100%;
}

.player-score, .ai-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 1rem;
  border-radius: 12px;
  border: 2px solid #00ff00;
  min-width: 80px;
}

.ai-score {
  border-color: #ff00ff;
}

.player-score .label, .ai-score .label {
  font-size: 0.8rem;
  opacity: 0.8;
  margin-bottom: 0.5rem;
}

.player-score .value, .ai-score .value {
  font-size: 2rem;
  font-family: 'Press Start 2P', monospace;
  color: #00ff00;
}

.ai-score .value {
  color: #ff00ff;
}

.game-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  font-size: 0.9rem;
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
  box-shadow:
      0 0 20px rgba(0, 255, 0, 0.3),
      0 0 40px rgba(255, 0, 255, 0.2);
}

.game-canvas:focus {
  outline: none;
  border-color: #ff00ff;
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
  max-width: 400px;
}

.menu h3, .pause-menu h3, .game-over h3 {
  margin-bottom: 1rem;
  color: #00ff00;
  font-family: 'Press Start 2P', monospace;
}

.difficulty-selector {
  margin: 1.5rem 0;
}

.difficulty-selector h4 {
  color: #00ff00;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.difficulty-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.difficulty-btn {
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8rem;
}

.difficulty-btn:hover {
  border-color: #00ff00;
  background: rgba(0, 255, 0, 0.1);
}

.difficulty-btn.active {
  border-color: #00ff00;
  background: rgba(0, 255, 0, 0.2);
  color: #00ff00;
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
  font-size: 1.5rem;
  color: #00ff00;
  margin-bottom: 1rem;
  font-family: 'Press Start 2P', monospace;
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

/* Contrôles mobiles */
.mobile-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 600px;
  gap: 2rem;
}

.paddle-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.control-btn {
  width: 60px;
  height: 60px;
  background: rgba(0, 255, 0, 0.2);
  border: 2px solid #00ff00;
  color: #00ff00;
  font-size: 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.control-btn:active {
  background: rgba(0, 255, 0, 0.4);
  transform: scale(0.95);
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
  max-width: 600px;
}

/* Responsive */
@media (max-width: 768px) {
  .pong-game {
    padding: 1rem;
    gap: 1rem;
  }

  .game-canvas {
    width: 100%;
    max-width: 400px;
    height: auto;
    aspect-ratio: 3/2;
  }

  .score-panel {
    gap: 1rem;
  }

  .player-score, .ai-score {
    min-width: 60px;
    padding: 0.5rem;
  }

  .player-score .value, .ai-score .value {
    font-size: 1.5rem;
  }

  .difficulty-buttons {
    flex-direction: column;
  }

  .mobile-controls {
    max-width: 400px;
  }
}

@media (max-width: 480px) {
  .pong-game {
    padding: 0.5rem;
    gap: 0.5rem;
  }

  .game-canvas {
    width: 100%;
    max-width: 300px;
    aspect-ratio: 3/2;
  }

  .game-ui {
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .score-panel {
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
  }

  .player-score, .ai-score {
    width: 100%;
    justify-content: center;
  }

  .instructions {
    font-size: 0.7rem;
  }

  .menu-buttons {
    flex-direction: column;
  }
}

/* Zones tactiles améliorées */
.touch-zones {
  display: flex;
  width: 100%;
  max-width: 600px;
  height: 200px;
  margin-top: 1rem;
  position: relative;
}

.left-zone, .right-zone {
  flex: 1;
  position: absolute;
  top: 0;
  height: 200px;
  z-index: 10;
}

.left-zone {
  left: 0;
}

.right-zone {
  right: 0;
}

/* Masquer les zones de toucher pour ne pas interférer avec les boutons */
.left-zone, .right-zone {
  opacity: 0;
  pointer-events: auto; /* Permet aux événements tactiles de fonctionner */
}
</style>