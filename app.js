import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, set, ref, push, child, onChildAdded, remove, update, onValue, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.9.0/firebase-database.js";

  const firebaseConfig = {
    apiKey: "AIzaSyCSgopKyi9VjbECE6H5tCVG83agj5P0z2c",
    authDomain: "talk-4e146.firebaseapp.com",
    databaseURL: "https://talk-4e146-default-rtdb.firebaseio.com",
    projectId: "talk-4e146",
    storageBucket: "talk-4e146.firebasestorage.app",
    messagingSenderId: "759021466507",
    appId: "1:759021466507:web:b3dfe782d716cdcc7f358e"
  };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const STORE_KEY = 'talk.displayName';
const THEME_KEY = 'talk.theme';
const SOUND_KEY = 'talk.sound';
const MAX_LEN = 1000;
const REACTIONS = ['👍','❤️','😂','😮','😢','🔥'];
const EMOJI_DATA = {
  '😀':1,'😁':1,'😂':1,'🤣':1,'😃':1,'😄':1,'😅':1,'😆':1,'😉':1,'😊':1,'😋':1,'😎':1,'🤩':1,'😍':1,'🥰':1,'😘':1,'😗':1,'😙':1,'😚':1,'🤗':1,'🤔':1,'🤭':1,'🤫':1,'🤥':1,'😐':1,'😑':1,'😶':1,'😏':1,'😒':1,'🙄':1,'😬':1,'🤐':1,'😌':1,'😔':1,'🤤':1,'😴':1,'😷':1,'🤒':1,'🤕':1,'🤢':1,'🤮':1,'🤧':1,'🥵':1,'🥶':1,'🥴':1,'😵':1,'🤯':1,'🤠':1,'🥳':1,'😎':1,'🤓':1,'🧐':1,'😕':1,'😟':1,'🙁':1,'😮':1,'😯':1,'😲':1,'😳':1,'🥺':1,'😦':1,'😧':1,'😨':1,'😰':1,'😥':1,'😢':1,'😭':1,'😱':1,'😖':1,'😣':1,'😞':1,'😓':1,'😩':1,'😫':1,'🥱':1,'😤':1,'😡':1,'😠':1,'🤬':1,'👍':1,'👎':1,'👏':1,'🙌':1,'🤝':1,'🙏':1,'💪':1,'🤟':1,'🤙':1,'👋':1,'✌️':1,'🤞':1,'❤️':1,'🧡':1,'💛':1,'💚':1,'💙':1,'💜':1,'🖤':1,'🤍':1,'💔':1,'💯':1,'💥':1,'🔥':1,'⭐':1,'🌟':1,'✨':1,'🎉':1,'🎊':1,'🎈':1,'🎁':1,'🏆':1,'🥇':1,'🎵':1,'🎶':1,'☀️':1,'🌙':1,'🌈':1,'☁️':1,'⚡':1,'🍕':1,'🍔':1,'🍟':1,'🌮':1,'🍣':1,'🍩':1,'🍪':1,'☕':1,'🍺':1,'🥂':1
};

// DOM refs
const $ = id => document.getElementById(id);
const msgContainer = $('messageContainer');
const emptyState = $('emptyState');
const composerForm = $('composerForm');
const msgInput = $('messageInput');
const nameInput = $('nameInput');
const saveNameBtn = $('saveNameBtn');
const connState = $('connectionState');
const statusChip = $('statusChip');
const msgCount = $('messageCount');
const charCount = $('charCount');
const themeToggle = $('themeToggle');
const themeIcon = $('themeIcon');
const soundToggle = $('soundToggle');
const soundIcon = $('soundIcon');
const actionMenuBtn = $('actionMenuBtn');
const actionMenu = $('actionMenu');
const mobileToggle = $('mobileToggle');
const sidebar = $('sidebar');
const backdrop = $('sidebarBackdrop');
const emojiToggle = $('emojiToggle');
const emojiPicker = $('emojiPicker');
const typingIndicator = $('typingIndicator');
const typingText = $('typingText');
const searchInput = $('searchInput');
const onlineAvatars = $('onlineAvatars');
const imageInput = $('imageInput');
const imagePreview = $('imagePreview');
const previewImg = $('previewImg');
const unreadBadge = $('unreadBadge');
const unreadBtn = $('unreadBtn');
const menuClearChat = $('menuClearChat');

let currentName = (localStorage.getItem(STORE_KEY) || '').trim().slice(0, 30);
let totalMessages = 0;
let soundEnabled = localStorage.getItem(SOUND_KEY) !== 'off';
let allMessages = []; // {id, name, message, sentAt, edited, reactions, imageData}
let lastSender = '';
let typingTimeout = null;
let isAtBottom = true;
let unreadCount = 0;
const userId = 'u_' + Math.random().toString(36).slice(2, 10);

// ── Theme ──
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  themeIcon.className = t === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  localStorage.setItem(THEME_KEY, t);
}
applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

// ── Sound ──
function updateSoundIcon() {
  soundIcon.className = soundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
  soundToggle.classList.toggle('active', !soundEnabled);
}
updateSoundIcon();
soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem(SOUND_KEY, soundEnabled ? 'on' : 'off');
  updateSoundIcon();
});

function playNotifSound() {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.value = 0.08;
    o.start(); o.stop(ctx.currentTime + 0.12);
  } catch(e) {}
}

// ── Connection status ──
function setStatus(text, ok) {
  connState.textContent = text;
  statusChip.classList.toggle('disconnected', !ok);
}

// ── Name ──
function updateNameUI() {
  nameInput.value = currentName;
  saveNameBtn.textContent = currentName ? 'Saved' : 'Save';
}
updateNameUI();
if (!currentName) nameInput.focus();
nameInput.addEventListener('input', () => saveNameBtn.textContent = 'Save');
saveNameBtn.addEventListener('click', () => {
  currentName = nameInput.value.trim().slice(0, 30);
  if (currentName) { localStorage.setItem(STORE_KEY, currentName); saveNameBtn.textContent = 'Saved'; updatePresence(); }
  else { localStorage.removeItem(STORE_KEY); saveNameBtn.textContent = 'Save'; }
});

// ── Char count ──
function updateCharCount() { charCount.textContent = msgInput.value.length + ' / ' + MAX_LEN; }
msgInput.addEventListener('input', () => { updateCharCount(); autoResize(); broadcastTyping(); });
updateCharCount();

function autoResize() {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
}

// ── Scroll tracking ──
msgContainer.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = msgContainer;
  isAtBottom = scrollHeight - scrollTop - clientHeight < 60;
  if (isAtBottom && unreadCount > 0) { unreadCount = 0; unreadBadge.classList.remove('visible'); document.title = 'Talk — Secure Live Chat'; }
});
function scrollToBottom() { msgContainer.scrollTop = msgContainer.scrollHeight; }
unreadBtn.addEventListener('click', () => { scrollToBottom(); unreadCount = 0; unreadBadge.classList.remove('visible'); document.title = 'Talk — Secure Live Chat'; });

// ── Avatar color from name ──
function nameColor(n) {
  let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

// ── Linkify ──
function linkify(text) {
  const esc = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return esc.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

// ── Relative time ──
function relTime(ts) {
  if (!ts) return '';
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return new Date(ts).toLocaleDateString([], {month:'short',day:'numeric'});
}
function fullTime(ts) { return ts ? new Date(ts).toLocaleString() : ''; }

// ── Build message DOM ──
function createMsgRow(entry, grouped) {
  const isOut = entry.name && entry.name.trim().toLowerCase() === currentName.trim().toLowerCase();
  const row = document.createElement('article');
  row.className = 'message-row ' + (isOut ? 'outgoing' : 'incoming') + (grouped ? ' grouped' : ' show-avatar');
  row.dataset.id = entry.id;

  const avatar = document.createElement('div');
  avatar.className = 'avatar xs';
  avatar.textContent = isOut ? 'Y' : (entry.name||'?')[0].toUpperCase();
  avatar.style.background = isOut ? 'linear-gradient(135deg,#4de3a0,#77d7ff)' : nameColor(entry.name||'?');

  const content = document.createElement('div');
  content.className = 'msg-content';

  if (!grouped) {
    const name = document.createElement('div');
    name.className = 'msg-name';
    name.textContent = isOut ? 'You' : (entry.name || 'Unknown');
    content.appendChild(name);
  }

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  if (entry.imageData) {
    const img = document.createElement('img');
    img.className = 'msg-image';
    img.src = entry.imageData;
    img.alt = 'Shared image';
    img.addEventListener('click', () => { previewImg.src = entry.imageData; imagePreview.classList.add('open'); });
    bubble.appendChild(img);
  }
  if (entry.message) {
    const span = document.createElement('span');
    span.innerHTML = linkify(entry.message);
    bubble.appendChild(span);
  }
  if (entry.edited) {
    const tag = document.createElement('span');
    tag.className = 'edited-tag';
    tag.textContent = ' (edited)';
    bubble.appendChild(tag);
  }

  // Actions
  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  const reactBtn = document.createElement('button');
  reactBtn.className = 'msg-action-btn'; reactBtn.innerHTML = '😀'; reactBtn.title = 'React';
  reactBtn.addEventListener('click', (e) => showReactionPicker(e, entry.id));
  actions.appendChild(reactBtn);
  if (isOut) {
    const editBtn = document.createElement('button');
    editBtn.className = 'msg-action-btn'; editBtn.innerHTML = '<i class="fas fa-pen"></i>'; editBtn.title = 'Edit';
    editBtn.addEventListener('click', () => startEdit(entry));
    actions.appendChild(editBtn);
    const delBtn = document.createElement('button');
    delBtn.className = 'msg-action-btn delete'; delBtn.innerHTML = '<i class="fas fa-trash"></i>'; delBtn.title = 'Delete';
    delBtn.addEventListener('click', () => deleteMessage(entry.id));
    actions.appendChild(delBtn);
  }
  bubble.appendChild(actions);

  // Reactions display
  const reactionsDiv = document.createElement('div');
  reactionsDiv.className = 'msg-reactions';
  reactionsDiv.id = 'reactions-' + entry.id;
  if (entry.reactions) renderReactions(reactionsDiv, entry.reactions, entry.id);

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = relTime(entry.sentAt);
  time.title = fullTime(entry.sentAt);

  content.appendChild(bubble);
  content.appendChild(reactionsDiv);
  content.appendChild(time);
  row.appendChild(avatar);
  row.appendChild(content);
  return row;
}

function renderReactions(container, reactions, msgId) {
  container.innerHTML = '';
  const counts = {};
  if (reactions) Object.values(reactions).forEach(r => { counts[r] = (counts[r]||0) + 1; });
  Object.entries(counts).forEach(([emoji, count]) => {
    const badge = document.createElement('span');
    badge.className = 'reaction-badge';
    badge.innerHTML = emoji + '<span class="count">' + count + '</span>';
    badge.addEventListener('click', () => addReaction(msgId, emoji));
    container.appendChild(badge);
  });
}

// ── Reaction picker popup ──
let activeReactionPicker = null;
function showReactionPicker(e, msgId) {
  closeReactionPicker();
  const picker = document.createElement('div');
  picker.className = 'reaction-picker open';
  REACTIONS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'reaction-pick'; btn.textContent = emoji;
    btn.addEventListener('click', () => { addReaction(msgId, emoji); closeReactionPicker(); });
    picker.appendChild(btn);
  });
  const row = e.target.closest('.message-row');
  row.appendChild(picker);
  picker.style.top = '-40px'; picker.style.right = '0';
  activeReactionPicker = picker;
}
function closeReactionPicker() { if (activeReactionPicker) { activeReactionPicker.remove(); activeReactionPicker = null; } }
document.addEventListener('click', e => { if (activeReactionPicker && !activeReactionPicker.contains(e.target)) closeReactionPicker(); });

function addReaction(msgId, emoji) {
  const rRef = ref(db, 'messages/' + msgId + '/reactions/' + userId);
  set(rRef, emoji);
}

// ── Delete message ──
function deleteMessage(msgId) {
  remove(ref(db, 'messages/' + msgId));
  const row = msgContainer.querySelector(`[data-id="${msgId}"]`);
  if (row) row.remove();
  allMessages = allMessages.filter(m => m.id !== msgId);
  totalMessages = Math.max(0, totalMessages - 1);
  msgCount.textContent = totalMessages;
  if (totalMessages === 0 && emptyState) emptyState.style.display = '';
}

// ── Edit message ──
function startEdit(entry) {
  const origText = entry.message || '';
  msgInput.value = origText;
  msgInput.focus();
  autoResize();
  updateCharCount();
  composerForm.dataset.editId = entry.id;
  msgInput.placeholder = 'Editing message... (Esc to cancel)';
}
function cancelEdit() {
  delete composerForm.dataset.editId;
  msgInput.value = '';
  msgInput.placeholder = 'Type a message...';
  autoResize(); updateCharCount();
}

// ── Emoji picker ──
function buildEmojiPicker() {
  const emojis = Object.keys(EMOJI_DATA);
  const grid = document.createElement('div');
  grid.className = 'emoji-grid scrollbar-thin';
  emojis.forEach(e => {
    const btn = document.createElement('button');
    btn.className = 'emoji-cell'; btn.type = 'button'; btn.textContent = e;
    btn.addEventListener('click', () => { msgInput.value += e; msgInput.focus(); updateCharCount(); });
    grid.appendChild(btn);
  });
  emojiPicker.appendChild(grid);
}
buildEmojiPicker();
emojiToggle.addEventListener('click', e => { e.stopPropagation(); emojiPicker.classList.toggle('open'); });
document.addEventListener('click', e => { if (!emojiPicker.contains(e.target) && e.target !== emojiToggle) emojiPicker.classList.remove('open'); });

// ── Image upload ──
imageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 500000) { setStatus('Image too large (max 500KB)', false); return; }
  const reader = new FileReader();
  reader.onload = () => sendMessage(null, reader.result);
  reader.readAsDataURL(file);
  imageInput.value = '';
});

// ── Image preview ──
imagePreview.addEventListener('click', () => imagePreview.classList.remove('open'));

// ── Mobile sidebar ──
mobileToggle.addEventListener('click', () => { sidebar.classList.add('open'); backdrop.classList.add('open'); });
backdrop.addEventListener('click', () => { sidebar.classList.remove('open'); backdrop.classList.remove('open'); });

// ── Action menu ──
actionMenuBtn.addEventListener('click', e => { e.stopPropagation(); actionMenu.classList.toggle('open'); });
document.addEventListener('click', e => { if (!actionMenu.contains(e.target)) actionMenu.classList.remove('open'); });
menuClearChat.addEventListener('click', () => {
  msgContainer.querySelectorAll('.message-row').forEach(r => r.remove());
  if (emptyState) emptyState.style.display = '';
  allMessages = []; totalMessages = 0; msgCount.textContent = '0'; lastSender = '';
  actionMenu.classList.remove('open');
});

// ── Typing broadcast ──
function broadcastTyping() {
  if (!currentName) return;
  set(ref(db, 'typing/' + userId), { name: currentName, ts: Date.now() });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => remove(ref(db, 'typing/' + userId)), 3000);
}
onValue(ref(db, 'typing'), snap => {
  const data = snap.val() || {};
  const now = Date.now();
  const typers = Object.entries(data)
    .filter(([id, v]) => id !== userId && v.name && (now - v.ts) < 5000)
    .map(([, v]) => v.name);
  if (typers.length > 0) {
    typingText.textContent = typers.length === 1 ? typers[0] + ' is typing...' : typers.length + ' people typing...';
    typingIndicator.classList.add('visible');
  } else {
    typingIndicator.classList.remove('visible');
  }
});

// ── Presence ──
function updatePresence() {
  if (!currentName) return;
  const presRef = ref(db, 'presence/' + userId);
  set(presRef, { name: currentName, ts: Date.now() });
  onDisconnect(presRef).remove();
}
updatePresence();
onValue(ref(db, 'presence'), snap => {
  const data = snap.val() || {};
  onlineAvatars.innerHTML = '';
  const now = Date.now();
  Object.entries(data).forEach(([id, v]) => {
    if (!v.name || (now - v.ts) > 120000) return;
    const av = document.createElement('div');
    av.className = 'online-avatar';
    av.style.background = nameColor(v.name);
    av.textContent = v.name[0].toUpperCase();
    const tip = document.createElement('span');
    tip.className = 'tooltip-name';
    tip.textContent = v.name;
    av.appendChild(tip);
    onlineAvatars.appendChild(av);
  });
});
setInterval(() => { if (currentName) set(ref(db, 'presence/' + userId + '/ts'), Date.now()); }, 60000);

// ── Search ──
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase().trim();
  msgContainer.querySelectorAll('.message-row').forEach(row => {
    const bubble = row.querySelector('.message-bubble');
    const text = bubble ? bubble.textContent.toLowerCase() : '';
    row.style.display = !q || text.includes(q) ? '' : 'none';
  });
});

// ── Keyboard shortcuts ──
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    emojiPicker.classList.remove('open');
    actionMenu.classList.remove('open');
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
    imagePreview.classList.remove('open');
    closeReactionPicker();
    if (composerForm.dataset.editId) cancelEdit();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
    if (window.innerWidth <= 768) { sidebar.classList.add('open'); backdrop.classList.add('open'); }
  }
});

msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); composerForm.requestSubmit(); }
});

// ── Send / Edit ──
function sendMessage(text, imageData) {
  const name = (nameInput.value || currentName).trim().slice(0, 30);
  if (!name) { setStatus('Enter your name first', false); nameInput.focus(); return; }
  if (!text && !imageData) { setStatus('Message cannot be empty', false); msgInput.focus(); return; }

  currentName = name;
  localStorage.setItem(STORE_KEY, currentName);
  saveNameBtn.textContent = 'Saved';
  updatePresence();

  const payload = { name: currentName, sentAt: Date.now() };
  if (text) payload.message = text;
  if (imageData) payload.imageData = imageData;

  const id = push(child(ref(db), 'messages')).key;
  set(ref(db, 'messages/' + id), payload).then(() => {
    setStatus('Connected', true);
  }).catch(() => setStatus('Send failed', false));
}

composerForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = msgInput.value.trim().slice(0, MAX_LEN);
  const editId = composerForm.dataset.editId;

  if (editId) {
    if (!text) return;
    update(ref(db, 'messages/' + editId), { message: text, edited: true }).then(() => {
      const row = msgContainer.querySelector(`[data-id="${editId}"]`);
      if (row) {
        const bubble = row.querySelector('.message-bubble span');
        if (bubble) bubble.innerHTML = linkify(text);
        let tag = row.querySelector('.edited-tag');
        if (!tag) { tag = document.createElement('span'); tag.className = 'edited-tag'; tag.textContent = ' (edited)'; row.querySelector('.message-bubble').appendChild(tag); }
      }
    });
    cancelEdit();
    return;
  }

  if (!text) return;
  sendMessage(text, null);
  msgInput.value = '';
  msgInput.placeholder = 'Type a message...';
  autoResize(); updateCharCount(); msgInput.focus();
  remove(ref(db, 'typing/' + userId));
});

// ── Listen for messages ──
onChildAdded(ref(db, 'messages/'), snap => {
  const data = snap.val() || {};
  if (!data.message && !data.imageData) return;

  if (emptyState) emptyState.style.display = 'none';

  const entry = { id: snap.key, name: data.name, message: data.message || '', sentAt: data.sentAt, edited: data.edited, reactions: data.reactions, imageData: data.imageData };
  const grouped = lastSender === (data.name || '').trim().toLowerCase();
  lastSender = (data.name || '').trim().toLowerCase();

  const row = createMsgRow(entry, grouped);
  msgContainer.appendChild(row);
  allMessages.push(entry);
  totalMessages++;
  msgCount.textContent = totalMessages;

  const isOwn = data.name && data.name.trim().toLowerCase() === currentName.trim().toLowerCase();
  if (isAtBottom || isOwn) {
    scrollToBottom();
  } else if (!isOwn) {
    unreadCount++;
    unreadBadge.classList.add('visible');
    document.title = `(${unreadCount}) Talk`;
  }
  if (!isOwn) playNotifSound();
});

// Listen for reaction updates on existing messages
onValue(ref(db, 'messages'), snap => {
  const data = snap.val() || {};
  Object.entries(data).forEach(([id, msg]) => {
    const container = document.getElementById('reactions-' + id);
    if (container && msg.reactions) renderReactions(container, msg.reactions, id);
  });
}, { onlyOnce: false });

// ── Paste image ──
msgInput.addEventListener('paste', e => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file.size > 500000) { setStatus('Image too large (max 500KB)', false); return; }
      const reader = new FileReader();
      reader.onload = () => sendMessage(null, reader.result);
      reader.readAsDataURL(file);
      return;
    }
  }
});

setStatus('Connected', true);
