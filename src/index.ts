declare global {
  // In wrangler.toml
  const GSHEETS_API_ENDPOINT: string;

  // In secrets
  const GSHEETS_ID: string;
  const GSHEETS_API_KEY: string;
}

interface RedirectProps {
  source: string,
  destination: string,
  code: 301 | 302 | 307 | 308,
  localized: boolean,
  deleted: boolean,
}

const fetchRedirectRows = async (): Promise<any> => {
  const lookup = `${GSHEETS_API_ENDPOINT}/${GSHEETS_ID}/values/Redirects!A:D?key=${GSHEETS_API_KEY}&valueRenderOption=UNFORMATTED_VALUE`;

  return await fetch(lookup)
    .then((response) => {
      console.log(response);
      return response.json()
    })
    .then((payload: any) => {
      console.log(payload);
      return payload;
    });
}

const handleRequest = async (request: Request): Promise<Response> => {
  return new Response(JSON.stringify(await fetchRedirectRows()));
};

addEventListener('fetch', (event: any) => {
  event.respondWith(handleRequest(event.request));
});

export {};
