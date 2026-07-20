import { environment } from '@/environments'
import type { UserXp } from '@/models/xp'
import { apiRequest } from './httpClient'

export const XpService = {
	me: (accessToken: string) => apiRequest<UserXp>(environment.apiRoutes.xp.me, { accessToken }),
}
