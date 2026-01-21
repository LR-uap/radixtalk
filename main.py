import os
import requests
from fastapi import FastAPI
from telethon import TelegramClient
from telethon.sessions import StringSession

app = FastAPI()

# These will be set in Render Environment Variables
API_ID = int(os.environ.get("TG_API_ID", 0))
API_HASH = os.environ.get("TG_API_HASH", "")
SESSION_STR = os.environ.get("TG_SESSION_STR", "")
CHANNEL_ID = os.environ.get("TG_CHANNEL_ID", "") # e.g., @YourChannelName

@app.get("/ping")
async def check_and_post():
    # Connect using the "Magic Key" (Session String)
    client = TelegramClient(StringSession(SESSION_STR), API_ID, API_HASH)
    await client.connect()
    
    # 1. Get RadixTalk Data
    r = requests.get("https://radixtalk.com/posts.json")
    data = r.json()
    latest_post = data['latest_posts'][0]
    
    # 2. Format the message
    title = latest_post['topic_title']
    excerpt = latest_post['raw'][:300] + "..."
    link = f"https://radixtalk.com/t/{latest_post['topic_id']}"
    
    full_message = f"**{title}**\n\n{excerpt}\n\n[Read on RadixTalk]({link})"
    
    # 3. Send as YOUR profile to the channel
    await client.send_message(CHANNEL_ID, full_message)
    await client.disconnect()
    
    return {"status": "Message Sent", "post_id": latest_post['id']}
