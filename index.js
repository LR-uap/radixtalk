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

// Remplace la fonction checkRadix dans index.js
async function checkRadix(lastId) {
  try {
    const response = await axios.get("https://radixtalk.com/posts.json");
    const allPosts = response.data.latest_posts;

    // 1. Filtrer pour ne garder que les messages PLUS RÉCENTS que lastId
    // On les trie par ID croissant (du plus vieux au plus récent)
    const newPosts = allPosts
      .filter(post => post.id > lastId)
      .sort((a, b) => a.id - b.id);

    if (newPosts.length === 0) {
      return { newPost: false, id: lastId };
    }

    if (!client.connected) await client.connect();

    console.log(`📥 ${newPosts.length} nouveaux messages détectés. Envoi en cours...`);

    let lastSentId = lastId;

    // 2. Boucle sur chaque nouveau message
    for (const post of newPosts) {
      const title = post.topic_title;
      const author = post.display_username || post.username || "Anonyme";
      const cleanBody = post.raw.substring(0, 400).replace(/[#*`_]/g, '');
      const link = `https://radixtalk.com/t/${post.topic_id}/${post.post_number}`;

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

      lastSentId = post.id;
      console.log(`✅ Message ${post.id} envoyé. Pause de 5s...`);

      // 3. Respect du Rate Limit : Pause de 5 secondes avant le suivant
      // (Sauf si c'est le dernier message de la liste)
      if (newPosts.indexOf(post) !== newPosts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    return { 
      newPost: true, 
      id: lastSentId, 
      count: newPosts.length,
      lastAuthor: newPosts[newPosts.length - 1].display_username,
      lastTitle: newPosts[newPosts.length - 1].topic_title
    };
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
