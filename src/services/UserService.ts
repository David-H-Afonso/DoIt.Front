import { environment } from '@/environments'
import type { AuthUser, CreateUserRequest, ResetUserPasswordRequest, UpdateUserRequest } from '@/models/auth'
import { apiRequest } from './httpClient'

export const UserService = {
	list: (accessToken: string) => apiRequest<AuthUser[]>(environment.apiRoutes.users.list, { accessToken }),
	create: (accessToken: string, request: CreateUserRequest) =>
		apiRequest<AuthUser>(environment.apiRoutes.users.create, {
			method: 'POST',
			body: request,
			accessToken,
		}),
	update: (accessToken: string, id: string, request: UpdateUserRequest) =>
		apiRequest<AuthUser>(environment.apiRoutes.users.byId(id), {
			method: 'PUT',
			body: request,
			accessToken,
		}),
	deactivate: (accessToken: string, id: string) =>
		apiRequest<void>(environment.apiRoutes.users.deactivate(id), {
			method: 'POST',
			accessToken,
		}),
	resetPassword: (accessToken: string, id: string, request: ResetUserPasswordRequest) =>
		apiRequest<void>(environment.apiRoutes.users.resetPassword(id), {
			method: 'POST',
			body: request,
			accessToken,
		}),
}
