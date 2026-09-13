/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Overrides the backend API base URL, e.g. http://localhost:4000/api/v1 */
    readonly VITE_API_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
