import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import DoItLogo from '@/components/Brand/DoItLogo'
import { useI18n } from '@/i18n'
import type { HouseholdAuthorizeRequest, HouseholdAuthorizeResponse } from '@/models/householdIntegration'
import { HouseholdIntegrationService } from '@/services/HouseholdIntegrationService'
import { useAppSelector } from '@/store/hooks'

const allowedScopes = new Set(['profile.read', 'tasks.read', 'tasks.complete', 'tasks.undo', 'tasks.create'])
const scopeTranslationKeys: Record<string, string> = {
	'profile.read': 'profileRead',
	'tasks.read': 'tasksRead',
	'tasks.complete': 'tasksComplete',
	'tasks.undo': 'tasksUndo',
	'tasks.create': 'tasksCreate',
}

type Props = {
	authorize?: (accessToken: string, request: HouseholdAuthorizeRequest) => Promise<HouseholdAuthorizeResponse>
	onRedirect?: (url: string) => void
}

export default function HouseholdAuthorizePage({
	authorize = HouseholdIntegrationService.authorize,
	onRedirect = (url) => window.location.assign(url),
}: Props) {
	const { t } = useI18n()
	const location = useLocation()
	const { accessToken, user } = useAppSelector((state) => state.auth)
	const [submitting, setSubmitting] = useState<'approve' | 'deny' | null>(null)
	const [error, setError] = useState<string | null>(null)
	const request = useMemo(() => parseRequest(location.search), [location.search])
	const requestIsValid = validateRequest(request)

	const decide = async (approved: boolean) => {
		if (!accessToken || !requestIsValid) return
		setSubmitting(approved ? 'approve' : 'deny')
		setError(null)
		try {
			const response = await authorize(accessToken, { ...request, approved })
			onRedirect(response.redirectUrl)
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t('householdConsent.error'))
			setSubmitting(null)
		}
	}

	return (
		<main className='auth-page household-consent-page'>
			<section className='auth-card household-consent-card' aria-labelledby='household-consent-title'>
				<DoItLogo className='auth-card__brand' />
				<div className='household-consent-card__client' aria-hidden='true'>H</div>
				<p className='eyebrow'>{t('householdConsent.kicker')}</p>
				<h1 id='household-consent-title'>{t('householdConsent.title')}</h1>
				<p>{t('householdConsent.description')}</p>

				{requestIsValid ? (
					<>
						<div className='household-consent-card__account'>
							<span>{t('householdConsent.account')}</span>
							<strong>{user?.displayName ?? user?.username}</strong>
						</div>
						<div>
							<h2>{t('householdConsent.permissions')}</h2>
							<ul className='household-consent-card__scopes'>
								{request.scopes.map((scope) => (
									<li key={scope}>{t(`householdConsent.scopes.${scopeTranslationKeys[scope]}`)}</li>
								))}
							</ul>
						</div>
						<p className='household-consent-card__note'>{t('householdConsent.note')}</p>
						{error ? <div className='form-error' role='alert'>{error}</div> : null}
						<div className='household-consent-card__actions'>
							<button className='secondary-action' type='button' disabled={submitting !== null} onClick={() => void decide(false)}>
								{submitting === 'deny' ? t('common.loading') : t('householdConsent.deny')}
							</button>
							<button className='primary-action' type='button' disabled={submitting !== null} onClick={() => void decide(true)}>
								{submitting === 'approve' ? t('common.loading') : t('householdConsent.approve')}
							</button>
						</div>
					</>
				) : (
					<div className='form-error' role='alert'>{t('householdConsent.invalidRequest')}</div>
				)}
			</section>
		</main>
	)
}

function parseRequest(search: string): HouseholdAuthorizeRequest {
	const params = new URLSearchParams(search)
	return {
		clientId: params.get('client_id') ?? '',
		redirectUri: params.get('redirect_uri') ?? '',
		state: params.get('state') ?? '',
		codeChallenge: params.get('code_challenge') ?? '',
		codeChallengeMethod: params.get('code_challenge_method') as 'S256',
		scopes: (params.get('scope') ?? '').split(' ').filter(Boolean),
		approved: false,
	}
}

function validateRequest(request: HouseholdAuthorizeRequest) {
	return request.clientId === 'household' &&
		request.redirectUri.length > 0 &&
		request.state.length >= 16 && request.state.length <= 512 &&
		request.codeChallengeMethod === 'S256' &&
		/^[A-Za-z0-9_-]{43}$/.test(request.codeChallenge) &&
		request.scopes.length > 0 && request.scopes.every((scope) => allowedScopes.has(scope))
}
