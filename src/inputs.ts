import { DirectomaticResponse, RawRedirectProps } from '.';

const lookup = `${process.env.GSHEETS_API_ENDPOINT}/${process.env.GSHEETS_ID}/values/Redirects!A:E?key=${process.env.GSHEETS_API_KEY}&valueRenderOption=UNFORMATTED_VALUE`;

/**
 * Check that the Google Sheet in configuration is reachable and see if it has
 * any rows in it already.
 *
 * @returns (Promise<DirectomaticResponse>) Status information
 */
export const checkSpreadsheetStatus = async (): Promise<DirectomaticResponse> => {
  const response = await fetch(lookup);
  const payload: any = await response.json();

  const result: DirectomaticResponse = {
    success: response.ok,
    errors: response.ok
      ? []
      : [`Google Sheet API returned ${response.status}, ${response.statusText}`],
    messages: payload?.values?.length
      ? [`Google Sheet contains ${payload.values.length} total rows.`]
      : ['Google Sheet could not be queried or contains no rows.'],
  };

  result.messages?.push(
    `Google Sheet URL https://docs.google.com/spreadsheets/d/${process.env.GSHEETS_ID}/edit`
  );

  return result;
};

/**
 * Look up the spreadsheet, pull all its rows, and return key:value objects of
 * the raw content of those rows. Needs to be sanitized/validated before use.
 *
 * @returns (Promise of RawRedirectProps[]) An array of raw redirect entries.
 */
export const fetchRedirectRows = async (): Promise<RawRedirectProps[]> => {
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
