import { describe, expect, it, vi } from 'vitest'
import { ProposalService } from './ProposalService'
import { apiRequest } from './httpClient'

vi.mock('./httpClient', () => ({ apiRequest: vi.fn() }))

describe('ProposalService', () => {
	it('posts the complete draft to the proposal endpoint', async () => {
		vi.mocked(apiRequest).mockResolvedValue({ id: 'proposal-1' })
		const request = { targetUserId: 'user-2', title: 'Take out bins', description: null, zoneId: null, scope: 'Personal', taskType: 'OneTime', importance: 'Normal', complexity: 'Easy', obligation: 'Required', schedule: null }
		await ProposalService.create('token', request)
		expect(apiRequest).toHaveBeenCalledWith('/api/tasks/proposals', { method: 'POST', body: request, accessToken: 'token' })
	})
})
