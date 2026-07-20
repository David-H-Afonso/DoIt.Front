import { authReducer, logoutLocal } from './authSlice'

describe('authSlice', () => {
	it('clears local session on logout', () => {
		const state = authReducer(
			{
				user: {
					id: '1',
					username: 'rikku',
					displayName: 'Rikku',
					role: 'Admin',
					preferredLocale: 'es',
					isActive: true,
					createdAt: 'now',
					updatedAt: 'now',
				},
				accessToken: 'access',
				refreshToken: 'refresh',
				accessTokenExpiresAt: 'later',
				refreshTokenExpiresAt: 'much-later',
				loading: false,
				error: null,
			},
			logoutLocal()
		)

		expect(state.accessToken).toBeNull()
		expect(state.refreshToken).toBeNull()
		expect(state.user).toBeNull()
	})
})
