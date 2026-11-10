import type { NotificationPreferences, TaskNotificationOverride, TaskNotificationUpdate } from '@/models/notifications'
import type { TaskItem } from '@/models/task'

export const taskNotificationKeys = ['availableFromEnabled', 'recommendedEnabled', 'beforeAvailableUntilEnabled', 'taskExpiredEnabled', 'taskCompletedEnabled'] as const
export type TaskNotificationKey = typeof taskNotificationKeys[number]

export const taskNotificationLabels: Record<TaskNotificationKey, string> = {
	availableFromEnabled: 'notifications.availableFrom',
	recommendedEnabled: 'notifications.recommended',
	beforeAvailableUntilEnabled: 'notifications.beforeAvailableUntil',
	taskExpiredEnabled: 'notifications.taskExpired',
	taskCompletedEnabled: 'notifications.taskCompleted',
}

export function inheritedTaskNotifications(taskId: string): TaskNotificationOverride {
	return { taskId, availableFromEnabled: null, recommendedEnabled: null, beforeAvailableUntilEnabled: null, taskExpiredEnabled: null, taskCompletedEnabled: null, beforeAvailableUntilMinutes: null }
}

export function setAllTaskNotifications(value: TaskNotificationOverride, enabled: boolean): TaskNotificationOverride {
	return { ...value, availableFromEnabled: enabled, recommendedEnabled: enabled, beforeAvailableUntilEnabled: enabled, taskExpiredEnabled: enabled, taskCompletedEnabled: enabled }
}

export function hasTaskNotificationOverride(value: TaskNotificationOverride) {
	return taskNotificationKeys.some((key) => value[key] !== null) || value.beforeAvailableUntilMinutes !== null
}

export function toTaskNotificationUpdate({ taskId, ...settings }: TaskNotificationOverride): TaskNotificationUpdate {
	return { taskId, settings }
}

export function getApplicableNotificationKeys(task: Pick<TaskItem, 'scope' | 'schedule'>): TaskNotificationKey[] {
	const keys: TaskNotificationKey[] = []
	if (task.schedule?.availableFromTime) keys.push('availableFromEnabled')
	if (task.schedule?.recommendedTime) keys.push('recommendedEnabled')
	if (task.schedule?.availableUntilTime) keys.push('beforeAvailableUntilEnabled', 'taskExpiredEnabled')
	if (task.scope === 'House') keys.push('taskCompletedEnabled')
	return keys
}

export function getTaskNotificationState(task: TaskItem, preferences: NotificationPreferences, value: TaskNotificationOverride, userId?: string) {
	const isRecipient = Boolean(userId) && (task.scope === 'Personal'
		? task.createdByUserId === userId
		: task.assignmentMode === 'Anyone' || task.assigneeIds.length === 0 || task.assigneeIds.includes(userId!))
	const applicableKeys = getApplicableNotificationKeys(task)
	const enabledKeys = task.isArchived || !isRecipient ? [] : applicableKeys.filter((key) => value[key] ?? preferences[key])
	const mode = taskNotificationKeys.every((key) => value[key] === false)
		? 'muted'
		: hasTaskNotificationOverride(value) ? 'custom' : 'defaults'
	const reason = task.isArchived ? 'archived'
		: !isRecipient ? 'notRecipient'
			: applicableKeys.length === 0 ? 'noSchedule'
				: mode === 'muted' ? 'muted'
					: enabledKeys.length === 0 ? 'disabled' : mode
	return { enabled: enabledKeys.length > 0, enabledKeys, applicableKeys, isRecipient, mode, reason }
}
