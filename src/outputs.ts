import {  DirectomaticResponse, Locales, RedirectProps } from "."
import { makeFullURL } from "./processing";

export interface BulkRedirectList {
  name: string;
  description: string;
  kind: 'redirect';
}

export interface BulkRedirectListItem {
  redirect: BulkRedirectListItemDetails;
}

export interface BulkRedirectListItemDetails {
  source_url: string;
  target_url: string;
  status_code: number;
}


// For the list metadata
const listApi = `${CF_API_ENDPOINT}/accounts/${CF_ACCT_ID}/rules/lists/${CF_LIST_ID}`;

// To the redirects contained in that list
const listItemsApi = `${CF_API_ENDPOINT}/accounts/${CF_ACCT_ID}/rules/lists/${CF_LIST_ID}/items`;

export interface BulkUploadReport {
  success: boolean;
  operation_id?: string;
  errors: any[];
  messages: any[];
  invalid_rules: BulkRedirectListItem[];
}


/**
 * Take the list of redirect rows, add the destination domain, make an item for
 * each locale, and return them as objects ready for Dash.
 *
 * @param input (RedirectProps[]) A clean list of redirect entries
 * @returns (BulkRedirectListItem[]) Raw redirect list entries for a CF Bulk Redirect List
 */
 export const makeBulkList = (input: RedirectProps[]): BulkRedirectListItem[] => {
  return input.flatMap(row => {
    const list = [{
      source_url: makeFullURL(row.source),
      target_url: makeFullURL(row.destination),
      status_code: row.code,
    }];

    // Add in locale-prefixed paths for localized redirects.
    if (row.localized) {
      for (const locale of Locales) {
        // We don't use en-us as a locale prefix on Marketing Site.
        if (locale === 'en-us') {
          continue;
        }

        // For other locales, add a redirect for that locale, too.
        list.push({
          source_url: makeFullURL(row.source, locale),
          target_url: makeFullURL(row.destination, locale),
          status_code: row.code,
        });
      }
    }

    // Per https://developers.cloudflare.com/rules/bulk-redirects/create-api/
    // the actual stucture isn't an array of rules, it's an array of { redirect: rule }
    return list.map(row => ({ redirect: row }));
  });
};

/**
 * Query the Cloudflare API about the Rules List to see if it is accessible and
 * contains any rows already.
 *
 * @returns (Promise<DirectomaticResponse>) Status information
 */
export const getBulkListStatus = async (): Promise<DirectomaticResponse> => {
  const response = await fetch(listApi, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${CF_API_TOKEN}`,
    }
  });

  const payload: any = await response.json();

  const messages = [`Cloudflare Rules List URL https://dash.cloudflare.com/${CF_ACCT_ID}/configurations/lists/${CF_LIST_ID}`];

  if (payload?.result) {
    messages.push(`Cloudflare list ${payload.result?.name} contains ${payload.result?.num_items} rules.`);
    messages.push(`Cloudflare list description: ${payload.result?.description}`);
  }

  const result: DirectomaticResponse = {
    success: response.ok && payload.success,
    errors: response.ok ? payload.errors :
      [
        `Cloudflare API returned ${response.status}, ${response.statusText}`,
        payload.errors
      ].flat(),
    messages: [messages, payload.messages].flat(),
  };

  return result;
}

/**
 * Given the new list of rules, PUT (completely replace) the destination list in
 * the Cloudflare Rules List API.
 *
 * @param list (BulkRedirectListItem[]) The rules ready to upload
 * @returns TBD -- API response from Cloudflare directly
 */
export const uploadBulkList = async (list: BulkRedirectListItem[]): Promise<DirectomaticResponse> => {
  const response: any = await fetch(listItemsApi, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${CF_API_TOKEN}`,
    },
    body: JSON.stringify(list),
  }).then(res => res.json());

  const report: DirectomaticResponse = {
    success: response?.success || false,
    errors: response?.errors || null,
    messages: response?.messages || null,
    invalidRules: [],
  };

  // Pick apart the response from Cloudflare to determine which of the Bulk Rules
  // the API objected to. These won't match rows from the spreadsheet exactly.
  if (response?.errors?.length) {
    report.invalidRules = response.errors.map((e: any) => {
      return list[e.source.parameter_value_index];
    });
  }

  // No errors on upload, update the description with the name of this app + date
  else {
    await fetch(listApi, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${CF_API_TOKEN}`,
      },
      body: JSON.stringify({ description: `Updated by Directomatic on ${Date()}`}),
    });
  }

  return report;
};
