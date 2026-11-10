import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CreateTaskRequest, TaskItem } from '@/models/task'
import { OccurrenceService, TaskService } from '@/services'
import type { OccurrenceActionResponse } from '@/models/now'
import type { TaskOccurrenceMutation } from '@/utils/taskCompletion'

type TasksState = {
	items: TaskItem[]
	loading: boolean
	error: string | null
	requestId?: string | null
	pendingOccurrences?: Record<string, TaskOccurrenceMutation['action']>
}

const initialState: TasksState = {
	items: [],
	loading: false,
	error: null,
	requestId: null,
	pendingOccurrences: {},
}

export const fetchTasks = createAsyncThunk('tasks/fetch', async (_, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) {
		return []
	}
	return TaskService.list(state.auth.accessToken)
})

export const createTask = createAsyncThunk('tasks/create', async (request: CreateTaskRequest, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) {
		throw new Error('Missing access token')
	}
	return TaskService.create(state.auth.accessToken, request)
})

export const updateTask = createAsyncThunk('tasks/update', async ({ id, request }: { id: string; request: CreateTaskRequest }, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) {
		throw new Error('Missing access token')
	}
	return TaskService.update(state.auth.accessToken, id, request)
})

export const archiveTask = createAsyncThunk('tasks/archive', async (id: string, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) {
		throw new Error('Missing access token')
	}
	await TaskService.archive(state.auth.accessToken, id)
	return id
})

export const deleteTask = createAsyncThunk('tasks/delete', async (id: string, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) throw new Error('Missing access token')
	await TaskService.delete(state.auth.accessToken, id)
	return id
})

export const restoreTask = createAsyncThunk('tasks/restore', async (id: string, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) throw new Error('Missing access token')
	await TaskService.restore(state.auth.accessToken, id)
	return id
})

export const mutateTaskOccurrence = createAsyncThunk('tasks/mutateOccurrence', async (request: TaskOccurrenceMutation, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	const token = state.auth.accessToken
	if (!token) throw new Error('Missing access token')
	const response = request.action === 'undo' ? await OccurrenceService.undo(token, request.occurrenceId)
		: request.action === 'early' ? await OccurrenceService.completeEarly(token, request.occurrenceId)
			: await OccurrenceService.apply(token, request.occurrenceId, request.action === 'missed' ? 'missed' : 'done')
	if (response.taskId !== request.taskId || response.occurrenceId !== request.occurrenceId) throw new Error('Unexpected occurrence response')
	// Refresh just this task, including authoritative actor, archival and shared
	// completion state. A read failure must not turn a successful write into a lie.
	let task: TaskItem | null = null
	try { task = await TaskService.get(token, request.taskId) } catch { /* Keep the confirmed status and expose the refresh warning. */ }
	return { response, task }
}, {
	condition: (request, { getState }) => {
		const state = getState() as { tasks: TasksState }
		return !state.tasks.pendingOccurrences?.[request.taskId]
	},
})

function applyConfirmedOccurrence(task: TaskItem, response: OccurrenceActionResponse, request: TaskOccurrenceMutation) {
	if (request.target === 'current' && task.occurrenceId === response.occurrenceId) {
		task.occurrenceStatus = response.status
		task.occurrenceDate = response.date
		task.occurrenceCompletedAt = null
		task.occurrenceCompletedByUserId = null
		if (response.status !== 'Pending') task.isOverdue = false
	} else if (request.target === 'upcoming' && task.upcomingOccurrence?.id === response.occurrenceId) {
		task.upcomingOccurrence.status = response.status
		task.upcomingOccurrence.completedAt = null
		task.upcomingOccurrence.completedByUserId = null
	}
	if (task.schedule?.recurrenceType === 'Manual') {
		if (request.action === 'undo') task.isArchived = false
		else if (response.status === 'Done') task.isArchived = true
	}
}

export const tasksSlice = createSlice({
	name: 'tasks',
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(fetchTasks.pending, (state, action) => {
				state.loading = true
				state.error = null
				state.requestId = action.meta.requestId
			})
			.addCase(fetchTasks.fulfilled, (state, action) => {
				if (state.requestId !== action.meta.requestId) return
				state.loading = false
				state.items = action.payload
				state.requestId = null
			})
			.addCase(fetchTasks.rejected, (state, action) => {
				if (state.requestId !== action.meta.requestId) return
				state.loading = false
				state.error = action.error.message ?? 'Failed to load tasks'
				state.requestId = null
			})
			.addCase(createTask.fulfilled, (state, action: PayloadAction<TaskItem>) => {
				state.items.unshift(action.payload)
			})
			.addCase(updateTask.fulfilled, (state, action: PayloadAction<TaskItem>) => {
				state.items = state.items.map((task) => (task.id === action.payload.id ? action.payload : task))
			})
			.addCase(archiveTask.fulfilled, (state, action: PayloadAction<string>) => {
				state.items = state.items.map((task) => task.id === action.payload ? { ...task, isArchived: true } : task)
			})
			.addCase(deleteTask.fulfilled, (state, action: PayloadAction<string>) => {
				state.items = state.items.filter((task) => task.id !== action.payload)
			})
			.addCase(restoreTask.fulfilled, (state, action: PayloadAction<string>) => {
				state.items = state.items.map((task) => task.id === action.payload ? { ...task, isArchived: false } : task)
			})
			.addCase(createTask.rejected, (state, action) => {
				state.error = action.error.message ?? 'Failed to create task'
			})
			.addCase(mutateTaskOccurrence.pending, (state, action) => {
				state.pendingOccurrences ??= {}
				state.pendingOccurrences[action.meta.arg.taskId] = action.meta.arg.action
				state.requestId = null
				state.loading = false
			})
			.addCase(mutateTaskOccurrence.fulfilled, (state, action) => {
				const request = action.meta.arg
				const index = state.items.findIndex((task) => task.id === request.taskId)
				if (index !== -1) {
					if (action.payload.task) state.items[index] = action.payload.task
					else applyConfirmedOccurrence(state.items[index], action.payload.response, request)
				}
				delete state.pendingOccurrences?.[request.taskId]
				state.requestId = null
				state.loading = false
			})
			.addCase(mutateTaskOccurrence.rejected, (state, action) => {
				delete state.pendingOccurrences?.[action.meta.arg.taskId]
			})
	},
})

export const tasksReducer = tasksSlice.reducer
