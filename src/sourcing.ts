import { RedirectProps } from './';
import { validateBoolean, validatePath, validateCode } from './validators';

export const fetchRedirectRows = async (): Promise<any> => {
  const lookup = `${GSHEETS_API_ENDPOINT}/${GSHEETS_ID}/values/Redirects!A:D?key=${GSHEETS_API_KEY}&valueRenderOption=UNFORMATTED_VALUE`;

  return await fetch(lookup)
    .then((response) => response.json())
    .then((payload: any) => {
      if (payload.values?.length < 0) {
        throw new Error('Google Sheets API did not return any rows.');
      }

      const rows = payload.values;
      const headers = payload.values
        .shift()
        .map((header: string) => header.replace(/:.+/, ''));

      return rows.map((row: any) => {
        const unverifiedRedirect = mergeHeaders(headers, row);
        return processSheetRow(unverifiedRedirect);
      });
    });
};

const processSheetRow = (input: any): RedirectProps => {
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

const mergeHeaders = (headers: string[], row: any[]) => {
  const entries = [];

  for (let i = 0; i < headers.length; i++) {
    entries.push([headers[i], row[i]]);
  }

  return Object.fromEntries(entries);
};
