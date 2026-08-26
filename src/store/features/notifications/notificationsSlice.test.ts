import { describe, expect, it } from 'vitest'
import { notificationsReducer, addNotification, markNotificationRead } from './notificationsSlice'

const item = { id: 'n-1', sourceType: 'TaskProposalCreated', sourceId: 'p-1', title: 'Proposal', body: 'A task was proposed', url: '/inbox', data: null, dueAtUtc: '2026-08-26T10:00:00Z', createdAt: '2026-08-26T10:00:00Z', isRead: false, readAtUtc: null }

describe('notificationsSlice', () => {
	it('adds and deduplicates inbox notifications', () => {
		const state = notificationsReducer(notificationsReducer(undefined, addNotification(item)), addNotification(item))
		expect(state.items).toHaveLength(1)
	})

	it('marks a notification read when the request resolves', () => {
		const state = notificationsReducer({ items: [item], loading: false, error: null }, markNotificationRead.fulfilled('n-1', 'request'))
		expect(state.items[0].isRead).toBe(true)
	})
})
