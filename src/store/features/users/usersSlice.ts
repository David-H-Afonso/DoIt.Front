import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthUser, CreateUserRequest, ResetUserPasswordRequest, UpdateUserRequest } from '@/models/auth'
import { UserService } from '@/services'

type UsersState = {
	items: AuthUser[]
	loading: boolean
	error: string | null
}

const initialState: UsersState = {
	items: [],
	loading: false,
	error: null,
}

export const fetchUsers = createAsyncThunk('users/fetch', async (_, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null; user: AuthUser | null } }
	if (!state.auth.accessToken || state.auth.user?.role !== 'Admin') {
		return []
	}
	return UserService.list(state.auth.accessToken)
})

export const createUser = createAsyncThunk('users/create', async (request: CreateUserRequest, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) {
		throw new Error('Missing access token')
	}
	return UserService.create(state.auth.accessToken, request)
})

export const updateUser = createAsyncThunk('users/update', async ({ id, request }: { id: string; request: UpdateUserRequest }, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) throw new Error('Missing access token')
	return UserService.update(state.auth.accessToken, id, request)
})

export const deactivateUser = createAsyncThunk('users/deactivate', async (id: string, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) throw new Error('Missing access token')
	await UserService.deactivate(state.auth.accessToken, id)
	return id
})

export const resetUserPassword = createAsyncThunk('users/resetPassword', async ({ id, request }: { id: string; request: ResetUserPasswordRequest }, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) throw new Error('Missing access token')
	await UserService.resetPassword(state.auth.accessToken, id, request)
	return id
})

export const usersSlice = createSlice({
	name: 'users',
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(fetchUsers.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(fetchUsers.fulfilled, (state, action: PayloadAction<AuthUser[]>) => {
				state.loading = false
				state.items = action.payload
			})
			.addCase(fetchUsers.rejected, (state, action) => {
				state.loading = false
				state.error = action.error.message ?? 'Failed to load users'
			})
			.addCase(createUser.fulfilled, (state, action: PayloadAction<AuthUser>) => {
				state.items.push(action.payload)
			})
			.addCase(createUser.rejected, (state, action) => {
				state.error = action.error.message ?? 'Failed to create user'
			})
			.addCase(updateUser.fulfilled, (state, action: PayloadAction<AuthUser>) => {
				state.items = state.items.map((user) => user.id === action.payload.id ? action.payload : user)
			})
			.addCase(deactivateUser.fulfilled, (state, action: PayloadAction<string>) => {
				state.items = state.items.map((user) => user.id === action.payload ? { ...user, isActive: false } : user)
			})
	},
})

export const usersReducer = usersSlice.reducer
