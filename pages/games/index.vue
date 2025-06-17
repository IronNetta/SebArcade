<template>
  <div class="games-page">
    <div class="page-header">
      <h1 class="page-title retro-font neon-text">
        🎮 ARCADE GAMES
      </h1>
      <p class="page-subtitle">
        Choisissez votre aventure rétro !
      </p>
    </div>

    <!-- Filtres -->
    <div class="filters">
      <div class="filter-group">
        <button
            v-for="filter in filters"
            :key="filter.key"
            @click="activeFilter = filter.key"
            :class="['filter-btn', { active: activeFilter === filter.key }]"
        >
          {{ filter.label }}
        </button>
      </div>

      <div class="search-box">
        <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Rechercher un jeu..."
            class="search-input"
        >
      </div>
    </div>

    <!-- Grille des jeux -->
    <div class="games-container">
      <TransitionGroup name="game-card" tag="div" class="games-grid">
        <div
            v-for="game in filteredGames"
            :key="game.id"
            class="game-card"
            @click="navigateToGame(game)"
        >
          <div class="game-preview">
            <div class="game-icon">{{ game.icon }}</div>
            <div class="game-overlay">
              <button class="play-btn">▶️ JOUER</button>
            </div>
          </div>

          <div class="game-info">
            <h3 class="game-title">{{ game.name }}</h3>
            <p class="game-description">{{ game.description }}</p>

            <div class="game-meta">
              <div class="difficulty">
                <span class="label">Difficulté:</span>
                <span class="value">{{ game.difficulty }}</span>
              </div>
              <div class="play-time">
                <span class="label">Durée:</span>
                <span class="value">{{ game.playTime }}</span>
              </div>
            </div>

            <div class="game-tags">
              <span
                  v-for="tag in game.tags"
                  :key="tag"
                  class="tag"
              >
                {{ tag }}
              </span>
            </div>

            <div class="game-actions">
              <div class="game-status">
                <span :class="['status-badge', game.status]">
                  {{ getStatusText(game.status) }}
                </span>
              </div>

              <div class="game-score" v-if="game.bestScore">
                <span class="score-label">🏆 Meilleur:</span>
                <span class="score-value">{{ game.bestScore }}</span>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>

      <!-- Message si aucun jeu trouvé -->
      <div v-if="filteredGames.length === 0" class="no-games">
        <div class="no-games-icon">🎮</div>
        <h3>Aucun jeu trouvé</h3>
        <p>Essayez de modifier vos filtres ou votre recherche</p>
      </div>
    </div>

    <!-- Section "Bientôt disponible" -->
    <section class="coming-soon-section">
      <h2 class="section-title retro-font">
        🚀 Prochainement
      </h2>
      <div class="coming-soon-grid">
        <div
            v-for="game in comingSoonGames"
            :key="game.id"
            class="coming-soon-card"
        >
          <div class="game-icon">{{ game.icon }}</div>
          <h4>{{ game.name }}</h4>
          <p>{{ game.description }}</p>
          <div class="progress-bar">
            <div class="progress" :style="{ width: game.progress + '%' }"></div>
          </div>
          <span class="progress-text">{{ game.progress }}% terminé</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
// Configuration de la page
useHead({
  title: '🎮 Jeux - SebArcade',
  meta: [
    { name: 'description', content: 'Découvrez tous nos mini-jeux rétro' }
  ]
})

// État réactif
const activeFilter = ref('all')
const searchQuery = ref('')

// Filtres disponibles
const filters = [
  { key: 'all', label: 'Tous' },
  { key: 'available', label: 'Disponibles' },
  { key: 'arcade', label: 'Arcade' },
  { key: 'puzzle', label: 'Puzzle' },
  { key: 'action', label: 'Action' }
]

// Données des jeux avec plus de détails
const games = ref([
  {
    id: 'snake',
    name: 'Snake',
    description: 'Le classique serpent qui grandit en mangeant des pommes. Simple mais addictif !',
    icon: '🐍',
    difficulty: '★★☆',
    playTime: '2-5 min',
    status: 'available',
    route: '/games/snake',
    tags: ['Classique', 'Arcade'],
    bestScore: localStorage.getItem('snake-high-score') || 0,
    category: 'arcade'
  },
  {
    id: 'space-invaders',
    name: 'Space Invaders',
    description: 'Défendez la Terre contre les envahisseurs aliens dans ce shoot\'em up légendaire.',
    icon: '👾',
    difficulty: '★★★',
    playTime: '5-10 min',
    status: 'available',
    route: '/games/space-invaders',
    tags: ['Shoot\'em up', 'Rétro'],
    category: 'action'
  },
  {
    id: 'asteroids',
    name: 'Asteroids',
    description: 'Naviguez dans l\'espace et détruisez les astéroïdes avec votre vaisseau.',
    icon: '🚀',
    difficulty: '★★★',
    playTime: '3-8 min',
    status: 'available',
    route: '/games/asteroids',
    tags: ['Espace', 'Action'],
    category: 'action'
  },
  {
    id: 'tetris',
    name: 'Tetris',
    description: 'Alignez les blocs qui tombent pour faire des lignes complètes.',
    icon: '🧩',
    difficulty: '★★☆',
    playTime: '5-15 min',
    status: 'available',
    route: '/games/tetris',
    tags: ['Puzzle', 'Logique'],
    category: 'puzzle'
  },
  {
    id: 'pacman',
    name: 'Pac-Man',
    description: 'Mangez tous les points en évitant les fantômes colorés.',
    icon: '👻',
    difficulty: '★★★',
    playTime: '3-10 min',
    status: 'available',
    route: '/games/pacman',
    tags: ['Maze', 'Classique'],
    category: 'arcade'
  },
  {
    id: 'breakout',
    name: 'Breakout',
    description: 'Cassez tous les blocs colorés avec votre balle rebondissante.',
    icon: '🏓',
    difficulty: '★★☆',
    playTime: '2-6 min',
    status: 'coming-soon',
    route: '/games/breakout',
    tags: ['Arcade', 'Réflexes'],
    category: 'arcade'
  }
])

// Jeux à venir avec progression
const comingSoonGames = ref([
  {
    id: 'breakout',
    name: 'Breakout',
    description: 'En développement actif',
    icon: '🏓',
    progress: 80
  }
])

// Computed pour les jeux filtrés
const filteredGames = computed(() => {
  let filtered = games.value

  // Filtrer par catégorie
  if (activeFilter.value !== 'all') {
    if (activeFilter.value === 'available') {
      filtered = filtered.filter(game => game.status === 'available')
    } else {
      filtered = filtered.filter(game => game.category === activeFilter.value)
    }
  }

  // Filtrer par recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(game =>
        game.name.toLowerCase().includes(query) ||
        game.description.toLowerCase().includes(query) ||
        game.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  return filtered
})

// Méthodes
const navigateToGame = (game) => {
  if (game.status === 'available') {
    navigateTo(game.route)
  } else {
    // Afficher un message ou une modal pour les jeux non disponibles
    alert(`🚧 ${game.name} sera bientôt disponible !`)
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'available':
      return '✅ Jouer maintenant'
    case 'coming-soon':
      return '🔜 Bientôt disponible'
    case 'beta':
      return '🧪 Version beta'
    default:
      return '❓ Statut inconnu'
  }
}
</script>

<style scoped>
.games-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Header */
.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-title {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.page-subtitle {
  font-size: 1.2rem;
  opacity: 0.8;
}

/* Filtres */
.filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
  gap: 2rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.8rem 1.5rem;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.filter-btn:hover {
  border-color: #00ff00;
  background: rgba(0, 255, 0, 0.1);
}

.filter-btn.active {
  background: linear-gradient(45deg, #00ff00, #00cc00);
  border-color: #00ff00;
  color: #000;
  font-weight: bold;
}

.search-box {
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.8rem 1rem;
  border-radius: 25px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #00ff00;
  background: rgba(0, 255, 0, 0.05);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

/* Grille des jeux */
.games-container {
  margin-bottom: 4rem;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
}

.game-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.game-card:hover {
  border-color: #00ff00;
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(0, 255, 0, 0.2);
}

.game-preview {
  position: relative;
  height: 200px;
  background: linear-gradient(135deg, rgba(0, 255, 0, 0.1), rgba(255, 0, 255, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.game-icon {
  font-size: 5rem;
  transition: transform 0.3s ease;
}

.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.game-card:hover .game-overlay {
  opacity: 1;
}

.game-card:hover .game-icon {
  transform: scale(1.1);
}

.play-btn {
  background: linear-gradient(45deg, #00ff00, #00cc00);
  border: none;
  color: #000;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.play-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
}

.game-info {
  padding: 1.5rem;
}

.game-title {
  font-size: 1.5rem;
  color: #00ff00;
  margin-bottom: 0.5rem;
  font-family: 'Press Start 2P', monospace;
}

.game-description {
  margin-bottom: 1rem;
  opacity: 0.8;
  line-height: 1.5;
}

.game-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.game-meta .label {
  opacity: 0.7;
}

.game-meta .value {
  color: #00ff00;
  font-weight: bold;
}

.game-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag {
  background: rgba(0, 255, 0, 0.2);
  color: #00ff00;
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.8rem;
  border: 1px solid rgba(0, 255, 0, 0.3);
}

.game-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.game-score {
  font-size: 0.9rem;
}

.score-label {
  opacity: 0.7;
}

.score-value {
  color: #ff00ff;
  font-weight: bold;
  font-family: 'Press Start 2P', monospace;
}

/* Message aucun jeu */
.no-games {
  text-align: center;
  padding: 4rem 2rem;
  opacity: 0.7;
}

.no-games-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

/* Section "Bientôt disponible" */
.coming-soon-section {
  margin-top: 4rem;
}

.section-title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #00ff00;
}

.coming-soon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.coming-soon-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 165, 0, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
}

.coming-soon-card:hover {
  border-color: #ffa500;
  transform: translateY(-4px);
}

.coming-soon-card .game-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.coming-soon-card h4 {
  color: #ffa500;
  margin-bottom: 0.5rem;
  font-family: 'Press Start 2P', monospace;
}

.coming-soon-card p {
  opacity: 0.8;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.progress-bar {
  background: rgba(255, 255, 255, 0.1);
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress {
  background: linear-gradient(90deg, #ffa500, #ff8c00);
  height: 100%;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #ffa500;
  font-weight: bold;
}

/* Animations */
.game-card-enter-active,
.game-card-leave-active {
  transition: all 0.3s ease;
}

.game-card-enter-from,
.game-card-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

/* Responsive */
@media (max-width: 768px) {
  .games-page {
    padding: 1rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    justify-content: center;
  }

  .search-box {
    max-width: none;
  }

  .games-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .game-meta {
    flex-direction: column;
    gap: 0.5rem;
  }

  .coming-soon-grid {
    grid-template-columns: 1fr;
  }
}
</style>
