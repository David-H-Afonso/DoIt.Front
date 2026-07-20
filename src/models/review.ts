export type ReviewTask = {
	occurrenceId: string
	taskId: string
	title: string
	zoneName?: string | null
	status: string
	completedBy?: string | null
	xpEarned: number
	taskCreatedAt: string
	completedAt?: string | null
}

export type ReviewZone = {
	zoneId?: string | null
	zoneName: string
	total: number
	done: number
	missed: number
	notApplicable: number
	pending: number
}

export type ReviewResponse = {
	date: string
	xpEarned: number
	done: ReviewTask[]
	missed: ReviewTask[]
	notApplicable: ReviewTask[]
	pending: ReviewTask[]
	byZone: ReviewZone[]
	created?: ReviewTask[]
}
