# Survey Chatbot

Adaptive survey chatbot that loads compressed questionnaire data, tracks response history, and displays live insights with an engaging, guided flow.

For full documentation, see [DOCUMENTATION.md](DOCUMENTATION.md).

## Features
- Compressed questionnaire payload stored server-side and decompressed per session.
- Response history endpoint powering live insights.
- Adaptive follow-ups based on rating sentiment.
- Simple RAG layer that surfaces relevant knowledge snippets.
- Modern UI with quick replies and progress indicators.

## Architecture overview
- Server API: [server.js](server.js)
- Web client: [public/index.html](public/index.html), [public/app.js](public/app.js), [public/styles.css](public/styles.css)

The server keeps a compressed questionnaire in memory, decompresses per session, and uses session history to adapt follow-ups and show progress.

## Run locally
1. Install dependencies:
   - npm install
2. Start the server:
   - npm start
3. Open http://localhost:3000

## API summary
- GET /api/start
   - Starts a new session and returns the first question.
- POST /api/message
   - Sends a message and returns the next step in the conversation.
- GET /api/history/:sessionId
   - Returns response history for insights.

## Configuration
- PORT: overrides the default port (3000).

## Project structure
- server.js: API server and survey logic.
- public/: static UI assets.
- package.json: dependencies and start script.

## Notes
- Session data is stored in memory. Restarting the server clears sessions.
- The questionnaire is a compressed JSON payload (gzip) to simulate compact storage.
