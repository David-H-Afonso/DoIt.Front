export type NowProgress = {
	total: number
	done: number
	missed: number
	notApplicable: number
	pending: number
}

export type NowTask = {
	occurrenceId: string
	id: string
	title: string
	zoneId?: string | null
	zoneName?: string | null
	scope: string
	assignmentMode: string
	assigneeIds: string[]
	assigneeNames: string[]
	status: 'overdue' | 'available' | 'unavailable' | 'completed'
	occurrenceStatus: 'Pending' | 'Done' | 'Missed' | 'NotApplicable'
	availableFromTime?: string | null
	availableUntilTime?: string | null
	recommendedTime?: string | null
	timeZoneId?: string | null
}

export type NowZone = {
	zoneId?: string | null
	zoneName: string
	progress: NowProgress
	overdue: NowTask[]
	available: NowTask[]
	 unavailable: NowTask[]
	completed?: NowTask[]
}

export type NowScope = 'me' | 'house' | 'all'

export type NowResponse = {
	date: string
	scope: NowScope
	progress: NowProgress
	zones: NowZone[]
}

export type OccurrenceAction = 'done' | 'missed' | 'notApplicable'

export type OccurrenceActionResponse = {
	occurrenceId: string
	taskId: string
	date: string
	status: 'Pending' | 'Done' | 'Missed' | 'NotApplicable'
	xpEarned: number
	userXp?: UserXp | null
}
import type { UserXp } from './xp'
