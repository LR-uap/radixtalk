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
      if (!client.connected) await client.connect();

      const title = latestPost.topic_title;
      const author = latestPost.display_username || latestPost.username || "Anonyme";
      // Nettoyage pour éviter les erreurs de formatage Markdown
      const cleanBody = latestPost.raw.substring(0, 400).replace(/[#*`_]/g, '');
      
      // Lien direct vers le message spécifique
      const link = `https://radixtalk.com/t/${latestPost.topic_id}/${latestPost.post_number}`;

      // Message Telegram optimisé
      const message = `🔹 **Nouveau message sur RadixTalk**\n\n` +
                      `📌 **Sujet :** ${title}\n` +
                      `👤 **Posté par :** ${author}\n\n` +
                      `💬 **Extrait :**\n_${cleanBody}..._\n\n` +
                      `🔗 [Répondre sur le forum](${link})`;

      await client.sendMessage(channelId, {
        message: message,
        parseMode: "markdown",
        linkPreview: false 
      });

      // IMPORTANT : On renvoie TOUTES les infos à Google Sheets ici
      return { 
        newPost: true, 
        id: latestPost.id, 
        title: title, 
        author: author,
        url: link 
      };
    }
    return { newPost: false, id: lastId };
  } catch (error) {
    console.error("Erreur RadixTalk:", error.message);
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
