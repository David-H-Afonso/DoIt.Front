import { environment } from '@/environments'
import type { CreateTaskRequest, TaskItem } from '@/models/task'
import { apiRequest } from './httpClient'

export const TaskService = {
	list: (accessToken: string) =>
		apiRequest<TaskItem[]>(environment.apiRoutes.tasks.list, { accessToken }),
	create: (accessToken: string, request: CreateTaskRequest) =>
		apiRequest<TaskItem>(environment.apiRoutes.tasks.create, {
			method: 'POST',
			body: request,
			accessToken,
		}),
	update: (accessToken: string, id: string, request: CreateTaskRequest) =>
		apiRequest<TaskItem>(environment.apiRoutes.tasks.byId(id), {
			method: 'PUT',
			body: request,
			accessToken,
		}),
	archive: (accessToken: string, id: string) =>
		apiRequest<void>(environment.apiRoutes.tasks.byId(id), {
			method: 'DELETE',
			accessToken,
		}),
	delete: (accessToken: string, id: string) =>
		apiRequest<void>(environment.apiRoutes.tasks.permanent(id), {
			method: 'DELETE',
			accessToken,
		}),
	restore: (accessToken: string, id: string) =>
		apiRequest<void>(environment.apiRoutes.tasks.restore(id), {
			method: 'POST',
			accessToken,
		}),
}
