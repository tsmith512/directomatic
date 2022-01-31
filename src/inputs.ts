import { RawRedirectProps } from '.';

export const fetchRedirectRows = async (): Promise<RawRedirectProps[]> => {
  const lookup = `${GSHEETS_API_ENDPOINT}/${GSHEETS_ID}/values/Redirects!A:D?key=${GSHEETS_API_KEY}&valueRenderOption=UNFORMATTED_VALUE`;

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

      return rows.map((row: any) => {
        return mergeHeaders(headers, row);
        // return processSheetRow(unverifiedRedirect);
      });
    });
};

const mergeHeaders = (headers: string[], row: any[]) => {
  const entries = [];

  for (let i = 0; i < headers.length; i++) {
    entries.push([headers[i], row[i]]);
  }

  return Object.fromEntries(entries);
};
