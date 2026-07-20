import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import svgr from 'vite-plugin-svgr'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '')
	const apiUrl = env.VITE_API_URL || 'http://localhost:5098'

	return {
		plugins: [
			react(),
			svgr({
				svgrOptions: {
					exportType: 'default',
				},
				include: '**/*.svg?react',
			}),
		],
		base: './',
		resolve: {
			alias: {
				'@': '/src',
				'@/assets': '/src/assets',
				'@/components': '/src/components',
				'@/hooks': '/src/hooks',
				'@/services': '/src/services',
				'@/utils': '/src/utils',
				'@/models': '/src/models',
				'@/store': '/src/store',
				'@/environments': '/src/environments',
				'@/layouts': '/src/layouts',
				'@/navigation': '/src/navigation',
			},
		},
		build: {
			outDir: 'dist',
			assetsDir: 'assets',
			sourcemap: false,
			rollupOptions: {
				output: {
					manualChunks: undefined,
				},
			},
		},
		server: {
			port: 5173,
			host: true,
			proxy: {
				'/api': {
					target: apiUrl,
					changeOrigin: true,
				},
			},
		},
		test: {
			environment: 'jsdom',
			setupFiles: './src/test/setup.ts',
			globals: true,
		},
	}
})
