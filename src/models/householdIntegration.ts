export type HouseholdAuthorizeRequest = {
	clientId: string
	redirectUri: string
	state: string
	codeChallenge: string
	codeChallengeMethod: 'S256'
	scopes: string[]
	approved: boolean
}

export type HouseholdAuthorizeResponse = {
	redirectUrl: string
}
