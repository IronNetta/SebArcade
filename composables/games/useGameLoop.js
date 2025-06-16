// composables/games/useGameLoop.js
export const useGameLoop = (updateFunction, fps = 60) => {
    const isRunning = ref(false)
    const frameCount = ref(0)
    const lastFrameTime = ref(0)
    const deltaTime = ref(0)
    const actualFPS = ref(0)

    let animationFrameId = null
    let fpsCounter = 0
    let fpsLastTime = 0

    // Calculer l'intervalle de frame souhaité
    const targetFrameTime = 1000 / fps

    // Fonction principale de la boucle
    const gameLoop = (currentTime) => {
        if (!isRunning.value) return

        // Calculer le delta time
        deltaTime.value = currentTime - lastFrameTime.value
        lastFrameTime.value = currentTime

        // Limiter les FPS si nécessaire
        if (deltaTime.value >= targetFrameTime) {
            // Exécuter la fonction de mise à jour du jeu
            updateFunction(deltaTime.value)

            frameCount.value++

            // Calculer les FPS actuels
            fpsCounter++
            if (currentTime - fpsLastTime >= 1000) {
                actualFPS.value = fpsCounter
                fpsCounter = 0
                fpsLastTime = currentTime
            }
        }

        // Programmer la prochaine frame
        animationFrameId = requestAnimationFrame(gameLoop)
    }

    // Démarrer la boucle
    const start = () => {
        if (isRunning.value) return

        isRunning.value = true
        lastFrameTime.value = performance.now()
        fpsLastTime = performance.now()
        animationFrameId = requestAnimationFrame(gameLoop)
    }

    // Arrêter la boucle
    const stop = () => {
        isRunning.value = false
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId)
            animationFrameId = null
        }
    }

    // Mettre en pause / reprendre
    const pause = () => {
        if (isRunning.value) {
            stop()
        } else {
            start()
        }
    }

    // Reset
    const reset = () => {
        stop()
        frameCount.value = 0
        deltaTime.value = 0
        actualFPS.value = 0
    }

    // Nettoyer lors de la destruction du composant
    onUnmounted(() => {
        stop()
    })

    return {
        isRunning: readonly(isRunning),
        frameCount: readonly(frameCount),
        deltaTime: readonly(deltaTime),
        actualFPS: readonly(actualFPS),
        start,
        stop,
        pause,
        reset
    }
}