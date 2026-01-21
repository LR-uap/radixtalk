const express = require("express");
const axios = require("axios");
require("dotenv").config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const app = express();
const port = process.env.PORT || 3000;

// Config from Environment Variables
const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const stringSession = new StringSession(process.env.TG_STRING_SESSION);
const channelId = process.env.TG_CHANNEL_ID;

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

async function checkRadix(lastId) {
  try {
    const response = await axios.get("https://radixtalk.com/posts.json");
    const latestPost = response.data.latest_posts[0];

    if (latestPost.id > lastId) {
      const title = latestPost.topic_title;
      // Remove Markdown symbols for cleaner Telegram post
      const cleanBody = latestPost.raw.substring(0, 400).replace(/[#*`_]/g, '');
      const link = `https://radixtalk.com/t/${latestPost.topic_id}`;

      const message = `**📢 New on RadixTalk**\n\n**${title}**\n\n${cleanBody}...\n\n🔗 [Read More](${link})`;

      await client.sendMessage(channelId, {
        message: message,
        parseMode: "markdown",
      });

      return { newPost: true, id: latestPost.id };
    }
    return { newPost: false, id: lastId };
  } catch (error) {
    console.error("Error checking RadixTalk:", error.message);
    return { error: error.message };
  }
}

// Endpoint for Google Apps Script to hit
app.get("/ping", async (req, res) => {
  const lastId = parseInt(req.query.last_id || "0");
  const result = await checkRadix(lastId);
  res.json(result);
});

app.listen(port, async () => {
  console.log(`🚀 Server listening on port ${port}`);
  await client.connect();
  console.log("✅ Logged into Telegram");
});
