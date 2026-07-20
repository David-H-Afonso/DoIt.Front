export type StatisticsSummary = {
	scheduled: number
	completed: number
	completedEarly: number
	completedLate: number
	completedOverdue: number
	missed: number
	notApplicable: number
	pending: number
	completionRate: number
}

export type StatisticsOccurrence = {
	occurrenceId?: string | null
	taskId: string
	scheduledDate: string
	status: string
	timing: string
	completedAt?: string | null
	differenceMinutes?: number | null
	timeZoneId: string
}

export type TaskStatistics = {
	taskId: string
	title: string
	zoneName?: string | null
	recurrenceType: string
	summary: StatisticsSummary
	occurrences: StatisticsOccurrence[]
}

export type StatisticsBucket = {
	key: string
	from: string
	to: string
	summary: StatisticsSummary
}

export type StatisticsResponse = {
	from: string
	to: string
	groupBy: string
	summary: StatisticsSummary
	buckets: StatisticsBucket[]
	tasks: TaskStatistics[]
}
