# Google Sheets Sync Function

Copy large/unwieldy Google Sheets data tabs from one sheet to {1..n} other sheets copies data from specific sheets in one Google Spreadsheet to another. It also posts sync results to a Slack channel.

## How It Works
- Reads mapping of source → target sheets.
- Copies data from source to target.
- Clears old data in target before copying.
- Posts success/failure to a Slack webhook.

## Setup
1. **Google Cloud Service Account**
   - Create a service account with `Google Sheets API` access.
   - Download the JSON key file as `credentials.json`.
   - **Do not commit this file.**

2. **Environment Variables**
   Store your Slack webhook as an env variable:
   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Deploy to Google Cloud Functions**

   ```bash
   gcloud functions deploy syncSheets \
     --gen2 \
     --region=us-central1 \
     --runtime=nodejs20 \
     --trigger-http \
     --entry-point=syncSheets \
     --allow-unauthenticated
   ```

## Example Sheet mapping

   ```javascript
   const mappings = [
     {
       sourceId: "SOURCE_SPREADSHEET_ID",
       sourceSheet: "Source Sheet Name",
       targetId: "TARGET_SPREADSHEET_ID",
       targetSheet: "Target Sheet Name"
     },
   ];
   ```

## Scheduling
Use Google Cloud Scheduler to call this function on a nightly cron schedule.

## Notes
1. Uses USER_ENTERED mode to preserve dates, numbers, formats.
2. Sensitive keys are kept outside the repo.
