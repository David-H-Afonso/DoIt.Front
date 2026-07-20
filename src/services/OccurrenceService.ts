import { environment } from '@/environments'
import type { OccurrenceAction, OccurrenceActionResponse } from '@/models/now'
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
}
