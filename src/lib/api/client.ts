/**
 * Backend error envelope (backend/src/middleware/errors.ts):
 * { error: { code, message, requestId, details? } } with HTTP status.
 */
export interface ApiErrorBody {
    error: {
        code: string;
        message: string;
        requestId?: string;
        details?: unknown;
    };
}

export class ApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly requestId?: string;
    readonly details?: unknown;

    constructor(status: number, code: string, message: string, requestId?: string, details?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.requestId = requestId;
        this.details = details;
    }
}

/** Shape of a failed fetch that carries no JSON envelope (network / proxy). */
function toApiError(status: number, fallbackMessage: string, requestId?: string, details?: unknown): ApiError {
    return new ApiError(status, 'HTTP_ERROR', fallbackMessage, requestId, details);
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface RequestOptions {
    method?: HttpMethod;
    /** JSON body — serialised automatically. */
    body?: unknown;
    /** Extra headers merged over defaults (e.g. Idempotency-Key). */
    headers?: Record<string, string>;
    /** When true the access token is NOT attached (login, refresh). */
    auth?: boolean;
    /** When true, a 204/empty body resolves to undefined. */
    raw?: boolean;
}

/** Token store abstraction so the client can refresh and persist credentials. */
export interface TokenStore {
    getAccessToken(): string | null;
    getRefreshToken(): string | null;
    setTokens(accessToken: string, refreshToken: string, expiresIn: number): void;
    clear(): void;
}

export interface RefreshResult {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    session: { id: string; expiresAt: string };
}

/** Reason a session was deemed unrecoverable, surfaced to the UI. */
export type UnauthorizedReason = 'session_expired' | 'forbidden' | 'unknown';

export interface ApiClientOptions {
    baseUrl: string;
    tokenStore: TokenStore;
    /** Called whenever authentication is irrecoverable (401 refresh failure). */
    onUnauthorized?: (reason: UnauthorizedReason) => void;
}

/**
 * Thin fetch wrapper for the backend at /api/v1.
 *
 * - Attaches `Authorization: Bearer <accessToken>` by default.
 * - On 401, attempts a single refresh (POST /auth/refresh with the stored
 *   refresh token) then retries the original request once. Reuse detection and
 *   session revocation are handled server side; a failed refresh clears the
 *   session and calls onUnauthorized.
 * - Always unwraps the backend `{ error: { code, message, requestId } }` envelope
 *   into an ApiError with the same code and status.
 */
export class ApiClient {
    /** In-flight refresh so concurrent 401s share one rotation (avoids reuse detection). */
    private refreshInFlight: Promise<boolean> | null = null;

    constructor(private readonly options: ApiClientOptions) {}

    private get baseUrl(): string {
        return this.options.baseUrl;
    }

    private get tokenStore(): TokenStore {
        return this.options.tokenStore;
    }

    async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
        const { method = 'GET', body, headers, auth = true, raw = false } = options;
        const url = `${this.baseUrl}${path}`;
        const requestHeaders: Record<string, string> = {
            Accept: 'application/json',
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...headers,
        };
        if (auth) {
            const accessToken = this.tokenStore.getAccessToken();
            if (accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`;
        }

        let response = await this.send(url, method, requestHeaders, body);
        if (response.status === 401 && auth) {
            if (this.tokenStore.getRefreshToken()) {
                const refreshed = await this.runRefresh();
                if (refreshed) {
                    // Re-read from the store: with a single-flight refresh the
                    // winning caller may have rotated the token pair already.
                    const retryToken = this.tokenStore.getAccessToken();
                    if (retryToken) requestHeaders.Authorization = `Bearer ${retryToken}`;
                    response = await this.send(url, method, requestHeaders, body);
                }
            }
            if (response.status === 401) {
                // Still unauthenticated after a refresh attempt: the session is
                // unrecoverable, so drop it and notify the app once.
                this.tokenStore.clear();
                this.options.onUnauthorized?.('session_expired');
            }
        }
        return this.decode<T>(response, raw);
    }

    private async send(url: string, method: HttpMethod, headers: Record<string, string>, body?: unknown): Promise<Response> {
        return fetch(url, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    }

    /** Single-flight wrapper: concurrent callers await the same rotation. */
    private runRefresh(): Promise<boolean> {
        if (!this.refreshInFlight) {
            this.refreshInFlight = this.refresh().finally(() => {
                this.refreshInFlight = null;
            });
        }
        return this.refreshInFlight;
    }

    private async refresh(): Promise<boolean> {
        const refreshToken = this.tokenStore.getRefreshToken();
        if (!refreshToken) return false;
        let response: Response;
        try {
            response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });
        } catch {
            // Transient network failure — do NOT destroy the session here; the
            // request() caller decides based on the retried response.
            return false;
        }
        if (!response.ok) {
            this.tokenStore.clear();
            this.options.onUnauthorized?.('session_expired');
            return false;
        }
        const payload = (await response.json()) as RefreshResult;
        this.tokenStore.setTokens(payload.accessToken, payload.refreshToken, payload.expiresIn);
        return true;
    }

    private async decode<T>(response: Response, raw: boolean): Promise<T> {
        if (response.status === 204) return undefined as T;
        const contentType = response.headers.get('content-type') ?? '';
        const isJson = contentType.includes('application/json');
        if (!isJson) {
            if (raw) return (await response.text()) as unknown as T;
            throw toApiError(response.status, `Unexpected response from the server (HTTP ${response.status}).`);
        }
        const payload = (await response.json()) as T | ApiErrorBody;
        if (!response.ok) {
            const body = payload as ApiErrorBody;
            const error = body.error;
            if (error) {
                throw new ApiError(response.status, error.code, error.message, error.requestId, error.details);
            }
            throw toApiError(response.status, `Request failed (HTTP ${response.status}).`);
        }
        return payload as T;
    }
}
