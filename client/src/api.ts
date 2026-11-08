const env = (import.meta as {
  env?: { DEV?: boolean; VITE_API_URL?: string; VITE_SOCKET_URL?: string }
}).env;
let backendUrlPromise: Promise<string> | undefined;
let resolvedBackendUrl: string | undefined;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const apiUrl = env?.VITE_API_URL ?? `${await getBackendUrl()}/api`;
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json() as { error?: string } & T;
  if (!response.ok) {
    throw new ApiError(result.error ?? 'The request could not be completed.', response.status);
  }
  return result;
}

export async function socketUrl(): Promise<string> {
  return env?.VITE_SOCKET_URL ?? getBackendUrl();
}

export function mediaUrl(path: string): string {
  const base = env?.VITE_API_URL
    ? new URL(env.VITE_API_URL, window.location.origin).origin
    : resolvedBackendUrl ?? window.location.origin;
  return new URL(path, base).toString();
}

function getBackendUrl(): Promise<string> {
  if (!backendUrlPromise) {
    backendUrlPromise = discoverBackendUrl().catch((error: unknown) => {
      backendUrlPromise = undefined;
      throw error;
    });
  }
  return backendUrlPromise;
}

async function discoverBackendUrl(): Promise<string> {
  if (!env?.DEV) return window.location.origin;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch('/__backend', { cache: 'no-store' });
    if (response.ok) {
      const result = await response.json() as { port?: number };
      if (!Number.isInteger(result.port) || !result.port || result.port < 1 || result.port > 65535) {
        throw new Error('The backend returned an invalid port.');
      }
      const backendUrl = new URL(window.location.origin);
      backendUrl.port = String(result.port);
      resolvedBackendUrl = backendUrl.origin;
      return resolvedBackendUrl;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('The backend did not become available. Check the backend startup logs and configuration.');
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifyPrivateMessages: boolean;
  notifyContent: boolean;
  notifyLivestreams: boolean;
}

export interface SiteSettings {
  siteName: string;
  welcomeMessage: string;
}

export interface AppNotification {
  id: string;
  category: 'private_messages' | 'content' | 'livestreams';
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt: string | null;
}

export interface ContentItem {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  likesCount: number;
  liked: boolean;
  assets: ContentAsset[];
}

export interface ContentAsset {
  id: string;
  name: string;
  mimeType: string;
  category: 'document' | 'video';
  sizeBytes: number;
  url: string;
  likesCount: number;
  liked: boolean;
}

export interface Stream {
  id: string;
  title: string;
  roomName: string;
  startedAt: string | null;
  likesCount: number;
  liked: boolean;
}
