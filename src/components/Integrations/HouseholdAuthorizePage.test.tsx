import { configureStore } from '@reduxjs/toolkit'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { authReducer } from '@/store/features/auth/authSlice'
import { themeReducer } from '@/store/features/theme/themeSlice'
import HouseholdAuthorizePage from './HouseholdAuthorizePage'

const query = new URLSearchParams({
	client_id: 'household',
	redirect_uri: 'https://household.test/api/integrations/callback/doit',
	state: 'runtime-generated-state-value',
	code_challenge: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
	code_challenge_method: 'S256',
	scope: 'profile.read tasks.read tasks.complete',
}).toString()
const webAccessToken = globalThis.crypto.randomUUID()
const webRefreshToken = globalThis.crypto.randomUUID()

describe('HouseholdAuthorizePage', () => {
	it('shows account and scopes, then approves without handling integration tokens', async () => {
		const authorize = vi.fn().mockResolvedValue({ redirectUrl: 'https://household.test/callback?code=opaque&state=preserved' })
		const onRedirect = vi.fn()
		renderPage(authorize, onRedirect)

		expect(screen.getByRole('heading', { name: 'Conectar DoIt con Household' })).toBeInTheDocument()
		expect(screen.getByText('Display consent-user')).toBeInTheDocument()
		expect(screen.getByText('Ver el resumen de tareas de Casa')).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Permitir y continuar' }))

		await waitFor(() => expect(authorize).toHaveBeenCalledTimes(1))
		expect(authorize).toHaveBeenCalledWith(webAccessToken, expect.objectContaining({
			clientId: 'household',
			approved: true,
			scopes: ['profile.read', 'tasks.read', 'tasks.complete'],
		}))
		expect(onRedirect).toHaveBeenCalledWith('https://household.test/callback?code=opaque&state=preserved')
	})

	it('sends a denial decision through the validated API redirect flow', async () => {
		const authorize = vi.fn().mockResolvedValue({ redirectUrl: 'https://household.test/callback?error=access_denied&state=preserved' })
		const onRedirect = vi.fn()
		renderPage(authorize, onRedirect)

		await userEvent.click(screen.getByRole('button', { name: 'Denegar' }))

		await waitFor(() => expect(authorize).toHaveBeenCalledWith(
			webAccessToken,
			expect.objectContaining({ approved: false }),
		))
		expect(onRedirect).toHaveBeenCalledTimes(1)
	})
})

function renderPage(authorize: ReturnType<typeof vi.fn>, onRedirect: ReturnType<typeof vi.fn>) {
	const store = configureStore({
		reducer: { auth: authReducer, theme: themeReducer },
		preloadedState: {
			auth: {
				user: {
					id: 'user-id',
					username: 'consent-user',
					displayName: 'Display consent-user',
					role: 'User',
					preferredLocale: 'es',
					isActive: true,
					createdAt: new Date(0).toISOString(),
					updatedAt: new Date(0).toISOString(),
				},
				accessToken: webAccessToken,
				refreshToken: webRefreshToken,
				accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
				refreshTokenExpiresAt: new Date(Date.now() + 120_000).toISOString(),
				loading: false,
				error: null,
			},
			theme: { ...themeReducer(undefined, { type: 'test/init' }), locale: 'es' as const },
		},
	})

	return render(
		<Provider store={store}>
			<MemoryRouter initialEntries={[`/integrations/household/authorize?${query}`]}>
				<HouseholdAuthorizePage authorize={authorize} onRedirect={onRedirect} />
			</MemoryRouter>
		</Provider>,
	)
}
