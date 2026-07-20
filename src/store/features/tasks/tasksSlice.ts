import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CreateTaskRequest, TaskItem } from '@/models/task'
import { TaskService } from '@/services'

type TasksState = {
	items: TaskItem[]
	loading: boolean
	error: string | null
}

const initialState: TasksState = {
	items: [],
	loading: false,
	error: null,
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

export const tasksSlice = createSlice({
	name: 'tasks',
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(fetchTasks.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchTasks.fulfilled, (state, action: PayloadAction<TaskItem[]>) => {
				state.loading = false
				state.items = action.payload
			})
			.addCase(fetchTasks.rejected, (state, action) => {
				state.loading = false
				state.error = action.error.message ?? 'Failed to load tasks'
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
	},
})

export const tasksReducer = tasksSlice.reducer
