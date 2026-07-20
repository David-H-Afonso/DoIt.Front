import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ReviewResponse } from '@/models/review'
import { ReviewService } from '@/services'

type ReviewState = {
	value: ReviewResponse | null
	loading: boolean
	error: string | null
}

const initialState: ReviewState = {
	value: null,
	loading: false,
	error: null,
}

export const fetchReview = createAsyncThunk('review/date', async (date: string | undefined, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) {
		throw new Error('Missing access token')
	}
	return date ? ReviewService.byDate(state.auth.accessToken, date) : ReviewService.today(state.auth.accessToken)
})

export const fetchTodayReview = fetchReview

export const reviewSlice = createSlice({
	name: 'review',
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(fetchTodayReview.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchTodayReview.fulfilled, (state, action: PayloadAction<ReviewResponse>) => {
				state.loading = false
				state.value = action.payload
			})
			.addCase(fetchTodayReview.rejected, (state, action) => {
				state.loading = false
				state.error = action.error.message ?? 'Failed to load review'
			})
	},
})

export const reviewReducer = reviewSlice.reducer
