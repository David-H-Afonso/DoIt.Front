import { createBrowserRouter } from 'react-router-dom'
import { lazy } from 'react'
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
import HouseholdAuthorizePage from '@/components/Integrations/HouseholdAuthorizePage'
import InboxPage from '@/components/Inbox/InboxPage'

const CalendarPage = lazy(() => import('@/components/Calendar/CalendarPage'))
const StatisticsPage = lazy(() => import('@/components/Statistics/StatisticsPage'))

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
							{ path: 'inbox', element: <InboxPage /> },
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
