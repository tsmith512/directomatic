declare global {
  // In wrangler.toml
  const GSHEETS_API_ENDPOINT: string;
  const CF_API_ENDPOINT: string;
  const DEFAULT_DEST_DOMAIN: string;

  // In secrets
  const GSHEETS_ID: string;
  const GSHEETS_API_KEY: string;
  const CF_ACCT_ID: string; // Really, account TAG
  const CF_LIST_ID: string;
  const CF_API_TOKEN: string;
}

import { Router } from 'itty-router';

import { fetchRedirectRows } from './inputs';
import { processSheetRow } from './processing';
import { BulkRedirectListItem, makeBulkList, uploadBulkList } from './outputs';

export type RedirectCode = 301 | 302 | 307 | 308;

/**
 * A validated and sanitized redirect object.
 */
export interface RedirectProps {
  source: string;
  destination: string;
  code: RedirectCode;
  localized: boolean;
  deleted: boolean;
}

/**
 * A raw spreadsheet row that could be a redirect object.
 */
export interface RawRedirectProps {
  source: string;
  destination: string;
  code?: string | number;
  localized?: string | boolean;
  deleted?: string | boolean;
}

/**
 * Work-in-progress, but all responses from this service will be one of these.
 */
export interface DirectomaticResponse {
  success?: boolean; // If an action was requested
  errors?: any[];
  messages: any[];
  invalid_rules: BulkRedirectListItem[];
}

// @TODO: This is not complete; just for initial dev.
export const Locales = ['en-us', 'de-de', 'es-es'];

const router = Router();

router.get('/', () => {
  return new Response(JSON.stringify({ messages: ['Directomatic says hello.']}), {
    headers: { 'content-type': 'application/json' },
  });
});

router.get('/publish', async () => {
  // Source the unprocessed redirects list from the Google Sheet. They'll have
  // the right keys but values aren't checked yet.
  const inputRows = await fetchRedirectRows();

  // Sanitize, validate, and clean up the input list into our final list
  const redirectsList = inputRows.flatMap((row) => {
    return processSheetRow(row) ?? [];
  });

  // Get the final formatted list of redirects to upload
  const bulkList = makeBulkList(redirectsList);

  // Send the processed list to CF
  const uploadResponse = await uploadBulkList(bulkList);

  return new Response(JSON.stringify(uploadResponse), {
    headers: { 'content-type': 'application/json' },
  });
});

addEventListener('fetch', (event: any) => {
  event.respondWith(router.handle(event.request));
});

export {};
