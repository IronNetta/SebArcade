<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title retro-font">
          <span class="neon-text">SebArcade</span>
        </h1>
        <p class="hero-subtitle">
          🎮 Collection de mini-jeux rétro
        </p>
        <div class="hero-buttons">
          <NuxtLink to="/games" class="game-button">
            🚀 Commencer à jouer
          </NuxtLink>
          <NuxtLink to="/scores" class="game-button secondary">
            🏆 Voir les scores
          </NuxtLink>
        </div>
      </div>

      <!-- Animation de fond -->
      <div class="hero-bg">
        <div class="floating-icons">
          <div class="icon" v-for="i in 20" :key="i">🎮</div>
        </div>
      </div>
    </section>

    <!-- Section des jeux disponibles -->
    <section class="games-preview">
      <h2 class="section-title retro-font neon-text">
        Jeux Disponibles
      </h2>

      <div class="games-grid">
        <div
            v-for="game in games"
            :key="game.id"
            class="game-card"
            @click="navigateToGame(game.route)"
        >
          <div class="game-icon">{{ game.icon }}</div>
          <h3 class="game-title">{{ game.name }}</h3>
          <p class="game-description">{{ game.description }}</p>
          <div class="game-stats">
            <span class="stat">
              🎯 Difficulté: {{ game.difficulty }}
            </span>
            <span class="stat">
              ⏱️ {{ game.playTime }}
            </span>
          </div>
          <div class="game-status">
            <span :class="['status-badge', game.status]">
              {{ getStatusText(game.status) }}
            </span>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
// Configuration de la page
useHead({
  title: '🎮 SebArcade - Accueil',
  meta: [
    { name: 'description', content: 'Bienvenue dans SebArcade, votre collection de mini-jeux rétro' }
  ]
})

// Données des jeux
const games = ref([
  {
    id: 'snake',
    name: 'Snake',
    description: 'Le classique serpent qui grandit en mangeant des pommes',
    icon: '🐍',
    difficulty: '★★☆',
    playTime: '2-5 min',
    status: 'available',
    route: '/games/snake'
  },
  {
    id: 'space-invaders',
    name: 'Space Invaders',
    description: 'Défendez la Terre contre les envahisseurs aliens',
    icon: '👾',
    difficulty: '★★★',
    playTime: '5-10 min',
    status: 'available',
    route: '/games/space-invaders'
  },
  {
    id: 'asteroids',
    name: 'Asteroids',
    description: 'Naviguez dans l\'espace et détruisez les astéroïdes',
    icon: '🚀',
    difficulty: '★★★',
    playTime: '3-8 min',
    status: 'available',
    route: '/games/asteroids'
  },
  {
    id: 'tetris',
    name: 'Tetris',
    description: 'Alignez les blocs qui tombent pour faire des lignes',
    icon: '🧩',
    difficulty: '★★☆',
    playTime: '5-15 min',
    status: 'available',
    route: '/games/tetris'
  },
  {
    id: 'pacman',
    name: 'Pac-Man',
    description: 'Mangez tous les points en évitant les fantômes',
    icon: '👻',
    difficulty: '★★★',
    playTime: '3-10 min',
    status: 'available',
    route: '/games/pacman'
  },
  {
    id: 'breakout',
    name: 'Breakout',
    description: 'Cassez tous les blocs avec votre balle',
    icon: '🏓',
    difficulty: '★★☆',
    playTime: '2-6 min',
    status: 'coming-soon',
    route: '/games/breakout'
  }
])

// Statistiques (simulées)
const totalGames = computed(() => games.value.length)
const totalPlayers = ref(1337)
const totalScores = ref(9999)
const averageRating = ref(4.8)

// Méthodes
const navigateToGame = (route) => {
  navigateTo(route)
}

const getStatusText = (status) => {
  switch (status) {
    case 'available':
      return '✅ Disponible'
    case 'coming-soon':
      return '🔜 Bientôt'
    case 'beta':
      return '🧪 Beta'
    default:
      return '❓ Inconnu'
  }
}

// Animation au chargement
onMounted(() => {
  // Ajouter des animations ou effets spéciaux
  console.log('🎮 SebArcade chargé!')
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}

/* Hero Section */
.hero {
  position: relative;
  text-align: center;
  padding: 4rem 2rem;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(0,255,0,0.1), rgba(255,0,255,0.1));
  border-radius: 20px;
  margin-bottom: 4rem;
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-title {
  font-size: clamp(2rem, 8vw, 4rem);
  margin-bottom: 1rem;
  animation: pulse 2s infinite;
}

.hero-subtitle {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.game-button.secondary {
  background: linear-gradient(45deg, #ff00ff, #cc00cc);
  border-color: #ff00ff;
}

.game-button.secondary:hover {
  background: linear-gradient(45deg, #cc00cc, #990099);
  box-shadow: 0 6px 12px rgba(255, 0, 255, 0.4);
}

/* Animation de fond */
.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  opacity: 0.1;
}

.floating-icons {
  position: absolute;
  width: 100%;
  height: 100%;
}

.floating-icons .icon {
  position: absolute;
  font-size: 2rem;
  animation: float 6s ease-in-out infinite;
}

.floating-icons .icon:nth-child(odd) {
  animation-delay: -3s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

/* Distribution aléatoire des icônes */
.floating-icons .icon:nth-child(1) { top: 10%; left: 10%; }
.floating-icons .icon:nth-child(2) { top: 20%; left: 80%; }
.floating-icons .icon:nth-child(3) { top: 30%; left: 30%; }
.floating-icons .icon:nth-child(4) { top: 40%; left: 70%; }
.floating-icons .icon:nth-child(5) { top: 50%; left: 20%; }
.floating-icons .icon:nth-child(6) { top: 60%; left: 90%; }
.floating-icons .icon:nth-child(7) { top: 70%; left: 40%; }
.floating-icons .icon:nth-child(8) { top: 80%; left: 60%; }

/* Sections */
.section-title {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}

/* Grille des jeux */
.games-preview {
  margin-bottom: 4rem;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
}

.game-card {
  cursor: pointer;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.game-card:hover {
  transform: translateY(-8px) scale(1.02);
}

.game-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: bounce 2s infinite;
}

.game-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #00ff00;
}

.game-description {
  margin-bottom: 1.5rem;
  opacity: 0.8;
  line-height: 1.5;
}

.game-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.stat {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  border-radius: 6px;
}

.game-status {
  margin-top: 1rem;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
}

.status-badge.available {
  background: rgba(0, 255, 0, 0.2);
  color: #00ff00;
  border: 1px solid #00ff00;
}

.status-badge.coming-soon {
  background: rgba(255, 165, 0, 0.2);
  color: #ffa500;
  border: 1px solid #ffa500;
}

/* Statistiques */
.stats-section {
  margin-bottom: 4rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  border: 1px solid rgba(0, 255, 0, 0.2);
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: #00ff00;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
}

.stat-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: bold;
  color: #00ff00;
  margin-bottom: 0.5rem;
  font-family: 'Press Start 2P', monospace;
}

.stat-label {
  opacity: 0.8;
  font-size: 0.9rem;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .hero {
    padding: 2rem 1rem;
  }

  .hero-buttons {
    flex-direction: column;
    align-items: center;
  }

  .games-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .game-stats {
    flex-direction: column;
    gap: 0.5rem;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}
</style>
