<template>
  <div class="breakout-page">
    <div class="game-header">
      <NuxtLink to="/games" class="back-link">
        ← Retour aux jeux
      </NuxtLink>
      <h1 class="game-title retro-font neon-text">
        🏓 BREAKOUT
      </h1>
      <div class="game-info">
        <span class="difficulty">★★☆</span>
        <span class="category">Arcade Classique</span>
      </div>
    </div>

    <BreakoutGame />
  </div>
</template>

<script setup>
// Configuration de la page
useHead({
  title: '🏓 Breakout - Nuxt Arcade',
  meta: [
    {
      name: 'description',
      content: 'Le classique Breakout - cassez toutes les briques avec votre balle rebondissante !'
    }
  ]
})
</script>

<style scoped>
.breakout-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  background: linear-gradient(135deg, #001122 0%, #000000 100%);
  min-height: 100vh;
}

.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.back-link {
  color: #00ff00;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: 2px solid #00ff00;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  background: rgba(0, 255, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.back-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 0, 0.2), transparent);
  transition: left 0.5s;
}

.back-link:hover::before {
  left: 100%;
}

.back-link:hover {
  background: rgba(0, 255, 0, 0.2);
  transform: translateY(-2px);
  box-shadow:
      0 4px 8px rgba(0, 255, 0, 0.3),
      0 0 20px rgba(0, 255, 0, 0.1);
}

.game-title {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  text-align: center;
  flex: 1;
  color: #00ff00;
  text-shadow:
      0 0 10px #00ff00,
      0 0 20px #00ff00,
      0 0 30px #00ff00;
  animation: neonGlow 2s ease-in-out infinite alternate;
  position: relative;
}

.game-title::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
  animation: shine 3s infinite;
  pointer-events: none;
}

.game-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.difficulty {
  color: #ffff00;
  text-shadow: 0 0 10px #ffff00;
  animation: starTwinkle 1.5s infinite;
}

.category {
  color: #00ff00;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Animations */
@keyframes neonGlow {
  from {
    text-shadow:
        0 0 10px #00ff00,
        0 0 20px #00ff00,
        0 0 30px #00ff00;
  }
  to {
    text-shadow:
        0 0 5px #00ff00,
        0 0 15px #00ff00,
        0 0 25px #00ff00,
        0 0 35px #00ff00;
  }
}

@keyframes shine {
  0% {
    transform: translateX(-100%) skewX(-15deg);
  }
  100% {
    transform: translateX(100%) skewX(-15deg);
  }
}

@keyframes starTwinkle {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .breakout-page {
    padding: 1rem;
  }

  .game-header {
    flex-direction: column;
    text-align: center;
    gap: 1.5rem;
  }

  .back-link {
    align-self: flex-start;
    font-size: 10px;
  }

  .game-title {
    font-size: clamp(1.2rem, 5vw, 2rem);
  }
}

@media (max-width: 480px) {
  .breakout-page {
    padding: 0.5rem;
  }

  .game-header {
    margin-bottom: 1rem;
  }

  .back-link {
    font-size: 9px;
    padding: 0.4rem 0.8rem;
  }

  .game-info {
    font-size: 9px;
  }
}

/* Effets spéciaux pour la page */
.breakout-page::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:
      radial-gradient(circle at 20% 80%, rgba(0, 255, 0, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 255, 0, 0.1) 0%, transparent 50%);
  pointer-events: none;
  z-index: -1;
}

/* Surbrillance rétro */
.retro-font {
  font-family: 'Press Start 2P', monospace;
}

.neon-text {
  position: relative;
}

.neon-text::before {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  color: #00ff00;
  filter: blur(0.02em);
  z-index: -1;
}
</style>