# Survey Chatbot Documentation

## Overview
The survey chatbot is a lightweight Node.js + Express application designed to collect customer insights through an adaptive chat-based survey. It demonstrates:
- Compressed questionnaire storage (gzip) and decompression per session.
- Response history tracking for live insights.
- Engagement improvements with quick replies, progress indicators, and sentiment-based follow-ups.

## How it works
1. The server stores a questionnaire JSON payload in a gzipped buffer.
2. A session is created for each user via GET /api/start.
3. Each response is validated and stored in the session history.
4. Rating questions trigger a follow-up to collect richer context.
5. The client calls /api/history/:sessionId to render live insights.

## Questionnaire model
Each question includes:
- id: unique identifier.
- text: the question prompt.
- type: rating | text | choice.
- min/max (rating only).
- options (choice only).

The questionnaire is defined in [server.js](server.js) and compressed with gzip on startup.

## API reference

### GET /api/start
Starts a new session.

Response
- sessionId: unique session identifier.
- intro: opening message.
- message: first question.
- quickReplies: suggested responses (when available).
- progress: answered/total/percent.

### POST /api/message
Sends a user response and advances the conversation.

Request body
- sessionId: active session identifier.
- message: user message string.

Response
- message: bot reply.
- quickReplies: suggested responses for the next question.
- progress: updated progress (when available).
- done: boolean indicating survey completion.
- ragContext: array of retrieved knowledge snippets.

### GET /api/history/:sessionId
Returns response history.

Response
- responses: array of collected answers.
- createdAt: session start timestamp.

## Client behavior
The UI in [public/app.js](public/app.js) manages:
- Session start and message submission.
- Rendering bot/user bubbles.
- Quick reply buttons.
- Live insight cards based on response history.
- Displaying RAG knowledge snippets in the insights panel.

## Engagement logic
- Ratings are normalized and validated.
- Each rating triggers one follow-up prompt to capture context.
- Encouragement phrases are randomized to keep the tone fresh.

## Simple RAG layer
The server includes a small in-memory knowledge base and a keyword overlap retriever:
- `knowledgeBase` stores short, tagged snippets.
- `retrieveContext()` scores snippets based on tag matches.
- The top matches are returned as `ragContext` in the response and surfaced in the UI.

## Extending the chatbot
- Add or reorder questions in [server.js](server.js).
- Replace the in-memory Map with a database for persistence.
- Add analytics exports by aggregating response history.
- Internationalize the UI by externalizing strings in [public/app.js](public/app.js).

## Security and privacy notes
- No user authentication is included by default.
- Sessions are in memory; use a data store for production.
- Add request validation and rate limiting for public deployments.

## Troubleshooting
- If the UI does not load, confirm the server is running on the expected PORT.
- If you see "Invalid session", refresh the page to start a new session.

## License
Add your preferred license here.
