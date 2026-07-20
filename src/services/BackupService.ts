import { environment } from '@/environments'
import type { BackupSchedule, UpdateBackupScheduleRequest } from '@/models/backup'
import { apiRequest } from './httpClient'

export const BackupService = {
	list: (accessToken: string) => apiRequest<BackupSchedule[]>(environment.apiRoutes.backups.users, { accessToken }),
	update: (accessToken: string, userId: string, request: UpdateBackupScheduleRequest) =>
		apiRequest<BackupSchedule>(environment.apiRoutes.backups.user(userId), {
			method: 'PUT',
			body: request,
			accessToken,
		}),
	runNow: (accessToken: string, userId: string) =>
		apiRequest<BackupSchedule>(environment.apiRoutes.backups.runNow(userId), {
			method: 'POST',
			accessToken,
		}),
}
