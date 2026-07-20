import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type UiState = {
	quickCreateOpen: boolean
	editingTaskId: string | null
	quickCreateZoneId: string | null
}

const initialState: UiState = {
	quickCreateOpen: false,
	editingTaskId: null,
	quickCreateZoneId: null,
}

export const uiSlice = createSlice({
	name: 'ui',
	initialState,
		reducers: {
		openQuickCreate: (state) => {
			state.quickCreateOpen = true
			state.editingTaskId = null
			state.quickCreateZoneId = null
		},
		openQuickCreateInZone: (state, action: PayloadAction<string>) => {
			state.quickCreateOpen = true
			state.editingTaskId = null
			state.quickCreateZoneId = action.payload
		},
		openTaskEditor: (state, action: { payload: string }) => {
			state.quickCreateOpen = true
			state.editingTaskId = action.payload
			state.quickCreateZoneId = null
		},
		closeQuickCreate: (state) => {
			state.quickCreateOpen = false
			state.editingTaskId = null
			state.quickCreateZoneId = null
		},
	},
})

export const { openQuickCreate, openQuickCreateInZone, openTaskEditor, closeQuickCreate } = uiSlice.actions
export const uiReducer = uiSlice.reducer
