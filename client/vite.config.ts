import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const raw = env.VITE_HOME_DIRECTORY || env.HOME_DIRECTORY || '/'
  const trimmed = raw.trim()
  const normalized = trimmed === '/' ? '/' : (`${trimmed.startsWith('/') ? '' : '/'}${trimmed}`).replace(/\/+$/, '') + '/'
  return {
    base: normalized,
    plugins: [react()],
  }
})
