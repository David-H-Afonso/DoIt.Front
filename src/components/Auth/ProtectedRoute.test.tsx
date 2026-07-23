import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { authReducer } from '@/store/features/auth/authSlice'
import ProtectedRoute from './ProtectedRoute'

describe('ProtectedRoute', () => {
	it('preserves the complete authorization request through login', async () => {
		const store = configureStore({ reducer: { auth: authReducer } })
		const request = '/integrations/household/authorize?client_id=household&state=preserved&scope=profile.read%20tasks.read'

		render(
			<Provider store={store}>
				<MemoryRouter initialEntries={[request]}>
					<Routes>
						<Route element={<ProtectedRoute />}>
							<Route path='/integrations/household/authorize' element={<div>consent</div>} />
						</Route>
						<Route path='/login' element={<LocationProbe />} />
					</Routes>
				</MemoryRouter>
			</Provider>,
		)

		const redirectedSearch = await screen.findByTestId('location-search')
		const returnTo = new URLSearchParams(redirectedSearch.textContent ?? '').get('returnTo')
		expect(returnTo).toBe(request)
	})
})

function LocationProbe() {
	const location = useLocation()
	return <div data-testid='location-search'>{location.search}</div>
}
