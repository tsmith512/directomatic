import { RawRedirectProps, RedirectProps } from '.';
import { validateBoolean, validatePath, validateCode } from './validators';

export const processSheetRow = (input: RawRedirectProps): RedirectProps => {
  const redirect = {
    source: validatePath(input.source),
    destination: validatePath(input.destination),
    code: validateCode(input.code, 302),
    localized: validateBoolean(input.localized, true),
    deleted: validateBoolean(input.deleted, false),
  };

  // @TODO: Need a way to return and/or bail out if a row is not valid.

  return redirect;
};
