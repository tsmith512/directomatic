declare global {
  // In wrangler.toml
  const GSHEETS_API_ENDPOINT: string;

  // In secrets
  const GSHEETS_ID: string;
  const GSHEETS_API_KEY: string;
}

import { fetchRedirectRows } from './inputs';

export type RedirectCode = 301 | 302 | 307 | 308;

export interface RedirectProps {
  source: string;
  destination: string;
  code: RedirectCode;
  localized: boolean;
  deleted: boolean;
}

export interface RawRedirectProps {
  source: string;
  destination: string;
  code?: string | number;
  localized?: string | boolean;
  deleted?: string | boolean;
}

const handleRequest = async (): Promise<Response> => {
  const rawRows = await fetchRedirectRows();
  return new Response(JSON.stringify(rawRows), {
    headers: { 'content-type': 'application/json' },
  });
};

addEventListener('fetch', (event: any) => {
  event.respondWith(handleRequest());
});

export {};
