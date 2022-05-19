/**
 * A very simple check that a bearer token in the authorization header matches
 * a secret value stored in the environment var AUTH_TOKEN.
 *
 * Based on tsmith512/rnf-location-service and itty-router middleware examples.
 *
 * @TODO: Both --- this could be better and also an Access service token would
 * suffice here, provided it can be confirmed here, too.
 *
 * @param request (Request) inbound request passed in from itty-router
 * @returns (undefined | Response) Nothing or a 401 Unauthorized response
 */
export const authCheck = (request: Request): undefined | Response => {
  const authHeader = request.headers.get('Authorization');

  if (authHeader) {
    const token = authHeader.split(' ').pop();

    if (token === AUTH_TOKEN) {
      return;
    }
  }

  // Stop request processing by issuring a request.
  return new Response(JSON.stringify({
    success: false,
    errors: ['Missing or invalid bearer token'],
    messages: ['Authorization failure for Directomatic access'],
  }), {
    status: 401,
    headers: {
      'Content-Type': 'text/json',
    },
  });
};
