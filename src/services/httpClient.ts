import { environment } from '@/environments'

export class ApiError extends Error {
	status: number
	code?: string

	constructor(message: string, status: number, code?: string) {
		super(message)
		this.status = status
		this.code = code
	}
}

type RequestOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
	body?: unknown
	accessToken?: string | null
}

let unauthorizedHandler: (() => Promise<boolean>) | null = null

export function setUnauthorizedHandler(handler: (() => Promise<boolean>) | null) {
	unauthorizedHandler = handler
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}, allowRefresh = true): Promise<T> {
	const headers: Record<string, string> = {
		Accept: 'application/json',
	}

	if (options.body !== undefined) {
		headers['Content-Type'] = 'application/json'
	}

	if (options.accessToken) {
		headers.Authorization = `Bearer ${options.accessToken}`
	}

	let response: Response
	try {
		response = await fetch(`${environment.baseUrl}${path}`, {
			method: options.method ?? 'GET',
			headers,
			body: options.body === undefined ? undefined : JSON.stringify(options.body),
		})
	} catch (error) {
		throw new ApiError(
			`No se pudo conectar con la API. Revisa que el backend esté iniciado (${environment.baseUrl || 'proxy /api'}).`,
			0,
			error instanceof Error ? error.message : undefined
		)
	}

	if (response.status === 204) {
		return undefined as T
	}

	const contentType = response.headers.get('content-type') ?? ''
	const payload = contentType.includes('application/json') ? await response.json() : await response.text()

	if (!response.ok) {
		if (response.status === 401 && options.accessToken && allowRefresh && unauthorizedHandler) {
			const refreshed = await unauthorizedHandler()
			if (refreshed) {
				return apiRequest(path, options, false)
			}
		}

		const message = typeof payload === 'string' ? payload : payload.message || 'Request failed'
		throw new ApiError(message, response.status, typeof payload === 'string' ? undefined : payload.code)
	}

	return payload as T
}
