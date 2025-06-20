<template>
  <div class="pong-page">
    <div class="game-header">
      <NuxtLink to="/games" class="back-link">
        ← Retour aux jeux
      </NuxtLink>
      <h1 class="game-title retro-font neon-text">
        🏓 PONG GAME
      </h1>
    </div>

    <PongGame />
  </div>
</template>

<script setup>
// Configuration de la page
import PongGame from "~/components/games/PongGame.vue";

useHead({
  title: '🏓 Pong Game - SebArcade',
  meta: [
    { name: 'description', content: 'Jouez au classique Pong dans votre navigateur' }
  ]
})
</script>

<style scoped>
.pong-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
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
}

.back-link:hover {
  background: rgba(0, 255, 0, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 255, 0, 0.3);
}

.game-title {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  text-align: center;
  flex: 1;
}

@media (max-width: 768px) {
  .pong-page {
    padding: 1rem;
  }

  .game-header {
    flex-direction: column;
    text-align: center;
  }

  .back-link {
    align-self: flex-start;
  }
}
</style>