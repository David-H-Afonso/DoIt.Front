import { configureStore } from '@reduxjs/toolkit'
import { afterEach, vi } from 'vitest'
import { NotificationService } from '@/services'
import { notificationPreferences } from '@/test/taskNotificationFixtures'
import { inheritedTaskNotifications, setAllTaskNotifications, toTaskNotificationUpdate } from '@/utils/taskNotifications'
import { fetchTaskNotificationSettings, saveTaskNotificationOverrides, setTaskNotificationPreferences, taskNotificationsReducer } from './taskNotificationsSlice'

const inherited = inheritedTaskNotifications('task')
const settings = { preferences: notificationPreferences, tasks: [inherited] }
const makeStore = (accessToken: string | null = 'token') => configureStore({ reducer: { auth: () => ({ accessToken }), taskNotifications: taskNotificationsReducer } })

afterEach(() => vi.restoreAllMocks())

describe('taskNotificationsSlice', () => {
	it('loads all task settings in one request, without fetching each task', async () => {
		const list = vi.spyOn(NotificationService, 'getTaskSettings').mockResolvedValue(settings)
		const individual = vi.spyOn(NotificationService, 'getTaskOverride')
		const store = makeStore()
		await store.dispatch(fetchTaskNotificationSettings())
		expect(list).toHaveBeenCalledExactlyOnceWith('token')
		expect(individual).not.toHaveBeenCalled()
		expect(store.getState().taskNotifications).toMatchObject({ loaded: true, loading: false, preferences: notificationPreferences, overrides: { task: inherited } })
	})

	it('persists mute and exact undo snapshots in batch requests', async () => {
		const muted = setAllTaskNotifications(inherited, false)
		const save = vi.spyOn(NotificationService, 'updateTaskOverrides').mockResolvedValueOnce([muted]).mockResolvedValueOnce([inherited])
		const store = makeStore()
		await store.dispatch(saveTaskNotificationOverrides([muted]))
		expect(store.getState().taskNotifications.overrides.task).toEqual(muted)
		await store.dispatch(saveTaskNotificationOverrides([inherited]))
		expect(store.getState().taskNotifications.overrides.task).toEqual(inherited)
		expect(save).toHaveBeenNthCalledWith(1, 'token', [toTaskNotificationUpdate(muted)])
		expect(save).toHaveBeenNthCalledWith(2, 'token', [toTaskNotificationUpdate(inherited)])
	})

	it('leaves stored settings unchanged after a failed save and clears pending state', async () => {
		vi.spyOn(NotificationService, 'getTaskSettings').mockResolvedValue(settings)
		vi.spyOn(NotificationService, 'updateTaskOverrides').mockRejectedValue(new Error('offline'))
		const store = makeStore()
		await store.dispatch(fetchTaskNotificationSettings())
		const result = await store.dispatch(saveTaskNotificationOverrides([setAllTaskNotifications(inherited, false)]))
		expect(saveTaskNotificationOverrides.rejected.match(result)).toBe(true)
		expect(store.getState().taskNotifications.overrides.task).toEqual(inherited)
		expect(store.getState().taskNotifications.pendingTaskIds).toEqual([])
	})

	it('ignores a stale list response that resolves after a saved change', async () => {
		let resolveList!: (value: typeof settings) => void
		vi.spyOn(NotificationService, 'getTaskSettings').mockResolvedValueOnce(settings).mockImplementationOnce(() => new Promise((resolve) => { resolveList = resolve }))
		const muted = setAllTaskNotifications(inherited, false)
		vi.spyOn(NotificationService, 'updateTaskOverrides').mockResolvedValue([muted])
		const store = makeStore()
		await store.dispatch(fetchTaskNotificationSettings())
		const refresh = store.dispatch(fetchTaskNotificationSettings())
		await store.dispatch(saveTaskNotificationOverrides([muted]))
		resolveList(settings)
		await refresh
		expect(store.getState().taskNotifications.overrides.task).toEqual(muted)
		expect(store.getState().taskNotifications.loaded).toBe(true)
	})

	it('blocks duplicate in-flight updates to the same task', async () => {
		let resolveSave!: (values: typeof inherited[]) => void
		const save = vi.spyOn(NotificationService, 'updateTaskOverrides').mockImplementation(() => new Promise((resolve) => { resolveSave = resolve }))
		const store = makeStore()
		const first = store.dispatch(saveTaskNotificationOverrides([inherited]))
		await store.dispatch(saveTaskNotificationOverrides([inherited]))
		expect(save).toHaveBeenCalledOnce()
		expect(store.getState().taskNotifications.pendingTaskIds).toEqual(['task'])
		resolveSave([inherited])
		await first
		expect(store.getState().taskNotifications.pendingTaskIds).toEqual([])
	})

	it('does not load settings without authentication and exposes load failures for retry', async () => {
		const list = vi.spyOn(NotificationService, 'getTaskSettings').mockRejectedValue(new Error('offline'))
		await makeStore(null).dispatch(fetchTaskNotificationSettings())
		expect(list).not.toHaveBeenCalled()
		const store = makeStore()
		await store.dispatch(fetchTaskNotificationSettings())
		expect(store.getState().taskNotifications).toMatchObject({ loaded: false, loading: false, error: 'offline' })
		list.mockResolvedValue(settings)
		await store.dispatch(fetchTaskNotificationSettings())
		expect(store.getState().taskNotifications).toMatchObject({ loaded: true, error: null })
	})

	it('updates inherited states when general preferences change', () => {
		const store = makeStore()
		const changed = { ...notificationPreferences, recommendedEnabled: false }
		store.dispatch(setTaskNotificationPreferences(changed))
		expect(store.getState().taskNotifications.preferences).toEqual(changed)
	})
})
