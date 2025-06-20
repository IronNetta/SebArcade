// composables/games/useScore.js
import { ref, computed, readonly, onMounted, onUnmounted, watch } from 'vue'

export const useScore = (gameId, options = {}) => {
    // Configuration par défaut avec possibilité de surcharge
    const defaultConfig = {
        comboTimeout: 3000,
        comboMultiplier: 0.1,
        levelThreshold: 1000,
        maxMultiplier: 5,
        maxHistorySize: 100,
        autoSave: true,
        achievements: true,
        analytics: true
    }

    const config = ref({ ...defaultConfig, ...options })

    // État principal du score
    const gameState = ref({
        currentScore: 0,
        highScore: 0,
        totalScore: 0,
        isNewRecord: false,
        gameStartTime: Date.now(),
        gameEndTime: null,
        isGameActive: false
    })

    // Système de combo avancé
    const comboState = ref({
        count: 0,
        multiplier: 1,
        maxCombo: 0,
        lastActionTime: 0,
        timer: null,
        streak: 0 // Actions consécutives réussies
    })

    // Système de niveau et progression
    const progressState = ref({
        level: 1,
        xp: 0,
        xpToNextLevel: 1000,
        maxLevel: 1,
        skillPoints: 0
    })

    // Historique et statistiques
    const historyData = ref({
        scores: [],
        sessions: [],
        achievements: new Set(),
        stats: {
            totalGames: 0,
            totalPlayTime: 0,
            averageScore: 0,
            bestSession: null,
            winStreak: 0,
            currentStreak: 0
        }
    })

    // Performance et analytics
    const analytics = ref({
        actionsPerMinute: 0,
        accuracy: 100,
        peakPerformance: 0,
        consistencyScore: 0,
        improvementRate: 0
    })

    // Événements et callbacks
    const events = ref({
        onScoreChange: [],
        onLevelUp: [],
        onAchievement: [],
        onComboBreak: [],
        onNewRecord: []
    })

    // Utilitaires de stockage avec gestion d'erreurs robuste
    const storage = {
        save: (key, data) => {
            if (!config.value.autoSave) return false

            try {
                const serialized = JSON.stringify(data)
                localStorage.setItem(`${gameId}-${key}`, serialized)
                return true
            } catch (error) {
                console.warn(`Erreur sauvegarde ${key}:`, error)
                // Tentative de nettoyage si quota dépassé
                if (error.name === 'QuotaExceededError') {
                    this.cleanup()
                    try {
                        localStorage.setItem(`${gameId}-${key}`, JSON.stringify(data))
                        return true
                    } catch (retryError) {
                        console.error('Impossible de sauvegarder après nettoyage:', retryError)
                    }
                }
                return false
            }
        },

        load: (key, defaultValue = null) => {
            try {
                const data = localStorage.getItem(`${gameId}-${key}`)
                return data ? JSON.parse(data) : defaultValue
            } catch (error) {
                console.warn(`Erreur chargement ${key}:`, error)
                return defaultValue
            }
        },

        remove: (key) => {
            try {
                localStorage.removeItem(`${gameId}-${key}`)
                return true
            } catch (error) {
                console.warn(`Erreur suppression ${key}:`, error)
                return false
            }
        },

        cleanup: () => {
            // Nettoie les anciens scores pour libérer de l'espace
            const scores = historyData.value.scores
            if (scores.length > config.value.maxHistorySize) {
                historyData.value.scores = scores
                    .sort((a, b) => b.score - a.score)
                    .slice(0, config.value.maxHistorySize)

                this.save('scores', historyData.value.scores)
            }
        }
    }

    // Système d'événements amélioré
    const emit = (eventName, data) => {
        const handlers = events.value[eventName] || []
        handlers.forEach(handler => {
            try {
                handler(data)
            } catch (error) {
                console.error(`Erreur dans le handler ${eventName}:`, error)
            }
        })
    }

    const on = (eventName, handler) => {
        if (!events.value[eventName]) {
            events.value[eventName] = []
        }
        events.value[eventName].push(handler)

        // Retourne une fonction pour supprimer l'écouteur
        return () => {
            const index = events.value[eventName].indexOf(handler)
            if (index > -1) {
                events.value[eventName].splice(index, 1)
            }
        }
    }

    // Calculs avancés de score
    const calculatePoints = (basePoints, options = {}) => {
        if (basePoints <= 0) return 0

        let finalPoints = basePoints

        // Application du multiplicateur de combo
        finalPoints *= comboState.value.multiplier

        // Bonus de niveau
        const levelBonus = 1 + (progressState.value.level - 1) * 0.05
        finalPoints *= levelBonus

        // Bonus de précision/performance
        if (options.accuracy) {
            const accuracyBonus = Math.max(0.5, options.accuracy / 100)
            finalPoints *= accuracyBonus
        }

        // Bonus de vitesse
        if (options.speed) {
            const speedBonus = Math.min(2, options.speed / 100)
            finalPoints *= speedBonus
        }

        // Bonus de difficulté
        if (options.difficulty) {
            finalPoints *= options.difficulty
        }

        return Math.floor(finalPoints)
    }

    // Gestion avancée des combos
    const updateCombo = (successful = true, points = 0) => {
        const now = Date.now()

        if (successful) {
            comboState.value.count++
            comboState.value.streak++
            comboState.value.lastActionTime = now

            // Calcul du multiplicateur avec courbe de progression
            const baseMultiplier = 1 + (comboState.value.count * config.value.comboMultiplier)
            const diminishingReturns = Math.pow(0.95, Math.max(0, comboState.value.count - 10))
            comboState.value.multiplier = Math.min(
                baseMultiplier * diminishingReturns,
                config.value.maxMultiplier
            )

            // Mise à jour du record de combo
            if (comboState.value.count > comboState.value.maxCombo) {
                comboState.value.maxCombo = comboState.value.count
            }

            // Reset du timer de combo
            if (comboState.value.timer) {
                clearTimeout(comboState.value.timer)
            }

            comboState.value.timer = setTimeout(() => {
                resetCombo()
            }, config.value.comboTimeout)

        } else {
            // Combo cassé
            const previousCombo = comboState.value.count
            resetCombo()

            if (previousCombo >= 5) {
                emit('onComboBreak', {
                    combo: previousCombo,
                    pointsLost: points * 0.1
                })
            }
        }
    }

    const resetCombo = () => {
        const wasComboActive = comboState.value.count > 0

        comboState.value.count = 0
        comboState.value.multiplier = 1
        comboState.value.streak = 0
        comboState.value.lastActionTime = 0

        if (comboState.value.timer) {
            clearTimeout(comboState.value.timer)
            comboState.value.timer = null
        }

        if (wasComboActive) {
            emit('onComboBreak', { combo: 0 })
        }
    }

    // Système de niveau et XP
    const addExperience = (xp) => {
        progressState.value.xp += xp

        while (progressState.value.xp >= progressState.value.xpToNextLevel) {
            levelUp()
        }
    }

    const levelUp = () => {
        progressState.value.xp -= progressState.value.xpToNextLevel
        progressState.value.level++
        progressState.value.skillPoints++

        // Mise à jour du niveau max
        if (progressState.value.level > progressState.value.maxLevel) {
            progressState.value.maxLevel = progressState.value.level
        }

        // Calcul de l'XP nécessaire pour le niveau suivant (progression exponentielle)
        progressState.value.xpToNextLevel = Math.floor(
            config.value.levelThreshold * Math.pow(1.2, progressState.value.level - 1)
        )

        emit('onLevelUp', {
            level: progressState.value.level,
            skillPoints: progressState.value.skillPoints
        })

        // Vérification des achievements de niveau
        checkLevelAchievements()
    }

    // Ajout de points principal avec logique complète
    const addPoints = (basePoints, options = {}) => {
        if (!gameState.value.isGameActive || basePoints <= 0) return 0

        const finalPoints = calculatePoints(basePoints, options)

        // Mise à jour du score
        const previousScore = gameState.value.currentScore
        gameState.value.currentScore += finalPoints
        gameState.value.totalScore += finalPoints

        // Gestion du combo
        updateCombo(options.combo !== false, finalPoints)

        // Ajout d'XP (généralement 10% des points)
        addExperience(Math.floor(finalPoints * 0.1))

        // Vérification du nouveau record
        checkNewRecord()

        // Mise à jour des analytics
        updateAnalytics(finalPoints, options)

        // Vérification des achievements
        if (config.value.achievements) {
            checkScoreAchievements()
        }

        // Émission de l'événement
        emit('onScoreChange', {
            points: finalPoints,
            total: gameState.value.currentScore,
            previous: previousScore,
            multiplier: comboState.value.multiplier
        })

        return finalPoints
    }

    // Analytics et performance
    const updateAnalytics = (points, options) => {
        const now = Date.now()
        const gameTime = now - gameState.value.gameStartTime

        // Actions par minute
        analytics.value.actionsPerMinute = (gameState.value.currentScore / gameTime) * 60000

        // Performance de pointe
        if (points > analytics.value.peakPerformance) {
            analytics.value.peakPerformance = points
        }

        // Précision si fournie
        if (options.accuracy !== undefined) {
            analytics.value.accuracy = (analytics.value.accuracy + options.accuracy) / 2
        }
    }

    // Système d'achievements avancé
    const achievementDefinitions = {
        'first-score': {
            name: 'Premier Pas',
            description: 'Marquer vos premiers points',
            icon: '🎯',
            check: () => gameState.value.currentScore > 0
        },
        'combo-starter': {
            name: 'Combo Débutant',
            description: 'Faire un combo de 5',
            icon: '🔥',
            check: () => comboState.value.count >= 5
        },
        'combo-master': {
            name: 'Maître du Combo',
            description: 'Faire un combo de 20',
            icon: '⚡',
            check: () => comboState.value.count >= 20
        },
        'level-5': {
            name: 'Niveau 5',
            description: 'Atteindre le niveau 5',
            icon: '⭐',
            check: () => progressState.value.level >= 5
        },
        'score-1000': {
            name: 'Millionnaire',
            description: 'Atteindre 1000 points',
            icon: '💰',
            check: () => gameState.value.currentScore >= 1000
        },
        'perfectionist': {
            name: 'Perfectionniste',
            description: 'Maintenir 95% de précision',
            icon: '🎖️',
            check: () => analytics.value.accuracy >= 95
        },
        'speedster': {
            name: 'Éclair',
            description: 'Dépasser 100 actions/minute',
            icon: '💨',
            check: () => analytics.value.actionsPerMinute >= 100
        }
    }

    const checkAchievements = () => {
        const newAchievements = []

        Object.entries(achievementDefinitions).forEach(([id, achievement]) => {
            if (!historyData.value.achievements.has(id) && achievement.check()) {
                historyData.value.achievements.add(id)
                newAchievements.push({ id, ...achievement })

                emit('onAchievement', { id, ...achievement })
            }
        })

        return newAchievements
    }

    const checkScoreAchievements = () => checkAchievements()
    const checkLevelAchievements = () => checkAchievements()

    // Vérification du nouveau record
    const checkNewRecord = () => {
        if (gameState.value.currentScore > gameState.value.highScore) {
            const previousRecord = gameState.value.highScore
            gameState.value.highScore = gameState.value.currentScore
            gameState.value.isNewRecord = true

            emit('onNewRecord', {
                newRecord: gameState.value.currentScore,
                previousRecord
            })

            return true
        }
        return false
    }

    // Démarrage de partie
    const startGame = () => {
        gameState.value.isGameActive = true
        gameState.value.gameStartTime = Date.now()
        gameState.value.gameEndTime = null
        gameState.value.currentScore = 0
        gameState.value.isNewRecord = false

        resetCombo()

        // Reset analytics pour cette partie
        analytics.value.actionsPerMinute = 0
        analytics.value.accuracy = 100
        analytics.value.peakPerformance = 0
    }

    // Fin de partie
    const endGame = () => {
        if (!gameState.value.isGameActive) return null

        gameState.value.isGameActive = false
        gameState.value.gameEndTime = Date.now()

        const gameData = {
            id: Date.now(),
            score: gameState.value.currentScore,
            level: progressState.value.level,
            maxCombo: comboState.value.maxCombo,
            duration: gameState.value.gameEndTime - gameState.value.gameStartTime,
            date: new Date().toISOString(),
            analytics: { ...analytics.value },
            isRecord: gameState.value.isNewRecord
        }

        // Ajout à l'historique
        historyData.value.scores.unshift(gameData)
        historyData.value.stats.totalGames++
        historyData.value.stats.totalPlayTime += gameData.duration

        // Calcul de la moyenne
        const total = historyData.value.scores.reduce((sum, game) => sum + game.score, 0)
        historyData.value.stats.averageScore = Math.round(total / historyData.value.scores.length)

        // Mise à jour de la meilleure session
        if (!historyData.value.stats.bestSession || gameData.score > historyData.value.stats.bestSession.score) {
            historyData.value.stats.bestSession = gameData
        }

        // Gestion des streaks
        if (gameData.score > historyData.value.stats.averageScore) {
            historyData.value.stats.currentStreak++
            if (historyData.value.stats.currentStreak > historyData.value.stats.winStreak) {
                historyData.value.stats.winStreak = historyData.value.stats.currentStreak
            }
        } else {
            historyData.value.stats.currentStreak = 0
        }

        // Nettoyage de l'historique si nécessaire
        if (historyData.value.scores.length > config.value.maxHistorySize) {
            historyData.value.scores = historyData.value.scores.slice(0, config.value.maxHistorySize)
        }

        // Sauvegarde
        saveAllData()

        return gameData
    }

    // Système de sauvegarde complet
    const saveAllData = () => {
        storage.save('gameState', gameState.value)
        storage.save('progressState', progressState.value)
        storage.save('historyData', {
            ...historyData.value,
            achievements: Array.from(historyData.value.achievements)
        })
        storage.save('analytics', analytics.value)
    }

    const loadAllData = () => {
        // Chargement de l'état du jeu
        const savedGameState = storage.load('gameState', {})
        Object.assign(gameState.value, {
            ...gameState.value,
            ...savedGameState,
            isGameActive: false // Toujours démarrer inactif
        })

        // Chargement de la progression
        const savedProgressState = storage.load('progressState', {})
        Object.assign(progressState.value, savedProgressState)

        // Chargement de l'historique
        const savedHistoryData = storage.load('historyData', {})
        Object.assign(historyData.value, savedHistoryData)

        // Conversion des achievements en Set
        if (savedHistoryData.achievements && Array.isArray(savedHistoryData.achievements)) {
            historyData.value.achievements = new Set(savedHistoryData.achievements)
        }

        // Chargement des analytics
        const savedAnalytics = storage.load('analytics', {})
        Object.assign(analytics.value, savedAnalytics)
    }

    // Computed properties
    const progressToNextLevel = computed(() => {
        const progress = (progressState.value.xp / progressState.value.xpToNextLevel) * 100
        return Math.min(progress, 100)
    })

    const formattedScore = computed(() => {
        return gameState.value.currentScore.toLocaleString()
    })

    const gameTime = computed(() => {
        if (!gameState.value.isGameActive) return 0
        return Date.now() - gameState.value.gameStartTime
    })

    const comboTimeRemaining = computed(() => {
        if (!comboState.value.timer) return 0
        const elapsed = Date.now() - comboState.value.lastActionTime
        return Math.max(0, config.value.comboTimeout - elapsed)
    })

    // Watchers pour auto-save
    watch(gameState, saveAllData, { deep: true })
    watch(progressState, saveAllData, { deep: true })
    watch(historyData, saveAllData, { deep: true })

    // Initialisation et nettoyage
    onMounted(() => {
        loadAllData()
    })

    onUnmounted(() => {
        if (comboState.value.timer) {
            clearTimeout(comboState.value.timer)
        }
        saveAllData()
    })

    // API publique
    return {
        // État (readonly)
        currentScore: readonly(computed(() => gameState.value.currentScore)),
        highScore: readonly(computed(() => gameState.value.highScore)),
        totalScore: readonly(computed(() => gameState.value.totalScore)),
        isNewRecord: readonly(computed(() => gameState.value.isNewRecord)),
        isGameActive: readonly(computed(() => gameState.value.isGameActive)),

        // Combo
        combo: readonly(computed(() => comboState.value.count)),
        maxCombo: readonly(computed(() => comboState.value.maxCombo)),
        multiplier: readonly(computed(() => comboState.value.multiplier)),
        comboTimeRemaining,

        // Progression
        level: readonly(computed(() => progressState.value.level)),
        xp: readonly(computed(() => progressState.value.xp)),
        skillPoints: readonly(computed(() => progressState.value.skillPoints)),
        progressToNextLevel,

        // Statistiques
        stats: readonly(historyData.value.stats),
        analytics: readonly(analytics),
        gameTime,
        formattedScore,

        // Actions
        startGame,
        endGame,
        addPoints,
        addExperience,
        resetCombo,
        checkAchievements,

        // Événements
        on,
        emit,

        // Utilitaires
        saveAllData,
        loadAllData,
        exportData: () => ({
            gameId,
            gameState: gameState.value,
            progressState: progressState.value,
            historyData: {
                ...historyData.value,
                achievements: Array.from(historyData.value.achievements)
            },
            analytics: analytics.value,
            exportDate: new Date().toISOString()
        }),

        // Configuration
        config: readonly(config)
    }
}