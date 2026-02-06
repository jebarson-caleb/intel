const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const quickReplies = document.getElementById("quickReplies");
const insightsContent = document.getElementById("insightsContent");
const progressPercent = document.getElementById("progressPercent");
const progressCount = document.getElementById("progressCount");

let sessionId = null;
let latestRag = [];

function addBubble(text, sender) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${sender}`;
  bubble.textContent = text;
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function renderQuickReplies(options = []) {
  quickReplies.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option;
    button.addEventListener("click", () => {
      chatInput.value = option;
      chatForm.requestSubmit();
    });
    quickReplies.appendChild(button);
  });
}

function setProgress(progress) {
  if (!progress) {
    return;
  }
  progressPercent.textContent = `${progress.percent}%`;
  progressCount.textContent = `${progress.answered}/${progress.total}`;
}

function renderInsights(responses, ragContext = []) {
  if (!responses.length) {
    insightsContent.innerHTML =
      '<p class="placeholder">Start the survey to see insights.</p>';
    return;
  }

  const ratingResponses = responses.filter((r) => r.type === "rating");
  const average = ratingResponses.length
    ? ratingResponses.reduce((sum, r) => sum + r.value, 0) / ratingResponses.length
    : 0;
  const rounded = average ? Math.round(average * 10) / 10 : "N/A";

  insightsContent.innerHTML = "";
  const averageCard = document.createElement("div");
  averageCard.className = "insight-card";
  averageCard.innerHTML = `<strong>Average rating</strong>${rounded}`;

  const highlights = responses.filter((r) => r.type === "text");
  const highlightText = highlights[0]?.value || "No highlight yet.";
  const improveText = highlights[1]?.value || "No improvement yet.";

  const highlightCard = document.createElement("div");
  highlightCard.className = "insight-card";
  highlightCard.innerHTML = `<strong>Highlight</strong>${highlightText}`;

  const improveCard = document.createElement("div");
  improveCard.className = "insight-card";
  improveCard.innerHTML = `<strong>Improvement</strong>${improveText}`;

  const responseCard = document.createElement("div");
  responseCard.className = "insight-card";
  responseCard.innerHTML = `<strong>Total responses</strong>${responses.length}`;

  insightsContent.append(averageCard, highlightCard, improveCard, responseCard);

  if (ragContext.length) {
    const ragCard = document.createElement("div");
    ragCard.className = "insight-card";
    ragCard.innerHTML = `
      <strong>Knowledge snippets</strong>
      <ul>${ragContext.map((text) => `<li>${text}</li>`).join("")}</ul>
    `;
    insightsContent.append(ragCard);
  }
}

async function fetchHistory() {
  if (!sessionId) {
    return;
  }
  const res = await fetch(`/api/history/${sessionId}`);
  const data = await res.json();
  renderInsights(data.responses || [], latestRag);
}

async function startSession() {
  const res = await fetch("/api/start");
  const data = await res.json();
  sessionId = data.sessionId;
  latestRag = [];
  addBubble(data.intro, "bot");
  addBubble(data.message, "bot");
  renderQuickReplies(data.quickReplies);
  setProgress(data.progress);
  await fetchHistory();
}

async function sendMessage(text) {
  if (!sessionId) {
    return;
  }
  const res = await fetch("/api/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message: text })
  });
  const data = await res.json();
  addBubble(data.message, "bot");
  latestRag = data.ragContext || [];
  if (data.done) {
    renderQuickReplies([]);
  } else {
    renderQuickReplies(data.quickReplies);
  }
  setProgress(data.progress);
  await fetchHistory();
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) {
    return;
  }
  addBubble(text, "user");
  chatInput.value = "";
  await sendMessage(text);
});

startSession();
