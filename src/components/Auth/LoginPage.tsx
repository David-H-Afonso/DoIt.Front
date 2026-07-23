import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { login, register } from '@/store/features/auth/authSlice'
import DoItLogo from '@/components/Brand/DoItLogo'

export default function LoginPage() {
	const { t, locale } = useI18n()
	const dispatch = useAppDispatch()
	const { accessToken, loading, error } = useAppSelector((state) => state.auth)
	const [searchParams] = useSearchParams()
	const [mode, setMode] = useState<'login' | 'register'>('login')
	const [username, setUsername] = useState('')
	const [displayName, setDisplayName] = useState('')
	const [password, setPassword] = useState('')

	if (accessToken) {
		return <Navigate to={safeReturnTo(searchParams.get('returnTo'))} replace />
	}

	const submit = (event: FormEvent) => {
		event.preventDefault()
		if (mode === 'register') {
			dispatch(register({ username, displayName: displayName || username, password, locale }))
			return
		}
		dispatch(login({ username, password }))
	}

	return (
		<main className='auth-page'>
			<form className='auth-card' onSubmit={submit}>
				<DoItLogo className='auth-card__brand' />
				<h1>{mode === 'login' ? t('auth.welcome') : t('auth.createAccount')}</h1>

				<label>
					{t('auth.username')}
					<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete='username' required />
				</label>

				{mode === 'register' ? (
					<label>
						{t('auth.displayName')}
						<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete='name' />
					</label>
				) : null}

				<label>
					{t('auth.password')}
					<input value={password} onChange={(event) => setPassword(event.target.value)} type='password' autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} />
				</label>

				{mode === 'register' ? <small>{t('auth.hint')}</small> : null}
				{error ? <div className='form-error'>{error}</div> : null}

				<button className='primary-action' type='submit' disabled={loading}>
					{loading ? t('common.loading') : mode === 'login' ? t('auth.login') : t('auth.register')}
				</button>

				<button className='link-action' type='button' onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
					{mode === 'login' ? t('auth.switchToRegister') : t('auth.switchToLogin')}
				</button>
			</form>
		</main>
	)
}

function safeReturnTo(value: string | null) {
	return value && value.startsWith('/') && !value.startsWith('//') && value.length <= 4096 ? value : '/now'
}
