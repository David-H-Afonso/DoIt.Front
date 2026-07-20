export type Zone = {
	id: string
	name: string
	description?: string | null
	color?: string | null
	icon?: string | null
	sortOrder: number
	isArchived: boolean
	createdAt: string
	updatedAt: string
}

export type CreateZoneRequest = {
	name: string
	description?: string | null
	color?: string | null
	icon?: string | null
	sortOrder?: number | null
}
