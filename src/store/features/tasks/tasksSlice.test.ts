import { configureStore } from '@reduxjs/toolkit'
import { afterEach, vi } from 'vitest'
import { OccurrenceService, TaskService } from '@/services'
import { notificationTask } from '@/test/taskNotificationFixtures'
import { fetchTasks, mutateTaskOccurrence, tasksReducer } from './tasksSlice'
import type { TaskOccurrenceMutation } from '@/utils/taskCompletion'

const task = notificationTask('task')
const request: TaskOccurrenceMutation = { taskId: task.id, occurrenceId: task.occurrenceId!, target: 'current', action: 'complete' }
const response = { taskId: task.id, occurrenceId: task.occurrenceId!, date: '2026-11-10', status: 'Done' as const, xpEarned: 10 }
const done = { ...task, occurrenceStatus: 'Done' as const, occurrenceCompletedAt: '2026-11-10T12:00:00Z', occurrenceCompletedByUserId: 'owner' }
const makeStore = () => configureStore({ reducer: { auth: () => ({ accessToken: 'token' }), tasks: tasksReducer }, preloadedState: { tasks: { items: [task], loading: false, error: null } } })

afterEach(() => vi.restoreAllMocks())

describe('inventory occurrence mutations', () => {
	it('completes the exact occurrence and refreshes the authoritative task, not the whole inventory', async () => {
		const apply = vi.spyOn(OccurrenceService, 'apply').mockResolvedValue(response)
		const get = vi.spyOn(TaskService, 'get').mockResolvedValue(done)
		const list = vi.spyOn(TaskService, 'list')
		const store = makeStore()
		await store.dispatch(mutateTaskOccurrence(request)).unwrap()
		expect(apply).toHaveBeenCalledExactlyOnceWith('token', 'occ-task', 'done')
		expect(get).toHaveBeenCalledExactlyOnceWith('token', 'task')
		expect(list).not.toHaveBeenCalled()
		expect(store.getState().tasks.items[0]).toEqual(done)
	})

	it('leaves the status unchanged on save failure and permits retry', async () => {
		vi.spyOn(OccurrenceService, 'apply').mockRejectedValue(new Error('offline'))
		const get = vi.spyOn(TaskService, 'get')
		const store = makeStore()
		await store.dispatch(mutateTaskOccurrence(request))
		expect(store.getState().tasks.items[0].occurrenceStatus).toBe('Pending')
		expect(store.getState().tasks.pendingOccurrences).toEqual({})
		expect(get).not.toHaveBeenCalled()
	})

	it('blocks duplicate in-flight submissions for a task', async () => {
		let resolve!: (value: typeof response) => void
		const apply = vi.spyOn(OccurrenceService, 'apply').mockImplementation(() => new Promise((finish) => { resolve = finish }))
		vi.spyOn(TaskService, 'get').mockResolvedValue(done)
		const store = makeStore()
		const first = store.dispatch(mutateTaskOccurrence(request))
		await store.dispatch(mutateTaskOccurrence(request))
		expect(apply).toHaveBeenCalledOnce()
		resolve(response)
		await first
	})

	it('does not let an older list response overwrite a completed occurrence', async () => {
		let resolveList!: (tasks: typeof task[]) => void
		vi.spyOn(TaskService, 'list').mockImplementation(() => new Promise((finish) => { resolveList = finish }))
		vi.spyOn(OccurrenceService, 'apply').mockResolvedValue(response)
		vi.spyOn(TaskService, 'get').mockResolvedValue(done)
		const store = makeStore()
		const oldList = store.dispatch(fetchTasks())
		await store.dispatch(mutateTaskOccurrence(request))
		resolveList([task])
		await oldList
		expect(store.getState().tasks.items[0].occurrenceStatus).toBe('Done')
	})

	it('keeps a confirmed write if the follow-up read fails without inventing actor or time data', async () => {
		vi.spyOn(OccurrenceService, 'apply').mockResolvedValue(response)
		vi.spyOn(TaskService, 'get').mockRejectedValue(new Error('read offline'))
		const store = makeStore()
		const result = await store.dispatch(mutateTaskOccurrence(request)).unwrap()
		expect(result.task).toBeNull()
		expect(store.getState().tasks.items[0]).toMatchObject({ occurrenceStatus: 'Done', occurrenceCompletedAt: null, occurrenceCompletedByUserId: null })
	})

	it('does not treat a partial shared response as globally Done', async () => {
		vi.spyOn(OccurrenceService, 'apply').mockResolvedValue({ ...response, status: 'Pending' })
		vi.spyOn(TaskService, 'get').mockResolvedValue({ ...done, occurrenceStatus: 'Pending' })
		const store = makeStore()
		await store.dispatch(mutateTaskOccurrence(request))
		expect(store.getState().tasks.items[0].occurrenceStatus).toBe('Pending')
	})

	it('uses the future occurrence endpoint only for an explicitly early action', async () => {
		const early = vi.spyOn(OccurrenceService, 'completeEarly').mockResolvedValue({ ...response, occurrenceId: 'future' })
		vi.spyOn(TaskService, 'get').mockResolvedValue({ ...task, upcomingOccurrence: { id: 'future', date: '2026-11-13', status: 'Done', completedByUserId: 'owner' } })
		const store = makeStore()
		await store.dispatch(mutateTaskOccurrence({ ...request, target: 'upcoming', occurrenceId: 'future', action: 'early' }))
		expect(early).toHaveBeenCalledExactlyOnceWith('token', 'future')
		expect(store.getState().tasks.items[0].occurrenceStatus).toBe('Pending')
		expect(store.getState().tasks.items[0].upcomingOccurrence?.status).toBe('Done')
	})
})
