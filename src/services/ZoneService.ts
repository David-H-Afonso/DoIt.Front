import { environment } from '@/environments'
import type { CreateZoneRequest, Zone } from '@/models/zone'
import { apiRequest } from './httpClient'

export const ZoneService = {
	list: (accessToken: string) =>
		apiRequest<Zone[]>(environment.apiRoutes.zones.list, { accessToken }),
	create: (accessToken: string, request: CreateZoneRequest) =>
		apiRequest<Zone>(environment.apiRoutes.zones.create, {
			method: 'POST',
			body: request,
			accessToken,
		}),
}
