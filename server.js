const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Passcode that protects David's live dashboard. Override on Render via the
// DAVID_CODE environment variable.
const DAVID_CODE = process.env.DAVID_CODE || 'david2026';

app.use(express.static(path.join(__dirname, 'public')));

// Health check — also the target of the keep-alive pings.
app.get('/healthz', (req, res) => res.send('ok'));

// It's one couple, so a single in-memory session is all we need.
function freshState() {
  return {
    entered: false,
    enteredAt: null,
    viewing: false,
    viewingAt: null,
    dodgeCount: 0,
    answered: null,
    answeredAt: null,
    dateChoice: null,
    dateChoiceAt: null,
    log: []
  };
}
let state = freshState();

const davidSockets = new Set();

function addLog(text) {
  state.log.push({ text, at: Date.now() });
  if (state.log.length > 100) state.log.shift();
}

function broadcastState() {
  const msg = JSON.stringify({ type: 'state', state });
  for (const ws of davidSockets) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

wss.on('connection', (ws) => {
  ws.role = null;

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch (e) { return; }

    // Handshake — a client announces who it is.
    if (msg.type === 'hello') {
      if (msg.role === 'david') {
        if (msg.code !== DAVID_CODE) {
          ws.send(JSON.stringify({ type: 'auth', ok: false }));
          return;
        }
        ws.role = 'david';
        davidSockets.add(ws);
        ws.send(JSON.stringify({ type: 'auth', ok: true }));
        ws.send(JSON.stringify({ type: 'state', state }));
      } else if (msg.role === 'marylyne') {
        ws.role = 'marylyne';
      }
      return;
    }

    // Let David reset the session from his dashboard (testing / a fresh ask).
    if (msg.type === 'reset' && ws.role === 'david') {
      state = freshState();
      addLog('🔄 David reset the session');
      broadcastState();
      return;
    }

    // Only Marylyne's client drives the rest of the state.
    if (ws.role !== 'marylyne') return;

    switch (msg.type) {
      case 'entered':
        if (!state.entered) {
          state.entered = true;
          state.enteredAt = Date.now();
          addLog('💖 Marylyne entered');
        }
        break;
      case 'viewing':
        if (!state.viewing) {
          state.viewing = true;
          state.viewingAt = Date.now();
          addLog('👀 She is looking at the question');
        }
        break;
      case 'dodge':
        state.dodgeCount = typeof msg.count === 'number' ? msg.count : state.dodgeCount + 1;
        addLog('🏃 She tried to click "No" (#' + state.dodgeCount + ')');
        break;
      case 'yes':
        if (state.answered !== 'yes') {
          state.answered = 'yes';
          state.answeredAt = Date.now();
          addLog('🎉 SHE SAID YES! 💕');
        }
        break;
      case 'datechoice':
        state.dateChoice = (typeof msg.choice === 'string' ? msg.choice : '').slice(0, 40);
        state.dateChoiceAt = Date.now();
        addLog('💝 She wants a ' + state.dateChoice + '!');
        break;
      default:
        return;
    }
    broadcastState();
  });

  ws.on('close', () => { davidSockets.delete(ws); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('willyou server listening on ' + PORT));

// Keep the free Render instance awake: ping our own public URL every 14 min so
// it never hits the 15-min idle timeout. Render injects RENDER_EXTERNAL_URL.
const SELF_URL = process.env.RENDER_EXTERNAL_URL;
if (SELF_URL) {
  setInterval(() => {
    fetch(SELF_URL + '/healthz').catch(() => {});
  }, 14 * 60 * 1000);
  console.log('self-ping keep-alive enabled for ' + SELF_URL);
}
