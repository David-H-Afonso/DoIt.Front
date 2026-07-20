import { apiRoutes } from '../apiRoutes'

function getApiBaseUrl(): string {
	if (typeof window !== 'undefined' && (window as any).API_BASE_URL) {
		return (window as any).API_BASE_URL
	}

	if (typeof window !== 'undefined' && (window as any).ENV && (window as any).ENV.VITE_API_URL) {
		return (window as any).ENV.VITE_API_URL
	}

	if (import.meta.env.VITE_API_URL) {
		return import.meta.env.VITE_API_URL
	}

	if (import.meta.env.DEV) {
		return ''
	}

	return '/'
}

export const environment = {
	baseUrl: getApiBaseUrl(),
	apiRoutes,
}
