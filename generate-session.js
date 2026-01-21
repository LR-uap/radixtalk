const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
require("dotenv").config();

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;

(async () => {
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("📱 Enter your phone number: "),
    phoneCode: async () => await input.text("📩 Enter the code you received: "),
    password: async () => await input.text("🔐 Enter your 2FA password (if any): "),
    onError: (err) => console.log(err),
  });

  console.log("\n✅ COPY THIS STRING FOR TG_STRING_SESSION:\n");
  console.log(client.session.save());
  process.exit();
})();
