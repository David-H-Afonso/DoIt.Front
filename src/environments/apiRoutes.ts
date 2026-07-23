export const apiRoutes = {
	auth: {
		register: '/api/auth/register',
		login: '/api/auth/login',
		refresh: '/api/auth/refresh',
		logout: '/api/auth/logout',
		me: '/api/auth/me',
	},
	integrations: {
		household: {
			authorize: '/api/integrations/household/v1/authorize',
		},
	},
	now: '/api/now',
	occurrences: {
		complete: (id: string) => `/api/occurrences/${id}/complete`,
		completeEarly: (id: string) => `/api/occurrences/${id}/complete-early`,
		miss: (id: string) => `/api/occurrences/${id}/miss`,
		notApplicable: (id: string) => `/api/occurrences/${id}/not-applicable`,
		undo: (id: string) => `/api/occurrences/${id}/undo`,
	},
	review: {
		today: '/api/review/today',
		byDate: (date: string) => `/api/review/${date}`,
	},
	zones: {
		list: '/api/zones',
		create: '/api/zones',
		byId: (id: string) => `/api/zones/${id}`,
	},
	tasks: {
		list: '/api/tasks',
		create: '/api/tasks',
		byId: (id: string) => `/api/tasks/${id}`,
		permanent: (id: string) => `/api/tasks/${id}/permanent`,
		restore: (id: string) => `/api/tasks/${id}/restore`,
	},
	theme: {
		me: '/api/theme/me',
	},
	users: {
		list: '/api/users',
		create: '/api/users',
		byId: (id: string) => `/api/users/${id}`,
		deactivate: (id: string) => `/api/users/${id}/deactivate`,
		resetPassword: (id: string) => `/api/users/${id}/reset-password`,
	},
	backups: {
		users: '/api/backups/users',
		user: (id: string) => `/api/backups/users/${id}`,
		runNow: (id: string) => `/api/backups/users/${id}/run-now`,
		fullRunNow: '/api/backups/full/run-now',
	},
	xp: {
		me: '/api/xp/me',
	},
	statistics: '/api/statistics',
	calendar: {
		events: '/api/calendar/events',
		event: (id: string) => `/api/calendar/events/${id}`,
		dueReminders: '/api/calendar/reminders/due',
		acknowledgeReminder: (id: string) => `/api/calendar/reminders/${id}/acknowledge`,
		monthlyReport: '/api/calendar/reports/monthly',
	},
} as const

export type ApiRoutes = typeof apiRoutes
