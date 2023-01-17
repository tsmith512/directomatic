import chalk from 'chalk';

import { DirectomaticResponse, Locales, RedirectCode, RedirectProps } from '.';
import { makeFullURL } from './processing';

/**
 * Key properties of the rule list itself.
 */
export interface BulkRedirectList {
  name: string;
  description: string;
  kind: 'redirect';
}

/**
 * The Rules List API refers to an array of [{ redirect: theRedirectObj }, ...]
 * entries with some metadata we don't track but need to keep nested properly.
 */
export interface BulkRedirectListItem {
  id?: string;
  redirect: BulkRedirectListItemDetails;
  created_on?: string;
  modified_on?: string;
}

/**
 * The actual redirect rule formatted for the Rules List API. Source and dest
 * must both be complete URLs and the status code must be one of the allowable
 * HTTP 3xx response codes. Nothing else is stored at the row-level on Dash.
 */
export interface BulkRedirectListItemDetails {
  source_url: string;
  target_url: string;
  status_code: RedirectCode;
}

// For the list metadata
const listApi = `${process.env.CF_API_ENDPOINT}/accounts/${process.env.CF_ACCT_ID}/rules/lists/${process.env.CF_LIST_ID}`;

// To the redirects contained in that list
const listItemsApi = `${process.env.CF_API_ENDPOINT}/accounts/${process.env.CF_ACCT_ID}/rules/lists/${process.env.CF_LIST_ID}/items`;

// For bulk operations API (you'll still need to append the operation ID)
const bulkOpsApi = `${process.env.CF_API_ENDPOINT}/accounts/${process.env.CF_ACCT_ID}/rules/lists/bulk_operations`;

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
  return input.flatMap((row) => {
    const list = [
      {
        source_url: makeFullURL(row.source),
        target_url: makeFullURL(row.destination),
        status_code: row.code,
      },
    ];

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
    return list.map((row) => ({ redirect: row }));
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
      'authorization': `Bearer ${process.env.CF_API_TOKEN}`,
    },
  });

  const payload: any = await response.json();

  const messages = [
    `Cloudflare Rules List URL https://dash.cloudflare.com/${process.env.CF_ACCT_ID}/configurations/lists/${process.env.CF_LIST_ID}`,
  ];

  if (payload?.result) {
    messages.push(
      `Cloudflare list ${payload.result?.name} contains ${payload.result?.num_items} rules.`
    );
    messages.push(`Cloudflare list description: ${payload.result?.description}`);
  }

  const result: DirectomaticResponse = {
    success: response.ok && payload.success,
    errors: response.ok
      ? payload.errors
      : [
          `Cloudflare API returned ${response.status}, ${response.statusText}`,
          payload.errors,
        ].flat(),
    messages: [messages, payload.messages].flat(),
  };

  return result;
};

/**
 * Truncate the Bulk Redirect List.
 *
 * Doing this separately from adding new items worked more consistently.
 *
 * @returns (boolean) was the operation successful
 */
export const emptyBulkList = async (): Promise<boolean> => {
  return await fetch(listItemsApi, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${process.env.CF_API_TOKEN}`,
    },
    body: JSON.stringify([]),
  })
    .then((res: any) => res.json())
    .then((payload: any) => payload.success as boolean);
};

/**
 * Given a list of rules, POST (append and possibly upsert) the items to the
 * Cloudflare Rules List API.
 *
 * @TODO: This works but is inconsistent with API documentation, and behavior
 * has changed since Directomatic v1. PUT with large payloads have no effect,
 * but a POST with duplicates will no longer error out.
 *
 * @param list (BulkRedirectListItem[]) The rules ready to upload
 * @returns TBD -- API response from Cloudflare directly
 */
export const uploadBulkList = async (
  list: BulkRedirectListItem[]
): Promise<DirectomaticResponse> => {
  const response: any = await fetch(listItemsApi, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${process.env.CF_API_TOKEN}`,
    },
    body: JSON.stringify(list),
  }).then((res) => {
    if (res.status === 200) {
      return res.json();
    }

    if (res.status === 429) {
      // We got rate-limited, let's return that instead of the response object
      // so we can re-try at the top-level.
      return 429;
    }

    // @TODO: If we're here, we didn't get a 200 OK or a 429 RATE LIMIT...
    // so what happened?
    console.log(res);
    return res.json();
  });

  if (response === 429) {
    console.log(
      `${chalk.yellow(
        'Rate Limited. Waiting 6 minutes.'
      )} (starting at ${new Date().getHours()}:${new Date().getMinutes()})`
    );
    await new Promise((r) => setTimeout(r, 1000 * 60 * 6));
    return await uploadBulkList(list);
  }

  const report: DirectomaticResponse = {
    success: response?.success || false,
    errors: response?.errors || [],
    messages: response?.messages || [],
    invalidRules: [],
  };

  // Pick apart the response from Cloudflare to determine which of the Bulk Rules
  // the API objected to. These won't match rows from the spreadsheet exactly.
  if (response?.errors?.length) {
    report.invalidRules = response.errors.map((e: any) => {
      // @TODO: This may not work once hostnames are applied?
      // WIP: I was getting exceptions on this line beause the API was giving me
      // back a ratelimiting error, not an error about a particular rule. Need to
      // actually pick apart responses, but in the meantime, just shove the
      // API errir into the response and I'll read it in the output. :puke:
      return list[e?.source?.parameter_value_index] || e;
    });
  }

  // No errors on upload, update the description with the name of this app + date
  else {
    report.bulkOperationsId = response.result.operation_id;
  }

  return report;
};

/**
 * Given a list of individual rules, DELETE them. (Requires that they have an
 * id property, generally set by having fetched them. Does not match src/dest
 * pairs.)
 *
 * @TODO: This is very similar to uploadBulkList(), consolidate?? Although the
 * shape of the API payload is different.
 *
 * @param list (BulkRedirectListItem[]) The rules ready to upload
 * @returns TBD -- API response from Cloudflare directly
 */
export const deleteBulkListItems = async (
  list: BulkRedirectListItem[]
): Promise<DirectomaticResponse> => {
  const items = list.flatMap((r) => {
    if ('id' in r) {
      return { id: r.id };
    } else {
      return [];
    }
  });

  const response: any = await fetch(listItemsApi, {
    method: 'DELETE',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${process.env.CF_API_TOKEN}`,
    },
    body: JSON.stringify({ items: items }),
  }).then((res) => {
    if (res.status === 200) {
      return res.json();
    }

    if (res.status === 429) {
      // We got rate-limited, let's return that instead of the response object
      // so we can re-try at the top-level.
      return 429;
    }

    // @TODO: If we're here, we didn't get a 200 OK or a 429 RATE LIMIT...
    // so what happened?
    console.log(res);
    return res.json();
  });

  if (response === 429) {
    console.log(
      `${chalk.yellow(
        'Rate Limited. Waiting 6 minutes.'
      )} (starting at ${new Date().getHours()}:${new Date().getMinutes()})`
    );
    await new Promise((r) => setTimeout(r, 1000 * 60 * 6));
    return await deleteBulkListItems(list);
  }

  const report: DirectomaticResponse = {
    success: response?.success || false,
    errors: response?.errors || [],
    messages: response?.messages || [],
  };

  if (response.result?.operation_id) {
    report.bulkOperationsId = response.result.operation_id;
  }

  return report;
};

/**
 * Query the Cloudflare API to fetch all currently published redirects.
 *
 * @TODO: Cache this locally, wow this takes a while.
 *
 * Paginated results come in pages of 25. Set the "cursor" query arg from the
 * previous response's result_into.cursors.after to get the next page. When
 * result_info.cursors.after is not defined, you're on the last page.
 *
 * @returns (Promise<BulkRedirectListItem[]>) Published redirect list rules
 */
export const getBulkListContents = async (): Promise<BulkRedirectListItem[]> => {
  const listContents: BulkRedirectListItem[] = [];
  let cursor: string | boolean = '';
  let i = 1;

  console.log(chalk.yellow('Fetching all Bulk Redirect list items...'));

  // eslint-disable-next-line no-constant-condition
  while (cursor !== false) {
    const response: any = await fetch(
      `${listItemsApi}${cursor ? '?cursor=' + cursor : ''}`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${process.env.CF_API_TOKEN}`,
        },
      }
    ).then((res: any) => {
      if (res.status === 200) {
        return res.json();
      }

      if (res.status === 429) {
        // We got rate-limited, let's return that instead of the response object
        // so we can re-try at the top-level.
        return 429;
      }

      // @TODO: If we're here, we didn't get a 200 OK or a 429 RATE LIMIT...
      // so what happened?
      console.log(res);
      return res.json();
    });

    if (response === 429) {
      console.log(
        `${chalk.yellow(
          'Rate Limited. Waiting 6 minutes.'
        )} (starting at ${new Date().getHours()}:${new Date().getMinutes()})`
      );
      await new Promise((r) => setTimeout(r, 1000 * 60 * 6));
      // We're just in a loop, if we continue without updating cursor or i,
      // it'll repeat the same request.
      continue;
    }

    if (response?.result?.length) {
      listContents.push(...response.result);
    }

    if (typeof process.stdout !== 'undefined') {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`Page ${i} / Total ${listContents.length}`);
    }

    cursor = response.result_info?.cursors?.after || false;
    i++;
  }

  console.log(chalk.green(`\nReceived ${listContents.length} redirects.`));

  return listContents;
};

/**
 * Query the Bulk Operations API to check status of an async PUT/POST operation.
 *
 * @param id (string) Bulk Operation ID to query
 * @returns (boolean) True if operation confirmed successful; false otherwise
 */
export const getBulkOpsStatus = async (id: string): Promise<boolean> => {
  return fetch(`${bulkOpsApi}/${id}`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${process.env.CF_API_TOKEN}`,
    },
  })
    .then((res) => res.json())
    .then(async (payload) => {
      if (payload.result.status === 'completed') {
        console.log(chalk.green('Bulk Operation completed.'));
        return true;
      } else if (payload.result.status === 'failed') {
        console.log(chalk.red('Bulk Operation failed:'));
        console.log(payload.error);
        return false;
      }

      // @TODO: It's pending or in progress... need to wait.
      await new Promise((r) => setTimeout(r, 5000));
      return await getBulkOpsStatus(id);
    })
    .catch((err) => {
      console.log(chalk.red('Checking for bulk operations status failed.'));
      console.log(err);
      return false;
    });
};

/**
 * Update the list description
 *
 * @param desc (string) New description to set
 * @returns (boolean) true if HTTP response is a success
 *
 * @TODO: Should check res.ok and also payload.success probably...
 */
export const setListDescription = async (desc: string): Promise<boolean> => {
  return await fetch(listApi, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${process.env.CF_API_TOKEN}`,
    },
    body: JSON.stringify({ description: desc }),
  }).then((res) => res.ok);
};
