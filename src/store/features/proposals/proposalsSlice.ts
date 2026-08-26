import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CreateTaskProposalRequest, TaskProposal } from '@/models/proposal'
import { ProposalService } from '@/services'

type ProposalsState = {
	items: TaskProposal[]
	loading: boolean
	error: string | null
}

const initialState: ProposalsState = { items: [], loading: false, error: null }

export const fetchProposals = createAsyncThunk('proposals/fetch', async (_, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) return []
	return ProposalService.list(state.auth.accessToken)
})

export const createProposal = createAsyncThunk('proposals/create', async (request: CreateTaskProposalRequest, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) throw new Error('Missing access token')
	return ProposalService.create(state.auth.accessToken, request)
})

export const acceptProposal = createAsyncThunk('proposals/accept', async (id: string, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) throw new Error('Missing access token')
	return ProposalService.accept(state.auth.accessToken, id)
})

export const rejectProposal = createAsyncThunk('proposals/reject', async (id: string, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) throw new Error('Missing access token')
	return ProposalService.reject(state.auth.accessToken, id)
})

function replaceProposal(items: TaskProposal[], proposal: TaskProposal) {
	return items.some((item) => item.id === proposal.id)
		? items.map((item) => item.id === proposal.id ? proposal : item)
		: [proposal, ...items]
}

export const proposalsSlice = createSlice({
	name: 'proposals',
	initialState,
	reducers: {
		clearProposals: (state) => { state.items = [] },
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchProposals.pending, (state) => { state.loading = true; state.error = null })
			.addCase(fetchProposals.fulfilled, (state, action: PayloadAction<TaskProposal[]>) => { state.loading = false; state.items = action.payload })
			.addCase(fetchProposals.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? 'Failed to load proposals' })
			.addCase(createProposal.fulfilled, (state, action: PayloadAction<TaskProposal>) => { state.items = replaceProposal(state.items, action.payload) })
			.addCase(acceptProposal.fulfilled, (state, action: PayloadAction<TaskProposal>) => { state.items = replaceProposal(state.items, action.payload) })
			.addCase(rejectProposal.fulfilled, (state, action: PayloadAction<TaskProposal>) => { state.items = replaceProposal(state.items, action.payload) })
		},
})

export const { clearProposals } = proposalsSlice.actions
export const proposalsReducer = proposalsSlice.reducer
