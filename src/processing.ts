import { BulkRedirectListItem, Locales, RawRedirectProps, RedirectProps } from '.';
import { validateBoolean, validatePath, validateCode } from './validators';

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
    return null;
  }

  // Now sanity check the object as a whole.
  if (redirect.source === redirect.destination) {
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
 * Given a redirect destination, if it has no hostname, add the locale prefix if
 * provided and prepend the default hostname. Otherwise leave unchanged.
 *
 * @param destination (string) The redirect target.
 * @param locale (string?) Optional. A locale for prefixing.
 * @returns (string) The full URL to redirect to.
 */
const makeDestination = (destination: string, locale?: string): string => {
  if (destination.indexOf('/') === 0) {
    return DEFAULT_DEST_DOMAIN + (locale ? `/${locale}` : '') + destination;
  }

  return destination;
}

/**
 * Tahe the list of redirect rows, add the destination domain, make an item for
 * each locale, and return them as objects ready for Dash.
 *
 * @param input (RedirectProps[]) A clean list of redirect entries
 * @returns (BulkRedirectListItem[]) Raw redirect list entries for a CF Bulk Redirect List
 */
export const processBulkList = (input: RedirectProps[]): BulkRedirectListItem[] => {
  return input.flatMap(row => {
    const list = [{
      source_url: row.source,
      target_url: makeDestination(row.destination),
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
          source_url: `/${locale}${row.source}`,
          target_url: makeDestination(row.destination, locale),
          status_code: row.code,
        });
      }
    }

    return list;
  });
};
