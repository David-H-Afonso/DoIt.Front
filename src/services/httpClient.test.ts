import { ApiError, apiRequest, setUnauthorizedHandler } from './httpClient'

describe('httpClient', () => {
	it('calls the unauthorized handler for 401 responses on authenticated requests', async () => {
		const unauthorizedHandler = vi.fn()
		setUnauthorizedHandler(unauthorizedHandler)

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				headers: {
					get: vi.fn().mockReturnValue('application/json'),
				},
				json: vi.fn().mockResolvedValue({ message: 'Unauthorized' }),
			})
		)

		await expect(apiRequest('/api/test', { accessToken: 'token' })).rejects.toBeInstanceOf(ApiError)
		expect(unauthorizedHandler).toHaveBeenCalledTimes(1)

		vi.unstubAllGlobals()
		setUnauthorizedHandler(null)
	})

	it('does not call the unauthorized handler for unauthenticated 401 responses', async () => {
		const unauthorizedHandler = vi.fn()
		setUnauthorizedHandler(unauthorizedHandler)

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				headers: {
					get: vi.fn().mockReturnValue('application/json'),
				},
				json: vi.fn().mockResolvedValue({ message: 'Unauthorized' }),
			})
		)

		await expect(apiRequest('/api/auth/login')).rejects.toBeInstanceOf(ApiError)
		expect(unauthorizedHandler).not.toHaveBeenCalled()

		vi.unstubAllGlobals()
		setUnauthorizedHandler(null)
	})
})
