// ── GLOBAL STATE ──
let GROQ_KEY = localStorage.getItem('aitf_key') || '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';
let MODEL = localStorage.getItem('aitf_model') || 'llama-3.1-8b-instant';
let lastResults = [];
let selectedCmp = [];
let savedTools = JSON.parse(localStorage.getItem('aitf_saved') || '[]');

const EMOJIS = ['🚀','✨','🎯','🔥','💡','🛠','🌟','⚡','🎨','🧠'];
const CATEGORIES = ['🎥 Video Editing', '✍️ Copywriting', '🎨 Image Gen', '💻 Coding', '📈 Marketing', '🔊 Audio/Voice'];

// ── INITIALIZATION ──
document.addEventListener('DOMContentLoaded', () => {
  renderHist();
  renderCatChips();
  renderSaved();
  updateSavedCount();
  updateModelBadge();

  // Load theme
  if (localStorage.getItem('aitf_theme') === 'light') document.body.classList.add('light');
  updateThemeIcon();

  // Remove the check for missing key to prevent the settings popup from showing automatically
  // if (!GROQ_KEY) setTimeout(openSettings, 1000);
});

// ── SETTINGS & THEME ──
document.getElementById('themeToggle').onclick = () => {
  document.body.classList.toggle('light');
  localStorage.setItem('aitf_theme', document.body.classList.contains('light') ? 'light' : 'dark');
  updateThemeIcon();
};

function updateThemeIcon() {
  document.getElementById('themeIcon').textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
}

function openSettings() {
  document.getElementById('modelSelect').value = MODEL;
  document.getElementById('settingsModal').classList.add('open');
}
function closeSettings() { document.getElementById('settingsModal').classList.remove('open'); }
function saveSettings() {
  const mod = document.getElementById('modelSelect').value;
  // The API key is no longer strictly required via the UI because we have a hardcoded fallback
  // if (!key) { showToast('API Key is required!'); return; }
  
  localStorage.setItem('aitf_model', mod);
  MODEL = mod;
  
  updateModelBadge();
  closeSettings();
  showToast('Settings saved successfully ✓');
}

function updateModelBadge() {
  const b = document.getElementById('modelBadge');
  b.textContent = `● Groq: ${MODEL.split('-')[1].toUpperCase()}`;
}

document.getElementById('settingsBtn').onclick = openSettings;

// ── KEYBOARD SHORTCUTS ──
document.getElementById('kbBtn').onclick = openKb;
function openKb() { document.getElementById('kbModal').classList.add('open'); }
function closeKb() { document.getElementById('kbModal').classList.remove('open'); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeCompare(); closeSettings(); closeKb(); }
  if (e.ctrlKey && e.key === ',') { e.preventDefault(); openSettings(); }
  if (e.key === '?' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') { openKb(); }
  if (e.ctrlKey && e.key === 'e' && document.getElementById('panel-finder').classList.contains('active')) { e.preventDefault(); exportJSON(); }
});
document.getElementById('userPrompt').addEventListener('keydown', e => { if (e.key === 'Enter' && e.ctrlKey) findTools(); });
document.getElementById('workflowPrompt').addEventListener('keydown', e => { if (e.key === 'Enter' && e.ctrlKey) buildWorkflow(); });

// ── TABS ──
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const tabId = btn.dataset.tab;
    document.getElementById('panel-' + tabId).classList.add('active');
    
    // Auto-load news if first visit
    if (tabId === 'news' && !document.getElementById('newsGrid').innerHTML) loadNews();
  });
});

// ── INPUT COUNTER ──
const promptEl = document.getElementById('userPrompt');
const charCountEl = document.getElementById('charCount');
promptEl.addEventListener('input', () => {
  const l = promptEl.value.length;
  charCountEl.textContent = l;
  charCountEl.style.color = l > 450 ? '#f59e0b' : 'var(--mt)';
  if (l > 500) promptEl.value = promptEl.value.slice(0, 500);
});

// ── GROQ API CALL ──
async function groq(sys, msg) {
  if (!GROQ_KEY) { openSettings(); throw new Error('API Key required'); }
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: MODEL, max_tokens: 2000, temperature: 0.7,
      response_format: { type: "json_object" }, // Force JSON structure
      messages: [{ role: 'system', content: sys }, { role: 'user', content: msg }]
    })
  });
  if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e?.error?.message || `API Error ${r.status}`); }
  const d = await r.json();
  let content = d.choices[0].message.content || '';
  // Fallback cleanup if model wrapped it
  content = content.replace(/```json|```/g, '').trim();
  return JSON.parse(content);
}

// ── HISTORY & CATEGORIES ──
function getHist() { try { return JSON.parse(localStorage.getItem('aitf_h')||'[]'); } catch { return []; } }
function saveHist(q) {
  let h = getHist().filter(x => x !== q); h.unshift(q); h = h.slice(0, 5);
  localStorage.setItem('aitf_h', JSON.stringify(h)); renderHist();
}
function delHist(q, e) {
  e.stopPropagation();
  localStorage.setItem('aitf_h', JSON.stringify(getHist().filter(x => x !== q))); renderHist();
}
function renderHist() {
  const h = getHist(), wrap = document.getElementById('historyWrap'), pills = document.getElementById('historyPills');
  if (!h.length) { wrap.classList.remove('visible'); return; }
  wrap.classList.add('visible');
  pills.innerHTML = h.map((q, i) => `<div class="history-pill" onclick="loadHist(${i})"><span>🕒 ${esc(q.slice(0, 34))}${q.length>34?'…':''}</span><span class="history-del" onclick="delHist(getHist()[${i}],event)">✕</span></div>`).join('');
}
function loadHist(i) { const q=getHist()[i]; if(!q) return; promptEl.value=q; promptEl.dispatchEvent(new Event('input')); findTools(); }

function renderCatChips() {
  const c = document.getElementById('catChips');
  c.innerHTML = CATEGORIES.map(cat => `<div class="cat-chip" onclick="clickCat('${cat}')">${cat}</div>`).join('');
  
  // Fill empty state suggestions
  const s = document.getElementById('suggestRow');
  if (s) s.innerHTML = CATEGORIES.slice(0,3).map(cat => `<button class="suggest-btn" onclick="clickCat('${cat}')">${cat}</button>`).join('');
}
function clickCat(cat) {
  promptEl.value = `I need the best tool for ${cat.replace(/[^a-zA-Z\s]/g, '')}. Make it easy to use.`;
  promptEl.dispatchEvent(new Event('input'));
  findTools();
}

// ── TOOL FINDER ──
async function findTools() {
  const prompt = promptEl.value.trim();
  if (!prompt) { showErr('errorBox', 'Please describe what you want to do.'); return; }
  const filters = [];
  ['budget','skill','priority','platform'].forEach(id => { const v=document.getElementById(id).value; if(v) filters.push(`${id}: ${v}`); });

  setLoad('loading', 'findBtn', true, 'Analysing...');
  document.getElementById('emptyFinder').style.display = 'none';
  document.getElementById('cards').innerHTML = '';
  document.getElementById('resultsHeader').classList.remove('visible');
  hideErr('errorBox'); selectedCmp = []; updateBanner();

  const sys = `You are an expert AI tools advisor. Return a JSON object with a single key "tools" containing an array of 3-4 objects. Each tool object must have: name, tagline, pricing (Free/Freemium/Paid), website (valid URL), why (1-2 sentences), pros (array of 2-3 strings), cons (array of 2 strings), bestFor (string), category (string).`;
  const msg = `User need: ${prompt}${filters.length ? '\nPreferences: ' + filters.join(', ') : ''}`;
  
  try {
    const data = await groq(sys, msg);
    const tools = data.tools || data; // Handle variations
    if (!Array.isArray(tools) || !tools.length) throw new Error("Invalid format returned by AI");
    
    lastResults = tools; saveHist(prompt); renderCards(tools, 'cards', true);
    document.getElementById('resultsHeader').classList.add('visible');
    animateCount('resultsCount', tools.length, ' tools found');
  } catch(e) { 
    showErr('errorBox', 'Error: ' + e.message + ' (Try again or check your API key)'); 
  } finally { 
    setLoad('loading', 'findBtn', false, 'Find Best Tools →'); 
  }
}

function renderCards(tools, containerId, isSearch = false) {
  const c = document.getElementById(containerId);
  c.innerHTML = '';
  const rl = ['Top Pick', '2nd Choice', '3rd Choice', '4th Choice'];
  
  tools.forEach((t, i) => {
    const pc = t.pricing.toLowerCase().includes('free') ? (t.pricing.toLowerCase()==='free'?'price-free':'price-freemium') : 'price-paid';
    const pros = (t.pros || []).map(p => `<div class="pro-item">${esc(p)}</div>`).join('');
    const cons = (t.cons || []).map(p => `<div class="con-item">${esc(p)}</div>`).join('');
    
    const domain = (t.website || '').replace(/^https?:\/\//,'').split('/')[0];
    const favUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : '';
    
    const isSaved = savedTools.some(st => st.name === t.name);
    
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.i = i;
    el.style.animationDelay = `${i * 0.1}s`;
    
    let compareHtml = '';
    if (isSearch) {
      compareHtml = `<input type="checkbox" class="compare-cb" title="Select to compare" onchange="toggleCmp(${i},this)">`;
    }
    
    el.innerHTML = `
      <div class="card-top">
        <div class="card-left">
          ${compareHtml}
          ${favUrl ? `<img src="${favUrl}" class="favicon" alt="logo" loading="lazy">` : ''}
          <div class="card-name">
            <div class="rank">${isSearch ? (rl[i] || '#' + (i + 1)) : t.category}</div>
            <h3>${esc(t.name)}</h3>
            <div class="tagline">${esc(t.tagline || '')}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="price-badge ${pc}">${esc(t.pricing)}</div>
          <button class="save-btn ${isSaved ? 'saved' : ''}" onclick="toggleSave(${isSearch ? i : -1}, '${esc(t.name)}', this)" title="${isSaved ? 'Remove from saved' : 'Save tool'}">
            ${isSaved ? '★' : '☆'}
          </button>
        </div>
      </div>
      <div class="why-box">💡 ${esc(t.why)}</div>
      <div class="pros-cons">
        <div class="pros-list"><div class="pc-label">Pros</div>${pros}</div>
        <div class="cons-list"><div class="pc-label">Cons</div>${cons}</div>
      </div>
      <div class="card-footer">
        <div class="use-case">Best for: ${esc(t.bestFor || '')}</div>
        <a href="${esc(t.website)}" target="_blank" rel="noopener" class="visit-btn">Visit Site <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></a>
      </div>`;
    c.appendChild(el);
  });
}

function animateCount(id, max, suffix) {
  const el = document.getElementById(id);
  let count = 0;
  const interval = setInterval(() => {
    count++;
    el.textContent = `${count}${suffix}`;
    if (count >= max) clearInterval(interval);
  }, 50);
}

// ── COMPARE ──
function toggleCmp(i, cb) {
  const card = document.querySelector(`#cards .card[data-i="${i}"]`);
  if (cb.checked) {
    if (selectedCmp.length >= 2) { cb.checked = false; showToast('Max 2 tools for comparison'); return; }
    selectedCmp.push(i); card.classList.add('compare-selected');
  } else {
    selectedCmp = selectedCmp.filter(x => x !== i); card.classList.remove('compare-selected');
  }
  updateBanner();
}
function updateBanner() {
  const b = document.getElementById('compareBanner'), bt = document.getElementById('compareBannerText'), btn = document.getElementById('compareNowBtn');
  if (!selectedCmp.length) { b.classList.remove('visible'); return; }
  b.classList.add('visible');
  if (selectedCmp.length === 1) { bt.textContent = '1 selected — pick one more'; btn.style.display = 'none'; }
  else { bt.textContent = `${lastResults[selectedCmp[0]].name} vs ${lastResults[selectedCmp[1]].name}`; btn.style.display = 'block'; }
}
function openCompare() {
  if (selectedCmp.length < 2) return;
  const [a, b] = selectedCmp.map(i => lastResults[i]);
  const rows = [
    ['Pricing', a.pricing, b.pricing],
    ['Category', a.category || '—', b.category || '—'],
    ['Best For', a.bestFor || '—', b.bestFor || '—'],
    ['Why Pick It', a.why, b.why],
    ['Pros', (a.pros || []).join('<br>• '), (b.pros || []).join('<br>• ')],
    ['Cons', (a.cons || []).join('<br>• '), (b.cons || []).join('<br>• ')],
    ['Website', `<a href="${esc(a.website)}" target="_blank" style="color:var(--ac)">${esc(a.website)}</a>`, `<a href="${esc(b.website)}" target="_blank" style="color:var(--ac)">${esc(b.website)}</a>`]
  ];
  const g = document.getElementById('compareGrid');
  g.innerHTML = `<div class="cg-label">Feature</div><div class="cg-header">${esc(a.name)}</div><div class="cg-header">${esc(b.name)}</div>
    ${rows.map(([l, av, bv]) => `<div class="cg-label">${l}</div><div class="cg-cell">${av}</div><div class="cg-cell">${bv}</div>`).join('')}`;
  document.getElementById('compareModal').classList.add('open');
}
function closeCompare() { document.getElementById('compareModal').classList.remove('open'); }

// ── SAVED TOOLS ──
function toggleSave(searchIdx, name, btn) {
  let tool = null;
  if (searchIdx >= 0) { tool = lastResults[searchIdx]; } 
  else { tool = savedTools.find(t => t.name === name); } // From alternatives or news
  
  if (!tool) return;
  
  const existingIdx = savedTools.findIndex(t => t.name === tool.name);
  if (existingIdx >= 0) {
    savedTools.splice(existingIdx, 1);
    btn.classList.remove('saved');
    btn.textContent = '☆';
    btn.title = 'Save tool';
    showToast('Removed from saved');
  } else {
    savedTools.unshift(tool);
    btn.classList.add('saved');
    btn.textContent = '★';
    btn.title = 'Remove from saved';
    showToast('Saved to your collection ⭐');
  }
  
  localStorage.setItem('aitf_saved', JSON.stringify(savedTools));
  updateSavedCount();
  if (document.getElementById('panel-saved').classList.contains('active')) renderSaved();
}

function updateSavedCount() {
  const badge = document.getElementById('savedCount');
  badge.textContent = savedTools.length;
  if (savedTools.length > 0) badge.classList.add('show'); else badge.classList.remove('show');
}

function renderSaved() {
  const c = document.getElementById('savedCards');
  const empty = document.getElementById('savedEmpty');
  const clearWrap = document.getElementById('clearSavedWrap');
  
  if (savedTools.length === 0) {
    c.innerHTML = '';
    empty.style.display = 'block';
    clearWrap.style.display = 'none';
    return;
  }
  
  empty.style.display = 'none';
  clearWrap.style.display = 'block';
  renderCards(savedTools, 'savedCards', false);
}

function clearSaved() {
  if (confirm('Are you sure you want to remove all saved tools?')) {
    savedTools = [];
    localStorage.setItem('aitf_saved', '[]');
    updateSavedCount();
    renderSaved();
    // Update active stars in search results
    document.querySelectorAll('.save-btn').forEach(b => { b.classList.remove('saved'); b.textContent = '☆'; });
  }
}

// ── EXPORT & COPY ──
function copyResults() {
  if (!lastResults.length) return;
  const txt = lastResults.map((t, i) => `${i + 1}. ${t.name} (${t.pricing})\n${t.tagline}\nWhy: ${t.why}\nPros: ${(t.pros || []).join(', ')}\nCons: ${(t.cons || []).join(', ')}\nLink: ${t.website}`).join('\n\n');
  navigator.clipboard.writeText(txt).then(() => showToast('Copied to clipboard ✓')).catch(() => showToast('Copy failed'));
}

function exportJSON() {
  if (!lastResults.length) return;
  const data = JSON.stringify(lastResults, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ai-tools-export.json'; a.click();
  URL.revokeObjectURL(url);
}

function exportPDF() {
  if (!lastResults.length) return;
  window.print();
}

// ── WORKFLOW ──
let lastWorkflow = [];
async function buildWorkflow() {
  const p = document.getElementById('workflowPrompt').value.trim();
  if (!p) { showErr('workflowError', 'Describe your project goal.'); return; }
  setLoad('workflowLoading', 'workflowBtn', true, 'Building...');
  document.getElementById('workflowSteps').innerHTML = ''; hideErr('workflowError'); document.getElementById('workflowActions').style.display='none';
  
  const sys = `You are an AI workflow expert. Return a JSON object with a key "steps" containing an array of 4-6 step objects. Each step: step (name string), description (one sentence string), tools (array of 2-3 objects with: name, website, pricing, note).`;
  try {
    const data = await groq(sys, `Project: ${p}\nCreate a step-by-step AI tool workflow.`);
    const steps = data.steps || data;
    lastWorkflow = steps;
    
    const c = document.getElementById('workflowSteps'); c.innerHTML = '';
    steps.forEach((s, i) => {
      const t = (s.tools || []).map(t => `<a href="${esc(t.website)}" target="_blank" rel="noopener" class="step-tool">${esc(t.name)}<span class="step-badge">${esc(t.pricing || '')}</span></a>`).join('');
      const el = document.createElement('div'); el.className = 'step-card'; el.style.animationDelay = `${i * 0.1}s`;
      el.innerHTML = `<div class="step-header"><div class="step-num">${i + 1}</div><div class="step-info"><div class="step-name">${esc(s.step)}</div><div class="step-desc">${esc(s.description || '')}</div></div></div><div class="step-tools">${t}</div>`;
      c.appendChild(el);
    });
    document.getElementById('workflowActions').style.display = 'block';
  } catch(e) { showErr('workflowError', 'Error: ' + e.message); }
  finally { setLoad('workflowLoading', 'workflowBtn', false, 'Build My Toolkit →'); }
}

function copyWorkflow() {
  if (!lastWorkflow.length) return;
  const txt = lastWorkflow.map((s, i) => `[ ] Step ${i+1}: ${s.step}\n    ${s.description}\n    Tools: ${s.tools.map(t => `${t.name} (${t.website})`).join(', ')}`).join('\n\n');
  navigator.clipboard.writeText(txt).then(() => showToast('Workflow copied as checklist ✓'));
}

// ── ALTERNATIVES ──
async function findAlts() {
  const tool = document.getElementById('altInput').value.trim();
  if (!tool) { showErr('altError', 'Enter a tool name.'); return; }
  setLoad('altLoading', 'altBtn', true, 'Finding...');
  document.getElementById('altCards').innerHTML = ''; hideErr('altError');
  
  const sys = `You are an AI tools expert. Return a JSON object with key "tools" containing exactly 3 objects. Each object: name, tagline, pricing, website, why (1-2 sentences why it's a good alt), pros (2 strings), cons (2 strings), bestFor (string), category (string).`;
  try {
    const data = await groq(sys, `Find 3 high-quality alternatives to "${tool}" with different strengths.`);
    const alts = data.tools || data;
    renderCards(alts, 'altCards', false);
  } catch(e) { showErr('altError', 'Error: ' + e.message); }
  finally { setLoad('altLoading', 'altBtn', false, 'Find Alternatives →'); }
}

// ── NEWS ──
async function loadNews() {
  setLoad('newsLoading', 'newsBtn', true, 'Fetching...');
  document.getElementById('newsGrid').innerHTML = ''; hideErr('newsError');
  const sys = `You are an AI industry analyst. Return a JSON object with key "news" containing 5-6 objects of recently trending AI tools. Each: name, category, description (2 sentences), pricing, website, highlight (one impressive phrase).`;
  try {
    const data = await groq(sys, 'List 5-6 recently trending or newly launched AI tools. Mix different categories.');
    const items = data.news || data;
    const g = document.getElementById('newsGrid'); g.innerHTML = '';
    items.forEach((item, i) => {
      const pc = item.pricing.toLowerCase().includes('free') ? (item.pricing.toLowerCase()==='free'?'price-free':'price-freemium') : 'price-paid';
      const el = document.createElement('div'); el.className = 'news-card'; el.style.animationDelay = `${i * 0.1}s`;
      el.innerHTML = `
        <div class="news-icon">${EMOJIS[i % EMOJIS.length]}</div>
        <div class="news-body">
          <div class="news-title"><a href="${esc(item.website)}" target="_blank" rel="noopener">${esc(item.name)}</a><span class="price-badge ${pc}" style="font-size:10px;padding:4px 8px">${esc(item.pricing)}</span></div>
          <div class="news-desc">${esc(item.description)}</div>
          <div class="news-meta"><span class="news-tag">⭐ ${esc(item.highlight)}</span><span class="news-cat">${esc(item.category)}</span></div>
        </div>`;
      g.appendChild(el);
    });
  } catch(e) { showErr('newsError', 'Error: ' + e.message); }
  finally { setLoad('newsLoading', 'newsBtn', false, 'Fetch Latest AI Tools →'); }
}

// ── UTILS ──
function esc(s) { const d = document.createElement('div'); d.textContent = String(s || ''); return d.innerHTML; }
function setLoad(lid, bid, on, txt) { document.getElementById(lid).classList.toggle('active', on); const b = document.getElementById(bid); b.disabled = on; b.textContent = txt; }
function showErr(id, msg) { const e = document.getElementById(id); e.textContent = '⚠ ' + msg; e.classList.add('visible'); }
function hideErr(id) { document.getElementById(id).classList.remove('visible'); }
function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); }
