declare global {
  // In wrangler.toml
  const GSHEETS_API_ENDPOINT: string;

  // In secrets
  const GSHEETS_ID: string;
  const GSHEETS_API_KEY: string;
}

import { fetchRedirectRows } from './sourcing';

export type RedirectCode = 301 | 302 | 307 | 308;

export interface RedirectProps {
  source: string;
  destination: string;
  code: RedirectCode;
  localized: boolean;
  deleted: boolean;
}

const handleRequest = async (): Promise<Response> => {
  return new Response(JSON.stringify(await fetchRedirectRows()));
};

addEventListener('fetch', (event: any) => {
  event.respondWith(handleRequest());
});

export {};
