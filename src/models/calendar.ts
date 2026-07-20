export type CalendarReminder = {
	id: string
	offsetMinutes: number
	isEnabled: boolean
	acknowledgedAt: string | null
	dueAtUtc: string
}

export type CalendarEvent = {
	id: string
	title: string
	description: string | null
	zoneId: string | null
	zoneName: string | null
	startAtUtc: string
	endAtUtc: string
	isAllDay: boolean
	timeZoneId: string
	isCancelled: boolean
	createdAt: string
	updatedAt: string
	reminders: CalendarReminder[]
}

export type CalendarReminderInput = {
	offsetMinutes: number
	isEnabled: boolean
}

export type CalendarEventInput = {
	title: string
	description: string | null
	zoneId: string | null
	startAt: string
	endAt: string
	isAllDay: boolean
	timeZoneId: string
	isCancelled?: boolean
	reminders: CalendarReminderInput[]
}

export type CalendarReminderDue = {
	reminderId: string
	eventId: string
	eventTitle: string
	startAtUtc: string
	offsetMinutes: number
	dueAtUtc: string
}

export type CalendarMonthlyReport = {
	year: number
	month: number
	totalEvents: number
	activeEvents: number
	cancelledEvents: number
	enabledReminders: number
	acknowledgedReminders: number
}
