import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import NowPage, { NowZoneSection } from './NowPage'
import { ToastProvider } from '@/components/Toasts/ToastProvider'
import { authReducer } from '@/store/features/auth/authSlice'
import { nowReducer } from '@/store/features/now/nowSlice'
import { themeReducer } from '@/store/features/theme/themeSlice'

describe('NowPage', () => {
	it('renders grouped task states and accessible primary action', () => {
		const store = configureStore({
			reducer: {
				auth: authReducer,
				now: nowReducer,
				theme: themeReducer,
			},
			preloadedState: {
				auth: {
					user: null,
					accessToken: null,
					refreshToken: null,
					accessTokenExpiresAt: null,
					refreshTokenExpiresAt: null,
					loading: false,
					error: null,
				},
				now: {
					date: '2026-07-11',
					scope: 'me',
					progress: { total: 3, done: 0, missed: 0, notApplicable: 0, pending: 3 },
					loading: false,
					error: null,
					lastLoadedAt: '2026-07-11T10:00:00Z',
					zones: [
						{
							zoneId: 'zone-1',
							zoneName: 'Cocina',
							progress: { total: 3, done: 0, missed: 0, notApplicable: 0, pending: 3 },
							overdue: [{ occurrenceId: 'occ-1', id: '1', title: 'Sacar basura', zoneId: 'zone-1', zoneName: 'Cocina', scope: 'Personal', status: 'overdue', occurrenceStatus: 'Pending', availableUntilTime: '09:00:00' }],
							available: [{ occurrenceId: 'occ-2', id: '2', title: 'Fregar platos', zoneId: 'zone-1', zoneName: 'Cocina', scope: 'Personal', status: 'available', occurrenceStatus: 'Pending', recommendedTime: '10:00:00' }],
							unavailable: [{ occurrenceId: 'occ-3', id: '3', title: 'Preparar cena', zoneId: 'zone-1', zoneName: 'Cocina', scope: 'Personal', status: 'unavailable', occurrenceStatus: 'Pending', availableFromTime: '20:00:00' }],
						},
					],
				},
				theme: { mode: 'light', locale: 'es', primaryColor: '#2563eb' },
			},
		})

		render(
			<Provider store={store}>
				<ToastProvider>
					<MemoryRouter>
						<NowPage />
					</MemoryRouter>
				</ToastProvider>
			</Provider>
		)

		expect(screen.getByText('Cocina')).toBeInTheDocument()
		expect(screen.getByText('Vencidas')).toBeInTheDocument()
		expect(screen.getByText('Disponibles ahora')).toBeInTheDocument()
		expect(screen.queryByText('Aún no disponibles')).not.toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: 'Completar' }).length).toBeGreaterThan(0)
		expect(screen.getAllByRole('button', { name: 'No hecha' }).length).toBeGreaterThan(0)
		expect(screen.queryByText('Disponible a las 20:00')).not.toBeInTheDocument()
	})

	it('shows completed recurring tasks when a zone is opened', () => {
		const zone = {
			zoneId: 'zone-1',
			zoneName: 'Cocina',
			progress: { total: 1, done: 1, missed: 0, notApplicable: 0, pending: 0 },
			overdue: [],
			available: [],
			unavailable: [],
			completed: [{ occurrenceId: 'occ-4', id: '4', title: 'Limpiar cocina', zoneId: 'zone-1', zoneName: 'Cocina', scope: 'Personal', assignmentMode: 'SingleUser', status: 'completed', occurrenceStatus: 'Done', assigneeIds: [], assigneeNames: [] }],
		}
		const store = configureStore({
			reducer: { auth: authReducer, now: nowReducer, theme: themeReducer },
			preloadedState: {
				auth: { user: null, accessToken: null, refreshToken: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null, loading: false, error: null },
				now: { date: '2026-07-20', scope: 'me', progress: { total: 1, done: 1, missed: 0, notApplicable: 0, pending: 0 }, zones: [zone], loading: false, error: null, lastLoadedAt: null },
				theme: { mode: 'light', locale: 'es', primaryColor: '#2563eb' },
			},
		})
		render(<Provider store={store}><ToastProvider><NowZoneSection zone={zone} showOpenLink={false} showCompleted /></ToastProvider></Provider>)

		expect(screen.getByText('Realizadas')).toBeInTheDocument()
		expect(screen.getByText('Limpiar cocina')).toBeInTheDocument()
	})
})
