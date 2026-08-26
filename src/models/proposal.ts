import type { CreateTaskRequest } from './task'

export type TaskProposalStatus = 'Pending' | 'Accepted' | 'Rejected'

export type TaskProposal = {
	id: string
	proposerUserId: string
	targetUserId: string
	status: TaskProposalStatus
	draft: CreateTaskRequest
	createdAt: string
	updatedAt: string
	resolvedAt?: string | null
	resultingTaskId?: string | null
}

export type CreateTaskProposalRequest = CreateTaskRequest & {
	targetUserId: string
}
