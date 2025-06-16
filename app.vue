<template>
  <div id="app">
    <!-- Navigation -->
    <nav class="main-nav">
      <div class="nav-container">
        <NuxtLink to="/" class="logo">
          <span class="neon-text">🎮 NUXT ARCADE</span>
        </NuxtLink>

        <div class="nav-links">
          <NuxtLink to="/" class="nav-link">Accueil</NuxtLink>
          <NuxtLink to="/games" class="nav-link">Jeux</NuxtLink>
          <NuxtLink to="/scores" class="nav-link">Scores</NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Contenu principal -->
    <main class="main-content">
      <NuxtPage />
    </main>

    <!-- Footer -->
    <footer class="main-footer">
      <div class="footer-content">
        <p>🚀 Créé avec Nuxt.js • 🎯 Collection de mini-jeux rétro</p>
        <div class="footer-links">
          <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
          <span>•</span>
          <a href="https://nuxt.com" target="_blank" rel="noopener">Nuxt.js</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
// Configuration de la page
useHead({
  title: '🎮 Nuxt Mini Games - Arcade Rétro',
  meta: [
    { name: 'description', content: 'Collection de mini-jeux rétro créés avec Nuxt.js' }
  ]
})
</script>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Navigation */
.main-nav {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 2px solid rgba(0, 255, 0, 0.3);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
}

.logo {
  text-decoration: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 18px;
  color: #00ff00;
  transition: all 0.3s ease;
}

.logo:hover {
  transform: scale(1.05);
  text-shadow: 0 0 20px #00ff00;
}

.nav-links {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-link {
  color: #fff;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.3s ease;
  font-weight: 500;
  position: relative;
}

.nav-link:hover {
  color: #00ff00;
  background: rgba(0, 255, 0, 0.1);
}

.nav-link.router-link-active {
  color: #00ff00;
  border-bottom: 2px solid #00ff00;
}

/* Contenu principal */
.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Footer */
.main-footer {
  background: rgba(0, 0, 0, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2rem;
  text-align: center;
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
}

.footer-content p {
  margin-bottom: 1rem;
  opacity: 0.8;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 1rem;
  align-items: center;
}

.footer-links a {
  color: #00ff00;
  text-decoration: none;
  transition: opacity 0.3s ease;
}

.footer-links a:hover {
  opacity: 0.7;
}

/* Responsive */
@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .logo {
    font-size: 14px;
  }

  .nav-links {
    gap: 1rem;
  }

  .main-content {
    padding: 1rem;
  }

  .footer-links {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>