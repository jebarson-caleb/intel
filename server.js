const crypto = require("crypto");
const express = require("express");
const path = require("path");
const zlib = require("zlib");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const questionnaire = {
  title: "Customer Experience Pulse",
  intro:
    "Thanks for sharing your feedback. I’ll keep this short and adapt based on your answers.",
  questions: [
    {
      id: "overall",
      text: "On a scale of 1–10, how satisfied are you with your overall experience?",
      type: "rating",
      min: 1,
      max: 10
    },
    {
      id: "value",
      text: "How would you rate the value for money?",
      type: "rating",
      min: 1,
      max: 10
    },
    {
      id: "support",
      text: "How satisfied are you with our customer support?",
      type: "rating",
      min: 1,
      max: 10
    },
    {
      id: "favorite",
      text: "What’s one thing you like most about our product or service?",
      type: "text"
    },
    {
      id: "improve",
      text: "What’s one thing we could improve?",
      type: "text"
    },
    {
      id: "channel",
      text: "Which channel do you prefer for updates?",
      type: "choice",
      options: ["Email", "SMS", "In-app", "None"]
    },
    {
      id: "recommend",
      text: "How likely are you to recommend us to a friend or colleague?",
      type: "rating",
      min: 1,
      max: 10
    }
  ]
};

const compressedQuestionnaire = zlib.gzipSync(
  Buffer.from(JSON.stringify(questionnaire))
);

const sessions = new Map();

const encouragements = [
  "Appreciate it!",
  "Thanks, that helps.",
  "Got it — thank you!",
  "Thanks for sharing.",
  "Helpful insight, thank you!"
];

const followUps = {
  lowRating:
    "Sorry to hear that. Could you share a quick detail on what influenced your rating?",
  midRating:
    "Thanks! What would make it a bit better for you?",
  highRating:
    "Great to hear! What stands out as working well?"
};

function getQuestionnaire() {
  const json = zlib.gunzipSync(compressedQuestionnaire).toString("utf8");
  return JSON.parse(json);
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createSession() {
  const id = crypto.randomUUID();
  const data = getQuestionnaire();
  const session = {
    id,
    createdAt: Date.now(),
    questionIndex: 0,
    responses: [],
    followUpPending: false
  };
  sessions.set(id, session);
  return { session, data };
}

function getQuestionForSession(session, data) {
  return data.questions[session.questionIndex];
}

function buildQuickReplies(question) {
  if (!question) {
    return [];
  }
  if (question.type === "rating") {
    return [question.min, question.max].map(String);
  }
  if (question.type === "choice") {
    return question.options;
  }
  return [];
}

function normalizeRating(input, question) {
  const value = Number(input);
  if (Number.isNaN(value)) {
    return null;
  }
  if (value < question.min || value > question.max) {
    return null;
  }
  return value;
}

function handleMessage(session, message, data) {
  const question = getQuestionForSession(session, data);
  if (!question) {
    return {
      message:
        "We already wrapped up the survey. If you’d like to add more feedback, just share it now.",
      done: true
    };
  }

  const trimmed = String(message || "").trim();
  if (!trimmed) {
    return {
      message: "Could you share a response so I can keep going?",
      quickReplies: buildQuickReplies(question)
    };
  }

  if (question.type === "rating") {
    const rating = normalizeRating(trimmed, question);
    if (rating === null) {
      return {
        message: `Please enter a number between ${question.min} and ${question.max}.`,
        quickReplies: buildQuickReplies(question)
      };
    }

    session.responses.push({
      id: question.id,
      type: question.type,
      value: rating
    });

    const followUpMessage =
      rating <= 6
        ? followUps.lowRating
        : rating <= 8
        ? followUps.midRating
        : followUps.highRating;

    if (!session.followUpPending) {
      session.followUpPending = true;
      return {
        message: `${getRandom(encouragements)} ${followUpMessage}`,
        quickReplies: []
      };
    }

    session.followUpPending = false;
    session.questionIndex += 1;
  } else if (question.type === "choice") {
    const normalized = trimmed.toLowerCase();
    const selected = question.options.find(
      (option) => option.toLowerCase() === normalized
    );
    if (!selected) {
      return {
        message: `Please pick one of the options: ${question.options.join(", ")}.`,
        quickReplies: buildQuickReplies(question)
      };
    }
    session.responses.push({
      id: question.id,
      type: question.type,
      value: selected
    });
    session.questionIndex += 1;
  } else {
    session.responses.push({
      id: question.id,
      type: question.type,
      value: trimmed
    });
    session.questionIndex += 1;
  }

  const nextQuestion = getQuestionForSession(session, data);
  if (!nextQuestion) {
    return {
      message: buildSummary(session.responses),
      done: true
    };
  }

  return {
    message: `${getRandom(encouragements)} ${nextQuestion.text}`,
    quickReplies: buildQuickReplies(nextQuestion),
    progress: buildProgress(session, data)
  };
}

function buildSummary(responses) {
  const ratings = responses.filter((r) => r.type === "rating");
  const average = ratings.length
    ? ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length
    : 0;
  const rounded = average ? Math.round(average * 10) / 10 : "N/A";
  const improvement = responses.find((r) => r.id === "improve")?.value ||
    "(no improvement shared)";
  const favorite = responses.find((r) => r.id === "favorite")?.value ||
    "(no highlight shared)";

  return (
    "All done — thanks for your time! Here’s a quick summary:\n" +
    `• Average rating: ${rounded}\n` +
    `• Highlight: ${favorite}\n` +
    `• Improvement: ${improvement}\n\n` +
    "If you’d like to add anything else, just type it here."
  );
}

function buildProgress(session, data) {
  const total = data.questions.length;
  const answered = Math.min(session.questionIndex, total);
  return {
    answered,
    total,
    percent: Math.round((answered / total) * 100)
  };
}

app.get("/api/start", (req, res) => {
  const { session, data } = createSession();
  const firstQuestion = getQuestionForSession(session, data);
  res.json({
    sessionId: session.id,
    intro: data.intro,
    message: firstQuestion.text,
    quickReplies: buildQuickReplies(firstQuestion),
    progress: buildProgress(session, data)
  });
});

app.post("/api/message", (req, res) => {
  const { sessionId, message } = req.body || {};
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).json({
      error: "Invalid session. Please refresh to start a new survey."
    });
    return;
  }
  const session = sessions.get(sessionId);
  const data = getQuestionnaire();
  const reply = handleMessage(session, message, data);
  res.json(reply);
});

app.get("/api/history/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found." });
    return;
  }
  res.json({
    responses: session.responses,
    createdAt: session.createdAt
  });
});

app.listen(port, () => {
  console.log(`Survey chatbot running on http://localhost:${port}`);
});
