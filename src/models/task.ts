export type TaskSchedule = {
	id: string
	recurrenceType: string
	startDate: string
	endDate?: string | null
	weekday?: number | null
	weekOfMonth?: number | null
	timesPerWeek?: number | null
	everyNDays?: number | null
	interval?: number | null
	availableFromTime?: string | null
	availableUntilTime?: string | null
	recommendedTime?: string | null
	timeZoneId: string
	unavailableVisibilityMode: string
	createdAt: string
	updatedAt: string
}

export type TaskItem = {
	id: string
	title: string
	description?: string | null
	zoneId?: string | null
	zoneName?: string | null
	scope: string
	taskType: string
	importance: string
	complexity: string
	obligation: string
	assignmentMode: string
	assigneeIds: string[]
	isArchived: boolean
	createdByUserId: string
	createdAt: string
	updatedAt: string
	occurrenceStatus?: 'Pending' | 'Done' | 'Missed' | 'NotApplicable' | null
	occurrenceDate?: string | null
	occurrenceCompletedAt?: string | null
	occurrenceId?: string | null
	occurrenceCompletedByUserId?: string | null
	isOverdue?: boolean
	schedule?: TaskSchedule | null
}

export type TaskScheduleRequest = {
	recurrenceType?: string | null
	startDate?: string | null
	endDate?: string | null
	weekday?: number | null
	weekOfMonth?: number | null
	timesPerWeek?: number | null
	everyNDays?: number | null
	interval?: number | null
	availableFromTime?: string | null
	availableUntilTime?: string | null
	recommendedTime?: string | null
	timeZoneId?: string | null
	unavailableVisibilityMode?: string | null
}

export type CreateTaskRequest = {
	title: string
	description?: string | null
	zoneId?: string | null
	scope?: string | null
	taskType?: string | null
	importance?: string | null
	complexity?: string | null
	obligation?: string | null
	schedule?: TaskScheduleRequest | null
	assignmentMode?: string | null
	assigneeIds?: string[] | null
}
