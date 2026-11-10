import { getApplicableNotificationKeys, getTaskNotificationState, hasTaskNotificationOverride, inheritedTaskNotifications, setAllTaskNotifications, taskNotificationKeys, toTaskNotificationUpdate } from './taskNotifications'
import { notificationPreferences as preferences, notificationTask } from '@/test/taskNotificationFixtures'

describe('task notification state', () => {
	it('resolves inherited values against the current user preferences', () => {
		const task = notificationTask('task')
		const inherited = inheritedTaskNotifications(task.id)
		expect(getTaskNotificationState(task, preferences, inherited, 'owner')).toMatchObject({ enabled: true, mode: 'defaults', enabledKeys: ['recommendedEnabled'] })
		expect(getTaskNotificationState(task, { ...preferences, recommendedEnabled: false }, inherited, 'owner')).toMatchObject({ enabled: false, reason: 'disabled' })
	})

	it('treats an explicit false as disabled rather than falling back to an enabled default', () => {
		const task = notificationTask('task')
		const value = { ...inheritedTaskNotifications(task.id), recommendedEnabled: false }
		expect(getTaskNotificationState(task, preferences, value, 'owner')).toMatchObject({ enabled: false, mode: 'custom' })
	})

	it('allows a task override to enable an event disabled in general settings', () => {
		const task = notificationTask('task')
		const value = { ...inheritedTaskNotifications(task.id), recommendedEnabled: true }
		expect(getTaskNotificationState(task, { ...preferences, recommendedEnabled: false }, value, 'owner').enabled).toBe(true)
	})

	it('mutes all five types without deleting the override or altering its lead time', () => {
		const original = { ...inheritedTaskNotifications('task'), recommendedEnabled: true, beforeAvailableUntilMinutes: 45 }
		const muted = setAllTaskNotifications(original, false)
		expect(taskNotificationKeys.every((key) => muted[key] === false)).toBe(true)
		expect(muted.beforeAvailableUntilMinutes).toBe(45)
		expect(original.recommendedEnabled).toBe(true)
		expect(getTaskNotificationState(notificationTask('task'), preferences, muted, 'owner')).toMatchObject({ enabled: false, mode: 'muted', reason: 'muted' })
	})

	it('does not claim a personal task without notification times has alerts', () => {
		const task = notificationTask('task', { schedule: null })
		expect(getApplicableNotificationKeys(task)).toEqual([])
		expect(getTaskNotificationState(task, preferences, inheritedTaskNotifications(task.id), 'owner')).toMatchObject({ enabled: false, reason: 'noSchedule' })
	})

	it('only counts completion alerts for House tasks', () => {
		const personal = notificationTask('personal', { schedule: null })
		const shared = notificationTask('shared', { scope: 'House', assignmentMode: 'Anyone', assigneeIds: [], schedule: null })
		expect(getTaskNotificationState(personal, preferences, inheritedTaskNotifications(personal.id), 'owner').enabled).toBe(false)
		expect(getTaskNotificationState(shared, preferences, inheritedTaskNotifications(shared.id), 'owner').enabledKeys).toEqual(['taskCompletedEnabled'])
	})

	it('does not show alerts addressed only to another assignee, even to the task creator', () => {
		const task = notificationTask('task', { scope: 'House', assigneeIds: ['someone-else'] })
		expect(getTaskNotificationState(task, preferences, inheritedTaskNotifications(task.id), 'owner')).toMatchObject({ enabled: false, reason: 'notRecipient' })
		expect(getTaskNotificationState(task, preferences, inheritedTaskNotifications(task.id), 'someone-else').enabled).toBe(true)
	})

	it('shows archived tasks without active alerts', () => {
		const task = notificationTask('task', { isArchived: true })
		expect(getTaskNotificationState(task, preferences, inheritedTaskNotifications(task.id), 'owner')).toMatchObject({ enabled: false, reason: 'archived' })
	})

	it('distinguishes restoring defaults from muting and preserves a zero-minute offset', () => {
		const inherited = inheritedTaskNotifications('task')
		expect(hasTaskNotificationOverride(inherited)).toBe(false)
		expect(hasTaskNotificationOverride({ ...inherited, beforeAvailableUntilMinutes: 0 })).toBe(true)
		expect(toTaskNotificationUpdate({ ...inherited, beforeAvailableUntilMinutes: 0 })).toEqual({ taskId: 'task', settings: { ...toTaskNotificationUpdate(inherited).settings, beforeAvailableUntilMinutes: 0 } })
	})
})
