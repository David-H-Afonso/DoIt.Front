import type { TaskItem } from '@/models/task'

export type TaskOccurrenceTarget = 'current' | 'upcoming'
export type TaskOccurrenceMutation = {
	taskId: string
	occurrenceId: string
	target: TaskOccurrenceTarget
	action: 'complete' | 'early' | 'undo' | 'missed'
}

export type TaskCompletionControl = {
	target: TaskOccurrenceTarget | null
	occurrenceId: string | null
	date: string | null
	state: 'pending' | 'done' | 'partial' | 'missed' | 'notApplicable' | 'blocked'
	action: TaskOccurrenceMutation['action'] | null
	reason: 'ready' | 'early' | 'archived' | 'unassigned' | 'noOccurrence' | 'unavailable' | 'readOnly'
}

export function canActOnTask(task: TaskItem, userId?: string, role?: string) {
	if (!userId) return false
	if (task.scope === 'Personal') return task.createdByUserId === userId
	return role === 'Admin' || task.assignmentMode === 'Anyone' || task.assigneeIds.includes(userId)
}

export function canUndoOccurrence(task: TaskItem, userId?: string, role?: string) {
	if (!userId || !task.occurrenceCompletedByUserId) return false
	return task.occurrenceCompletedByUserId === userId || role === 'Admin' && task.scope === 'House'
}

export function canUndoOccurrenceSummary(task: TaskItem, userId?: string, role?: string) {
	const occurrence = task.upcomingOccurrence
	if (!userId || !occurrence?.completedByUserId) return false
	return occurrence.completedByUserId === userId || role === 'Admin' && task.scope === 'House'
}

export function getTaskCompletionControl(task: TaskItem, userId?: string, role?: string, now = new Date()): TaskCompletionControl {
	const target = task.occurrenceId && task.occurrenceStatus ? 'current' : task.upcomingOccurrence ? 'upcoming' : null
	const occurrence = target === 'current'
		? { id: task.occurrenceId!, date: task.occurrenceDate ?? null, status: task.occurrenceStatus!, completedBy: task.occurrenceCompletedByUserId, completedAt: task.occurrenceCompletedAt }
		: target === 'upcoming' ? { ...task.upcomingOccurrence!, completedBy: task.upcomingOccurrence!.completedByUserId } : null
	const base: TaskCompletionControl = { target, occurrenceId: occurrence?.id ?? null, date: occurrence?.date ?? null, state: 'blocked', action: null, reason: 'noOccurrence' }
	if (!occurrence) return { ...base, reason: task.isArchived ? 'archived' : 'noOccurrence' }
	const canUndo = target === 'current' ? canUndoOccurrence(task, userId, role) : canUndoOccurrenceSummary(task, userId, role)
	if (occurrence.status === 'Done') return { ...base, state: 'done', action: canUndo ? 'undo' : null, reason: canUndo ? 'ready' : 'readOnly' }
	if (task.isArchived) return { ...base, reason: 'archived' }
	if (!canActOnTask(task, userId, role)) return { ...base, reason: 'unassigned' }

	// An AllAssignees response may remain Pending after a successful completion.
	// Do not present the whole task as Done while other people are still required.
	const partial = task.assignmentMode === 'AllAssignees' && Boolean(occurrence.completedAt)
	if (partial && occurrence.completedBy === userId && canUndo) return { ...base, state: 'partial', action: 'undo', reason: 'ready' }
	const local = localMoment(now, task.schedule?.timeZoneId)
	const future = local && occurrence.date ? occurrence.date > local.date : target === 'upcoming'
	if (!future && local && occurrence.date === local.date && task.schedule?.availableFromTime && local.time < task.schedule.availableFromTime.slice(0, 8)) return { ...base, reason: 'unavailable' }
	const state = occurrence.status === 'Missed' ? 'missed' : occurrence.status === 'NotApplicable' ? 'notApplicable' : partial ? 'partial' : 'pending'
	return { ...base, state, action: future ? 'early' : 'complete', reason: future ? 'early' : 'ready' }
}

function localMoment(now: Date, timeZone?: string) {
	try {
		const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now)
		const read = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
		return { date: `${read('year')}-${read('month')}-${read('day')}`, time: `${read('hour')}:${read('minute')}:${read('second')}` }
	} catch {
		// Invalid legacy timezone metadata must not crash the list; the API still
		// validates availability and permissions before changing an occurrence.
		return null
	}
}
