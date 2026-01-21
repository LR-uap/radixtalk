const http = require("http");
const axios = require("axios");
require("dotenv").config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

// Configuration
const API_ID = Number(process.env.TG_API_ID);
const API_HASH = process.env.TG_API_HASH;
const STRING_SESSION = process.env.TG_STRING_SESSION;
const CHANNEL_ID = process.env.TG_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

const client = new TelegramClient(
  new StringSession(STRING_SESSION),
  API_ID,
  API_HASH,
  { connectionRetries: 5 }
);

async function checkRadix(lastId) {
  try {
    const response = await axios.get("https://radixtalk.com/posts.json");
    const posts = response.data.latest_posts;
    const latestPost = posts[0];

    // Only proceed if there's a post newer than what we last recorded
    if (latestPost.id > lastId) {
      if (!client.connected) await client.connect();

      const title = latestPost.topic_title;
      const excerpt = latestPost.raw.substring(0, 350).replace(/[#*`_]/g, '') + "...";
      const link = `https://radixtalk.com/t/${latestPost.topic_id}`;
      
      const message = `**📢 New on RadixTalk**\n\n**${title}**\n\n${excerpt}\n\n🔗 [Read Full Post](${link})`;

      await client.sendMessage(CHANNEL_ID, {
        message: message,
        parseMode: "markdown",
        linkPreview: true
      });

      return { newPost: true, id: latestPost.id };
    }
    return { newPost: false, id: lastId };
  } catch (err) {
    console.error("❌ Error fetching RadixTalk:", err.message);
    return { error: err.message };
  }
}

// HTTP server to receive Google Apps Script triggers
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname === "/ping") {
    const lastId = parseInt(url.searchParams.get("last_id") || "0");
    console.log(`Pinger received. Last ID known: ${lastId}`);
    
    const result = await checkRadix(lastId);
    
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(PORT, async () => {
  console.log(`🚀 RadixTalk Forwarder active on port ${PORT}`);
  await client.connect();
  console.log("✅ Logged into Telegram successfully");
});
