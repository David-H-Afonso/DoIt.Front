import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { NotificationPreferences, TaskNotificationOverride } from '@/models/notifications'
import { NotificationService } from '@/services'
import { toTaskNotificationUpdate } from '@/utils/taskNotifications'

type TaskNotificationsState = {
	preferences: NotificationPreferences | null
	overrides: Record<string, TaskNotificationOverride>
	loading: boolean
	loaded: boolean
	error: string | null
	pendingTaskIds: string[]
	requestId: string | null
}

type ThunkState = { auth: { accessToken: string | null }; taskNotifications: TaskNotificationsState }
const initialState: TaskNotificationsState = { preferences: null, overrides: {}, loading: false, loaded: false, error: null, pendingTaskIds: [], requestId: null }

export const fetchTaskNotificationSettings = createAsyncThunk('taskNotifications/fetch', async (_, { getState }) => {
	const { auth } = getState() as ThunkState
	if (!auth.accessToken) throw new Error('Missing access token')
	return NotificationService.getTaskSettings(auth.accessToken)
}, {
	condition: (_, { getState }) => {
		const { auth, taskNotifications } = getState() as ThunkState
		return Boolean(auth.accessToken) && !taskNotifications.loading && taskNotifications.pendingTaskIds.length === 0
	},
})

export const saveTaskNotificationOverrides = createAsyncThunk('taskNotifications/save', async (values: TaskNotificationOverride[], { getState }) => {
	const { auth } = getState() as ThunkState
	if (!auth.accessToken) throw new Error('Missing access token')
	return NotificationService.updateTaskOverrides(auth.accessToken, values.map(toTaskNotificationUpdate))
}, {
	condition: (values, { getState }) => {
		const { taskNotifications } = getState() as ThunkState
		return values.length > 0 && values.length <= 500 && !values.some((value) => taskNotifications.pendingTaskIds.includes(value.taskId))
	},
})

const taskNotificationsSlice = createSlice({
	name: 'taskNotifications',
	initialState,
	reducers: {
		setTaskNotificationPreferences: (state, action: PayloadAction<NotificationPreferences>) => {
			state.preferences = action.payload
			state.requestId = null
			state.loading = false
		},
		setTaskNotificationOverride: (state, action: PayloadAction<TaskNotificationOverride>) => {
			state.overrides[action.payload.taskId] = action.payload
			state.requestId = null
			state.loading = false
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchTaskNotificationSettings.pending, (state, action) => {
				state.loading = true
				state.error = null
				state.requestId = action.meta.requestId
			})
			.addCase(fetchTaskNotificationSettings.fulfilled, (state, action) => {
				if (state.requestId !== action.meta.requestId) return
				state.loading = false
				state.loaded = true
				state.requestId = null
				state.preferences = action.payload.preferences
				state.overrides = Object.fromEntries(action.payload.tasks.map((value) => [value.taskId, value]))
			})
			.addCase(fetchTaskNotificationSettings.rejected, (state, action) => {
				if (state.requestId !== action.meta.requestId) return
				state.loading = false
				state.requestId = null
				state.error = action.error.message ?? 'Failed to load task notification settings'
			})
			.addCase(saveTaskNotificationOverrides.pending, (state, action) => {
				state.pendingTaskIds.push(...action.meta.arg.map((value) => value.taskId))
				// An older in-flight list response must not overwrite this mutation.
				state.requestId = null
				state.loading = false
			})
			.addCase(saveTaskNotificationOverrides.fulfilled, (state, action) => {
				action.payload.forEach((value) => { state.overrides[value.taskId] = value })
				state.pendingTaskIds = state.pendingTaskIds.filter((id) => !action.meta.arg.some((value) => value.taskId === id))
			})
			.addCase(saveTaskNotificationOverrides.rejected, (state, action) => {
				state.pendingTaskIds = state.pendingTaskIds.filter((id) => !action.meta.arg.some((value) => value.taskId === id))
			})
	},
})

export const { setTaskNotificationPreferences, setTaskNotificationOverride } = taskNotificationsSlice.actions
export const taskNotificationsReducer = taskNotificationsSlice.reducer
