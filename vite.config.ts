import { defineConfig, loadEnv } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Server-only secrets (no VITE_ prefix) into process.env for dev
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    server: { port: 3000 },
    plugins: [tanstackStart(), viteReact(), tailwindcss()],
  }
})
