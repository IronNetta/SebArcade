// composables/games/useKeyboard.js
export const useKeyboard = () => {
    const pressedKeys = ref(new Set())
    const keyEvents = ref([])

    // État des touches directionnelles
    const arrows = computed(() => ({
        up: pressedKeys.value.has('ArrowUp'),
        down: pressedKeys.value.has('ArrowDown'),
        left: pressedKeys.value.has('ArrowLeft'),
        right: pressedKeys.value.has('ArrowRight')
    }))

    // État des touches WASD
    const wasd = computed(() => ({
        up: pressedKeys.value.has('KeyW'),
        down: pressedKeys.value.has('KeyS'),
        left: pressedKeys.value.has('KeyA'),
        right: pressedKeys.value.has('KeyD')
    }))

    // État des touches d'action
    const actions = computed(() => ({
        space: pressedKeys.value.has('Space'),
        enter: pressedKeys.value.has('Enter'),
        escape: pressedKeys.value.has('Escape'),
        shift: pressedKeys.value.has('ShiftLeft') || pressedKeys.value.has('ShiftRight'),
        ctrl: pressedKeys.value.has('ControlLeft') || pressedKeys.value.has('ControlRight')
    }))

    // Gestionnaires d'événements
    const handleKeyDown = (event) => {
        const key = event.code || event.key

        // Empêcher le comportement par défaut pour les touches de jeu
        if (isGameKey(key)) {
            event.preventDefault()
        }

        // Ajouter la touche aux touches pressées
        if (!pressedKeys.value.has(key)) {
            pressedKeys.value.add(key)

            // Ajouter l'événement à la file
            keyEvents.value.push({
                type: 'keydown',
                key,
                timestamp: Date.now()
            })
        }
    }

    const handleKeyUp = (event) => {
        const key = event.code || event.key

        // Empêcher le comportement par défaut pour les touches de jeu
        if (isGameKey(key)) {
            event.preventDefault()
        }

        // Retirer la touche des touches pressées
        pressedKeys.value.delete(key)

        // Ajouter l'événement à la file
        keyEvents.value.push({
            type: 'keyup',
            key,
            timestamp: Date.now()
        })
    }

    // Vérifier si une touche est une touche de jeu
    const isGameKey = (key) => {
        const gameKeys = [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'KeyW', 'KeyA', 'KeyS', 'KeyD',
            'Space', 'Enter', 'Escape'
        ]
        return gameKeys.includes(key)
    }

    // Méthodes utilitaires
    const isKeyPressed = (key) => pressedKeys.value.has(key)

    const wasKeyJustPressed = (key) => {
        return keyEvents.value.some(event =>
            event.type === 'keydown' &&
            event.key === key &&
            Date.now() - event.timestamp < 100 // Dans les 100ms
        )
    }

    const wasKeyJustReleased = (key) => {
        return keyEvents.value.some(event =>
            event.type === 'keyup' &&
            event.key === key &&
            Date.now() - event.timestamp < 100 // Dans les 100ms
        )
    }

    // Nettoyer les anciens événements
    const clearOldEvents = () => {
        const now = Date.now()
        keyEvents.value = keyEvents.value.filter(event =>
            now - event.timestamp < 500 // Garder les événements des 500ms
        )
    }

    // Réinitialiser l'état
    const reset = () => {
        pressedKeys.value.clear()
        keyEvents.value = []
    }

    // Activer/désactiver l'écoute du clavier
    const enable = () => {
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
    }

    const disable = () => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
        reset()
    }

    // Configuration spécifique pour un élément
    const bindToElement = (element) => {
        if (!element) return

        element.addEventListener('keydown', handleKeyDown)
        element.addEventListener('keyup', handleKeyUp)

        // S'assurer que l'élément peut recevoir le focus
        if (element.tabIndex === -1) {
            element.tabIndex = 0
        }

        return () => {
            element.removeEventListener('keydown', handleKeyDown)
            element.removeEventListener('keyup', handleKeyUp)
        }
    }

    // Raccourcis pour les directions combinées
    const getDirection = () => {
        const dir = { x: 0, y: 0 }

        // Utiliser les flèches ou WASD
        if (arrows.value.left || wasd.value.left) dir.x -= 1
        if (arrows.value.right || wasd.value.right) dir.x += 1
        if (arrows.value.up || wasd.value.up) dir.y -= 1
        if (arrows.value.down || wasd.value.down) dir.y += 1

        return dir
    }

    // Détecter les combinaisons de touches
    const isComboPressed = (keys) => {
        return keys.every(key => pressedKeys.value.has(key))
    }

    // Gestion des touches personnalisées
    const customBindings = ref(new Map())

    const bindKey = (key, callback, options = {}) => {
        const binding = {
            callback,
            once: options.once || false,
            preventDefault: options.preventDefault !== false
        }

        customBindings.value.set(key, binding)
    }

    const unbindKey = (key) => {
        customBindings.value.delete(key)
    }

    // Traiter les touches personnalisées
    const processCustomBindings = () => {
        for (const event of keyEvents.value) {
            if (event.type === 'keydown') {
                const binding = customBindings.value.get(event.key)
                if (binding) {
                    binding.callback(event)

                    if (binding.once) {
                        customBindings.value.delete(event.key)
                    }
                }
            }
        }
    }

    // Auto-nettoyer les événements dans un interval
    let cleanupInterval = null

    const startAutoCleanup = () => {
        cleanupInterval = setInterval(() => {
            clearOldEvents()
            processCustomBindings()
        }, 100)
    }

    const stopAutoCleanup = () => {
        if (cleanupInterval) {
            clearInterval(cleanupInterval)
            cleanupInterval = null
        }
    }

    // Lifecycle
    onMounted(() => {
        enable()
        startAutoCleanup()
    })

    onUnmounted(() => {
        disable()
        stopAutoCleanup()
    })

    return {
        // État des touches
        pressedKeys: readonly(pressedKeys),
        arrows: readonly(arrows),
        wasd: readonly(wasd),
        actions: readonly(actions),

        // Méthodes utilitaires
        isKeyPressed,
        wasKeyJustPressed,
        wasKeyJustReleased,
        getDirection,
        isComboPressed,

        // Gestion des événements
        bindKey,
        unbindKey,
        bindToElement,

        // Contrôle
        enable,
        disable,
        reset,
        clearOldEvents
    }
}
