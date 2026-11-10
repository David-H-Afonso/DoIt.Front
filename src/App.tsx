import './App.scss'
import { Outlet } from 'react-router-dom'
import { useEffect, type CSSProperties } from 'react'
import { ToastProvider } from '@/components/Toasts/ToastProvider'
import { useAppSelector } from '@/store/hooks'
import { translate } from '@/i18n'

function App() {
	const theme = useAppSelector((state) => state.theme)
	useEffect(() => { document.documentElement.lang = theme.locale }, [theme.locale])

	return (
		<div
			className='app-root'
			data-theme={theme.mode}
			style={{
				'--color-primary': theme.primaryColor,
				'--color-success': theme.accentColor,
				'--color-background': theme.backgroundColor,
				'--color-surface': theme.surfaceColor,
				'--color-text': theme.textColor ?? undefined,
				'--app-background-image': theme.backgroundImagePath ? `url(${theme.backgroundImagePath})` : 'none',
				'--app-background-overlay-opacity': theme.backgroundOverlayOpacity,
			} as CSSProperties}
		>
			<ToastProvider regionLabel={translate(theme.locale, 'toasts.regionLabel')} dismissLabel={translate(theme.locale, 'toasts.dismiss')}>
				<Outlet />
			</ToastProvider>
		</div>
	)
}

export default App
