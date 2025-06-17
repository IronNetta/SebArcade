b<template>
  <div class="scores-page">
    <div class="page-header">
      <h1 class="page-title retro-font neon-text">
        🏆 HALL OF FAME
      </h1>
      <p class="page-subtitle">
        Les meilleurs scores de tous les temps
      </p>
    </div>

    <!-- Sélecteur de jeu -->
    <div class="game-selector">
      <button
          v-for="game in availableGames"
          :key="game.id"
          @click="selectedGame = game.id"
          :class="['game-tab', { active: selectedGame === game.id }]"
      >
        {{ game.icon }} {{ game.name }}
      </button>
    </div>

    <!-- Scores du jeu sélectionné -->
    <div class="scores-container">
      <div class="current-game-stats">
        <h2 class="game-title">
          {{ getCurrentGame().icon }} {{ getCurrentGame().name }}
        </h2>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🎯</div>
            <div class="stat-value">{{ getCurrentStats().highScore }}</div>
            <div class="stat-label">Meilleur Score</div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">🎮</div>
            <div class="stat-value">{{ getCurrentStats().totalGames }}</div>
            <div class="stat-label">Parties Jouées</div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-value">{{ getCurrentStats().averageScore }}</div>
            <div class="stat-label">Score Moyen</div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">🔥</div>
            <div class="stat-value">{{ getCurrentStats().bestStreak }}</div>
            <div class="stat-label">Meilleure Série</div>
          </div>
        </div>
      </div>

      <!-- Historique des scores -->
      <div class="scores-history">
        <h3 class="section-title">📈 Historique des Scores</h3>

        <div v-if="getCurrentHistory().length === 0" class="no-scores">
          <div class="no-scores-icon">🎮</div>
          <h4>Aucun score enregistré</h4>
          <p>Commencez à jouer pour voir vos scores ici !</p>
          <NuxtLink :to="`/games/${selectedGame}`" class="game-button">
            🚀 Jouer maintenant
          </NuxtLink>
        </div>

        <div v-else class="scores-list">
          <div class="scores-header">
            <span class="header-rank">#</span>
            <span class="header-score">Score</span>
            <span class="header-level">Niveau</span>
            <span class="header-date">Date</span>
            <span class="header-duration">Durée</span>
          </div>

          <div
              v-for="(score, index) in getCurrentHistory()"
              :key="index"
              :class="['score-item', { 'best-score': index === 0 }]"
          >
            <span class="score-rank">
              <span v-if="index === 0">🥇</span>
              <span v-else-if="index === 1">🥈</span>
              <span v-else-if="index === 2">🥉</span>
              <span v-else>{{ index + 1 }}</span>
            </span>

            <span class="score-value">{{ formatScore(score.score) }}</span>
            <span class="score-level">{{ score.level || 1 }}</span>
            <span class="score-date">{{ formatDate(score.date) }}</span>
            <span class="score-duration">{{ formatDuration(score.duration) }}</span>
          </div>
        </div>
      </div>

      <!-- Achievements -->
      <div class="achievements-section">
        <h3 class="section-title">🏅 Succès Débloqués</h3>

        <div class="achievements-grid">
          <div
              v-for="achievement in getAchievements()"
              :key="achievement.id"
              :class="['achievement-card', { unlocked: achievement.unlocked }]"
          >
            <div class="achievement-icon">{{ achievement.icon }}</div>
            <div class="achievement-info">
              <h4 class="achievement-name">{{ achievement.name }}</h4>
              <p class="achievement-description">{{ achievement.description }}</p>
              <div v-if="achievement.unlocked" class="achievement-date">
                Débloqué le {{ formatDate(achievement.unlockedDate) }}
              </div>
            </div>
            <div class="achievement-status">
              <span v-if="achievement.unlocked" class="unlocked-badge">✅</span>
              <span v-else class="locked-badge">🔒</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="page-actions">
        <button @click="exportScores" class="game-button secondary">
          💾 Exporter les Scores
        </button>
        <button @click="showImportModal = true" class="game-button secondary">
          📁 Importer les Scores
        </button>
        <button @click="showResetModal = true" class="game-button danger">
          🗑️ Réinitialiser les Scores
        </button>
      </div>
    </div>

    <!-- Modal d'importation -->
    <div v-if="showImportModal" class="modal-overlay" @click="showImportModal = false">
      <div class="modal" @click.stop>
        <h3>📁 Importer des Scores</h3>
        <p>Collez ici les données de scores exportées :</p>
        <textarea
            v-model="importData"
            placeholder="Collez les données JSON ici..."
            class="import-textarea"
        ></textarea>
        <div class="modal-actions">
          <button @click="importScores" class="game-button">Importer</button>
          <button @click="showImportModal = false" class="game-button secondary">Annuler</button>
        </div>
      </div>
    </div>

    <!-- Modal de réinitialisation -->
    <div v-if="showResetModal" class="modal-overlay" @click="showResetModal = false">
      <div class="modal" @click.stop>
        <h3>⚠️ Réinitialiser les Scores</h3>
        <p>Êtes-vous sûr de vouloir supprimer tous les scores de <strong>{{ getCurrentGame().name }}</strong> ?</p>
        <p class="warning">Cette action est irréversible !</p>
        <div class="modal-actions">
          <button @click="resetScores" class="game-button danger">Confirmer</button>
          <button @click="showResetModal = false" class="game-button secondary">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Configuration de la page
useHead({
  title: '🏆 Scores - SebArcade',
  meta: [
    { name: 'description', content: 'Consultez les meilleurs scores de tous les jeux' }
  ]
})

// État réactif
const selectedGame = ref('snake')
const showImportModal = ref(false)
const showResetModal = ref(false)
const importData = ref('')

// Jeux disponibles
const availableGames = [
  { id: 'snake', name: 'Snake', icon: '🐍' },
  { id: 'space-invaders', name: 'Space Invaders', icon: '👾' },
  { id: 'asteroids', name: 'Asteroids', icon: '🚀' },
  { id: 'tetris', name: 'Tetris', icon: '🧩' },
  { id: 'pacman', name: 'Pac-Man', icon: '👻' },
  { id: 'breakout', name: 'Breakout', icon: '🏓' }
]

// Obtenir le jeu actuel
const getCurrentGame = () => {
  return availableGames.find(game => game.id === selectedGame.value) || availableGames[0]
}

// Obtenir les statistiques du jeu actuel
const getCurrentStats = () => {
  const gameId = selectedGame.value

  try {
    const highScore = parseInt(localStorage.getItem(`${gameId}-high-score`) || '0')
    const historyData = localStorage.getItem(`${gameId}-score-history`)
    const history = historyData ? JSON.parse(historyData) : []

    const totalGames = history.length
    const averageScore = totalGames > 0
        ? Math.round(history.reduce((sum, game) => sum + game.score, 0) / totalGames)
        : 0

    // Calculer la meilleure série (nombre de parties consécutives avec amélioration)
    let bestStreak = 0
    let currentStreak = 0
    for (let i = 1; i < history.length; i++) {
      if (history[i].score > history[i - 1].score) {
        currentStreak++
        bestStreak = Math.max(bestStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }

    return {
      highScore: formatScore(highScore),
      totalGames,
      averageScore: formatScore(averageScore),
      bestStreak
    }
  } catch (error) {
    console.error('Erreur lors du chargement des stats:', error)
    return {
      highScore: '0',
      totalGames: 0,
      averageScore: '0',
      bestStreak: 0
    }
  }
}

// Obtenir l'historique du jeu actuel
const getCurrentHistory = () => {
  const gameId = selectedGame.value

  try {
    const historyData = localStorage.getItem(`${gameId}-score-history`)
    const history = historyData ? JSON.parse(historyData) : []

    // Trier par score décroissant et prendre les 20 meilleurs
    return history
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
  } catch (error) {
    console.error('Erreur lors du chargement de l\'historique:', error)
    return []
  }
}

// Obtenir les achievements
const getAchievements = () => {
  const gameId = selectedGame.value
  const achievements = [
    {
      id: 'first-score',
      name: 'Premier Pas',
      description: 'Terminer votre première partie',
      icon: '🎯',
      unlocked: false
    },
    {
      id: 'score-100',
      name: 'Centenaire',
      description: 'Atteindre 100 points',
      icon: '💯',
      unlocked: false
    },
    {
      id: 'score-1000',
      name: 'Millionnaire',
      description: 'Atteindre 1000 points',
      icon: '🏆',
      unlocked: false
    },
    {
      id: 'games-10',
      name: 'Persévérant',
      description: 'Jouer 10 parties',
      icon: '🎮',
      unlocked: false
    },
    {
      id: 'perfect-game',
      name: 'Partie Parfaite',
      description: 'Réaliser un score exceptionnel',
      icon: '⭐',
      unlocked: false
    }
  ]

  try {
    const savedAchievements = localStorage.getItem(`${gameId}-achievements`)
    const unlockedIds = savedAchievements ? JSON.parse(savedAchievements) : []
    const stats = getCurrentStats()

    // Vérifier les achievements automatiques
    const totalGames = parseInt(stats.totalGames)
    const highScore = parseInt(stats.highScore.replace(/\s/g, '')) || 0

    achievements.forEach(achievement => {
      let shouldUnlock = false

      switch (achievement.id) {
        case 'first-score':
          shouldUnlock = totalGames > 0
          break
        case 'score-100':
          shouldUnlock = highScore >= 100
          break
        case 'score-1000':
          shouldUnlock = highScore >= 1000
          break
        case 'games-10':
          shouldUnlock = totalGames >= 10
          break
        case 'perfect-game':
          shouldUnlock = highScore >= 5000
          break
      }

      achievement.unlocked = shouldUnlock || unlockedIds.includes(achievement.id)

      if (achievement.unlocked) {
        achievement.unlockedDate = new Date().toISOString()
      }
    })

    return achievements
  } catch (error) {
    console.error('Erreur lors du chargement des achievements:', error)
    return achievements
  }
}

// Formatage
const formatScore = (score) => {
  return score.toLocaleString()
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (milliseconds) => {
  if (!milliseconds) return 'N/A'
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return `${seconds}s`
}

// Actions
const exportScores = () => {
  const gameId = selectedGame.value
  const data = {
    game: getCurrentGame().name,
    gameId,
    highScore: localStorage.getItem(`${gameId}-high-score`),
    history: localStorage.getItem(`${gameId}-score-history`),
    achievements: localStorage.getItem(`${gameId}-achievements`),
    exportDate: new Date().toISOString()
  }

  const jsonData = JSON.stringify(data, null, 2)

  // Créer et télécharger le fichier
  const blob = new Blob([jsonData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${gameId}-scores-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  alert('✅ Scores exportés avec succès !')
}

const importScores = () => {
  try {
    const data = JSON.parse(importData.value)

    if (data.gameId && data.gameId === selectedGame.value) {
      // Importer les données
      if (data.highScore) localStorage.setItem(`${data.gameId}-high-score`, data.highScore)
      if (data.history) localStorage.setItem(`${data.gameId}-score-history`, data.history)
      if (data.achievements) localStorage.setItem(`${data.gameId}-achievements`, data.achievements)

      showImportModal.value = false
      importData.value = ''

      alert('✅ Scores importés avec succès !')

      // Forcer le rafraîchissement des données
      selectedGame.value = selectedGame.value
    } else {
      alert('❌ Données invalides ou jeu incorrect')
    }
  } catch (error) {
    alert('❌ Erreur lors de l\'importation: Format de données invalide')
  }
}

const resetScores = () => {
  const gameId = selectedGame.value

  localStorage.removeItem(`${gameId}-high-score`)
  localStorage.removeItem(`${gameId}-score-history`)
  localStorage.removeItem(`${gameId}-achievements`)

  showResetModal.value = false

  alert('✅ Scores réinitialisés !')

  // Forcer le rafraîchissement
  selectedGame.value = selectedGame.value
}
</script>

<style scoped>
.scores-page {
  max-width: 1000px;
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

/* Sélecteur de jeu */
.game-selector {
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
  justify-content: center;
}

.game-tab {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 1rem 2rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.game-tab:hover {
  border-color: #00ff00;
  background: rgba(0, 255, 0, 0.1);
}

.game-tab.active {
  background: linear-gradient(45deg, #00ff00, #00cc00);
  border-color: #00ff00;
  color: #000;
}

/* Statistiques */
.current-game-stats {
  margin-bottom: 3rem;
}

.game-title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #00ff00;
  font-family: 'Press Start 2P', monospace;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(0, 255, 0, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: #00ff00;
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 255, 0, 0.2);
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #00ff00;
  margin-bottom: 0.5rem;
  font-family: 'Press Start 2P', monospace;
}

.stat-label {
  opacity: 0.8;
  font-size: 0.9rem;
}

/* Historique */
.scores-history {
  margin-bottom: 3rem;
}

.section-title {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: #00ff00;
  font-family: 'Press Start 2P', monospace;
}

.no-scores {
  text-align: center;
  padding: 3rem;
  opacity: 0.7;
}

.no-scores-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.scores-list {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
}

.scores-header {
  display: grid;
  grid-template-columns: 60px 1fr 80px 120px 80px;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 255, 0, 0.1);
  border-bottom: 2px solid rgba(0, 255, 0, 0.3);
  font-weight: bold;
  font-size: 0.9rem;
}

.score-item {
  display: grid;
  grid-template-columns: 60px 1fr 80px 120px 80px;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 0.2s ease;
}

.score-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.score-item.best-score {
  background: rgba(255, 215, 0, 0.1);
  border-left: 4px solid gold;
}

.score-rank {
  text-align: center;
  font-weight: bold;
}

.score-value {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.9rem;
  color: #00ff00;
}

/* Achievements */
.achievements-section {
  margin-bottom: 3rem;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.achievement-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.3s ease;
}

.achievement-card.unlocked {
  border-color: rgba(0, 255, 0, 0.5);
  background: rgba(0, 255, 0, 0.05);
}

.achievement-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.achievement-info {
  flex: 1;
}

.achievement-name {
  color: #00ff00;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.achievement-description {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 0.25rem;
}

.achievement-date {
  font-size: 0.8rem;
  opacity: 0.6;
}

.achievement-status {
  flex-shrink: 0;
}

.unlocked-badge, .locked-badge {
  font-size: 1.5rem;
}

/* Actions */
.page-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.game-button.danger {
  background: linear-gradient(45deg, #ff4444, #cc0000);
  border-color: #ff4444;
}

.game-button.danger:hover {
  background: linear-gradient(45deg, #cc0000, #990000);
  box-shadow: 0 6px 12px rgba(255, 68, 68, 0.4);
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: rgba(0, 20, 0, 0.95);
  border: 2px solid #00ff00;
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal h3 {
  color: #00ff00;
  margin-bottom: 1rem;
  font-family: 'Press Start 2P', monospace;
}

.import-textarea {
  width: 100%;
  height: 200px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  font-family: monospace;
  margin: 1rem 0;
  resize: vertical;
}

.import-textarea:focus {
  outline: none;
  border-color: #00ff00;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.warning {
  color: #ff4444;
  font-weight: bold;
}

/* Responsive */
@media (max-width: 768px) {
  .scores-page {
    padding: 1rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .scores-header,
  .score-item {
    grid-template-columns: 40px 1fr 60px;
    font-size: 0.8rem;
  }

  .header-date,
  .header-duration,
  .score-date,
  .score-duration {
    display: none;
  }

  .achievements-grid {
    grid-template-columns: 1fr;
  }

  .page-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
