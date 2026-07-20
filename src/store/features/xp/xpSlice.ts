import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { UserXp } from '@/models/xp'
import { XpService } from '@/services'

type XpState = {
	value: UserXp | null
	loading: boolean
	error: string | null
}

const initialState: XpState = {
	value: null,
	loading: false,
	error: null,
}

export const fetchXp = createAsyncThunk('xp/fetch', async (_, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) {
		throw new Error('Missing access token')
	}
	return XpService.me(state.auth.accessToken)
})

export const xpSlice = createSlice({
	name: 'xp',
	initialState,
	reducers: {
		setXp: (state, action: PayloadAction<UserXp>) => {
			state.value = action.payload
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchXp.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchXp.fulfilled, (state, action: PayloadAction<UserXp>) => {
				state.loading = false
				state.value = action.payload
			})
			.addCase(fetchXp.rejected, (state, action) => {
				state.loading = false
				state.error = action.error.message ?? 'Failed to load XP'
			})
	},
})

export const { setXp } = xpSlice.actions
export const xpReducer = xpSlice.reducer
