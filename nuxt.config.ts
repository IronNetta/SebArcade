export default defineNuxtConfig({
    devtools: { enabled: false }, // Disable devtools which might trigger oxc-parser

    modules: [
        '@nuxtjs/tailwindcss',
        '@nuxt/content'
    ],

    content: {
        // Disable features that might use oxc-parser
        markdown: {
            // Use a simpler parser to avoid oxc-parser
            toc: false, // Disable table of contents to reduce parser usage
        }
    },

    // Vercel specific configuration
    nitro: {
        preset: 'vercel'
    },

    css: [
        '~/assets/css/main.css'
    ],

    app: {
        head: {
            title: '🎮 Mini Games',
            htmlAttrs: {
                lang: 'fr'
            },
            meta: [
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1' },
                { hid: 'description', name: 'description', content: 'Collection de mini-jeux' }
            ],
            link: [
                // Police pour le style rétro des jeux
                { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
                { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
                { href: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&display=swap', rel: 'stylesheet' }
            ]
        }
    },

    ssr: false,

    components: [
        {
            path: '~/components',
            pathPrefix: false,
        }
    ]
})
