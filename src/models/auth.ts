export type AuthUser = {
	id: string
	username: string
	displayName: string
	role: string
	preferredLocale: string
	isActive: boolean
	createdAt: string
	updatedAt: string
	lastLoginAt?: string | null
}

export type AuthResponse = {
	user: AuthUser
	accessToken: string
	refreshToken: string
	accessTokenExpiresAt: string
	refreshTokenExpiresAt: string
}

export type LoginRequest = {
	username: string
	password: string
}

export type RegisterRequest = LoginRequest & {
	displayName: string
	locale?: string
}

export type CreateUserRequest = RegisterRequest & {
	role?: string | null
}

export type UpdateUserRequest = {
	displayName: string
	locale?: string | null
	role?: string | null
	isActive: boolean
}

export type ResetUserPasswordRequest = {
	password: string
}
