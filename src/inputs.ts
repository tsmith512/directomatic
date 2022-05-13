import { RawRedirectProps } from '.';

/**
 * Look up the spreadsheet, pull all its rows, and return key:value objects of
 * the raw content of those rows. Needs to be sanitized/validated before use.
 *
 * @returns (Promise of RawRedirectProps[]) An array of raw redirect entries.
 */
export const fetchRedirectRows = async (): Promise<RawRedirectProps[]> => {
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

      // Take the array of rows and turn 'em into key:value objects and return
      return rows.map((row: any) => mergeHeaders(headers, row));
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
