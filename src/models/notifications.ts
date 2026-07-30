export type WebPushConfig = {
	enabled: boolean
	publicKey: string | null
}

export type PushSubscriptionStatus = {
	id: string
	endpoint: string
	deviceName: string | null
	isActive: boolean
	createdAt: string
	updatedAt: string
	lastSeenAt: string
}

export type PushSubscriptionRequest = {
	endpoint: string
	p256dh: string
	auth: string
	deviceName?: string | null
}

export type DeletePushSubscriptionRequest = {
	endpoint?: string
	id?: string
}
