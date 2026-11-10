export type WebPushConfig = {
	enabled: boolean
	publicKey: string | null
}

export type PushSubscriptionStatus = {
	id: string
	endpoint: string
	deviceName: string | null
	isActive: boolean
	createdAt: string
	updatedAt: string
	lastSeenAt: string
}

export type PushSubscriptionRequest = {
	endpoint: string
	p256dh: string
	auth: string
	deviceName?: string | null
}

export type DeletePushSubscriptionRequest = {
	endpoint?: string
	id?: string
}

export type NotificationPreferences = {
	availableFromEnabled: boolean
	recommendedEnabled: boolean
	beforeAvailableUntilEnabled: boolean
	taskExpiredEnabled: boolean
	taskCompletedEnabled: boolean
	beforeAvailableUntilMinutes: number
}

export type UpdateNotificationPreferencesRequest = NotificationPreferences

export type TaskNotificationOverride = {
	taskId: string
	availableFromEnabled: boolean | null
	recommendedEnabled: boolean | null
	beforeAvailableUntilEnabled: boolean | null
	taskExpiredEnabled: boolean | null
	taskCompletedEnabled: boolean | null
	beforeAvailableUntilMinutes: number | null
}

export type UpdateTaskNotificationOverrideRequest = Omit<TaskNotificationOverride, 'taskId'>

export type TaskNotificationSettings = {
	preferences: NotificationPreferences
	tasks: TaskNotificationOverride[]
}

export type TaskNotificationUpdate = {
	taskId: string
	settings: UpdateTaskNotificationOverrideRequest
}

export type NotificationInboxItem = {
	id: string
	sourceType: string
	sourceId: string
	title: string
	body: string
	url: string
	data?: Record<string, unknown> | null
	dueAtUtc: string
	createdAt: string
	isRead: boolean
	readAtUtc?: string | null
}

export function isCountedNotification(item: Pick<NotificationInboxItem, 'sourceType'>) {
	return item.sourceType === 'TaskProposalCreated'
		|| item.sourceType === 'TaskProposalAccepted'
		|| item.sourceType === 'TaskProposalRejected'
}
