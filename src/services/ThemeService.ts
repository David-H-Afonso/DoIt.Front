import { environment } from '@/environments'
import type { ThemePreference } from '@/models/theme'
import { apiRequest } from './httpClient'

export const ThemeService = {
	get: (accessToken: string) => apiRequest<ThemePreference>(environment.apiRoutes.theme.me, { accessToken }),
	update: (accessToken: string, request: ThemePreference) =>
		apiRequest<ThemePreference>(environment.apiRoutes.theme.me, {
			method: 'PUT',
			body: request,
			accessToken,
		}),
}
