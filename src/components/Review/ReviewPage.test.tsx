import { configureStore } from '@reduxjs/toolkit'
import { fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import ReviewPage from './ReviewPage'
import { authReducer } from '@/store/features/auth/authSlice'
import { reviewReducer } from '@/store/features/review/reviewSlice'
import { themeReducer } from '@/store/features/theme/themeSlice'

describe('ReviewPage', () => {
	it('renders daily XP and status sections', () => {
		const store = configureStore({
			reducer: { auth: authReducer, review: reviewReducer, theme: themeReducer },
			preloadedState: {
				auth: { user: null, accessToken: null, refreshToken: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null, loading: false, error: null },
				review: {
					loading: false,
					error: null,
					value: {
						date: '2026-07-12',
						xpEarned: 25,
						created: [],
						done: [{ occurrenceId: 'occ-1', taskId: 'task-1', title: 'Fregar', zoneName: 'Cocina', status: 'Done', completedBy: 'Rikku', xpEarned: 25 }],
						missed: [{ occurrenceId: 'occ-2', taskId: 'task-2', title: 'Basura', zoneName: null, status: 'Missed', completedBy: 'Rikku', xpEarned: 0 }],
						notApplicable: [],
						pending: [],
						byZone: [],
					},
				},
				theme: { mode: 'light', locale: 'es', primaryColor: '#2563eb' },
			},
		})

		render(
			<Provider store={store}>
				<ReviewPage />
			</Provider>
		)

		expect(screen.getByText('25 XP')).toBeInTheDocument()
		expect(screen.getByText('Realizadas')).toBeInTheDocument()
		expect(screen.getByText('No realizadas')).toBeInTheDocument()
		expect(screen.getByText('Fregar')).toBeInTheDocument()
	})

	it('moves the selected date in both directions using local calendar dates', () => {
		const store = configureStore({
			reducer: { auth: authReducer, review: reviewReducer, theme: themeReducer },
			preloadedState: {
				auth: { user: null, accessToken: null, refreshToken: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null, loading: false, error: null },
				review: { loading: false, error: null, value: null },
				theme: { mode: 'light', locale: 'es', primaryColor: '#2563eb' },
			},
		})

		render(<Provider store={store}><ReviewPage /></Provider>)
		const input = screen.getByLabelText('Seleccionar fecha') as HTMLInputElement
		const initial = input.value

		fireEvent.click(screen.getByRole('button', { name: 'Día siguiente' }))
		const next = input.value
		fireEvent.click(screen.getByRole('button', { name: 'Día anterior' }))

		expect(next).not.toBe(initial)
		expect(input.value).toBe(initial)
	})
})
