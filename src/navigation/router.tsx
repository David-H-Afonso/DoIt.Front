import { createBrowserRouter } from 'react-router-dom'
import App from '@/App'
import AppShell from '@/components/AppShell/AppShell'
import LoginPage from '@/components/Auth/LoginPage'
import ProtectedRoute from '@/components/Auth/ProtectedRoute'
import NowPage from '@/components/Now/NowPage'
import TasksPage from '@/components/Tasks/TasksPage'
import ProfilePage from '@/components/Profile/ProfilePage'
import ReviewPage from '@/components/Review/ReviewPage'
import ZoneDetailPage from '@/components/Zones/ZoneDetailPage'
import ZonesPage from '@/components/Zones/ZonesPage'
import StatisticsPage from '@/components/Statistics/StatisticsPage'
import CalendarPage from '@/components/Calendar/CalendarPage'
import HouseholdAuthorizePage from '@/components/Integrations/HouseholdAuthorizePage'

export const router = createBrowserRouter([
	{
		path: '/',
		element: <App />,
		errorElement: <App />,
		children: [
			{
				path: 'login',
				element: <LoginPage />,
			},
			{
				element: <ProtectedRoute />,
				children: [
					{
						path: 'integrations/household/authorize',
						element: <HouseholdAuthorizePage />,
					},
					{
						element: <AppShell />,
						children: [
							{ index: true, element: <NowPage /> },
							{ path: 'now', element: <NowPage /> },
							{ path: 'tasks', element: <TasksPage /> },
							{ path: 'zones', element: <ZonesPage /> },
							{ path: 'zones/:id', element: <ZoneDetailPage /> },
							{ path: 'review', element: <ReviewPage /> },
							{ path: 'statistics', element: <StatisticsPage /> },
							{ path: 'calendar', element: <CalendarPage /> },
							{ path: 'profile', element: <ProfilePage /> },
						],
					},
				],
			},
		],
	},
	{
		path: '*',
		element: <App />,
		errorElement: <App />,
	},
])
