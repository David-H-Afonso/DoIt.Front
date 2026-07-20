import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CreateZoneRequest, Zone } from '@/models/zone'
import { ZoneService } from '@/services'

type ZonesState = {
	items: Zone[]
	loading: boolean
	error: string | null
}

const initialState: ZonesState = {
	items: [],
	loading: false,
	error: null,
}

export const fetchZones = createAsyncThunk('zones/fetch', async (_, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) {
		return []
	}
	return ZoneService.list(state.auth.accessToken)
})

export const createZone = createAsyncThunk('zones/create', async (request: CreateZoneRequest, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) {
		throw new Error('Missing access token')
	}
	return ZoneService.create(state.auth.accessToken, request)
})

export const zonesSlice = createSlice({
	name: 'zones',
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(fetchZones.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchZones.fulfilled, (state, action: PayloadAction<Zone[]>) => {
				state.loading = false
				state.items = action.payload
			})
			.addCase(fetchZones.rejected, (state, action) => {
				state.loading = false
				state.error = action.error.message ?? 'Failed to load zones'
			})
			.addCase(createZone.fulfilled, (state, action: PayloadAction<Zone>) => {
				state.items.push(action.payload)
			})
			.addCase(createZone.rejected, (state, action) => {
				state.error = action.error.message ?? 'Failed to create zone'
			})
	},
})

export const zonesReducer = zonesSlice.reducer
