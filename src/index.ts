declare global {
  // In wrangler.toml
  const GSHEETS_API_ENDPOINT: string;
  const DEFAULT_DEST_DOMAIN: string;

  // In secrets
  const GSHEETS_ID: string;
  const GSHEETS_API_KEY: string;
}

import { fetchRedirectRows } from './inputs';
import { processBulkList, processSheetRow } from './processing';

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

export interface BulkRedirectList {
  name: string;
  description: string;
  kind: 'redirect';
}

export interface BulkRedirectListItem {
  source_url: string;
  target_url: string;
  status_code: number;
}

// @TODO: This is not complete; just for initial dev.
export const Locales = ['en-us', 'de-de', 'es-es'];

const handleRequest = async (): Promise<Response> => {
  // Source the unprocessed redirects list from the Google Sheet. They'll have
  // the right keys but values aren't checked yet.
  const inputRows = await fetchRedirectRows();

  // Sanitize, validate, and clean up the input list into our final list
  const redirectsList = inputRows.flatMap((row) => {
    return processSheetRow(row) ?? [];
  });

  const bulkList = processBulkList(redirectsList);

  return new Response(JSON.stringify(bulkList), {
    headers: { 'content-type': 'application/json' },
  });
};

addEventListener('fetch', (event: any) => {
  event.respondWith(handleRequest());
});

export {};
