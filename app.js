const kits = window.DRUM_KITS || [];
const standaloneParts = window.DRUM_STANDALONE_PARTS || [];
const $ = (s) => document.querySelector(s);
const grid = $('#kitGrid');
const standaloneGrid = $('#standaloneGrid');
const dialog = $('#kitDialog');
let currentView = 'kits';

const norm = v => String(v ?? '').toLowerCase().replace(/[″”"]/g,'').replace(/\s+/g,' ').trim();
const unique = arr => [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'en',{numeric:true}));
const esc = s => String(s ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const primaryImage = o => o.image || o.realImageUrl || '';
const imageLabel = o => o.image ? 'תמונה מתוך ה-VST' : (o.realImageUrl ? 'תמונה אמיתית' : '');
function safeImg(src, alt, extra=''){ return src ? `<img src="${esc(src)}" alt="${esc(alt)}" ${extra} onerror="this.classList.add('img-load-error');this.removeAttribute('src')">` : ''; }
function realPhotoSection(o, title){
  if(!o.realImageUrl) return '';
  return `<section class="section real-photo-section"><div class="section-title"><h3>תמונה אמיתית</h3><span>מוצגת ישירות מהאינטרנט</span></div><div class="real-photo-frame">${safeImg(o.realImageUrl, `תמונה אמיתית של ${title}`, 'loading="lazy" data-real-photo="1"')}<div class="remote-image-error">לא ניתן לטעון את התמונה מהקישור הזה. ייתכן שהאתר חוסם הצגה ישירה.</div></div><div class="remote-image-note">התמונה נטענת מהקישור עצמו ואינה מעבירה לאתר אחר. מומלץ להשתמש בקישור ישיר לקובץ JPG/PNG/WebP.</div></section>`;
}

function partText(p){return [p.type,p.size,p.brand,p.model,p.tools,p.expansion,p.format,p.software,p.engineer,p.preset,p.mixPreset,p.notes].filter(Boolean).join(' ')}
function allText(k){return [k.expansion,k.format,k.software,k.engineer,k.preset,k.mixPreset,k.kit,k.aboutKit,k.aboutEngineer,...k.parts.map(partText)].filter(Boolean).join(' ')}
function kitBrands(k){return unique(k.parts.map(p=>p.brand))}
function kitSizes(k){return unique(k.parts.map(p=>p.size))}
function kitTypes(k){return unique(k.parts.map(p=>p.type))}

function allExpansions(){ return unique([...kits.map(k=>k.expansion), ...standaloneParts.map(p=>p.expansion)]); }
function allFormats(){ return unique([...kits.map(k=>k.format), ...standaloneParts.map(p=>p.format)]); }
function allEngineers(){ return unique([...kits.map(k=>k.engineer), ...standaloneParts.map(p=>p.engineer)]); }
function allBrands(){ return unique([...kits.flatMap(kitBrands), ...standaloneParts.map(p=>p.brand)]); }
function allTypes(){ return unique([...kits.flatMap(kitTypes), ...standaloneParts.map(p=>p.type)]); }
function allSizes(){ return unique([...kits.flatMap(kitSizes), ...standaloneParts.map(p=>p.size)]); }

function fillSelect(sel, values){values.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;sel.append(o)})}
fillSelect($('#expansionFilter'), allExpansions());
fillSelect($('#formatFilter'), allFormats());
fillSelect($('#engineerFilter'), allEngineers());
fillSelect($('#brandFilter'), allBrands());
fillSelect($('#typeFilter'), allTypes());
fillSelect($('#sizeFilter'), allSizes());

function setStats(){
  const kitParts=kits.flatMap(k=>k.parts);
  const allParts=[...kitParts,...standaloneParts];
  const brands=unique(allParts.map(p=>p.brand));
  $('#stats').innerHTML=[
    ['KITS',kits.length],
    ['STANDALONE',standaloneParts.length],
    ['INSTRUMENTS',allParts.length],
    ['EXPANSIONS',allExpansions().length]
  ].map(([l,n])=>`<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('');
  $('#kitsNavCount').textContent=kits.length;
  $('#partsNavCount').textContent=standaloneParts.length;
  $('#kitsSwitchCount').textContent=kits.length;
  $('#partsSwitchCount').textContent=standaloneParts.length;
}
setStats();

function filters(){return {
  q:norm($('#searchInput').value), expansion:$('#expansionFilter').value, format:$('#formatFilter').value,
  engineer:$('#engineerFilter').value, brand:$('#brandFilter').value, type:$('#typeFilter').value, size:$('#sizeFilter').value
}}

function matchesKit(k,f){
  if(f.q && !norm(allText(k)).includes(f.q)) return false;
  if(f.expansion && k.expansion!==f.expansion) return false;
  if(f.format && k.format!==f.format) return false;
  if(f.engineer && k.engineer!==f.engineer) return false;
  if(f.brand && !k.parts.some(p=>p.brand===f.brand)) return false;
  if(f.type && !k.parts.some(p=>p.type===f.type)) return false;
  if(f.size && !k.parts.some(p=>p.size===f.size)) return false;
  return true;
}
function matchesStandalone(p,f){
  if(f.q && !norm(partText(p)).includes(f.q)) return false;
  if(f.expansion && p.expansion!==f.expansion) return false;
  if(f.format && p.format!==f.format) return false;
  if(f.engineer && p.engineer!==f.engineer) return false;
  if(f.brand && p.brand!==f.brand) return false;
  if(f.type && p.type!==f.type) return false;
  if(f.size && p.size!==f.size) return false;
  return true;
}

function card(k){
 const brands=kitBrands(k).slice(0,4);
 const cover=primaryImage(k);
 const image=safeImg(cover,k.kit||k.preset,'loading="lazy"');
 return `<article class="kit-card" data-id="${k.id}" tabindex="0">
   <div class="kit-card-image ${cover?'':'no-image'}">${image}<div class="image-shade"></div>
    ${k.format?`<span class="format-chip">${esc(k.format)}</span>`:''}
   </div>
   <div class="kit-card-body"><div class="expansion">${esc(k.expansion)} ${k.format?`• ${esc(k.format)}`:''}</div>
    <h2>${esc(k.kit || k.preset)}</h2>
    <div class="meta"><span>${esc(k.preset || '—')}</span>${k.mixPreset?`<span>${esc(k.mixPreset)}</span>`:''}${k.engineer?`<span>${esc(k.engineer)}</span>`:''}</div>
    <div class="tags"><span class="tag accent">${k.parts.length} PARTS</span>${brands.map(b=>`<span class="tag">${esc(b)}</span>`).join('')}</div>
   </div></article>`;
}

function standaloneCard(p){
  const title=[p.brand,p.model].filter(Boolean).join(' ' ) || p.name || p.type || 'Instrument';
  const cover=primaryImage(p);
  const image=safeImg(cover,title,'loading="lazy"');
  return `<article class="standalone-card" data-part-id="${esc(p.id)}" tabindex="0">
    <div class="standalone-image ${cover?'':'no-image'}">${image}<div class="image-shade"></div>
      ${p.format?`<span class="format-chip">${esc(p.format)}</span>`:''}
      <span class="instrument-chip">${esc(p.type || 'PART')}</span>
    </div>
    <div class="standalone-body">
      <div class="expansion">${esc(p.expansion || 'ללא הרחבה')} ${p.format?`• ${esc(p.format)}`:''}</div>
      <h2>${esc(title)}</h2>
      <div class="standalone-specs">
        ${p.size?`<span><small>גודל</small><b>${esc(p.size)}</b></span>`:''}
        ${p.brand?`<span><small>חברה</small><b>${esc(p.brand)}</b></span>`:''}
      </div>
      <div class="meta">${p.engineer?`<span>${esc(p.engineer)}</span>`:''}${p.preset?`<span>${esc(p.preset)}</span>`:''}${p.mixPreset?`<span>${esc(p.mixPreset)}</span>`:''}</div>
    </div>
  </article>`;
}

function render(){
  const f=filters();
  if(currentView==='kits'){
    const list=kits.filter(k=>matchesKit(k,f));
    $('#resultCount').textContent=list.length;
    $('#resultLabel').textContent='מערכות';
    $('#viewHint').textContent='לחיצה על מערכת פותחת פירוט מלא';
    grid.innerHTML=list.map(card).join('');
    grid.classList.remove('hidden'); standaloneGrid.classList.add('hidden');
    showEmpty(list.length, 'kits');
  } else {
    const list=standaloneParts.filter(p=>matchesStandalone(p,f));
    $('#resultCount').textContent=list.length;
    $('#resultLabel').textContent='פריטים בודדים';
    $('#viewHint').textContent='לחיצה על פריט פותחת את כל פרטי הסאונד והמקור';
    standaloneGrid.innerHTML=list.map(standaloneCard).join('');
    standaloneGrid.classList.remove('hidden'); grid.classList.add('hidden');
    showEmpty(list.length, 'standalone');
  }
}
function showEmpty(count,view){
  const empty=$('#emptyState');
  empty.classList.toggle('hidden',count>0);
  if(count===0 && view==='standalone' && standaloneParts.length===0){
    $('#emptyTitle').textContent='עדיין אין פריטים בודדים בספרייה';
    $('#emptyText').textContent='כאן יופיעו סנרים, קיקים, טומים ומצילות שתוסיף בנפרד ממערכות מלאות.';
  } else {
    $('#emptyTitle').textContent='לא נמצאו תוצאות';
    $('#emptyText').textContent='נסה שם של חברה, דגם, כלי, הרחבה או גודל אחר.';
  }
}

function relatedForPart(part,currentId){
 const key=[part.brand,part.model,part.size].filter(Boolean).map(norm);
 const kitMatches=kits.filter(k=>k.id!==currentId && k.parts.some(p=>key.every(x=>norm(partText(p)).includes(x))));
 const standaloneMatches=standaloneParts.filter(p=>key.every(x=>norm(partText(p)).includes(x)));
 return {kitMatches,standaloneMatches};
}
function openKit(k){
 const cover=primaryImage(k);
 const image=safeImg(cover,k.kit||k.preset);
 const parts=k.parts.map((p,idx)=>`<div class="part" data-part-index="${idx}"><div class="part-head"><div class="part-type">${esc(p.type)}</div>${p.size?`<div class="part-size">${esc(p.size)}</div>`:''}</div><div class="part-main">${esc([p.brand,p.model].filter(Boolean).join(' · '))}</div>${p.tools?`<div class="part-tools">Tools: ${esc(p.tools)}</div>`:''}</div>`).join('');
 $('#dialogContent').innerHTML=`<div class="dialog-scroll"><div class="dialog-top ${cover?'has-image':'placeholder'}">${image}${cover?`<div class="image-view-hint">${imageLabel(k)} · לחץ לצפייה מלאה</div>`:''}<div class="dialog-gradient"></div><button class="close-dialog" type="button">×</button><div class="dialog-title"><div class="expansion">${esc(k.expansion)} ${k.format?`• ${esc(k.format)}`:''}</div><h2>${esc(k.kit || k.preset)}</h2><p>${esc(k.preset)}${k.mixPreset?` · ${esc(k.mixPreset)}`:''}</p></div></div>
 <div class="dialog-body"><div class="info-strip"><div class="info-box"><span>הרחבה</span><b>${esc(k.expansion||'—')}</b></div><div class="info-box"><span>פורמט</span><b>${esc(k.format||'—')}</b></div><div class="info-box"><span>הוקלט / הופק ע״י</span><b>${esc(k.engineer||'—')}</b></div><div class="info-box"><span>Preset / Mix</span><b>${esc([k.preset,k.mixPreset].filter(Boolean).join(' · ')||'—')}</b></div></div>
 ${realPhotoSection(k,k.kit||k.preset)}
 ${k.aboutKit?`<section class="section"><div class="section-title"><h3>על המערכת</h3></div><div class="copy">${esc(k.aboutKit)}</div></section>`:''}
 <section class="section"><div class="section-title"><h3>תופים ומצילות</h3><span>${k.parts.length} פריטים</span></div><div class="parts-grid">${parts}</div><div class="click-search-note">לחץ על תוף או מצילה כדי לראות היכן אותו פריט מופיע בספרייה.</div><div id="relatedBox"></div></section>
 ${k.aboutEngineer?`<section class="section"><div class="section-title"><h3>${esc(k.engineer)}</h3></div><div class="copy">${esc(k.aboutEngineer)}</div></section>`:''}
 <div class="dialog-actions">${k.video?`<a class="primary" href="${esc(k.video)}" target="_blank" rel="noopener">▶ וידאו</a>`:''}${k.productUrl?`<a href="${esc(k.productUrl)}" target="_blank" rel="noopener">עמוד ההרחבה ↗</a>`:''}</div></div></div>`;
 dialog.showModal();
 $('.close-dialog').onclick=()=>dialog.close();
 if(cover){const im=$('.dialog-top img'); if(im) im.onclick=()=>openImageLightbox(cover,k.kit||k.preset);}
 const real=$('[data-real-photo]'); if(real) real.onclick=()=>openImageLightbox(k.realImageUrl,`תמונה אמיתית של ${k.kit||k.preset}`);
 document.querySelectorAll('.part').forEach(el=>el.onclick=()=>showRelated(k,k.parts[+el.dataset.partIndex]));
}
function openStandalone(p){
 const title=[p.brand,p.model].filter(Boolean).join(' ') || p.name || p.type || 'Instrument';
 const cover=primaryImage(p);
 const image=safeImg(cover,title);
 $('#dialogContent').innerHTML=`<div class="dialog-scroll"><div class="dialog-top standalone-dialog-top ${cover?'has-image':'placeholder'}">${image}${cover?`<div class="image-view-hint">${imageLabel(p)} · לחץ לצפייה מלאה</div>`:''}<div class="dialog-gradient"></div><button class="close-dialog" type="button">×</button><div class="dialog-title"><div class="expansion">${esc(p.expansion||'פריט בודד')} ${p.format?`• ${esc(p.format)}`:''}</div><h2>${esc(title)}</h2><p>${esc([p.type,p.size].filter(Boolean).join(' · '))}</p></div></div>
 <div class="dialog-body"><div class="info-strip"><div class="info-box"><span>סוג</span><b>${esc(p.type||'—')}</b></div><div class="info-box"><span>גודל</span><b>${esc(p.size||'—')}</b></div><div class="info-box"><span>הרחבה</span><b>${esc(p.expansion||'—')}</b></div><div class="info-box"><span>הוקלט / הופק ע״י</span><b>${esc(p.engineer||'—')}</b></div></div>
 ${p.image && p.realImageUrl ? realPhotoSection(p,title) : ''}
 <section class="section"><div class="section-title"><h3>פרטי הכלי</h3></div><div class="single-part-detail"><div><span>חברה</span><b>${esc(p.brand||'—')}</b></div><div><span>דגם</span><b>${esc(p.model||'—')}</b></div><div><span>פורמט</span><b>${esc(p.format||'—')}</b></div><div><span>Software</span><b>${esc(p.software||'—')}</b></div>${p.tools?`<div><span>Tools / Articulations</span><b>${esc(p.tools)}</b></div>`:''}${p.preset?`<div><span>Preset</span><b>${esc(p.preset)}</b></div>`:''}</div></section>
 ${p.notes?`<section class="section"><div class="section-title"><h3>הערות</h3></div><div class="copy">${esc(p.notes)}</div></section>`:''}
 <div class="dialog-actions">${p.video?`<a class="primary" href="${esc(p.video)}" target="_blank" rel="noopener">▶ וידאו</a>`:''}${p.productUrl?`<a href="${esc(p.productUrl)}" target="_blank" rel="noopener">עמוד ההרחבה ↗</a>`:''}</div></div></div>`;
 dialog.showModal();
 $('.close-dialog').onclick=()=>dialog.close();
 if(cover){const im=$('.dialog-top img'); if(im) im.onclick=()=>openImageLightbox(cover,title);}
 const real=$('[data-real-photo]'); if(real) real.onclick=()=>openImageLightbox(p.realImageUrl,`תמונה אמיתית של ${title}`);
}
function openImageLightbox(src,alt){
 let box=document.querySelector('.image-lightbox');
 if(!box){box=document.createElement('div');box.className='image-lightbox';box.innerHTML='<button class="image-lightbox-close" type="button" aria-label="סגור">×</button><img alt="">';document.body.appendChild(box);box.querySelector('.image-lightbox-close').onclick=()=>box.classList.remove('open');box.addEventListener('click',e=>{if(e.target===box)box.classList.remove('open')});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&box.classList.contains('open'))box.classList.remove('open')});}
 const img=box.querySelector('img');img.src=src;img.alt=alt||'תמונת מערכת';box.classList.add('open');
}
function showRelated(k,p){
 const {kitMatches,standaloneMatches}=relatedForPart(p,k.id), box=$('#relatedBox');
 const title=[p.brand,p.model,p.size].filter(Boolean).join(' · ');
 const total=kitMatches.length+standaloneMatches.length;
 box.innerHTML=`<div class="matches"><div class="match-row"><b>${esc(title)}</b><span>${total?`נמצא בעוד ${total} מקומות בספרייה`:'לא נמצא במקום נוסף'}</span></div>${kitMatches.map(x=>`<div class="match-row"><b>${esc(x.kit)}</b><span>מערכת · ${esc(x.expansion)} · ${esc(x.preset)}</span></div>`).join('')}${standaloneMatches.map(x=>`<div class="match-row"><b>${esc([x.brand,x.model].filter(Boolean).join(' '))}</b><span>פריט בודד · ${esc(x.expansion||'')}</span></div>`).join('')}</div>`;
 box.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function switchView(view){
  currentView=view;
  document.querySelectorAll('[data-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===view));
  render();
}
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));

grid.addEventListener('click',e=>{const cardEl=e.target.closest('.kit-card');if(cardEl)openKit(kits.find(k=>k.id===cardEl.dataset.id))});
grid.addEventListener('keydown',e=>{if(e.key==='Enter'){const c=e.target.closest('.kit-card');if(c)openKit(kits.find(k=>k.id===c.dataset.id))}});
standaloneGrid.addEventListener('click',e=>{const cardEl=e.target.closest('.standalone-card');if(cardEl)openStandalone(standaloneParts.find(p=>String(p.id)===cardEl.dataset.partId))});
standaloneGrid.addEventListener('keydown',e=>{if(e.key==='Enter'){const c=e.target.closest('.standalone-card');if(c)openStandalone(standaloneParts.find(p=>String(p.id)===c.dataset.partId))}});
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
$('#searchInput').addEventListener('input',render);document.querySelectorAll('.filters select').forEach(s=>s.addEventListener('change',render));
$('#clearSearch').onclick=()=>{$('#searchInput').value='';render();$('#searchInput').focus()};
$('#resetFilters').onclick=()=>{$('#searchInput').value='';document.querySelectorAll('.filters select').forEach(s=>s.value='');render()};
render();
