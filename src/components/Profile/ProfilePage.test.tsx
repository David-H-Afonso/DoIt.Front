import { configureStore } from '@reduxjs/toolkit'
import { fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { ToastProvider } from '@/components/Toasts/ToastProvider'
import { authReducer } from '@/store/features/auth/authSlice'
import { themeReducer } from '@/store/features/theme/themeSlice'
import { tasksReducer } from '@/store/features/tasks/tasksSlice'
import { usersReducer } from '@/store/features/users/usersSlice'
import { xpReducer } from '@/store/features/xp/xpSlice'
import { zonesReducer } from '@/store/features/zones/zonesSlice'
import ProfilePage from './ProfilePage'

describe('ProfilePage', () => {
	it('keeps user creation collapsed and toggles the editor closed', () => {
		const store = configureStore({
			reducer: { auth: authReducer, theme: themeReducer, users: usersReducer, xp: xpReducer, zones: zonesReducer, tasks: tasksReducer },
			preloadedState: {
				auth: { user: { id: 'admin', username: 'admin', displayName: 'Admin', role: 'Admin', preferredLocale: 'es', isActive: true, createdAt: '', updatedAt: '' }, accessToken: null, refreshToken: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null, loading: false, error: null },
				theme: { mode: 'light', locale: 'es', primaryColor: '#2563eb' },
				users: { items: [{ id: 'admin', username: 'admin', displayName: 'Admin', role: 'Admin', preferredLocale: 'es', isActive: true, createdAt: '', updatedAt: '' }], loading: false, error: null },
				xp: { value: null, loading: false, error: null },
				zones: { items: [], loading: false, error: null },
				tasks: { items: [], loading: false, error: null },
			},
		})

		render(<Provider store={store}><ToastProvider><ProfilePage /></ToastProvider></Provider>)

		expect(screen.queryByLabelText('Usuario')).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
		expect(screen.getByLabelText('Usuario')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
		expect(screen.queryByLabelText('Usuario')).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
		expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
		expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
	})
})
