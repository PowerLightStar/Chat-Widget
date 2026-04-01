import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type ViteDevServer } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Dev: open `/embed` (no trailing slash) and still resolve the embed HTML entry. */
function embedPathRewrite() {
  return {
    name: 'embed-path-rewrite',
    configureServer(server: ViteDevServer) {
      applyEmbedPathRewrite(server)
    },
    configurePreviewServer(server: ViteDevServer) {
      applyEmbedPathRewrite(server)
    },
  }
}

function applyEmbedPathRewrite(server: ViteDevServer) {
  server.middlewares.use((req, _res, next) => {
    const url = req.url ?? ''
    if (url === '/embed' || url.startsWith('/embed?')) {
      req.url = '/embed/' + url.slice('/embed'.length)
    }
    next()
  })
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    embedPathRewrite(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        embed: path.resolve(__dirname, 'embed/index.html'),
      },
    },
  },
})
