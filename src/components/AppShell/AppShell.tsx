import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, type CSSProperties } from 'react'
import { useI18n } from '@/i18n'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { openQuickCreate } from '@/store/features/ui/uiSlice'
import { refreshSession } from '@/store/features/auth/authSlice'
import { fetchTasks } from '@/store/features/tasks/tasksSlice'
import { fetchXp } from '@/store/features/xp/xpSlice'
import { fetchZones } from '@/store/features/zones/zonesSlice'
import { fetchNow, setNowScope } from '@/store/features/now/nowSlice'
import type { NowScope } from '@/models/now'
import QuickCreateSheet from '@/components/Tasks/QuickCreateSheet'
import DoItLogo from '@/components/Brand/DoItLogo'

const navItems = [
	{ to: '/now', labelKey: 'navigation.now', icon: 'M8 5.5h8M8 12h8M8 18.5h5M5 5.5h.01M5 12h.01M5 18.5h.01' },
	{ to: '/tasks', labelKey: 'navigation.tasks', icon: 'M5 6h14M5 12h14M5 18h9M8 6h.01M8 12h.01M8 18h.01' },
	{ to: '/zones', labelKey: 'navigation.zones', icon: 'M4.5 5.5h6v6h-6Zm9 0h6v6h-6Zm-9 9h6v6h-6Zm9 0h6v6h-6Z' },
	{ to: '/review', labelKey: 'navigation.review', icon: 'M8 7h10M8 12h10M8 17h6M4.5 7h.01M4.5 12h.01M4.5 17h.01' },
	{ to: '/profile', labelKey: 'navigation.profile', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0' },
]

export default function AppShell() {
	const { t } = useI18n()
	const dispatch = useAppDispatch()
	const location = useLocation()
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const accessTokenExpiresAt = useAppSelector((state) => state.auth.accessTokenExpiresAt)
	const nowScope = useAppSelector((state) => state.now.scope)
	const quickCreateOpen = useAppSelector((state) => state.ui.quickCreateOpen)
	const progress = useAppSelector((state) => state.now.progress)
	const completion = progress.total > 0 ? Math.round(((progress.done + progress.notApplicable) / progress.total) * 100) : 0
	const titleKey = location.pathname.startsWith('/zones')
		? 'zones.title'
		: location.pathname.startsWith('/tasks')
			? 'tasks.title'
		: location.pathname.startsWith('/review')
			? 'review.title'
			: location.pathname.startsWith('/profile')
				? 'profile.title'
				: 'now.title'
	const showScope = location.pathname === '/' || location.pathname.startsWith('/now')
	const isZoneDetail = location.pathname.startsWith('/zones/')

	useEffect(() => {
		if (accessToken) {
			if (accessTokenExpiresAt && new Date(accessTokenExpiresAt).getTime() <= Date.now()) {
				dispatch(refreshSession())
				return
			}
			dispatch(fetchZones())
			dispatch(fetchTasks())
			dispatch(fetchNow())
			dispatch(fetchXp())
		}
	}, [accessToken, accessTokenExpiresAt, dispatch])

	const changeScope = (scope: NowScope) => {
		dispatch(setNowScope(scope))
		dispatch(fetchNow({ scope }))
	}

	return (
		<div className='app-frame'>
			<aside className='command-rail' aria-label='Main navigation'>
				<div className='command-rail__brand'>
					<DoItLogo />
				</div>
				<nav className='command-rail__nav'>
					{navItems.map((item) => (
						<NavLink key={item.to} to={item.to} className={({ isActive }) => `command-rail__item${isActive ? ' command-rail__item--active' : ''}`}>
							<svg aria-hidden='true' viewBox='0 0 24 24'>
								<path d={item.icon} />
							</svg>
							<span>{t(item.labelKey)}</span>
						</NavLink>
					))}
				</nav>
				<div className='command-rail__progress' aria-label={t('now.progressLabel')} style={{ '--progress': `${completion}%` } as CSSProperties}>
					<div className='command-rail__progress-header'><span>{t('now.progress')}</span><strong>{completion}%</strong></div>
					<div className='command-rail__progress-track'><span style={{ width: `${completion}%` }} /></div>
				</div>
			</aside>

			<header className='app-topbar'>
				<div className='app-title-block'>
					{isZoneDetail ? <Link className='app-context-back' to='/zones' aria-label={t('zones.back')}>‹ <span>{t('zones.back')}</span></Link> : null}
					<strong>{t(titleKey)}</strong>
				</div>
				<div className='app-topbar__actions'>
					{showScope ? (
						<div className='scope-switch' aria-label={t('now.scopeLabel')}>
							<button type='button' className={nowScope === 'me' ? 'is-active' : undefined} aria-pressed={nowScope === 'me'} onClick={() => changeScope('me')}>
								{t('now.scopeMe')}
							</button>
							<button type='button' className={nowScope === 'house' ? 'is-active' : undefined} aria-pressed={nowScope === 'house'} onClick={() => changeScope('house')}>
								{t('now.scopeHouse')}
							</button>
							<button type='button' className={nowScope === 'all' ? 'is-active' : undefined} aria-pressed={nowScope === 'all'} onClick={() => changeScope('all')}>
								{t('now.scopeAll')}
							</button>
						</div>
					) : null}
					<button className='create-command' type='button' onClick={() => dispatch(openQuickCreate())} aria-label={t('navigation.create')}>
						<svg aria-hidden='true' viewBox='0 0 24 24'>
							<path d='M12 5v14M5 12h14' />
						</svg>
						<span>{t('navigation.create')}</span>
					</button>
				</div>
			</header>

			<main className='app-content'>
				<Outlet />
			</main>

			<nav className='mobile-dock' aria-label='Main navigation'>
				{navItems.slice(0, 2).map((item) => (
					<NavLink key={item.to} to={item.to} className={({ isActive }) => `mobile-dock__item${isActive ? ' mobile-dock__item--active' : ''}`}>
						<svg aria-hidden='true' viewBox='0 0 24 24'>
							<path d={item.icon} />
						</svg>
						<span>{t(item.labelKey)}</span>
					</NavLink>
				))}
				<button className='mobile-dock__create' type='button' onClick={() => dispatch(openQuickCreate())} aria-label={t('navigation.create')}>
					<svg aria-hidden='true' viewBox='0 0 24 24'>
						<path d='M12 5v14M5 12h14' />
					</svg>
				</button>
				{[navItems[3], navItems[4]].map((item) => (
					<NavLink key={item.to} to={item.to} className={({ isActive }) => `mobile-dock__item${isActive ? ' mobile-dock__item--active' : ''}`}>
						<svg aria-hidden='true' viewBox='0 0 24 24'>
							<path d={item.icon} />
						</svg>
						<span>{t(item.labelKey)}</span>
					</NavLink>
				))}
			</nav>

			{quickCreateOpen ? <QuickCreateSheet /> : null}
		</div>
	)
}
