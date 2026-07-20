import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'

export default function ProtectedRoute() {
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	return accessToken ? <Outlet /> : <Navigate to='/login' replace />
}
