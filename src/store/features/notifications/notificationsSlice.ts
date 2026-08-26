import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { NotificationInboxItem } from '@/models/notifications'
import { NotificationService } from '@/services'

type NotificationsState = {
	items: NotificationInboxItem[]
	loading: boolean
	error: string | null
}

const initialState: NotificationsState = { items: [], loading: false, error: null }

export const fetchInbox = createAsyncThunk('notifications/fetchInbox', async (unreadOnly: boolean | undefined, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) return []
	return NotificationService.listInbox(state.auth.accessToken, unreadOnly ?? false)
})

export const markNotificationRead = createAsyncThunk('notifications/markRead', async (id: string, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) throw new Error('Missing access token')
	await NotificationService.markInboxRead(state.auth.accessToken, id)
	return id
})

export const notificationsSlice = createSlice({
	name: 'notifications',
	initialState,
	reducers: {
		addNotification: (state, action: PayloadAction<NotificationInboxItem>) => {
			state.items = [action.payload, ...state.items.filter((item) => item.id !== action.payload.id)]
		},
		clearNotifications: (state) => {
			state.items = []
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchInbox.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchInbox.fulfilled, (state, action: PayloadAction<NotificationInboxItem[]>) => {
				state.loading = false
				state.items = action.payload
			})
			.addCase(fetchInbox.rejected, (state, action) => {
				state.loading = false
				state.error = action.error.message ?? 'Failed to load inbox'
			})
			.addCase(markNotificationRead.fulfilled, (state, action: PayloadAction<string>) => {
				const item = state.items.find((candidate) => candidate.id === action.payload)
				if (item) {
					item.isRead = true
					item.readAtUtc = new Date().toISOString()
				}
			})
		},
})

export const { addNotification, clearNotifications } = notificationsSlice.actions
export const notificationsReducer = notificationsSlice.reducer
