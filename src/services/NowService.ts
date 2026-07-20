import { environment } from '@/environments'
import type { NowResponse, NowScope } from '@/models/now'
import { apiRequest } from './httpClient'

type NowRequest = {
	scope?: NowScope
	date?: string
}

export const NowService = {
	get: (accessToken: string, request: NowRequest = {}) => {
		const params = new URLSearchParams()
		if (request.scope) {
			params.set('scope', request.scope)
		}
		if (request.date) {
			params.set('date', request.date)
		}

		const query = params.toString()
		return apiRequest<NowResponse>(`${environment.apiRoutes.now}${query ? `?${query}` : ''}`, { accessToken })
	},
}
