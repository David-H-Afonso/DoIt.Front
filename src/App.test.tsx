import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import LoginPage from './components/Auth/LoginPage'
import { store } from './store'
import { MemoryRouter } from 'react-router-dom'

describe('App', () => {
	it('renders the login foundation screen', () => {
		render(
			<Provider store={store}>
				<MemoryRouter>
					<LoginPage />
				</MemoryRouter>
			</Provider>
		)

	expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
		expect(screen.getByLabelText('Usuario')).toBeInTheDocument()
		expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
	})
})
