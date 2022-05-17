import { RawRedirectProps, RedirectProps } from '.';
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
    console.log(`Redirect from ${redirect?.source} to ${redirect?.destination} is invalid.`);
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
}
