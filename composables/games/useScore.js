// composables/games/useScore.js
export const useScore = (gameId) => {
    // État du score
    const currentScore = ref(0)
    const highScore = ref(0)
    const isNewRecord = ref(false)
    const scoreHistory = ref([])
    const multiplier = ref(1)
    const combo = ref(0)
    const level = ref(1)

    // Configuration
    const config = ref({
        comboTimeout: 3000, // 3 secondes pour maintenir le combo
        comboMultiplier: 0.1, // +10% par combo
        levelThreshold: 1000, // Points nécessaires pour passer au niveau suivant
        maxMultiplier: 5
    })

    // Timers
    let comboTimer = null
    let lastComboTime = 0

    // Charger les données sauvegardées
    const loadSavedData = () => {
        try {
            // High score
            const savedHighScore = localStorage.getItem(`${gameId}-high-score`)
            if (savedHighScore) {
                highScore.value = parseInt(savedHighScore)
            }

            // Historique des scores
            const savedHistory = localStorage.getItem(`${gameId}-score-history`)
            if (savedHistory) {
                scoreHistory.value = JSON.parse(savedHistory)
            }

            // Niveau débloqué
            const savedLevel = localStorage.getItem(`${gameId}-max-level`)
            if (savedLevel) {
                level.value = parseInt(savedLevel)
            }
        } catch (error) {
            console.warn('Erreur lors du chargement des scores:', error)
        }
    }

    // Sauvegarder les données
    const saveData = () => {
        try {
            localStorage.setItem(`${gameId}-high-score`, highScore.value.toString())
            localStorage.setItem(`${gameId}-score-history`, JSON.stringify(scoreHistory.value))
            localStorage.setItem(`${gameId}-max-level`, level.value.toString())
        } catch (error) {
            console.warn('Erreur lors de la sauvegarde des scores:', error)
        }
    }

    // Ajouter des points
    const addPoints = (points, options = {}) => {
        if (points <= 0) return

        const finalPoints = Math.floor(points * multiplier.value)
        currentScore.value += finalPoints

        // Gestion du combo
        if (options.combo) {
            increaseCombo()
        } else if (options.resetCombo) {
            resetCombo()
        }

        // Vérifier le niveau
        updateLevel()

        // Vérifier le nouveau record
        checkNewRecord()

        return finalPoints
    }

    // Gérer les combos
    const increaseCombo = () => {
        combo.value++
        lastComboTime = Date.now()

        // Augmenter le multiplicateur
        const newMultiplier = 1 + (combo.value * config.value.comboMultiplier)
        multiplier.value = Math.min(newMultiplier, config.value.maxMultiplier)

        // Reset du timer de combo
        if (comboTimer) {
            clearTimeout(comboTimer)
        }

        comboTimer = setTimeout(() => {
            resetCombo()
        }, config.value.comboTimeout)
    }

    const resetCombo = () => {
        combo.value = 0
        multiplier.value = 1
        lastComboTime = 0

        if (comboTimer) {
            clearTimeout(comboTimer)
            comboTimer = null
        }
    }

    // Mettre à jour le niveau
    const updateLevel = () => {
        const newLevel = Math.floor(currentScore.value / config.value.levelThreshold) + 1
        if (newLevel > level.value) {
            level.value = newLevel
            // Événement de montée de niveau
            return true
        }
        return false
    }

    // Vérifier nouveau record
    const checkNewRecord = () => {
        if (currentScore.value > highScore.value) {
            highScore.value = currentScore.value
            isNewRecord.value = true
            return true
        }
        return false
    }

    // Finaliser la partie
    const endGame = () => {
        // Ajouter à l'historique
        const gameData = {
            score: currentScore.value,
            level: level.value,
            combo: combo.value,
            date: new Date().toISOString(),
            duration: Date.now() - gameStartTime
        }

        scoreHistory.value.unshift(gameData)

        // Garder seulement les 50 derniers scores
        if (scoreHistory.value.length > 50) {
            scoreHistory.value = scoreHistory.value.slice(0, 50)
        }

        // Sauvegarder
        saveData()

        // Reset du combo
        resetCombo()

        return gameData
    }

    // Recommencer une partie
    const resetGame = () => {
        currentScore.value = 0
        isNewRecord.value = false
        resetCombo()
        gameStartTime = Date.now()
    }

    // Variables de temps
    let gameStartTime = Date.now()

    // Statistiques calculées
    const averageScore = computed(() => {
        if (scoreHistory.value.length === 0) return 0
        const total = scoreHistory.value.reduce((sum, game) => sum + game.score, 0)
        return Math.round(total / scoreHistory.value.length)
    })

    const totalGamesPlayed = computed(() => scoreHistory.value.length)

    const bestCombo = computed(() => {
        if (scoreHistory.value.length === 0) return 0
        return Math.max(...scoreHistory.value.map(game => game.combo || 0))
    })

    const progressToNextLevel = computed(() => {
        const currentLevelScore = (level.value - 1) * config.value.levelThreshold
        const nextLevelScore = level.value * config.value.levelThreshold
        const progress = currentScore.value - currentLevelScore
        const total = nextLevelScore - currentLevelScore

        return Math.min((progress / total) * 100, 100)
    })

    // Système de bonus
    const applyBonus = (type, value = 1) => {
        switch (type) {
            case 'double':
                return addPoints(currentScore.value) // Double le score actuel
            case 'multiplier':
                multiplier.value = Math.min(multiplier.value * value, config.value.maxMultiplier)
                break
            case 'instant':
                return addPoints(value)
            case 'combo':
                increaseCombo()
                break
        }
    }

    // Formatage du score
    const formatScore = (score) => {
        return score.toLocaleString()
    }

    const formatTime = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000)
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60

        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    // Exporter les statistiques
    const getStats = () => {
        return {
            currentScore: currentScore.value,
            highScore: highScore.value,
            averageScore: averageScore.value,
            totalGames: totalGamesPlayed.value,
            bestCombo: bestCombo.value,
            level: level.value,
            history: scoreHistory.value.slice(0, 10) // 10 derniers scores
        }
    }

    // Importer/Exporter des données
    const exportData = () => {
        return {
            gameId,
            highScore: highScore.value,
            scoreHistory: scoreHistory.value,
            level: level.value,
            exportDate: new Date().toISOString()
        }
    }

    const importData = (data) => {
        try {
            if (data.gameId === gameId) {
                highScore.value = Math.max(highScore.value, data.highScore || 0)
                level.value = Math.max(level.value, data.level || 1)

                // Fusionner l'historique
                if (data.scoreHistory) {
                    const mergedHistory = [...scoreHistory.value, ...data.scoreHistory]
                    // Supprimer les doublons et trier par date
                    const uniqueHistory = mergedHistory
                        .filter((game, index, arr) =>
                            arr.findIndex(g => g.date === game.date) === index
                        )
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .slice(0, 50)

                    scoreHistory.value = uniqueHistory
                }

                saveData()
                return true
            }
        } catch (error) {
            console.error('Erreur lors de l\'importation:', error)
        }
        return false
    }

    // Achievements/Succès basiques
    const checkAchievements = () => {
        const achievements = []

        if (currentScore.value >= 1000 && !hasAchievement('first-1000')) {
            achievements.push({ id: 'first-1000', name: 'Premier Millier', description: 'Atteindre 1000 points' })
        }

        if (combo.value >= 10 && !hasAchievement('combo-master')) {
            achievements.push({ id: 'combo-master', name: 'Maître du Combo', description: 'Faire un combo de 10' })
        }

        if (level.value >= 5 && !hasAchievement('level-5')) {
            achievements.push({ id: 'level-5', name: 'Niveau 5', description: 'Atteindre le niveau 5' })
        }

        return achievements
    }

    const hasAchievement = (achievementId) => {
        const saved = localStorage.getItem(`${gameId}-achievements`)
        if (saved) {
            const achievements = JSON.parse(saved)
            return achievements.includes(achievementId)
        }
        return false
    }

    const unlockAchievement = (achievementId) => {
        let achievements = []
        const saved = localStorage.getItem(`${gameId}-achievements`)
        if (saved) {
            achievements = JSON.parse(saved)
        }

        if (!achievements.includes(achievementId)) {
            achievements.push(achievementId)
            localStorage.setItem(`${gameId}-achievements`, JSON.stringify(achievements))
            return true
        }
        return false
    }

    // Initialisation
    onMounted(() => {
        loadSavedData()
        gameStartTime = Date.now()
    })

    // Nettoyage
    onUnmounted(() => {
        if (comboTimer) {
            clearTimeout(comboTimer)
        }
    })

    return {
        // État
        currentScore: readonly(currentScore),
        highScore: readonly(highScore),
        isNewRecord: readonly(isNewRecord),
        combo: readonly(combo),
        multiplier: readonly(multiplier),
        level: readonly(level),

        // Statistiques calculées
        averageScore,
        totalGamesPlayed,
        bestCombo,
        progressToNextLevel,

        // Actions
        addPoints,
        increaseCombo,
        resetCombo,
        applyBonus,
        endGame,
        resetGame,

        // Utilitaires
        formatScore,
        formatTime,
        getStats,
        exportData,
        importData,

        // Achievements
        checkAchievements,
        unlockAchievement,
        hasAchievement,

        // Configuration
        config
    }
}