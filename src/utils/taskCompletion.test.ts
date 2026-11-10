import { getTaskCompletionControl } from './taskCompletion'
import { notificationTask } from '@/test/taskNotificationFixtures'

const now = new Date('2026-11-10T12:00:00Z')

describe('task inventory completion target', () => {
	it('completes the current pending occurrence, never the next one by accident', () => {
		const task = notificationTask('task', { upcomingOccurrence: { id: 'future', date: '2026-11-13', status: 'Pending' } })
		expect(getTaskCompletionControl(task, 'owner', 'User', now)).toMatchObject({ occurrenceId: 'occ-task', target: 'current', action: 'complete', state: 'pending' })
	})

	it('lets a one-off task without notification times be completed', () => {
		const task = notificationTask('task', { schedule: { ...notificationTask('task').schedule!, recurrenceType: 'Manual', recommendedTime: null } })
		expect(getTaskCompletionControl(task, 'owner', 'User', now).action).toBe('complete')
	})

	it('uses explicit early completion for a future-only occurrence', () => {
		const task = notificationTask('task', { occurrenceId: null, occurrenceStatus: null, upcomingOccurrence: { id: 'future', date: '2026-11-13', status: 'Pending' } })
		expect(getTaskCompletionControl(task, 'owner', 'User', now)).toMatchObject({ occurrenceId: 'future', target: 'upcoming', action: 'early', reason: 'early' })
	})

	it('keeps a completed current occurrence checked even when the next occurrence is pending', () => {
		const task = notificationTask('task', { occurrenceStatus: 'Done', occurrenceCompletedByUserId: 'owner', upcomingOccurrence: { id: 'future', date: '2026-11-13', status: 'Pending' } })
		expect(getTaskCompletionControl(task, 'owner', 'User', now)).toMatchObject({ target: 'current', occurrenceId: 'occ-task', state: 'done', action: 'undo' })
	})

	it('can undo an automatically archived completed one-off task', () => {
		const task = notificationTask('task', { isArchived: true, occurrenceStatus: 'Done', occurrenceCompletedByUserId: 'owner' })
		expect(getTaskCompletionControl(task, 'owner', 'User', now).action).toBe('undo')
	})

	it('does not complete tasks the user is not allowed to act on', () => {
		const task = notificationTask('task', { scope: 'House', assigneeIds: ['other'], createdByUserId: 'other' })
		expect(getTaskCompletionControl(task, 'owner', 'User', now)).toMatchObject({ action: null, reason: 'unassigned' })
		expect(getTaskCompletionControl(task, 'owner', 'Admin', now).action).toBe('complete')
	})

	it('does not let another ordinary user undo somebody elses completion', () => {
		const task = notificationTask('task', { scope: 'House', assignmentMode: 'Anyone', occurrenceStatus: 'Done', occurrenceCompletedByUserId: 'other' })
		expect(getTaskCompletionControl(task, 'owner', 'User', now)).toMatchObject({ state: 'done', action: null })
	})

	it('respects start windows in the schedule timezone but still allows overdue work', () => {
		const task = notificationTask('task', { schedule: { ...notificationTask('task').schedule!, availableFromTime: '18:00:00' } })
		expect(getTaskCompletionControl(task, 'owner', 'User', now)).toMatchObject({ action: null, reason: 'unavailable' })
		expect(getTaskCompletionControl({ ...task, occurrenceDate: '2026-11-09' }, 'owner', 'User', now).action).toBe('complete')
	})

	it('keeps an AllAssignees partial completion distinct from a completed task', () => {
		const task = notificationTask('task', { scope: 'House', assignmentMode: 'AllAssignees', assigneeIds: ['owner', 'other'], occurrenceCompletedAt: '2026-11-10T11:00:00Z', occurrenceCompletedByUserId: 'owner' })
		expect(getTaskCompletionControl(task, 'owner', 'User', now)).toMatchObject({ state: 'partial', action: 'undo' })
		expect(getTaskCompletionControl(task, 'other', 'User', now)).toMatchObject({ state: 'partial', action: 'complete' })
	})

	it('can mark missed or not-applicable work done without first undoing it', () => {
		for (const occurrenceStatus of ['Missed', 'NotApplicable'] as const) {
			expect(getTaskCompletionControl(notificationTask('task', { occurrenceStatus }), 'owner', 'User', now).action).toBe('complete')
		}
	})

	it('never renders a working completion action without an occurrence ID', () => {
		expect(getTaskCompletionControl(notificationTask('task', { occurrenceId: null, occurrenceStatus: null }), 'owner', 'User', now)).toMatchObject({ action: null, reason: 'noOccurrence' })
	})
})
