import { environment } from '@/environments'
import type { OccurrenceAction, OccurrenceActionResponse, OccurrenceSnoozeResponse } from '@/models/now'
import { apiRequest } from './httpClient'

const routeByAction = (occurrenceId: string, action: OccurrenceAction) => {
	if (action === 'done') {
		return environment.apiRoutes.occurrences.complete(occurrenceId)
	}
	if (action === 'missed') {
		return environment.apiRoutes.occurrences.miss(occurrenceId)
	}
	return environment.apiRoutes.occurrences.notApplicable(occurrenceId)
}

export const OccurrenceService = {
	apply: (accessToken: string, occurrenceId: string, action: OccurrenceAction) =>
		apiRequest<OccurrenceActionResponse>(routeByAction(occurrenceId, action), {
			method: 'POST',
			accessToken,
		}),
	completeRetroactive: (accessToken: string, occurrenceId: string, date: string) =>
		apiRequest<OccurrenceActionResponse>(environment.apiRoutes.occurrences.completeRetroactive(occurrenceId), {
			method: 'POST',
			accessToken,
			body: { date },
		}),
	completeEarly: (accessToken: string, occurrenceId: string) =>
		apiRequest<OccurrenceActionResponse>(environment.apiRoutes.occurrences.completeEarly(occurrenceId), {
			method: 'POST',
			accessToken,
		}),
	undo: (accessToken: string, occurrenceId: string) =>
		apiRequest<OccurrenceActionResponse>(environment.apiRoutes.occurrences.undo(occurrenceId), {
			method: 'POST',
			accessToken,
		}),
	snooze: (accessToken: string, occurrenceId: string, duration: '1h' | '6h' | '12h' | '24h' | 'tomorrow') =>
		apiRequest<OccurrenceSnoozeResponse>(environment.apiRoutes.occurrences.snooze(occurrenceId), {
			method: 'POST',
			accessToken,
			body: { duration },
		}),
	cancelSnooze: (accessToken: string, occurrenceId: string) =>
		apiRequest<void>(environment.apiRoutes.occurrences.cancelSnooze(occurrenceId), {
			method: 'DELETE',
			accessToken,
		}),
}
