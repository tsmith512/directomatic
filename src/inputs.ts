import { RawRedirectProps, RedirectProps } from '.';
import { processSheetRow } from './processing';

/**
 * Look up the spreadsheet, pull all its rows, and process them into redirect
 * with sanitized and normalized properties.
 * @returns (Promise of RecirectProps[]) An array of redirects to enter.
 */
export const fetchRedirectRows = async (): Promise<RedirectProps[]> => {
  const lookup = `${GSHEETS_API_ENDPOINT}/${GSHEETS_ID}/values/Redirects!A:E?key=${GSHEETS_API_KEY}&valueRenderOption=UNFORMATTED_VALUE`;

  return await fetch(lookup)
    .then((response) => response.json())
    .then((payload: any) => {
      if (payload.values?.length < 0) {
        throw new Error('Google Sheets API did not return any rows.');
      }

      // Get the rows out of the spreadsheet
      const rows = payload.values;

      // Shift the first row (headers) off, and then pull key names from it.
      // Header cells are all formatted "[key]: Descpription (Acceptable Value)"
      const headers = payload.values
        .shift()
        .map((header: string) => header.replace(/:.+/, ''));

      // Now process each object to sanitize it as a real RediredtProps we can
      // submit. Use flatMap to easily drop anything that doesn't validate.
      return rows.flatMap((row: any) => {
        return processSheetRow(mergeHeaders(headers, row)) ?? [];
      });
    });
};

/**
 * Merges an array of keys and an array of values into an object.
 *
 * @param headers (string[]) the keys
 * @param row (any[]) the values
 * @returns (object) of {headers[0]: row[0], ... }
 */
const mergeHeaders = (headers: string[], row: any[]) => {
  const entries = [];

  for (let i = 0; i < headers.length; i++) {
    entries.push([headers[i], row[i]]);
  }

  return Object.fromEntries(entries);
};
