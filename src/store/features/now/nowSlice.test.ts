import { vi } from 'vitest'
import { NowService } from '@/services'
import { applyOccurrenceStatus, fetchNow, nowReducer, restoreNowSnapshot, setNowScope } from './nowSlice'

describe('nowSlice', () => {
	it('updates the selected scope', () => {
		const state = nowReducer(undefined, setNowScope('house'))

		expect(state.scope).toBe('house')
	})

	it('applies optimistic occurrence status and restores snapshots', () => {
		const initial = {
			date: '2026-07-12',
			scope: 'me' as const,
			progress: { total: 1, done: 0, missed: 0, notApplicable: 0, pending: 1 },
			zones: [
				{
					zoneId: 'zone-1',
					zoneName: 'Cocina',
					progress: { total: 1, done: 0, missed: 0, notApplicable: 0, pending: 1 },
					overdue: [],
					available: [{ occurrenceId: 'occ-1', id: 'task-1', title: 'Fregar', zoneId: 'zone-1', zoneName: 'Cocina', scope: 'Personal', status: 'available' as const, occurrenceStatus: 'Pending' as const }],
					unavailable: [],
				},
			],
			loading: false,
			error: null,
			lastLoadedAt: '2026-07-12T10:00:00Z',
		}
		const snapshot = { zones: initial.zones, progress: initial.progress }

		const done = nowReducer(initial, applyOccurrenceStatus({ occurrenceId: 'occ-1', status: 'Done' }))
		expect(done.progress.done).toBe(1)
		expect(done.progress.pending).toBe(0)
		expect(done.zones[0].available).toHaveLength(0)

		const restored = nowReducer(done, restoreNowSnapshot(snapshot))
		expect(restored.progress.pending).toBe(1)
		expect(restored.zones[0].available).toHaveLength(1)
	})

	it('requests the current browser date when no date is provided', async () => {
		const get = vi.spyOn(NowService, 'get').mockResolvedValue({} as never)
		const now = new Date()
		const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

		await fetchNow()(vi.fn() as never, () => ({ auth: { accessToken: 'token' }, now: { scope: 'me' } }) as never, undefined)

		expect(get).toHaveBeenCalledWith('token', { scope: 'me', date: localDate })
		get.mockRestore()
	})
})
