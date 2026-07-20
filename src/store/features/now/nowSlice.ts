import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { NowProgress, NowResponse, NowScope, NowZone } from '@/models/now'
import { NowService } from '@/services'

type NowState = {
	date: string | null
	scope: NowScope
	progress: NowProgress
	zones: NowZone[]
	loading: boolean
	error: string | null
	lastLoadedAt: string | null
}

const emptyProgress: NowProgress = {
	total: 0,
	done: 0,
	missed: 0,
	notApplicable: 0,
	pending: 0,
}

const initialState: NowState = {
	date: null,
	scope: 'me',
	progress: emptyProgress,
	zones: [],
	loading: false,
	error: null,
	lastLoadedAt: null,
}

type FetchNowRequest = {
	scope?: NowScope
	date?: string
}

export const fetchNow = createAsyncThunk('now/fetch', async (request: FetchNowRequest | undefined, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null }; now: NowState }
	if (!state.auth.accessToken) {
		throw new Error('Missing access token')
	}

	return NowService.get(state.auth.accessToken, {
		scope: request?.scope ?? state.now.scope,
		date: request?.date,
	})
})

const applyNow = (state: NowState, payload: NowResponse) => {
	state.date = payload.date
	state.scope = payload.scope
	state.progress = payload.progress
	state.zones = payload.zones
	state.error = null
	state.lastLoadedAt = new Date().toISOString()
}

export const nowSlice = createSlice({
	name: 'now',
	initialState,
	reducers: {
		setNowScope: (state, action: PayloadAction<NowScope>) => {
			state.scope = action.payload
		},
		applyOccurrenceStatus: (state, action: PayloadAction<{ occurrenceId: string; status: 'Done' | 'Missed' | 'NotApplicable' }>) => {
			for (const zone of state.zones) {
				for (const bucket of [zone.overdue, zone.available, zone.unavailable]) {
					const index = bucket.findIndex((task) => task.occurrenceId === action.payload.occurrenceId)
					if (index === -1) {
						continue
					}

					bucket.splice(index, 1)
					zone.progress.pending = Math.max(0, zone.progress.pending - 1)
					state.progress.pending = Math.max(0, state.progress.pending - 1)
					if (action.payload.status === 'Done') {
						zone.progress.done += 1
						state.progress.done += 1
					} else if (action.payload.status === 'Missed') {
						zone.progress.missed += 1
						state.progress.missed += 1
					} else {
						zone.progress.notApplicable += 1
						state.progress.notApplicable += 1
					}
					return
				}
			}
		},
		restoreNowSnapshot: (state, action: PayloadAction<{ zones: NowZone[]; progress: NowProgress }>) => {
			state.zones = action.payload.zones
			state.progress = action.payload.progress
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchNow.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchNow.fulfilled, (state, action: PayloadAction<NowResponse>) => {
				state.loading = false
				applyNow(state, action.payload)
			})
			.addCase(fetchNow.rejected, (state, action) => {
				state.loading = false
				state.error = action.error.message ?? 'Failed to load now'
			})
	},
})

export const { applyOccurrenceStatus, restoreNowSnapshot, setNowScope } = nowSlice.actions
export const nowReducer = nowSlice.reducer
