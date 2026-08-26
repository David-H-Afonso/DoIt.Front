import { environment } from '@/environments'
import type { CreateTaskProposalRequest, TaskProposal } from '@/models/proposal'
import { apiRequest } from './httpClient'

export const ProposalService = {
	list: (accessToken: string) => apiRequest<TaskProposal[]>(environment.apiRoutes.proposals.list, { accessToken }),
	get: (accessToken: string, id: string) => apiRequest<TaskProposal>(environment.apiRoutes.proposals.byId(id), { accessToken }),
	create: (accessToken: string, request: CreateTaskProposalRequest) => apiRequest<TaskProposal>(environment.apiRoutes.proposals.create, {
		method: 'POST',
		body: request,
		accessToken,
	}),
	accept: (accessToken: string, id: string) => apiRequest<TaskProposal>(environment.apiRoutes.proposals.accept(id), { method: 'POST', accessToken }),
	reject: (accessToken: string, id: string) => apiRequest<TaskProposal>(environment.apiRoutes.proposals.reject(id), { method: 'POST', accessToken }),
}
