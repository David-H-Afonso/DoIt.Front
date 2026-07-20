import { environment } from '@/environments'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/models/auth'
import { apiRequest } from './httpClient'

export const AuthService = {
	login: (request: LoginRequest) =>
		apiRequest<AuthResponse>(environment.apiRoutes.auth.login, { method: 'POST', body: request }),
	register: (request: RegisterRequest) =>
		apiRequest<AuthResponse>(environment.apiRoutes.auth.register, { method: 'POST', body: request }),
	refresh: (refreshToken: string) =>
		apiRequest<AuthResponse>(environment.apiRoutes.auth.refresh, {
			method: 'POST',
			body: { refreshToken },
		}),
	logout: (refreshToken: string) =>
		apiRequest<void>(environment.apiRoutes.auth.logout, {
			method: 'POST',
			body: { refreshToken },
		}),
}
