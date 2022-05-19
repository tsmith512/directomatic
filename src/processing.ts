import { RawRedirectProps, RedirectProps } from '.';
import { BulkRedirectListItem } from './outputs';
import { validateBoolean, validatePath, validateCode } from './validators';

/**
 * Given raw input, sanitize and validate. Report errors to console/logs and
 * return null to prevent anything weird being published.
 *
 * @param input (RawRedirectProps) A row from the spreadsheet
 * @returns (RedirectProps | null) Validated/sanitized redirect or null on error
 */
export const processSheetRow = (input: RawRedirectProps): RedirectProps | null => {
  let redirect;

  // Validate each of the fields individually, an exception on any of which will
  // cause this row to be skipped.
  try {
    redirect = {
      source: validatePath(input.source),
      destination: validatePath(input.destination),
      code: validateCode(input.code, 302),
      localized: validateBoolean(input.localized, true),
      deleted: validateBoolean(input.deleted, false),
    };
  } catch {
    console.log(`Redirect from ${input?.source} to ${input?.destination} is invalid.`);
    return null;
  }

  // Now sanity check the object as a whole.
  if (redirect.source === redirect.destination) {
    console.log(`Redirect from ${redirect.source} redirects to itself.`);
    return null;
  }

  // @TODO: THIS WILL DEPEND ON HOW THE SUBMISSION TO THE CLOUDFLARE LIST WORKS.
  // If a PUT to that enpoint will completely replace the List, then we don't
  // need to retain deleted redirects. We should dump them here. HOWEVER, if it
  // is a PATCH instead, then we need to keep those here and delete them server
  // side when that happens. Currently assuming a PUT/replace.
  if (redirect.deleted) {
    return null;
  }

  return redirect;
};

/**
 * Given a redirect src/dest, if it has no hostname, add the locale prefix if
 * provided and prepend the default hostname. Otherwise leave unchanged.
 *
 * @param destination (string) The redirect target.
 * @param locale (string?) Optional. A locale for prefixing.
 * @returns (string) The full URL to redirect to.
 */
export const makeFullURL = (path: string, locale?: string): string => {
  if (path.indexOf('/') === 0) {
    return DEFAULT_DEST_DOMAIN + (locale ? `/${locale}` : '') + path;
  }

  return path;
};

/**
 * Do these two redirects match?
 *
 * @param a (BulkRedirectListItem) A redirect item to test
 * @param b (BulkRedirectListItem) A redirect item to test
 * @returns (boolean)
 */
export const redirectCompare = (a: BulkRedirectListItem, b: BulkRedirectListItem): boolean => {
  return (
    (a.redirect.source_url === b.redirect.source_url) &&
    (a.redirect.target_url === b.redirect.target_url) &&
    (a.redirect.status_code === b.redirect.status_code)
  );
};

/**
 * Is the provided redirect in the given list?
 *
 * @param needle (BulkRedirectListItem) A redirect to find
 * @param haystack (BulkRedirectListItem[]) The list to find it in
 * @returns (boolean)
 */
export const ruleInList = (needle: BulkRedirectListItem, haystack: BulkRedirectListItem[]): boolean => {
  return haystack.findIndex(test => {
    return redirectCompare(needle, test);
  }) !== -1;
};
