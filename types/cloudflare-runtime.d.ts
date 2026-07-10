// The deployment worker receives these bindings from Cloudflare. Keeping this
// lightweight declaration local lets the frontend type-check without requiring
// Cloudflare's generated runtime type package for the empty-MVP configuration.
declare type Fetcher = { fetch(input: Request | URL | string, init?: RequestInit): Promise<Response> };
declare type D1Database = Record<string, unknown>;

declare module "cloudflare:workers" {
  export const env: { DB?: D1Database };
}
