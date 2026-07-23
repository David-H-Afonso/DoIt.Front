import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'

export default function ProtectedRoute() {
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const location = useLocation()
	if (accessToken) return <Outlet />

	const returnTo = `${location.pathname}${location.search}${location.hash}`
	return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
}
