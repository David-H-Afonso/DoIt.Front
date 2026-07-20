import { environment } from '@/environments'
import type { StatisticsResponse } from '@/models/statistics'
import { apiRequest } from './httpClient'

export const StatisticsService = {
	get: (accessToken: string, from: string, to: string, groupBy: string) => {
		const params = new URLSearchParams({ from, to, groupBy })
		return apiRequest<StatisticsResponse>(`${environment.apiRoutes.statistics}?${params.toString()}`, { accessToken })
	},
}
