import type { TaskItem } from '@/models/task'
import type { NotificationPreferences } from '@/models/notifications'

export const notificationPreferences: NotificationPreferences = {
	availableFromEnabled: true,
	recommendedEnabled: true,
	beforeAvailableUntilEnabled: true,
	taskExpiredEnabled: false,
	taskCompletedEnabled: true,
	beforeAvailableUntilMinutes: 30,
}

export function notificationTask(id: string, values: Partial<TaskItem> = {}): TaskItem {
	return {
		id, title: id, scope: 'Personal', taskType: 'Routine', importance: 'Normal', complexity: 'Easy', obligation: 'Required', assignmentMode: 'SingleUser', assigneeIds: ['owner'], isArchived: false, createdByUserId: 'owner', createdAt: '2026-11-10T08:00:00Z', updatedAt: '2026-11-10T08:00:00Z',
		occurrenceId: `occ-${id}`, occurrenceStatus: 'Pending', occurrenceDate: '2026-11-10', occurrenceCompletedAt: null, occurrenceCompletedByUserId: null,
		schedule: { id: `schedule-${id}`, recurrenceType: 'Daily', startDate: '2026-11-10', recommendedTime: '10:00:00', timeZoneId: 'Europe/Madrid', unavailableVisibilityMode: 'Dimmed', createdAt: '2026-11-10T08:00:00Z', updatedAt: '2026-11-10T08:00:00Z' },
		...values,
	}
}
