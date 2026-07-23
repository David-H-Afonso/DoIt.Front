import { environment } from '@/environments'
import type { HouseholdAuthorizeRequest, HouseholdAuthorizeResponse } from '@/models/householdIntegration'
import { apiRequest } from './httpClient'

export const HouseholdIntegrationService = {
	authorize: (accessToken: string, request: HouseholdAuthorizeRequest) =>
		apiRequest<HouseholdAuthorizeResponse>(environment.apiRoutes.integrations.household.authorize, {
			method: 'POST',
			accessToken,
			body: request,
		}),
}
