const axios = require('axios');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const serviceAccount = require('./credentials.json'); // <-- Exclude from repo

const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/your/webhook/url'; // <-- Use env var in real deployment

const mappings = [
  {
    sourceId: "SOURCE_SPREADSHEET_ID",
    sourceSheet: "Source Sheet Name",
    targetId: "TARGET_SPREADSHEET_ID",
    targetSheet: "Target Sheet Name"
  },
  // Add more mappings as needed
];

exports.syncSheets = async (req, res) => {
  const slackMessages = [];

  try {
    const auth = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    for (const map of mappings) {
      console.log(`🔁 ${map.sourceSheet} → ${map.targetSheet}`);
      try {
        const sourceMeta = await sheets.spreadsheets.get({ spreadsheetId: map.sourceId });
        const targetMeta = await sheets.spreadsheets.get({ spreadsheetId: map.targetId });

        const actualSourceTab = sourceMeta.data.sheets.find(
          s => s.properties.title.trim() === map.sourceSheet.trim()
        );
        const actualTargetTab = targetMeta.data.sheets.find(
          s => s.properties.title.trim() === map.targetSheet.trim()
        );

        if (!actualSourceTab || !actualTargetTab) {
          throw new Error(`Sheet not found. Source: ${!!actualSourceTab}, Target: ${!!actualTargetTab}`);
        }

        const rangeSource = `'${actualSourceTab.properties.title}'`;
        const rangeTarget = `'${actualTargetTab.properties.title}'!A1`;

        const values = (
          await sheets.spreadsheets.values.get({
            spreadsheetId: map.sourceId,
            range: rangeSource,
          })
        ).data.values || [];

        await sheets.spreadsheets.values.clear({
          spreadsheetId: map.targetId,
          range: rangeTarget,
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId: map.targetId,
          range: rangeTarget,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: values },
        });

        console.log(`✅ Synced: ${map.sourceSheet}`);
        // push to Slack the success or failure of sheet copying
        slackMessages.push(`✅ *Success:* \`${map.sourceSheet} → ${map.targetSheet}\``);
      } catch (err) {
        console.error(`❌ Sync error on ${map.sourceSheet}:`, err);
        slackMessages.push(`❌ *Failed:* \`${map.sourceSheet} → ${map.targetSheet}\` — ${err.message}`);
      }
    }

    if (slackMessages.length > 0) {
      await axios.post(SLACK_WEBHOOK_URL, {
        text: slackMessages.join('\n'),
      });
    }

    res.status(200).send("✅ Sheet sync completed.");
  } catch (err) {
    console.error("❌ Critical sync error:", err);
    await axios.post(SLACK_WEBHOOK_URL, {
      text: `🚨 *Critical sync failure:* ${err.message}`
    });
    res.status(500).send("Sync failed.");
  }
};
