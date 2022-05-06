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
