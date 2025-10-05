<template>
  <div class="scores-page">
    <div class="page-header">
      <h1 class="page-title retro-font neon-text">
        🏆 HALL OF FAME
      </h1>
      <p class="page-subtitle">
        Statistiques complètes et analyses de performance
      </p>
    </div>

    <!-- Sélecteur de jeu avec statistiques rapides -->
    <div class="game-selector-enhanced">
      <div
          v-for="game in availableGames"
          :key="game.id"
          @click="selectedGame = game.id"
          :class="['game-card', { active: selectedGame === game.id }]"
      >
        <div class="game-icon">{{ game.icon }}</div>
        <div class="game-info">
          <h3>{{ game.name }}</h3>
          <div class="quick-stats">
            <span class="stat">🏆 {{ getQuickStats(game.id).highScore }}</span>
            <span class="stat">🎮 {{ getQuickStats(game.id).totalGames }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Dashboard principal -->
    <div class="dashboard">
      <!-- Statistiques principales -->
      <div class="main-stats">
        <div class="stat-card primary">
          <div class="stat-header">
            <span class="stat-icon">👑</span>
            <span class="stat-label">Record Absolu</span>
          </div>
          <div class="stat-value">{{ getCurrentStats().highScore }}</div>
          <div class="stat-trend" v-if="getCurrentStats().improvement">
            <span class="trend-icon">📈</span>
            <span>+{{ getCurrentStats().improvement }}% vs moyenne</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon">🎯</span>
            <span class="stat-label">Précision Moyenne</span>
          </div>
          <div class="stat-value">{{ getCurrentStats().averageAccuracy }}%</div>
          <div class="stat-progress">
            <div class="progress-bar">
              <div
                  class="progress-fill"
                  :style="{ width: getCurrentStats().averageAccuracy + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon">⚡</span>
            <span class="stat-label">Actions/Min</span>
          </div>
          <div class="stat-value">{{ getCurrentStats().avgAPM }}</div>
          <div class="stat-comparison">
            vs {{ getCurrentStats().peakAPM }} max
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon">🔥</span>
            <span class="stat-label">Série Actuelle</span>
          </div>
          <div class="stat-value">{{ getCurrentStats().currentStreak }}</div>
          <div class="stat-comparison">
            Record: {{ getCurrentStats().bestStreak }}
          </div>
        </div>
      </div>

      <!-- Graphiques de performance -->
      <div class="performance-charts">
        <div class="chart-container">
          <h3 class="chart-title">📈 Évolution des Scores</h3>
          <div class="score-chart" ref="scoreChart">
            <canvas id="scoreCanvas" width="400" height="200"></canvas>
          </div>
        </div>

        <div class="chart-container">
          <h3 class="chart-title">🎯 Analyse de Performance</h3>
          <div class="performance-radar" ref="performanceRadar">
            <div class="radar-stats">
              <div class="radar-stat">
                <span class="label">Régularité</span>
                <div class="radar-bar">
                  <div
                      class="radar-fill"
                      :style="{ width: getCurrentAnalytics().consistency + '%' }"
                  ></div>
                </div>
                <span class="value">{{ getCurrentAnalytics().consistency }}%</span>
              </div>
              <div class="radar-stat">
                <span class="label">Progression</span>
                <div class="radar-bar">
                  <div
                      class="radar-fill improvement"
                      :style="{ width: getCurrentAnalytics().improvement + '%' }"
                  ></div>
                </div>
                <span class="value">{{ getCurrentAnalytics().improvement }}%</span>
              </div>
              <div class="radar-stat">
                <span class="label">Endurance</span>
                <div class="radar-bar">
                  <div
                      class="radar-fill endurance"
                      :style="{ width: getCurrentAnalytics().endurance + '%' }"
                  ></div>
                </div>
                <span class="value">{{ getCurrentAnalytics().endurance }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Historique amélioré -->
      <div class="enhanced-history">
        <div class="history-header">
          <h3 class="section-title">📊 Historique Détaillé</h3>
          <div class="history-filters">
            <select v-model="historyFilter" class="filter-select">
              <option value="all">Toutes les parties</option>
              <option value="records">Nouveaux records</option>
              <option value="recent">7 derniers jours</option>
              <option value="best">Top 10</option>
            </select>
            <select v-model="historySortBy" class="filter-select">
              <option value="date">Par date</option>
              <option value="score">Par score</option>
              <option value="duration">Par durée</option>
              <option value="level">Par niveau</option>
            </select>
          </div>
        </div>

        <div v-if="getFilteredHistory().length === 0" class="no-scores">
          <div class="no-scores-icon">🎮</div>
          <h4>Aucune partie trouvée</h4>
          <p>Ajustez les filtres ou commencez à jouer !</p>
          <NuxtLink :to="`/games/${selectedGame}`" class="game-button">
            🚀 Jouer maintenant
          </NuxtLink>
        </div>

        <div v-else class="scores-table-enhanced">
          <div class="table-header">
            <span class="col-rank">#</span>
            <span class="col-score">Score</span>
            <span class="col-analytics">Performance</span>
            <span class="col-duration">Durée</span>
            <span class="col-date">Date</span>
            <span class="col-actions">Actions</span>
          </div>

          <div
              v-for="(game, index) in getFilteredHistory()"
              :key="game.id"
              :class="['game-row', { 
                'record-row': game.isRecord,
                'recent-row': isRecentGame(game.date)
              }]"
          >
            <div class="col-rank">
              <span v-if="index === 0 && historySortBy === 'score'">🥇</span>
              <span v-else-if="index === 1 && historySortBy === 'score'">🥈</span>
              <span v-else-if="index === 2 && historySortBy === 'score'">🥉</span>
              <span v-else>{{ index + 1 }}</span>
            </div>

            <div class="col-score">
              <div class="score-main">{{ formatScore(game.score) }}</div>
              <div class="score-details">
                Niveau {{ game.level || 1 }}
                <span v-if="game.maxCombo > 0" class="combo-badge">
                  🔥{{ game.maxCombo }}
                </span>
              </div>
            </div>

            <div class="col-analytics">
              <div class="performance-indicators">
                <div class="indicator" v-if="game.analytics">
                  <span class="indicator-icon">🎯</span>
                  <span class="indicator-value">{{ Math.round(game.analytics.accuracy) }}%</span>
                </div>
                <div class="indicator" v-if="game.analytics">
                  <span class="indicator-icon">⚡</span>
                  <span class="indicator-value">{{ Math.round(game.analytics.actionsPerMinute) }}</span>
                </div>
                <div class="indicator" v-if="game.analytics && game.analytics.peakPerformance">
                  <span class="indicator-icon">📈</span>
                  <span class="indicator-value">{{ formatScore(game.analytics.peakPerformance) }}</span>
                </div>
              </div>
            </div>

            <div class="col-duration">
              <div class="duration-main">{{ formatDuration(game.duration) }}</div>
              <div class="duration-details">
                {{ calculateGamePace(game) }}
              </div>
            </div>

            <div class="col-date">
              <div class="date-main">{{ formatDate(game.date) }}</div>
              <div class="date-relative">{{ getRelativeTime(game.date) }}</div>
            </div>

            <div class="col-actions">
              <button
                  @click="showGameDetails(game)"
                  class="action-btn detail-btn"
                  title="Voir les détails"
              >
                📋
              </button>
              <button
                  @click="shareGame(game)"
                  class="action-btn share-btn"
                  title="Partager"
              >
                📤
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Achievements avancés -->
      <div class="achievements-enhanced">
        <div class="achievements-header">
          <h3 class="section-title">🏅 Système de Succès</h3>
          <div class="achievement-progress">
            <span>{{ getUnlockedAchievements().length }} / {{ getAllAchievements().length }} débloqués</span>
            <div class="progress-bar">
              <div
                  class="progress-fill"
                  :style="{ width: (getUnlockedAchievements().length / getAllAchievements().length) * 100 + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <div class="achievements-categories">
          <div class="category-tabs">
            <button
                v-for="category in achievementCategories"
                :key="category.id"
                @click="selectedAchievementCategory = category.id"
                :class="['category-tab', { active: selectedAchievementCategory === category.id }]"
            >
              {{ category.icon }} {{ category.name }}
            </button>
          </div>

          <div class="achievements-grid">
            <div
                v-for="achievement in getAchievementsByCategory(selectedAchievementCategory)"
                :key="achievement.id"
                :class="['achievement-card-enhanced', { 
                  unlocked: achievement.unlocked,
                  'near-unlock': achievement.progress >= 80
                }]"
            >
              <div class="achievement-icon-large">{{ achievement.icon }}</div>
              <div class="achievement-content">
                <h4 class="achievement-name">{{ achievement.name }}</h4>
                <p class="achievement-description">{{ achievement.description }}</p>

                <div v-if="achievement.progress !== undefined" class="achievement-progress-bar">
                  <div class="progress-track">
                    <div
                        class="progress-fill"
                        :style="{ width: Math.min(achievement.progress, 100) + '%' }"
                    ></div>
                  </div>
                  <span class="progress-text">{{ Math.round(achievement.progress) }}%</span>
                </div>

                <div v-if="achievement.unlocked" class="achievement-unlock-info">
                  <span class="unlock-badge">✅ Débloqué</span>
                  <span class="unlock-date">{{ formatDate(achievement.unlockedDate) }}</span>
                </div>

                <div v-if="achievement.reward" class="achievement-reward">
                  🎁 {{ achievement.reward }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Outils avancés -->
      <div class="advanced-tools">
        <h3 class="section-title">🛠️ Outils Avancés</h3>

        <div class="tools-grid">
          <div class="tool-card">
            <h4>📊 Analyse de Tendance</h4>
            <p>Analysez votre progression sur les 30 derniers jours</p>
            <button @click="generateTrendReport" class="tool-button">
              Générer le rapport
            </button>
          </div>

          <div class="tool-card">
            <h4>🎯 Objectifs Personnalisés</h4>
            <p>Définissez vos propres défis et objectifs</p>
            <button @click="showGoalsModal = true" class="tool-button">
              Gérer les objectifs
            </button>
          </div>

          <div class="tool-card">
            <h4>📈 Comparaison de Parties</h4>
            <p>Comparez les performances entre différentes sessions</p>
            <button @click="showComparisonModal = true" class="tool-button">
              Comparer les parties
            </button>
          </div>

          <div class="tool-card">
            <h4>💾 Sauvegarde Cloud</h4>
            <p>Synchronisez vos données entre appareils</p>
            <button @click="showCloudSync = true" class="tool-button">
              Configurer
            </button>
          </div>
        </div>
      </div>

      <!-- Actions principales -->
      <div class="main-actions">
        <button @click="exportAdvancedData" class="game-button secondary">
          💾 Export Complet
        </button>
        <button @click="showImportModal = true" class="game-button secondary">
          📁 Importer des Données
        </button>
        <button @click="showAnalyticsModal = true" class="game-button">
          📊 Rapport Détaillé
        </button>
        <button @click="showResetModal = true" class="game-button danger">
          🗑️ Réinitialiser
        </button>
      </div>
    </div>

    <!-- Modal de détails de partie -->
    <div v-if="selectedGameDetails" class="modal-overlay" @click="closeGameDetails">
      <div class="modal-large" @click.stop>
        <div class="modal-header">
          <h3>📋 Détails de la Partie</h3>
          <button @click="closeGameDetails" class="close-btn">×</button>
        </div>

        <div class="game-details-content">
          <div class="details-grid">
            <div class="detail-section">
              <h4>🎯 Performance</h4>
              <div class="detail-stats">
                <div class="detail-stat">
                  <span class="label">Score Final:</span>
                  <span class="value">{{ formatScore(selectedGameDetails.score) }}</span>
                </div>
                <div class="detail-stat">
                  <span class="label">Niveau Atteint:</span>
                  <span class="value">{{ selectedGameDetails.level }}</span>
                </div>
                <div class="detail-stat">
                  <span class="label">Combo Maximum:</span>
                  <span class="value">{{ selectedGameDetails.maxCombo }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section" v-if="selectedGameDetails.analytics">
              <h4>📊 Analytics</h4>
              <div class="detail-stats">
                <div class="detail-stat">
                  <span class="label">Précision:</span>
                  <span class="value">{{ Math.round(selectedGameDetails.analytics.accuracy) }}%</span>
                </div>
                <div class="detail-stat">
                  <span class="label">Actions/Min:</span>
                  <span class="value">{{ Math.round(selectedGameDetails.analytics.actionsPerMinute) }}</span>
                </div>
                <div class="detail-stat">
                  <span class="label">Performance Max:</span>
                  <span class="value">{{ formatScore(selectedGameDetails.analytics.peakPerformance) }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4>⏱️ Temporel</h4>
              <div class="detail-stats">
                <div class="detail-stat">
                  <span class="label">Durée:</span>
                  <span class="value">{{ formatDuration(selectedGameDetails.duration) }}</span>
                </div>
                <div class="detail-stat">
                  <span class="label">Date:</span>
                  <span class="value">{{ formatDate(selectedGameDetails.date) }}</span>
                </div>
                <div class="detail-stat">
                  <span class="label">Rythme:</span>
                  <span class="value">{{ calculateGamePace(selectedGameDetails) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="details-actions">
            <button @click="shareGame(selectedGameDetails)" class="game-button">
              📤 Partager cette partie
            </button>
            <button @click="replayGame(selectedGameDetails)" class="game-button secondary">
              🔄 Rejouer avec ces paramètres
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'analytics -->
    <div v-if="showAnalyticsModal" class="modal-overlay" @click="showAnalyticsModal = false">
      <div class="modal-large" @click.stop>
        <div class="modal-header">
          <h3>📊 Rapport Analytique Complet</h3>
          <button @click="showAnalyticsModal = false" class="close-btn">×</button>
        </div>

        <div class="analytics-report">
          <div class="report-section">
            <h4>📈 Évolution des Performances</h4>
            <div class="analytics-chart" ref="analyticsChart">
              <!-- Graphique détaillé généré dynamiquement -->
              <canvas id="analyticsCanvas" width="600" height="300"></canvas>
            </div>
          </div>

          <div class="report-section">
            <h4>🎯 Analyse Comparative</h4>
            <div class="comparison-grid">
              <div class="comparison-card">
                <h5>Meilleure Performance</h5>
                <div class="comparison-data">
                  <div class="data-point">
                    <span class="label">Score:</span>
                    <span class="value">{{ getBestPerformance().score }}</span>
                  </div>
                  <div class="data-point">
                    <span class="label">Date:</span>
                    <span class="value">{{ formatDate(getBestPerformance().date) }}</span>
                  </div>
                </div>
              </div>

              <div class="comparison-card">
                <h5>Performance Moyenne</h5>
                <div class="comparison-data">
                  <div class="data-point">
                    <span class="label">Score:</span>
                    <span class="value">{{ getCurrentStats().averageScore }}</span>
                  </div>
                  <div class="data-point">
                    <span class="label">Régularité:</span>
                    <span class="value">{{ getCurrentAnalytics().consistency }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="report-section">
            <h4>🏆 Recommandations</h4>
            <div class="recommendations">
              <div
                  v-for="recommendation in getRecommendations()"
                  :key="recommendation.id"
                  class="recommendation-card"
              >
                <div class="recommendation-icon">{{ recommendation.icon }}</div>
                <div class="recommendation-content">
                  <h5>{{ recommendation.title }}</h5>
                  <p>{{ recommendation.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Autres modals existantes avec styles améliorés -->
    <div v-if="showImportModal" class="modal-overlay" @click="showImportModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>📁 Importer des Données</h3>
          <button @click="showImportModal = false" class="close-btn">×</button>
        </div>
        <div class="modal-content">
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
    </div>

    <div v-if="showResetModal" class="modal-overlay" @click="showResetModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>⚠️ Réinitialiser les Données</h3>
          <button @click="showResetModal = false" class="close-btn">×</button>
        </div>
        <div class="modal-content">
          <p>Êtes-vous sûr de vouloir supprimer toutes les données de <strong>{{ getCurrentGame().name }}</strong> ?</p>
          <p class="warning">Cette action est irréversible et supprimera :</p>
          <ul class="reset-list">
            <li>✗ Tous les scores et records</li>
            <li>✗ L'historique des parties</li>
            <li>✗ Les succès débloqués</li>
            <li>✗ Les statistiques et analytics</li>
          </ul>
          <div class="modal-actions">
            <button @click="resetAllData" class="game-button danger">Confirmer la suppression</button>
            <button @click="showResetModal = false" class="game-button secondary">Annuler</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Configuration de la page
useHead({
  title: '🏆 Scores Avancés - SebArcade',
  meta: [
    { name: 'description', content: 'Analytics complètes et statistiques avancées de performance' }
  ]
})

// État réactif
const selectedGame = ref('snake')
const showImportModal = ref(false)
const showResetModal = ref(false)
const showAnalyticsModal = ref(false)
const showGoalsModal = ref(false)
const showComparisonModal = ref(false)
const showCloudSync = ref(false)
const importData = ref('')
const selectedGameDetails = ref(null)
const historyFilter = ref('all')
const historySortBy = ref('date')
const selectedAchievementCategory = ref('general')

// Jeux disponibles avec plus de données
const availableGames = [
  { id: 'snake', name: 'Snake', icon: '🐍', difficulty: 1.2 },
  { id: 'space-invaders', name: 'Space Invaders', icon: '👾', difficulty: 1.5 },
  { id: 'asteroids', name: 'Asteroids', icon: '🚀', difficulty: 1.8 },
  { id: 'tetris', name: 'Tetris', icon: '🧩', difficulty: 2.0 },
  { id: 'pacman', name: 'Pac-Man', icon: '👻', difficulty: 1.6 },
  { id: 'breakout', name: 'Breakout', icon: '🏓', difficulty: 1.3 },
  { id: 'pong', name: 'Pong', icon: '🏓', difficulty: 1.0 },
  { id: 'dino', name: 'Dino Runner', icon: '🦕', difficulty: 1.4 }
]

// Catégories d'achievements
const achievementCategories = [
  { id: 'general', name: 'Général', icon: '🎯' },
  { id: 'score', name: 'Score', icon: '🏆' },
  { id: 'combo', name: 'Combos', icon: '🔥' },
  { id: 'time', name: 'Temps', icon: '⏱️' },
  { id: 'skill', name: 'Compétence', icon: '⭐' }
]

// Méthodes utilitaires
const getCurrentGame = () => {
  return availableGames.find(game => game.id === selectedGame.value) || availableGames[0]
}

const getQuickStats = (gameId) => {
  try {
    const highScore = parseInt(localStorage.getItem(`${gameId}-high-score`) || '0')
    const historyData = localStorage.getItem(`${gameId}-score-history`)
    const history = historyData ? JSON.parse(historyData) : []

    return {
      highScore: formatScore(highScore),
      totalGames: history.length
    }
  } catch (error) {
    return { highScore: '0', totalGames: 0 }
  }
}

const getCurrentStats = () => {
  const gameId = selectedGame.value

  try {
    const historyData = localStorage.getItem(`${gameId}-score-history`)
    const history = historyData ? JSON.parse(historyData) : []

    if (history.length === 0) {
      return {
        highScore: '0',
        averageScore: '0',
        averageAccuracy: 0,
        avgAPM: 0,
        peakAPM: 0,
        currentStreak: 0,
        bestStreak: 0,
        improvement: 0
      }
    }

    const scores = history.map(h => h.score)
    const highScore = Math.max(...scores)
    const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)

    // Calcul des moyennes d'analytics
    const gamesWithAnalytics = history.filter(h => h.analytics)
    const avgAccuracy = gamesWithAnalytics.length > 0
        ? Math.round(gamesWithAnalytics.reduce((sum, h) => sum + h.analytics.accuracy, 0) / gamesWithAnalytics.length)
        : 0

    const avgAPM = gamesWithAnalytics.length > 0
        ? Math.round(gamesWithAnalytics.reduce((sum, h) => sum + h.analytics.actionsPerMinute, 0) / gamesWithAnalytics.length)
        : 0

    const peakAPM = gamesWithAnalytics.length > 0
        ? Math.max(...gamesWithAnalytics.map(h => h.analytics.actionsPerMinute))
        : 0

    // Calcul de l'amélioration
    const recentGames = history.slice(0, 5)
    const oldGames = history.slice(-5)
    const recentAvg = recentGames.reduce((sum, h) => sum + h.score, 0) / recentGames.length
    const oldAvg = oldGames.reduce((sum, h) => sum + h.score, 0) / oldGames.length
    const improvement = oldAvg > 0 ? Math.round(((recentAvg - oldAvg) / oldAvg) * 100) : 0

    return {
      highScore: formatScore(highScore),
      averageScore: formatScore(averageScore),
      averageAccuracy: avgAccuracy,
      avgAPM,
      peakAPM: Math.round(peakAPM),
      currentStreak: 0, // À implémenter
      bestStreak: 0, // À implémenter
      improvement
    }
  } catch (error) {
    console.error('Erreur stats:', error)
    return {
      highScore: '0',
      averageScore: '0',
      averageAccuracy: 0,
      avgAPM: 0,
      peakAPM: 0,
      currentStreak: 0,
      bestStreak: 0,
      improvement: 0
    }
  }
}

const getCurrentAnalytics = () => {
  const gameId = selectedGame.value
  const historyData = localStorage.getItem(`${gameId}-score-history`)
  const history = historyData ? JSON.parse(historyData) : []

  if (history.length === 0) {
    return { consistency: 0, improvement: 0, endurance: 0 }
  }

  const scores = history.map(h => h.score)
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
  const consistency = Math.max(0, 100 - (Math.sqrt(variance) / mean) * 100)

  const improvement = Math.min(100, Math.max(0, getCurrentStats().improvement + 50))
  const avgDuration = history.reduce((sum, h) => sum + (h.duration || 0), 0) / history.length
  const endurance = Math.min(100, (avgDuration / 300000) * 100) // 5 minutes = 100%

  return {
    consistency: Math.round(consistency),
    improvement: Math.round(improvement),
    endurance: Math.round(endurance)
  }
}

const getFilteredHistory = () => {
  const gameId = selectedGame.value
  const historyData = localStorage.getItem(`${gameId}-score-history`)
  let history = historyData ? JSON.parse(historyData) : []

  // Application des filtres
  switch (historyFilter.value) {
    case 'records':
      history = history.filter(h => h.isRecord)
      break
    case 'recent':
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      history = history.filter(h => new Date(h.date) > weekAgo)
      break
    case 'best':
      history = history.sort((a, b) => b.score - a.score).slice(0, 10)
      break
  }

  // Application du tri
  switch (historySortBy.value) {
    case 'score':
      history.sort((a, b) => b.score - a.score)
      break
    case 'duration':
      history.sort((a, b) => (b.duration || 0) - (a.duration || 0))
      break
    case 'level':
      history.sort((a, b) => (b.level || 0) - (a.level || 0))
      break
    default: // date
      history.sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  return history
}

const getAllAchievements = () => {
  return [
    // Général
    { id: 'first-game', category: 'general', name: 'Premier Pas', description: 'Terminer votre première partie', icon: '🎯', unlocked: false },
    { id: 'games-10', category: 'general', name: 'Persévérant', description: 'Jouer 10 parties', icon: '🎮', unlocked: false },
    { id: 'daily-player', category: 'general', name: 'Joueur Quotidien', description: 'Jouer tous les jours pendant une semaine', icon: '📅', unlocked: false },

    // Score
    { id: 'score-100', category: 'score', name: 'Centenaire', description: 'Atteindre 100 points', icon: '💯', unlocked: false },
    { id: 'score-1000', category: 'score', name: 'Millionnaire', description: 'Atteindre 1000 points', icon: '🏆', unlocked: false },
    { id: 'score-10000', category: 'score', name: 'Légende', description: 'Atteindre 10000 points', icon: '👑', unlocked: false },

    // Combos
    { id: 'combo-5', category: 'combo', name: 'Combo Débutant', description: 'Faire un combo de 5', icon: '🔥', unlocked: false },
    { id: 'combo-20', category: 'combo', name: 'Maître du Combo', description: 'Faire un combo de 20', icon: '⚡', unlocked: false },
    { id: 'combo-50', category: 'combo', name: 'Roi du Combo', description: 'Faire un combo de 50', icon: '💥', unlocked: false },

    // Temps
    { id: 'marathon', category: 'time', name: 'Marathonien', description: 'Jouer pendant 30 minutes d\'affilée', icon: '🏃', unlocked: false },
    { id: 'speed-demon', category: 'time', name: 'Démon de Vitesse', description: 'Atteindre 200 APM', icon: '💨', unlocked: false },

    // Compétence
    { id: 'perfectionist', category: 'skill', name: 'Perfectionniste', description: 'Maintenir 95% de précision', icon: '🎖️', unlocked: false },
    { id: 'level-10', category: 'skill', name: 'Niveau 10', description: 'Atteindre le niveau 10', icon: '⭐', unlocked: false }
  ]
}

const getUnlockedAchievements = () => {
  return getAllAchievements().filter(a => a.unlocked)
}

const getAchievementsByCategory = (category) => {
  return getAllAchievements().filter(a => a.category === category)
}

// Méthodes de formatage
const formatScore = (score) => score.toLocaleString()

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

const getRelativeTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (days > 0) return `il y a ${days}j`
  if (hours > 0) return `il y a ${hours}h`
  if (minutes > 0) return `il y a ${minutes}min`
  return 'À l\'instant'
}

const calculateGamePace = (game) => {
  if (!game.duration || !game.score) return 'N/A'
  const pointsPerSecond = game.score / (game.duration / 1000)
  if (pointsPerSecond > 10) return 'Rapide ⚡'
  if (pointsPerSecond > 5) return 'Normal 🚶'
  return 'Lent 🐌'
}

const isRecentGame = (dateString) => {
  if (!dateString) return false
  const gameDate = new Date(dateString)
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return gameDate > dayAgo
}

// Actions
const showGameDetails = (game) => {
  selectedGameDetails.value = game
}

const closeGameDetails = () => {
  selectedGameDetails.value = null
}

const shareGame = (game) => {
  const text = `🎮 ${getCurrentGame().name}: ${formatScore(game.score)} points en ${formatDuration(game.duration)}! #SebArcade`

  if (navigator.share) {
    navigator.share({
      title: 'Ma performance sur SebArcade',
      text: text,
      url: window.location.href
    })
  } else {
    navigator.clipboard.writeText(text).then(() => {
      alert('📋 Résultat copié dans le presse-papiers!')
    })
  }
}

const replayGame = (game) => {
  // Rediriger vers le jeu avec les paramètres de la partie
  const params = new URLSearchParams({
    replay: true,
    level: game.level || 1,
    target: game.score
  })
  navigateTo(`/games/${selectedGame.value}?${params.toString()}`)
}

const exportAdvancedData = () => {
  const gameId = selectedGame.value
  const data = {
    version: '2.0',
    game: getCurrentGame().name,
    gameId,
    exportDate: new Date().toISOString(),
    data: {
      gameState: localStorage.getItem(`${gameId}-gameState`),
      progressState: localStorage.getItem(`${gameId}-progressState`),
      historyData: localStorage.getItem(`${gameId}-historyData`),
      analytics: localStorage.getItem(`${gameId}-analytics`),
      achievements: localStorage.getItem(`${gameId}-achievements`)
    },
    metadata: {
      totalGames: getCurrentStats().totalGames || 0,
      highScore: localStorage.getItem(`${gameId}-high-score`),
      exportedBy: 'SebArcade Advanced System'
    }
  }

  const jsonData = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${gameId}-advanced-export-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  alert('✅ Export avancé terminé!')
}

const importScores = () => {
  try {
    const data = JSON.parse(importData.value)

    if (data.version === '2.0' && data.gameId === selectedGame.value) {
      // Import des nouvelles données
      Object.entries(data.data).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(`${data.gameId}-${key}`, value)
        }
      })
    } else if (data.gameId === selectedGame.value) {
      // Import legacy
      if (data.highScore) localStorage.setItem(`${data.gameId}-high-score`, data.highScore)
      if (data.history) localStorage.setItem(`${data.gameId}-score-history`, data.history)
      if (data.achievements) localStorage.setItem(`${data.gameId}-achievements`, data.achievements)
    } else {
      alert('❌ Données incompatibles avec le jeu sélectionné')
      return
    }

    showImportModal.value = false
    importData.value = ''
    alert('✅ Données importées avec succès!')

    // Forcer le rafraîchissement
    selectedGame.value = selectedGame.value
  } catch (error) {
    alert('❌ Erreur lors de l\'importation: Format invalide')
  }
}

const resetAllData = () => {
  const gameId = selectedGame.value
  const keysToRemove = [
    `${gameId}-gameState`,
    `${gameId}-progressState`,
    `${gameId}-historyData`,
    `${gameId}-analytics`,
    `${gameId}-achievements`,
    `${gameId}-high-score`,
    `${gameId}-score-history`
  ]

  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })

  showResetModal.value = false
  alert('✅ Toutes les données ont été réinitialisées!')

  // Forcer le rafraîchissement
  selectedGame.value = selectedGame.value
}

const generateTrendReport = () => {
  const gameId = selectedGame.value
  const historyData = localStorage.getItem(`${gameId}-score-history`)
  const history = historyData ? JSON.parse(historyData) : []

  if (history.length < 5) {
    alert('📊 Pas assez de données pour générer un rapport de tendance (minimum 5 parties)')
    return
  }

  // Calcul des tendances
  const last30Days = history.filter(game => {
    const gameDate = new Date(game.date)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return gameDate > thirtyDaysAgo
  })

  if (last30Days.length === 0) {
    alert('📊 Aucune partie dans les 30 derniers jours')
    return
  }

  const report = {
    period: '30 derniers jours',
    gamesPlayed: last30Days.length,
    averageScore: Math.round(last30Days.reduce((sum, g) => sum + g.score, 0) / last30Days.length),
    bestScore: Math.max(...last30Days.map(g => g.score)),
    totalPlaytime: last30Days.reduce((sum, g) => sum + (g.duration || 0), 0),
    averageAccuracy: last30Days.filter(g => g.analytics).length > 0
        ? Math.round(last30Days.filter(g => g.analytics).reduce((sum, g) => sum + g.analytics.accuracy, 0) / last30Days.filter(g => g.analytics).length)
        : 'N/A',
    improvement: 'Calculé...'
  }

  const reportText = `
📊 RAPPORT DE TENDANCE - ${getCurrentGame().name}

📅 Période: ${report.period}
🎮 Parties jouées: ${report.gamesPlayed}
📈 Score moyen: ${formatScore(report.averageScore)}
🏆 Meilleur score: ${formatScore(report.bestScore)}
⏱️ Temps total: ${formatDuration(report.totalPlaytime)}
🎯 Précision moyenne: ${report.averageAccuracy}${typeof report.averageAccuracy === 'number' ? '%' : ''}

📈 Tendance: ${report.averageScore > getCurrentStats().averageScore.replace(/\s/g, '') ? 'En progression' : 'À améliorer'}
  `

  alert(reportText)
}

const getBestPerformance = () => {
  const historyData = localStorage.getItem(`${selectedGame.value}-score-history`)
  const history = historyData ? JSON.parse(historyData) : []

  if (history.length === 0) {
    return { score: '0', date: null }
  }

  const best = history.reduce((max, game) => game.score > max.score ? game : max)
  return {
    score: formatScore(best.score),
    date: best.date
  }
}

const getRecommendations = () => {
  const stats = getCurrentStats()
  const analytics = getCurrentAnalytics()
  const recommendations = []

  // Recommandations basées sur les performances
  if (analytics.consistency < 50) {
    recommendations.push({
      id: 'consistency',
      icon: '🎯',
      title: 'Améliorer la Régularité',
      description: 'Vos scores varient beaucoup. Concentrez-vous sur une approche plus méthodique.'
    })
  }

  if (stats.averageAccuracy < 80) {
    recommendations.push({
      id: 'accuracy',
      icon: '🔍',
      title: 'Travailler la Précision',
      description: 'Ralentissez le rythme et concentrez-vous sur la précision plutôt que la vitesse.'
    })
  }

  if (stats.avgAPM < 50) {
    recommendations.push({
      id: 'speed',
      icon: '⚡',
      title: 'Augmenter la Vitesse',
      description: 'Une fois la précision maîtrisée, travaillez sur l\'augmentation du rythme.'
    })
  }

  if (analytics.improvement < 0) {
    recommendations.push({
      id: 'practice',
      icon: '💪',
      title: 'Sessions d\'Entraînement',
      description: 'Vos performances stagnent. Essayez des sessions courtes mais fréquentes.'
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'excellence',
      icon: '🌟',
      title: 'Excellentes Performances!',
      description: 'Continuez sur cette lancée et essayez d\'autres jeux pour diversifier vos compétences.'
    })
  }

  return recommendations
}

// Lifecycle
onMounted(() => {
  // Initialisation des graphiques si nécessaire
  nextTick(() => {
    drawScoreChart()
    drawAnalyticsChart()
  })
  
  // Redessiner les graphiques lors du redimensionnement
  window.addEventListener('resize', () => {
    setTimeout(() => {
      drawScoreChart()
      drawAnalyticsChart()
    }, 100)
  })
})

const drawScoreChart = () => {
  // Implémentation basique d'un graphique
  const canvas = document.getElementById('scoreCanvas')
  if (!canvas) return

  // Mettre à jour les dimensions du canvas pour correspondre à sa taille d'affichage
  const displayWidth = canvas.clientWidth
  const displayHeight = canvas.clientHeight
  
  if (displayWidth > 0 && displayHeight > 0) {
    // Mise à l'échelle pour haute densité de pixels
    const pixelRatio = window.devicePixelRatio || 1
    const scaledWidth = displayWidth * pixelRatio
    const scaledHeight = displayHeight * pixelRatio
    
    if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
      canvas.width = scaledWidth
      canvas.height = scaledHeight
    }
  }

  const ctx = canvas.getContext('2d')
  
  // Mise à l'échelle du contexte pour haute densité de pixels
  if (displayWidth > 0 && displayHeight > 0) {
    ctx.scale(pixelRatio, pixelRatio)
    ctx.translate(0, 0)
  }
  
  const historyData = localStorage.getItem(`${selectedGame.value}-score-history`)
  const history = historyData ? JSON.parse(historyData) : []

  if (history.length === 0) {
    ctx.fillStyle = '#666'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Aucune donnée à afficher', displayWidth / 2, displayHeight / 2)
    return
  }

  // Dessiner un graphique simple
  ctx.clearRect(0, 0, displayWidth, displayHeight)
  ctx.strokeStyle = '#00ff00'
  ctx.lineWidth = 2 / pixelRatio

  const scores = history.slice(-20).map(h => h.score) // 20 derniers scores
  const maxScore = Math.max(...scores)
  const minScore = Math.min(...scores)
  const range = maxScore - minScore || 1

  ctx.beginPath()
  scores.forEach((score, index) => {
    const x = (index / (scores.length - 1)) * (displayWidth - 40) + 20
    const y = displayHeight - 20 - ((score - minScore) / range) * (displayHeight - 40)

    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()
}

const drawAnalyticsChart = () => {
  // Implémentation pour le modal d'analytics
  const canvas = document.getElementById('analyticsCanvas')
  if (!canvas) return

  // Mettre à jour les dimensions du canvas pour correspondre à sa taille d'affichage
  const displayWidth = canvas.clientWidth
  const displayHeight = canvas.clientHeight
  
  if (displayWidth > 0 && displayHeight > 0) {
    // Mise à l'échelle pour haute densité de pixels
    const pixelRatio = window.devicePixelRatio || 1
    const scaledWidth = displayWidth * pixelRatio
    const scaledHeight = displayHeight * pixelRatio
    
    if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
      canvas.width = scaledWidth
      canvas.height = scaledHeight
    }
  }

  const ctx = canvas.getContext('2d')
  
  // Mise à l'échelle du contexte pour haute densité de pixels
  if (displayWidth > 0 && displayHeight > 0) {
    ctx.scale(pixelRatio, pixelRatio)
    ctx.translate(0, 0)
  }
  
  // Graphique plus détaillé pour le modal
  // (Implementation similaire mais plus complexe)
  
  // Exemple de graphique simple pour le moment
  ctx.clearRect(0, 0, displayWidth, displayHeight)
  ctx.fillStyle = '#333'
  ctx.fillRect(0, 0, displayWidth, displayHeight)
  
  ctx.fillStyle = '#666'
  ctx.font = '16px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('Données analytiques détaillées', displayWidth / 2, displayHeight / 2)
}
</script>

<style scoped>
.scores-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
}

/* Header amélioré */
.page-header {
  text-align: center;
  margin-bottom: 3rem;
  background: linear-gradient(135deg, rgba(0, 255, 0, 0.1), rgba(0, 255, 255, 0.1));
  padding: 2rem;
  border-radius: 20px;
  border: 2px solid rgba(0, 255, 0, 0.3);
}

.page-title {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  text-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
}

.page-subtitle {
  font-size: 1.3rem;
  opacity: 0.9;
  font-weight: 300;
}

/* Sélecteur de jeu amélioré */
.game-selector-enhanced {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 3rem;
}

.game-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.game-card:hover {
  border-color: #00ff00;
  background: rgba(0, 255, 0, 0.05);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 255, 0, 0.2);
}

.game-card.active {
  border-color: #00ff00;
  background: rgba(0, 255, 0, 0.1);
  box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
}

.game-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.game-info h3 {
  color: #00ff00;
  margin-bottom: 0.5rem;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.9rem;
}

.quick-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  opacity: 0.8;
}

/* Dashboard principal */
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.main-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.stat-card:hover::before {
  left: 100%;
}

.stat-card:hover {
  border-color: rgba(0, 255, 0, 0.5);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 255, 0, 0.15);
}

.stat-card.primary {
  border-color: rgba(255, 215, 0, 0.5);
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.05));
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.8;
  font-weight: 500;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #00ff00;
  font-family: 'Press Start 2P', monospace;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
}

.stat-trend, .stat-comparison {
  font-size: 0.8rem;
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.stat-progress {
  margin-top: 1rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ff00, #00cc00);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Graphiques de performance */
.performance-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
}

.chart-container {
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(0, 255, 0, 0.2);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
}

.chart-title {
  color: #00ff00;
  margin-bottom: 1.5rem;
  font-family: 'Press Start 2P', monospace;
  font-size: 1rem;
  text-align: center;
}

.score-chart {
  width: 100%;
  height: 200px;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radar-stats {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.radar-stat {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.radar-stat .label {
  width: 100px;
  font-size: 0.9rem;
  font-weight: 500;
}

.radar-bar {
  flex: 1;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.radar-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ff00, #00cc00);
  border-radius: 6px;
  transition: width 0.5s ease;
}

.radar-fill.improvement {
  background: linear-gradient(90deg, #ffaa00, #ff8800);
}

.radar-fill.endurance {
  background: linear-gradient(90deg, #0088ff, #0066cc);
}

.radar-stat .value {
  width: 50px;
  text-align: right;
  font-weight: bold;
  color: #00ff00;
}

/* Historique amélioré */
.enhanced-history {
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(0, 255, 0, 0.3);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-title {
  color: #00ff00;
  font-family: 'Press Start 2P', monospace;
  font-size: 1.2rem;
}

.history-filters {
  display: flex;
  gap: 1rem;
}

.filter-select {
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.filter-select:focus {
  outline: none;
  border-color: #00ff00;
}

.scores-table-enhanced {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 60px 2fr 2fr 120px 120px 100px;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 255, 0, 0.1);
  border-bottom: 2px solid rgba(0, 255, 0, 0.3);
  font-weight: bold;
  font-size: 0.9rem;
}

.game-row {
  display: grid;
  grid-template-columns: 60px 2fr 2fr 120px 120px 100px;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 0.2s ease;
  align-items: center;
}

.game-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.game-row.record-row {
  background: rgba(255, 215, 0, 0.1);
  border-left: 4px solid gold;
}

.game-row.recent-row {
  background: rgba(0, 255, 0, 0.05);
}

.col-rank {
  text-align: center;
  font-weight: bold;
  font-size: 1.1rem;
}

.score-main {
  font-family: 'Press Start 2P', monospace;
  color: #00ff00;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.score-details {
  font-size: 0.8rem;
  opacity: 0.8;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.combo-badge {
  background: rgba(255, 69, 0, 0.3);
  border: 1px solid rgba(255, 69, 0, 0.5);
  border-radius: 12px;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  color: #ff4500;
}

.performance-indicators {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.indicator-icon {
  font-size: 0.9rem;
}

.indicator-value {
  font-weight: bold;
  color: #00ff00;
}

.duration-main {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.duration-details {
  font-size: 0.8rem;
  opacity: 0.7;
}

.date-main {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.date-relative {
  font-size: 0.8rem;
  opacity: 0.6;
}

.col-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.action-btn:hover {
  background: rgba(0, 255, 0, 0.2);
  border-color: #00ff00;
}

/* Achievements améliorés */
.achievements-enhanced {
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(0, 255, 0, 0.3);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
}

.achievements-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.achievement-progress {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.category-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.category-tab {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.category-tab:hover {
  border-color: #00ff00;
  background: rgba(0, 255, 0, 0.1);
}

.category-tab.active {
  background: linear-gradient(45deg, #00ff00, #00cc00);
  border-color: #00ff00;
  color: #000;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.achievement-card-enhanced {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.achievement-card-enhanced::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.achievement-card-enhanced:hover::before {
  left: 100%;
}

.achievement-card-enhanced.unlocked {
  border-color: rgba(0, 255, 0, 0.5);
  background: rgba(0, 255, 0, 0.05);
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
}

.achievement-card-enhanced.near-unlock {
  border-color: rgba(255, 165, 0, 0.5);
  background: rgba(255, 165, 0, 0.05);
}

.achievement-icon-large {
  font-size: 3rem;
  flex-shrink: 0;
  filter: grayscale(100%);
  transition: filter 0.3s ease;
}

.achievement-card-enhanced.unlocked .achievement-icon-large {
  filter: grayscale(0%);
}

.achievement-content {
  flex: 1;
}

.achievement-name {
  color: #00ff00;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  font-weight: bold;
}

.achievement-description {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.achievement-progress-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.progress-track {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-text {
  font-size: 0.8rem;
  font-weight: bold;
  color: #00ff00;
  width: 50px;
  text-align: right;
}

.achievement-unlock-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.unlock-badge {
  background: rgba(0, 255, 0, 0.2);
  border: 1px solid rgba(0, 255, 0, 0.5);
  border-radius: 12px;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  color: #00ff00;
}

.unlock-date {
  font-size: 0.8rem;
  opacity: 0.6;
}

.achievement-reward {
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid rgba(255, 215, 0, 0.5);
  border-radius: 8px;
  padding: 0.5rem;
  font-size: 0.8rem;
  color: #ffd700;
  margin-top: 0.5rem;
}

/* Outils avancés */
.advanced-tools {
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(0, 255, 0, 0.3);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.tool-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
}

.tool-card:hover {
  border-color: rgba(0, 255, 0, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 255, 0, 0.15);
}

.tool-card h4 {
  color: #00ff00;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.tool-card p {
  margin-bottom: 1.5rem;
  opacity: 0.8;
  line-height: 1.4;
}

.tool-button {
  background: linear-gradient(45deg, #00ff00, #00cc00);
  border: none;
  color: #000;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.8rem;
}

.tool-button:hover {
  background: linear-gradient(45deg, #00cc00, #009900);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 255, 0, 0.4);
}

/* Actions principales */
.main-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  padding: 2rem 0;
}

.game-button {
  background: linear-gradient(45deg, #00ff00, #00cc00);
  border: 2px solid #00ff00;
  color: #000;
  padding: 1rem 2rem;
  border-radius: 12px;
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.9rem;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  font-weight: bold;
}

.game-button:hover {
  background: linear-gradient(45deg, #00cc00, #009900);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 255, 0, 0.4);
}

.game-button.secondary {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
}

.game-button.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #00ff00;
  color: #00ff00;
  box-shadow: 0 6px 12px rgba(255, 255, 255, 0.2);
}

.game-button.danger {
  background: linear-gradient(45deg, #ff4444, #cc0000);
  border-color: #ff4444;
  color: white;
}

.game-button.danger:hover {
  background: linear-gradient(45deg, #cc0000, #990000);
  box-shadow: 0 6px 12px rgba(255, 68, 68, 0.4);
}

/* Modals améliorées */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal, .modal-large {
  background: rgba(0, 20, 0, 0.95);
  border: 2px solid #00ff00;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideIn 0.3s ease;
  backdrop-filter: blur(20px);
}

.modal-large {
  max-width: 800px;
  width: 95%;
}

@keyframes slideIn {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 2rem 1rem;
  border-bottom: 2px solid rgba(0, 255, 0, 0.3);
}

.modal-header h3 {
  color: #00ff00;
  margin: 0;
  font-family: 'Press Start 2P', monospace;
  font-size: 1.1rem;
}

.close-btn {
  background: none;
  border: none;
  color: #ff4444;
  font-size: 2rem;
  cursor: pointer;
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 68, 68, 0.2);
  transform: rotate(90deg);
}

.modal-content {
  padding: 2rem;
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
  transition: border-color 0.3s ease;
}

.import-textarea:focus {
  outline: none;
  border-color: #00ff00;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
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
  margin: 1rem 0;
}

.reset-list {
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid rgba(255, 68, 68, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

.reset-list li {
  margin: 0.5rem 0;
  color: #ff6666;
}

/* Détails de partie */
.game-details-content {
  padding: 2rem;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.detail-section {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
}

.detail-section h4 {
  color: #00ff00;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-stat:last-child {
  border-bottom: none;
}

.detail-stat .label {
  opacity: 0.8;
  font-size: 0.9rem;
}

.detail-stat .value {
  font-weight: bold;
  color: #00ff00;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.8rem;
}

.details-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* Rapport analytique */
.analytics-report {
  padding: 2rem;
  max-height: 60vh;
  overflow-y: auto;
}

.report-section {
  margin-bottom: 3rem;
}

.report-section h4 {
  color: #00ff00;
  margin-bottom: 1.5rem;
  font-size: 1.2rem;
  font-family: 'Press Start 2P', monospace;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.analytics-chart {
  width: 100%;
  height: 300px;
  min-height: 200px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(0, 255, 0, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.comparison-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
}

.comparison-card h5 {
  color: #00ff00;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.comparison-data {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.data-point {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.data-point .label {
  opacity: 0.8;
}

.data-point .value {
  font-weight: bold;
  color: #00ff00;
}

.recommendations {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recommendation-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.recommendation-card:hover {
  border-color: rgba(0, 255, 0, 0.5);
  background: rgba(0, 255, 0, 0.05);
}

.recommendation-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.recommendation-content h5 {
  color: #00ff00;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.recommendation-content p {
  opacity: 0.8;
  line-height: 1.4;
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

.no-scores h4 {
  margin-bottom: 1rem;
  color: #00ff00;
}

.no-scores p {
  margin-bottom: 2rem;
  opacity: 0.8;
}

/* Responsive */
@media (max-width: 768px) {
  .scores-page {
    padding: 1rem;
  }

  .page-title {
    font-size: 2.5rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }

  .game-selector-enhanced {
    grid-template-columns: 1fr;
  }

  .main-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .stat-card {
    padding: 1.5rem;
  }

  .stat-value {
    font-size: 2rem;
  }

  .performance-charts {
    grid-template-columns: 1fr;
  }

  .chart-container {
    padding: 1rem;
  }

  .score-chart,
  .analytics-chart {
    height: 150px;
  }

  .table-header,
  .game-row {
    grid-template-columns: 40px 2fr 1fr;
    font-size: 0.8rem;
  }

  .col-analytics,
  .col-duration,
  .col-actions {
    display: none;
  }

  .achievements-grid {
    grid-template-columns: 1fr;
  }

  .achievement-card-enhanced {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .tools-grid {
    grid-template-columns: 1fr;
  }

  .main-actions {
    flex-direction: column;
    align-items: center;
  }

  .game-button {
    width: 100%;
    max-width: 300px;
  }

  .modal, .modal-large {
    width: 95%;
    margin: 1rem;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-content {
    padding: 1rem;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .comparison-grid {
    grid-template-columns: 1fr;
  }

  .history-header {
    flex-direction: column;
    align-items: stretch;
  }

  .history-filters {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 2rem;
  }

  .main-stats {
    grid-template-columns: 1fr;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .score-chart,
  .analytics-chart {
    height: 120px;
  }

  .table-header,
  .game-row {
    grid-template-columns: 30px 1fr;
    gap: 0.5rem;
  }

  .col-score .score-details,
  .col-duration,
  .col-date {
    display: none;
  }

  .category-tabs {
    flex-direction: column;
  }

  .achievement-card-enhanced {
    padding: 1rem;
  }

  .achievement-icon-large {
    font-size: 2rem;
  }
}

/* Animations supplémentaires */
@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.2); }
  50% { box-shadow: 0 0 30px rgba(0, 255, 0, 0.4); }
}

.stat-card.primary:hover {
  animation: glow 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.achievement-card-enhanced.near-unlock {
  animation: pulse 2s infinite;
}

/* Scrollbar personnalisée */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #00ff00, #00cc00);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #00cc00, #009900);
}
</style>