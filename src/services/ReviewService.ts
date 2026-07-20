import { environment } from '@/environments'
import type { ReviewResponse } from '@/models/review'
import { apiRequest } from './httpClient'

export const ReviewService = {
	today: (accessToken: string) => apiRequest<ReviewResponse>(environment.apiRoutes.review.today, { accessToken }),
	byDate: (accessToken: string, date: string) => apiRequest<ReviewResponse>(environment.apiRoutes.review.byDate(date), { accessToken }),
}
