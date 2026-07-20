import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { AuthService } from '@/services'
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '@/models/auth'

type AuthState = {
	user: AuthUser | null
	accessToken: string | null
	refreshToken: string | null
	accessTokenExpiresAt: string | null
	refreshTokenExpiresAt: string | null
	loading: boolean
	error: string | null
}

const initialState: AuthState = {
	user: null,
	accessToken: null,
	refreshToken: null,
	accessTokenExpiresAt: null,
	refreshTokenExpiresAt: null,
	loading: false,
	error: null,
}

export const login = createAsyncThunk('auth/login', async (request: LoginRequest) =>
	AuthService.login(request)
)

export const register = createAsyncThunk('auth/register', async (request: RegisterRequest) =>
	AuthService.register(request)
)

export const refreshSession = createAsyncThunk(
	'auth/refresh',
	async (_, { getState, rejectWithValue }) => {
		const state = getState() as { auth: AuthState }
		if (!state.auth.refreshToken) {
			return rejectWithValue('missing_refresh_token')
		}

		return AuthService.refresh(state.auth.refreshToken)
	}
)

const applyAuth = (state: AuthState, payload: AuthResponse) => {
	state.user = payload.user
	state.accessToken = payload.accessToken
	state.refreshToken = payload.refreshToken
	state.accessTokenExpiresAt = payload.accessTokenExpiresAt
	state.refreshTokenExpiresAt = payload.refreshTokenExpiresAt
	state.error = null
}

export const authSlice = createSlice({
	name: 'auth',
	initialState,
	reducers: {
		logoutLocal: () => initialState,
		clearAuthError: (state) => {
			state.error = null
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(login.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(login.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
				state.loading = false
				applyAuth(state, action.payload)
			})
			.addCase(login.rejected, (state, action) => {
				state.loading = false
				state.error = action.error.message ?? 'Login failed'
			})
			.addCase(register.pending, (state) => {
				state.loading = true
				state.error = null
			})
			.addCase(register.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
				state.loading = false
				applyAuth(state, action.payload)
			})
			.addCase(register.rejected, (state, action) => {
				state.loading = false
				state.error = action.error.message ?? 'Register failed'
			})
			.addCase(refreshSession.fulfilled, (state, action) => {
				applyAuth(state, action.payload as AuthResponse)
			})
			.addCase(refreshSession.rejected, (state) => {
				state.accessToken = null
				state.refreshToken = null
				state.accessTokenExpiresAt = null
				state.refreshTokenExpiresAt = null
				state.user = null
			})
	},
})

export const { logoutLocal, clearAuthError } = authSlice.actions
export const authReducer = authSlice.reducer
