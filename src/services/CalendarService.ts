import { environment } from '@/environments'
import type { CalendarEvent, CalendarEventInput, CalendarMonthlyReport, CalendarReminderDue } from '@/models/calendar'
import { apiRequest } from './httpClient'

export const CalendarService = {
	list: (accessToken: string, from: string, to: string) => {
		const params = new URLSearchParams({ from, to })
		return apiRequest<CalendarEvent[]>(`${environment.apiRoutes.calendar.events}?${params.toString()}`, { accessToken })
	},
	create: (accessToken: string, request: CalendarEventInput) =>
		apiRequest<CalendarEvent>(environment.apiRoutes.calendar.events, { method: 'POST', body: request, accessToken }),
	update: (accessToken: string, id: string, request: CalendarEventInput) =>
		apiRequest<CalendarEvent>(environment.apiRoutes.calendar.event(id), { method: 'PUT', body: request, accessToken }),
	remove: (accessToken: string, id: string) =>
		apiRequest<void>(environment.apiRoutes.calendar.event(id), { method: 'DELETE', accessToken }),
	dueReminders: (accessToken: string, from: string, to: string) => {
		const params = new URLSearchParams({ from, to })
		return apiRequest<CalendarReminderDue[]>(`${environment.apiRoutes.calendar.dueReminders}?${params.toString()}`, { accessToken })
	},
	acknowledgeReminder: (accessToken: string, id: string) =>
		apiRequest<void>(environment.apiRoutes.calendar.acknowledgeReminder(id), { method: 'POST', accessToken }),
	monthlyReport: (accessToken: string, year: number, month: number, timeZoneId: string) => {
		const params = new URLSearchParams({ year: String(year), month: String(month), timeZoneId })
		return apiRequest<CalendarMonthlyReport>(`${environment.apiRoutes.calendar.monthlyReport}?${params.toString()}`, { accessToken })
	},
}
