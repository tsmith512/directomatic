![Directomatic](./docs/directomatic.png)

# A Redirect Generator

This service, intended to run locally or as a Cloudflare
[Worker](https://developers.cloudflare.com/workers) consumes a list of redirect
paths (or full URLs) from a Google Sheet and produces a validated, localized,
full-URL list of rules for Cloudflare's
[Bulk Redirects](https://developers.cloudflare.com/rules/bulk-redirects/).

This service exposes a very simple API but currently lacks a frontend. I hope you
like [Postman](https://www.postman.com/) or [Insomnia](https://insomnia.rest/).
Or you're a badass who can `cURL` everything.

## Setup

- Create a Google Sheet
  - @TODO Sample starter
- Provision a Google Sheets API token to read from it
- Create a Cloudflare Rules List of type "redirect"
- Provision a Cloudflare API token (TBD) to write to it
- Create a Directomatic Worker (whether you intend to run locally or not)
- Add the following _[Secrets](https://developers.cloudflare.com/workers/wrangler/commands/#secret)_ using Wrangler:
  - `AUTH_TOKEN` the Bearer token used to authenticate any Directomatic request
  - `GSHEETS_ID` the spreadsheet ID, which you can get from the URL
  - `GSHEETS_API_KEY` the API key for Google Sheets
  - `CF_ACCT_ID` the Account Tag (external ID) that owns the list
  - `CF_LIST_ID` the Rules List ID, which must be a "redirects" list
  - `CF_API_TOKEN` the API key for Cloudflare API
- Confirm in `wrangler.toml` that the default values are acceptable for:
  - `GSHEETS_API_ENDPOINT`
  - `CF_API_ENDDPOINT`
  - `DEFAULT_DEST_DOMAIN` the default base domain and schema for path-only rules.
    - **You will definitely need to edit this.**
    - @TODO: So store elsewhere?
  - @TODO: Locales are hard-coded but should be configurable.
- Deploy Directomatic to Workers or use `wrangler dev` to run it locally.
  - Either way, use the Bearer token to authenticate all requests to it.
- Request `/status` to confirm that both API integrations are properly running.

## Usage

- Populate the spreadsheet with the necessary paths.
- Use `/list` to confirm that they are being read and pass validation.
- Use `/publish` to generated localized URLs and add them to the Cloudflare List
- If you haven't already, ["create a Bulk Redirect rule to enable the redirects in the list"](https://developers.cloudflare.com/rules/bulk-redirects/create-dashboard/#3-create-a-bulk-redirect-rule-to-enable-the-redirects-in-the-list) in the Cloudflare Dashboard.
