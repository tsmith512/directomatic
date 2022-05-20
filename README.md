![Directomatic](./docs/directomatic.png)

# A Redirect Generator

This service, intended to run locally or as a Cloudflare
[Worker](https://developers.cloudflare.com/workers), consumes a list of redirect
paths (or full URLs) from a Google Sheet and produces a validated, localized,
full-URL list of rules for Cloudflare's
[Bulk Redirects](https://developers.cloudflare.com/rules/bulk-redirects/).

This service exposes a very simple API but currently lacks a frontend. I hope you
like [Postman](https://www.postman.com/) or [Insomnia](https://insomnia.rest/).
Or you're a badass who can `cURL` everything.

## Features

- Accommodates root-relative paths _or_ full URLs
- Adds locale prefixes if requested
- Reports and compares without publishing to avoid destructive edits

## Setup

- Create a Google Sheet
  - See [the sample](./docs/spreadsheet-template.csv) for column headers
  - Only columns A through E are required
  - _The tab must be called "Redirects"_
- Set the sharing options for the spreadsheet to "Anyone with the link can View"
- Provision a Google Sheets API token to read from it _(details below)_
- Create a Cloudflare Rules List of type "redirect" _(details below)_
- Provision a Cloudflare API token (TBD) to write to it
- Create a Directomatic Worker (whether you intend to run locally or not)
- Make up a Bearer token you will use to authenticate your requests. Doesn't matter what it is.
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
- Deploy Directomatic to Workers with `wrangler publish` or use `wrangler dev`
  to run it locally.
  - Either way, use the Bearer token to authenticate all requests to it.
- Request `/status` to confirm that both API integrations are properly running.

### Google Sheets Setup

- Visit https://console.cloud.google.com/apis/dashboard
- You will need to create a project and potentially a billing account (this project is well within free-tier)
- Use "Enable APIs and Services"
- Search for and enable "Google Sheets API"
- Then open "Credentials" or visit https://console.cloud.google.com/apis/credentials
- Use "Create Credentials" to create "API Key"
- Edit that API key to restrict it to the "Google Sheets API" only.
- Copy that API key and use `wrangler secret save GSHEETS_API_KEY`
- Open the spreadsheet and grab its id from the URL: `https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_SPREADSHEET_ID/edit#gid=0`
- Copy that ID and use `wrangler secret save GSHEETS_ID`

### Cloudflare Setup

**Create the List**

- Log into https://dash.cloudflare.com
- If you have access to multiple accounts, select the appropriate one
- From the account overview screen, open "Manage Account" -> "Configurations"
- Open the "Lists" tab and Create New List
  - Set whatever "List name" you want.
  - Direct-o-matic will set the description on successful upload.
  - "Content type" _must be "Redirect."_
- Grab your Account Tag (ID) and List ID from the URL of the edit page:
  - `https://dash.cloudflare.com/ACCOUNT_ID_HERE/configurations/lists/LIST_ID_HERE/add`
  - Save the account tag with `wrangler secret save CF_ACCT_ID`
  - Save the list ID with `wrangler secret save CF_LIST_ID`

**Provision the API Key**

- Navigate to https://dash.cloudflare.com/profile
- Open "API Tokens" and "Create Token"
- Look for "Create Custom Token" -> "Get Started"
- Under Permissions, add these two:
  - Account -> Bulk URL Redirects -> Edit
  - Account -> Account Filter Lists -> Edit
- If you login has access to multiple accounts, it's a good idea to restrict
  this key to a specific account under "Account Resources."
- The key will only be displayed once when it is created!
- Copy the key and save with `wrangler secret save CF_API_TOKEN`

## Usage

- Populate the spreadsheet with the necessary paths.
- Use `/status` to confirm both integrations are working.
- Use `/list` to read and validate rules from the spreadsheet.
- Use `/diff` to compare processed rules from the spreadsheet with the published
  rules on the Rules List API to see what would be added or removed.
- Use `/publish` to process the spreadsheet into rules and _replace_ the List on
  Cloudflare.
- If you haven't already, ["create a Bulk Redirect rule to enable the redirects in the list"](https://developers.cloudflare.com/rules/bulk-redirects/create-dashboard/#3-create-a-bulk-redirect-rule-to-enable-the-redirects-in-the-list) in the Cloudflare Dashboard.

## Known Limitations

- The spreadsheet must be set to "Anyone with the link can View"
- The app will not enable/disable the List as a Bulk Redirect list, only update
- There's no frontend

### Troubleshooting

- If Google Sheets returns a `400` error, make sure the tab with the redirects
  list is called "Redirects" and that the spreadsheet is publicly readable.
