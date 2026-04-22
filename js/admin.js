/* ============================================================
   TrainHub — Admin (localStorage + migração Firebase)
   ============================================================ */

const STORAGE_KEY   = 'trainhub_admin_data';
const PRESET_COLORS = ['#00B4A6','#FFB800','#00D68F','#00B4D8','#8338EC','#FF4757','#06D6A0','#118AB2','#EF476F','#E85454'];

let _companies = [], _trainings = [], _instrutores = [];
let activeCompanyId = null, editingCompanyId = null, editingTrainingId = null;
let tempDomains = [];

/* ── BOOT ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const d = JSON.parse(raw); _companies = d.companies||[]; _trainings = d.trainings||[]; _instrutores = d.instrutores||[]; }
  } catch(e) {}
  renderSidebar();
  if (_companies.length) selectCompany(_companies[0].id);
  document.getElementById('loadingOverlay')?.classList.add('hidden');
  document.querySelectorAll('.modal-bg').forEach(bg => bg.addEventListener('click', e => { if (e.target===bg) bg.classList.remove('open'); }));
});

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ companies: _companies, trainings: _trainings, instrutores: _instrutores }));
}

/* ── MIGRAÇÃO FIREBASE ──────────────────────────────────── */
async function migrateToFirebase() {
  const btn = document.getElementById('btnMigrate');
  if (!_companies.length) { toast('Nenhuma empresa para migrar.','err'); return; }
  if (!confirm('Migrar ' + _companies.length + ' empresa(s), ' + _trainings.length + ' treinamento(s) e ' + _instrutores.length + ' instrutor(es) para o Firebase?')) return;
  btn.disabled = true;
  btn.textContent = 'Conectando ao Firebase...';
  try {
    const fb = await import('./firebase.js');
    btn.textContent = 'Migrando empresas...';
    for (const c of _companies) { await fb.saveCompany(c); toast('Empresa "' + c.name + '" migrada.','ok'); }
    btn.textContent = 'Migrando treinamentos...';
    for (const t of _trainings) await fb.saveTraining(t);
    if (_trainings.length) toast(_trainings.length + ' treinamentos migrados.','ok');
    btn.textContent = 'Migrando instrutores...';
    for (const i of _instrutores) await fb.saveInstructor(i);
    if (_instrutores.length) toast(_instrutores.length + ' instrutores migrados.','ok');
    btn.textContent = '✓ Concluído!';
    btn.style.cssText = 'background:var(--ok-g);color:var(--ok);border-color:rgba(0,214,143,.3)';
    setTimeout(() => { btn.style.display='none'; }, 4000);
  } catch(e) {
    btn.disabled = false; btn.textContent = 'Migrar para Firebase';
    toast('Erro: ' + e.message, 'err'); console.error(e);
  }
}

/* ── SIDEBAR ────────────────────────────────────────────── */
function renderSidebar() {
  const el = document.getElementById('companyList');
  if (!_companies.length) { el.innerHTML = '<div class="no-items">Nenhuma empresa cadastrada.</div>'; return; }
  el.innerHTML = _companies.map(c => {
    const count = _trainings.filter(t => t.companyId===c.id).length;
    const init  = (c.shortName||'?').slice(0,3).toUpperCase();
    const logo  = c.logo ? '<img src="'+c.logo+'" style="width:100%;height:100%;object-fit:contain;border-radius:8px;padding:2px;" onerror="this.parentElement.textContent=\''+init+'\'">' : init;
    return '<div class="company-item '+(c.id===activeCompanyId?'active':'')+'" id="ci-'+c.id+'" onclick="selectCompany(\''+c.id+'\')">'
      + '<div class="company-dot" style="background:'+(c.logo?'#1C2840':c.color)+';border:1px solid '+c.color+'30">'+logo+'</div>'
      + '<div class="company-item-info"><div class="company-item-name">'+c.name+'</div><div class="company-item-count">'+count+' treinamento'+(count!==1?'s':'')+'</div></div>'
      + '<button class="company-item-del" onclick="event.stopPropagation();confirmDelete(\'empresa\',\''+c.id+'\')" title="Excluir"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>'
      + '</div>';
  }).join('');
}

/* ── COMPANY PANEL ──────────────────────────────────────── */
function selectCompany(id) { activeCompanyId = id; renderSidebar(); renderCompanyPanel(); }

function renderCompanyPanel() {
  const c = _companies.find(x => x.id===activeCompanyId); if (!c) return;
  document.getElementById('emptyState').style.display = 'none';
  const panel = document.getElementById('companyPanel'); panel.style.display = 'flex';
  const trainings   = _trainings.filter(t => t.companyId===activeCompanyId);
  const instrutores = _instrutores.filter(i => i.empresaId===activeCompanyId);
  const mods = trainings.reduce((a,t)=>a+(t.modules?.length||0),0);
  const domains = (c.emailDomains||[]).join(', ')||'—';
  panel.innerHTML = `
    <div class="company-header">
      <div class="company-header-avatar" style="background:${c.logo?'#151E30':c.color};border:2px solid ${c.color}40">
        ${c.logo ? '<img src="'+c.logo+'" style="width:100%;height:100%;object-fit:contain;padding:4px;" onerror="this.style.display=\'none\'">' : (c.shortName||'?').slice(0,3).toUpperCase()}
      </div>
      <div class="company-header-info">
        <div class="company-header-name">${c.name}</div>
        <div class="company-header-meta">Matrícula: <span>${c.matriculaPrefix}-0001</span> &nbsp;·&nbsp; <span>${trainings.length} treinamentos · ${mods} módulos · ${instrutores.length} instrutores</span></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="openCompanyModal('${c.id}')">Editar</button>
        <button class="btn btn-primary btn-sm" onclick="openTrainingModal()">+ Novo Treinamento</button>
      </div>
    </div>
    <div class="tab-bar">
      <button class="tab active" onclick="switchTab(this,'tab-trainings')">Treinamentos (${trainings.length})</button>
      <button class="tab" onclick="switchTab(this,'tab-instrutores');renderInstructorTab()">Instrutores (${instrutores.length})</button>
      <button class="tab" onclick="switchTab(this,'tab-settings')">Configurações</button>
    </div>
    <div class="tab-content active" id="tab-trainings">
      ${trainings.length===0 ? '<div class="no-items" style="padding:40px">Nenhum treinamento. Clique em <strong>+ Novo Treinamento</strong>.</div>' : trainings.map(renderTrainingCard).join('')}
    </div>
    <div class="tab-content" id="tab-instrutores"></div>
    <div class="tab-content" id="tab-settings">
      <div style="max-width:520px">
        <div class="form-grid" style="gap:12px">
          <div class="form-group full"><label class="flabel">Nome completo</label><input class="finput" value="${c.name}" onchange="quickUpdate('${c.id}','name',this.value)"></div>
          <div class="form-group"><label class="flabel">Nome curto</label><input class="finput" value="${c.shortName||''}" onchange="quickUpdate('${c.id}','shortName',this.value)"></div>
          <div class="form-group"><label class="flabel">Prefixo Matrícula</label><input class="finput" value="${c.matriculaPrefix||''}" style="text-transform:uppercase" onchange="quickUpdate('${c.id}','matriculaPrefix',this.value.toUpperCase())"></div>
          <div class="form-group full"><label class="flabel">Domínios de e-mail</label><input class="finput" value="${domains}" onchange="quickUpdate('${c.id}','emailDomains',this.value.split(',').map(s=>s.trim()).filter(Boolean))"></div>
        </div>
        <div style="margin-top:16px"><button class="btn btn-danger btn-sm" onclick="confirmDelete('empresa','${c.id}')">Excluir empresa</button></div>
      </div>
    </div>`;
}

function switchTab(btn, tabId) {
  document.getElementById('companyPanel').querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('companyPanel').querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active'); document.getElementById(tabId)?.classList.add('active');
}

function quickUpdate(id, field, value) {
  const c = _companies.find(x=>x.id===id); if (!c) return;
  c[field] = value; save(); renderSidebar(); toast('Salvo!','ok');
}

/* ── INSTRUTORES ────────────────────────────────────────── */
function renderInstructorTab() {
  const el = document.getElementById('tab-instrutores');
  const list = _instrutores.filter(i=>i.empresaId===activeCompanyId);
  el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    + '<span class="section-label">'+list.length+' instrutor'+(list.length!==1?'es':'')+'</span>'
    + '<div style="display:flex;gap:8px">'
    + '<button class="btn btn-ghost btn-sm" onclick="openImportCSVModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Importar CSV</button>'
    + '<button class="btn btn-primary btn-sm" onclick="openInstructorModal()">+ Novo</button>'
    + '</div></div>'
    + (list.length===0 ? '<div class="no-items">Nenhum instrutor. Importe o CSV ou adicione manualmente.</div>'
      : '<div style="display:flex;flex-direction:column;gap:6px">'
      + list.map(i => '<div style="display:grid;grid-template-columns:110px 1fr 1fr auto;gap:8px;align-items:center;padding:10px 12px;background:var(--sur2);border:1px solid var(--bor);border-radius:var(--r8)">'
        + '<span style="font-family:var(--fm);font-size:.8rem;color:var(--tx2)">'+i.matricula+'</span>'
        + '<span style="font-size:.88rem">'+i.nome+'</span>'
        + '<span style="font-size:.8rem;color:var(--tx3)">'+i.email+'</span>'
        + '<button class="btn btn-danger btn-xs" onclick="removeInstructor(\''+i.matricula+'\')">Remover</button>'
        + '</div>').join('')
      + '</div>');
}

function removeInstructor(mat) {
  if (!confirm('Remover '+mat+'?')) return;
  _instrutores = _instrutores.filter(i=>i.matricula!==mat); save(); renderInstructorTab(); renderSidebar(); toast('Removido.','ok');
}

function openInstructorModal() {
  ['iMatricula','iNome','iEmail'].forEach(id=>document.getElementById(id).value='');
  openModal('modalInstructor');
}

function saveInstructorManual() {
  const mat=document.getElementById('iMatricula').value.trim().toUpperCase();
  const nome=document.getElementById('iNome').value.trim();
  const email=document.getElementById('iEmail').value.trim().toLowerCase();
  if (!mat||!nome||!email) { toast('Preencha todos os campos.','err'); return; }
  _instrutores.push({ matricula:mat, nome, email, empresaId:activeCompanyId, ativo:true });
  save(); closeModal('modalInstructor'); renderInstructorTab(); renderSidebar(); toast('Instrutor salvo!','ok');
}

/* ── IMPORTAR CSV ───────────────────────────────────────── */
function openImportCSVModal() {
  document.getElementById('csvText').value='';
  document.getElementById('csvPreview').innerHTML='';
  openModal('modalCSV');
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l=>l.trim());
  const first = lines[0].toLowerCase();
  const hasHeader = first.includes('matricula') || first.includes('nome') || first.includes('email');
  const start = hasHeader ? 1 : 0;
  let idxMat=0, idxNome=1, idxEmpresa=2, idxEmail=3;
  if (hasHeader) {
    const headers = lines[0].split(',').map(h=>h.trim().toLowerCase());
    headers.forEach((h,i) => {
      if (h.includes('matricula')||h.includes('matrícula')) idxMat=i;
      else if (h==='nome') idxNome=i;
      else if (h.includes('empresa')) idxEmpresa=i;
      else if (h.includes('email')||h.includes('e-mail')) idxEmail=i;
    });
  }
  return lines.slice(start).map(line => {
    const sep  = line.includes(';') ? ';' : ',';
    const cols = line.split(sep).map(c=>c.trim().replace(/^"|"$/g,''));
    // Detecta empresa pelo domínio do e-mail (mais confiável)
    const email = cols[idxEmail]||'';
    const domain = email.split('@')[1]?.toLowerCase()||'';
    let empresaId = activeCompanyId;

    if (domain) {
      // 1. Tenta pelo domínio do e-mail
      const byDomain = _companies.find(c =>
        (c.emailDomains||[]).some(d => d.toLowerCase() === domain)
      );
      if (byDomain) {
        empresaId = byDomain.id;
      } else {
        // 2. Fallback: pela coluna Empresa
        const nomeEmpresa = cols[idxEmpresa]||'';
        if (nomeEmpresa) {
          const byName = _companies.find(c =>
            c.name.toLowerCase().includes(nomeEmpresa.toLowerCase()) ||
            nomeEmpresa.toLowerCase().includes(c.name.toLowerCase())
          );
          if (byName) empresaId = byName.id;
        }
      }
    }
    return { matricula:cols[idxMat]||'', nome:cols[idxNome]||'', email:cols[idxEmail]||'', empresaId, ativo:true };
  }).filter(r=>r.matricula&&r.email);
}

function previewCSV() {
  const rows = parseCSV(document.getElementById('csvText').value||'');
  const preview = document.getElementById('csvPreview');
  if (!rows.length) { preview.innerHTML='<p style="color:var(--err);font-size:.8rem">Nenhum registro válido.</p>'; return; }
  const byCompany = {};
  rows.forEach(r => { const n=_companies.find(c=>c.id===r.empresaId)?.name||'?'; byCompany[n]=(byCompany[n]||0)+1; });
  const summary = Object.entries(byCompany).map(([n,c])=>n+': '+c).join(' · ');
  preview.innerHTML = '<p style="font-size:.78rem;color:var(--ok);margin-bottom:4px">✓ '+rows.length+' instrutor'+(rows.length!==1?'es':'')+' encontrado'+(rows.length!==1?'s':'')+'.</p>'
    + '<p style="font-size:.75rem;color:var(--tx3);margin-bottom:8px">'+summary+'</p>'
    + '<div style="max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">'
    + rows.slice(0,5).map(r => {
        const cn = _companies.find(c=>c.id===r.empresaId)?.shortName||'?';
        return '<div style="display:grid;grid-template-columns:100px 1fr 1fr 60px;gap:8px;padding:6px 8px;background:var(--sur3);border-radius:var(--r4);font-size:.75rem">'
          + '<span style="font-family:var(--fm);color:var(--tx2)">'+r.matricula+'</span>'
          + '<span>'+r.nome+'</span><span style="color:var(--tx3)">'+r.email+'</span>'
          + '<span style="color:var(--or);font-weight:600">'+cn+'</span></div>';
      }).join('')
    + (rows.length>5?'<p style="font-size:.75rem;color:var(--tx3);text-align:center;margin-top:4px">...e mais '+(rows.length-5)+'</p>':'')
    + '</div>';
}

function confirmImportCSV() {
  const rows = parseCSV(document.getElementById('csvText').value||'');
  if (!rows.length) { toast('Nenhum registro válido.','err'); return; }
  rows.forEach(r => {
    const idx = _instrutores.findIndex(i=>i.matricula===r.matricula);
    if (idx>=0) _instrutores[idx]={..._instrutores[idx],...r};
    else _instrutores.push(r);
  });
  save(); closeModal('modalCSV'); renderInstructorTab(); renderSidebar();
  toast(rows.length+' instrutores importados!','ok');
}

/* ── TRAINING CARD ──────────────────────────────────────── */
function renderTrainingCard(t) {
  const lc={'Básico':'badge-green','Intermediário':'badge-am','Avançado':'badge-err'};
  const cc={'Segurança':'badge-or','Regulatório':'badge-blue','Saúde':'badge-green','Técnico':'badge-am','Eficiência':'badge-muted'};
  const mc=t.modules?.length||0, mins=(t.modules||[]).reduce((a,m)=>a+(parseInt(m.duration)||0),0);
  return '<div class="training-card" id="tc-'+t.id+'">'
    + '<div class="training-card-head" onclick="toggleCard(\''+t.id+'\')">'
    + '<div class="training-left"><div class="training-title-row"><div class="training-name">'+t.title+'</div>'
    + '<span class="badge '+(cc[t.category]||'badge-muted')+'">'+t.category+'</span>'
    + '<span class="badge '+(lc[t.level]||'badge-muted')+'">'+t.level+'</span></div>'
    + '<div class="training-meta-row"><span style="font-size:.78rem;color:var(--tx3)">'+mc+' módulo'+(mc!==1?'s':'')+' · '+mins+' min</span></div></div>'
    + '<div class="training-right">'
    + '<button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();openTrainingModal(\''+t.id+'\')">Editar</button>'
    + '<button class="btn btn-danger btn-xs" onclick="event.stopPropagation();confirmDelete(\'treinamento\',\''+t.id+'\')">Excluir</button>'
    + '<svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'
    + '</div></div>'
    + '<div class="training-body">'
    + (t.modules||[]).map((m,i)=>'<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--sur2);border:1px solid var(--bor);border-radius:var(--r8);margin-bottom:6px">'
      + '<div class="mod-num">'+(i+1)+'</div><div style="flex:1;min-width:0">'
      + '<div style="font-family:var(--fd);font-size:.9rem;font-weight:700;text-transform:uppercase">'+m.title+'</div>'
      + '<div style="font-family:var(--fm);font-size:.7rem;color:var(--tx3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(m.githubUrl||'— sem URL —')+'</div></div>'
      + '<span style="font-family:var(--fm);font-size:.75rem;color:var(--tx3);white-space:nowrap">'+(m.duration||'—')+' min</span>'
      + (m.githubUrl?'<a href="'+m.githubUrl+'" target="_blank" class="btn btn-ghost btn-xs">↗</a>':'')
      + '</div>').join('')
    + '<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:4px" onclick="openTrainingModal(\''+t.id+'\')">Editar módulos</button>'
    + '</div></div>';
}

function toggleCard(id) { document.getElementById('tc-'+id)?.classList.toggle('open'); }

/* ── COMPANY MODAL ──────────────────────────────────────── */
function openCompanyModal(editId) {
  editingCompanyId=editId||null;
  tempDomains=[];
  document.getElementById('modalCompanyTitle').textContent=editId?'Editar Empresa':'Nova Empresa';
  buildColorSwatches();
  if (editId) {
    const c=_companies.find(x=>x.id===editId); if (!c) return;
    document.getElementById('cName').value=c.name;
    document.getElementById('cShort').value=c.shortName||'';
    document.getElementById('cPrefix').value=c.matriculaPrefix||'';
    document.getElementById('cColor').value=c.color;
    document.getElementById('cLogo').value=c.logo||'';
    document.getElementById('cColorPicker').value=c.color;
    tempDomains=[...(c.emailDomains||[])];
    highlightSwatch(c.color);
  } else {
    ['cName','cShort','cPrefix','cLogo'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('cColor').value='#00B4A6';
    document.getElementById('cColorPicker').value='#00B4A6';
    highlightSwatch('#00B4A6');
  }
  renderDomainTags();
  openModal('modalCompany');
}

function buildColorSwatches() {
  document.getElementById('colorSwatches').innerHTML=PRESET_COLORS.map(c=>'<div class="color-swatch" style="background:'+c+'" data-color="'+c+'" onclick="selectColor(\''+c+'\')" title="'+c+'"></div>').join('');
}
function selectColor(hex) { document.getElementById('cColor').value=hex; document.getElementById('cColorPicker').value=hex; highlightSwatch(hex); }
function setCustomColor(hex) { document.getElementById('cColor').value=hex; highlightSwatch(hex); }
function highlightSwatch(hex) { document.querySelectorAll('.color-swatch').forEach(el=>el.classList.toggle('selected',el.dataset.color===hex)); }
function addDomain(e) {
  if (e.key!=='Enter') return; e.preventDefault();
  const v=document.getElementById('domainInput').value.trim().toLowerCase();
  if (!v||!v.includes('.')) return;
  if (!tempDomains.includes(v)) tempDomains.push(v);
  document.getElementById('domainInput').value=''; renderDomainTags();
}
function removeDomain(d) { tempDomains=tempDomains.filter(x=>x!==d); renderDomainTags(); }
function renderDomainTags() {
  const input=document.getElementById('domainInput');
  const wrap=document.getElementById('domainTags');
  wrap.innerHTML=tempDomains.map(d=>'<span class="tag">'+d+'<button onclick="removeDomain(\''+d+'\')">×</button></span>').join('');
  wrap.appendChild(input);
}

function saveCompanyModal() {
  const name=document.getElementById('cName').value.trim();
  const short=document.getElementById('cShort').value.trim();
  const prefix=document.getElementById('cPrefix').value.trim().toUpperCase();
  const color=document.getElementById('cColor').value;
  const logo=document.getElementById('cLogo').value.trim();
  if (!name||!short||!prefix) { toast('Preencha nome, nome curto e prefixo.','err'); return; }
  const id=editingCompanyId||(slug(name)+'-'+Date.now().toString(36));
  const company={id,name,shortName:short,matriculaPrefix:prefix,color,logo:logo||null,emailDomains:[...tempDomains],active:true};
  if (!editingCompanyId) _companies.push(company);
  else { const idx=_companies.findIndex(c=>c.id===id); if(idx>=0) _companies[idx]=company; }
  save(); activeCompanyId=id;
  toast(editingCompanyId?'Empresa atualizada!':'Empresa criada!','ok');
  closeModal('modalCompany'); renderSidebar(); renderCompanyPanel();
}

/* ── TRAINING MODAL ─────────────────────────────────────── */
function openTrainingModal(editId) {
  editingTrainingId=editId||null;
  document.getElementById('modalTrainingTitle').textContent=editId?'Editar Treinamento':'Novo Treinamento';
  if (editId) {
    const t=_trainings.find(x=>x.id===editId); if (!t) return;
    document.getElementById('tTitle').value=t.title;
    document.getElementById('tDesc').value=t.description||'';
    document.getElementById('tCategory').value=t.category;
    document.getElementById('tLevel').value=t.level;
    renderModuleRows(t.modules||[]);
  } else {
    ['tTitle','tDesc'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('tCategory').value='Segurança';
    document.getElementById('tLevel').value='Básico';
    renderModuleRows([]);
    setTimeout(()=>addModuleRow(),50);
  }
  openModal('modalTraining');
}

let _mrc=0;
function renderModuleRows(mods) { document.getElementById('moduleRows').innerHTML=''; mods.forEach(m=>addModuleRow(m)); }

function addModuleRow(data) {
  const id='mr'+(_mrc++), el=document.getElementById('moduleRows'), num=el.children.length+1;
  const row=document.createElement('div');
  row.className='module-row'; row.dataset.rowId=id; row.setAttribute('draggable','true');
  row.innerHTML='<div class="drag-handle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/></svg></div>'
    +'<div class="mod-num">'+num+'</div>'
    +'<div class="mod-info"><input class="mod-title-input" placeholder="Título" value="'+(data?.title||'')+'" oninput="renumberRows()">'
    +'<input class="mod-url-input" placeholder="https://docs.google.com/..." value="'+(data?.githubUrl||'')+'" oninput="checkUrl(this)" style="margin-top:4px">'
    +'<div class="url-status" id="us-'+id+'"></div></div>'
    +'<input class="mod-dur-input" type="number" min="1" max="999" placeholder="min" value="'+(data?.duration||'')+'">'
    +'<button class="mod-del-btn" onclick="removeModuleRow(this)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
  row.addEventListener('dragstart',e=>{row._drag=true;row.classList.add('dragging');});
  row.addEventListener('dragover',e=>e.preventDefault());
  row.addEventListener('drop',e=>{e.preventDefault();const p=el;const nodes=[...p.children];const si=nodes.indexOf(document.querySelector('.dragging')),ti=nodes.indexOf(row);if(si<ti)p.insertBefore(document.querySelector('.dragging'),row.nextSibling);else p.insertBefore(document.querySelector('.dragging'),row);renumberRows();});
  row.addEventListener('dragend',()=>row.classList.remove('dragging'));
  el.appendChild(row);
  if (data?.githubUrl) checkUrl(row.querySelector('.mod-url-input'));
  renumberRows();
}

function removeModuleRow(btn) { btn.closest('.module-row').remove(); renumberRows(); }
function renumberRows() { document.querySelectorAll('#moduleRows .mod-num').forEach((el,i)=>el.textContent=i+1); }
function checkUrl(input) {
  const id=input.closest('.module-row').dataset.rowId;
  const s=document.getElementById('us-'+id); if(!s) return;
  const v=input.value.trim();
  if (!v){s.textContent='';return;}
  s.className='url-status '+(v.startsWith('https://')?'ok':'bad');
  s.textContent=v.startsWith('https://')?'✓ URL válida':'⚠ Deve começar com https://';
}

function saveTrainingModal() {
  const title=document.getElementById('tTitle').value.trim();
  if (!title) { toast('Informe o título.','err'); return; }
  const rows=[...document.querySelectorAll('#moduleRows .module-row')];
  const modules=rows.map((r,i)=>({id:'mod-'+String(i+1).padStart(2,'0'),title:r.querySelector('.mod-title-input').value.trim()||'Módulo '+(i+1),duration:parseInt(r.querySelector('.mod-dur-input').value)||0,githubUrl:r.querySelector('.mod-url-input').value.trim(),order:i+1}));
  const id=editingTrainingId||(slug(title)+'-'+Date.now().toString(36));
  const t={id,companyId:activeCompanyId,title,description:document.getElementById('tDesc').value.trim(),category:document.getElementById('tCategory').value,level:document.getElementById('tLevel').value,totalDuration:modules.reduce((a,m)=>a+m.duration,0),modules,active:true};
  if (!editingTrainingId) _trainings.push(t);
  else { const idx=_trainings.findIndex(x=>x.id===id); if(idx>=0) _trainings[idx]=t; }
  save(); toast(editingTrainingId?'Atualizado!':'Criado!','ok'); closeModal('modalTraining'); renderCompanyPanel();
}

/* ── DELETE ─────────────────────────────────────────────── */
function confirmDelete(type,id) {
  document.getElementById('confirmTitle').textContent='Excluir '+type;
  document.getElementById('confirmMsg').textContent=type==='empresa'?'Excluir empresa e todos os treinamentos?':'Excluir este treinamento?';
  document.getElementById('confirmBtn').onclick=()=>{
    if(type==='empresa'){_trainings=_trainings.filter(t=>t.companyId!==id);_instrutores=_instrutores.filter(i=>i.empresaId!==id);_companies=_companies.filter(c=>c.id!==id);activeCompanyId=_companies[0]?.id||null;if(!activeCompanyId){document.getElementById('emptyState').style.display='flex';document.getElementById('companyPanel').style.display='none';}}
    else _trainings=_trainings.filter(t=>t.id!==id);
    save(); closeModal('modalConfirm'); renderSidebar(); if(activeCompanyId) renderCompanyPanel(); toast('Excluído.','ok');
  };
  openModal('modalConfirm');
}

/* ── UTILS ──────────────────────────────────────────────── */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function toast(msg,type='info') { const w=document.getElementById('toastWrap');const t=document.createElement('div');t.className='toast '+type;t.textContent=msg;w.appendChild(t);setTimeout(()=>t.remove(),3500); }
function slug(str) { return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

Object.assign(window,{
  selectCompany,openCompanyModal,saveCompanyModal,quickUpdate,confirmDelete,
  openTrainingModal,saveTrainingModal,toggleCard,switchTab,
  addModuleRow,removeModuleRow,checkUrl,renumberRows,
  selectColor,setCustomColor,addDomain,removeDomain,
  openImportCSVModal,previewCSV,confirmImportCSV,
  openInstructorModal,saveInstructorManual,removeInstructor,renderInstructorTab,
  openModal,closeModal,migrateToFirebase,
});