'use strict';
(() => {
const $ = id => document.getElementById(id);
const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data = window.ATLAS_DATA || {metadata:{},schools:[]};
const schools = [...data.schools].sort((a,b)=>a.name.localeCompare(b.name));
const meta = data.metadata || {};
const directory=window.ATLAS_DIRECTORY_AUDIT;
function reviewDetail(s){return s.reviewedAt?`<details><summary>Location review · ${safe(s.reviewedAt)}</summary><p>${safe(s.reviewNote||'')}</p>${s.sourceUrl?`<p><a href="${safe(s.sourceUrl)}" target="_blank" rel="noopener">School / NYCPS location source ↗</a></p>`:''}${s.geocodingSource?`<p>Coordinates: ${safe(s.geocodingSource)}. Address match, not an independently surveyed campus boundary.</p>`:''}${s.originalSource?`<p>Original state record: ${safe(s.originalSource.address)} · ${safe(s.originalSource.borough)}<br>Original coordinates: ${safe(s.originalSource.lat)}, ${safe(s.originalSource.lon)}</p>`:''}</details>`:'';}
function directoryDetail(s){const entry=directory?.stateRecords.find(r=>r.stateId===s.id);const campuses=(entry?.campusIds||[]).map(id=>directory.campuses.find(c=>c.id===id)).filter(Boolean);return campuses.length?`<details><summary>Directory name/address candidates (${campuses.length})</summary><p>Candidate links, not verified identity or operating status.</p>${campuses.map(c=>`<p><strong>${safe(c.name)}</strong><br>Directory grades: ${safe(c.grades)} · ${safe(c.csd)}<br>Campus identifier: ${safe(c.id)}</p>`).join('')}</details>`:'<p>No conservative directory match. This does not establish closure.</p>';}
let filtered = [], selected = null, map, clusters;
const markers = new Map();
const conflictIds=new Set((window.ATLAS_SPATIAL?.countyLabelMismatches||[]).map(s=>s.id));
const planned=s=>/SUCCESS ACADEMY.*NYC\s*(15|18)$/.test(s.name);
const quality=s=>[planned(s)?'Planned opening · verify status':'',conflictIds.has(s.id)?'Source borough / coordinate conflict':''].filter(Boolean).join(' · ')||'Operating status unverified';
const params = new URLSearchParams(location.hash.slice(1));
$('search').value = params.get('q') || '';
if ([...$('borough').options].some(o=>o.value===params.get('borough'))) $('borough').value=params.get('borough');
const date = new Date(meta.fetchedAt || meta.retrievedAt);
const dateLabel = Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/New_York'});
$('snapshot').textContent = meta.reviewedAt?`Manhattan review · ${meta.reviewedAt}`:`Snapshot · ${dateLabel}`;
$('about-date').textContent = `Bundled snapshot retrieved ${dateLabel}. ${schools.length.toLocaleString()} mapped records across five boroughs. ${meta.coverageNote||''} Retrieval date is not the source’s effective date; the source’s data vintage is unverified. ${meta.excludedRecordCount ? `${meta.excludedRecordCount} source record was excluded for a location outside NYC.` : ''}`;
function status(message){$('map-status').textContent=message;$('map-status').hidden=!message;}
function fit(){if(map && clusters && filtered.length){map.fitBounds(clusters.getBounds(),{padding:[45,85],maxZoom:14,animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});}}
function setView(mode){document.querySelector('.app').classList.toggle('show-map',mode==='map');$('list-tab').setAttribute('aria-pressed',String(mode==='list'));$('map-tab').setAttribute('aria-pressed',String(mode==='map'));if(map){requestAnimationFrame(()=>{map.invalidateSize();if(mode==='map') {if(selected){const s=schools.find(s=>s.id===selected);if(s)map.setView([s.lat,s.lon],15);}else fit();}});}}
function closeDetail(){selected=null;$('detail').hidden=true;document.querySelectorAll('.item.active').forEach(el=>{el.classList.remove('active');el.setAttribute('aria-pressed','false');});}
function selectSchool(s,fromMap=false){
if(!s)return;
if(!filtered.some(row=>row.id===s.id)){$('search').value='';$('borough').value='';render(false);}
if($('access-panel'))$('access-panel').hidden=true;
selected=s.id;
for(const el of document.querySelectorAll('.item')){const active=el.dataset.id===s.id;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));if(active&&fromMap)el.scrollIntoView({block:'nearest'});}
$('detail').innerHTML=`<button class="close" aria-label="Close school details">×</button><div class="eyebrow">${safe(s.borough)} · CHARTER SCHOOL RECORD</div><h2 id="detail-title" tabindex="-1">${safe(s.name)}</h2><p>${safe(s.address)}</p>${s.code?`<p>NYSED code · ${safe(s.code)}</p>`:''}<p class="quality-note">${safe(quality(s))}. Confirm current location and admissions with the school.</p>${s.dbn?`<p>NYCPS DBN · ${safe(s.dbn)}</p>`:''}${reviewDetail(s)}${directoryDetail(s)}<div class="detail-actions"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address+' '+s.name)}" target="_blank" rel="noopener">Get directions ↗</a><a href="https://www.nysed.gov/charter-schools/charter-schools-directory" target="_blank" rel="noopener">Verify in NYSED directory ↗</a></div>`;
$('detail').hidden=false;$('detail').setAttribute('aria-labelledby','detail-title');$('detail').querySelector('.close').onclick=()=>{closeDetail();if(matchMedia('(max-width:750px)').matches)setView('list');const button=[...document.querySelectorAll('.item')].find(el=>el.dataset.id===s.id);if(button)button.focus();};
if(matchMedia('(max-width:750px)').matches)setView('map');
if(!fromMap)$('detail-title').focus({preventScroll:true});
if(map&&clusters){const marker=markers.get(s.id);if(!fromMap)clusters.zoomToShowLayer(marker,()=>{marker.openPopup();});}
}
function render(shouldFit=true){
const q=$('search').value.trim().toLocaleLowerCase(), b=$('borough').value;
filtered=schools.filter(s=>(!b||s.borough===b)&&(!q||`${s.name} ${(s.aliases||[]).join(' ')} ${s.address} ${s.borough} ${s.code} ${s.dbn||''}`.toLocaleLowerCase().includes(q)));
if(selected&&!filtered.some(s=>s.id===selected))closeDetail();
$('count').textContent=filtered.length.toLocaleString();$('summary').textContent=' school records';$('scope').textContent=`${q||b?'Filtered from':'Showing all'} ${schools.length.toLocaleString()} mapped records`;
$('map-title').textContent=b||'All five boroughs';$('export').disabled=!filtered.length;$('fit').disabled=!filtered.length||!map;
const frag=document.createDocumentFragment();
for(const s of filtered){const li=document.createElement('li');const btn=document.createElement('button');btn.className='item'+(s.id===selected?' active':'');btn.dataset.id=s.id;btn.setAttribute('aria-pressed',String(s.id===selected));btn.innerHTML=`<strong>${safe(s.name)}</strong><small>${safe(s.address)}</small><span class="borough-tag">${safe(s.borough)}</span>${conflictIds.has(s.id)||planned(s)?`<small class="quality-note">${safe(quality(s))}</small>`:''}<span class="arrow" aria-hidden="true">↗</span>`;btn.onclick=()=>selectSchool(s);li.appendChild(btn);frag.appendChild(li);}
$('results').replaceChildren(frag);$('empty').hidden=filtered.length!==0;
if(!schools.length){$('empty').querySelector('h2').textContent='School data could not be loaded';$('empty').querySelector('p').textContent='Keep the data folder beside index.html, then reopen the atlas.';$('empty-reset').hidden=true;}
if(clusters){clusters.clearLayers();clusters.addLayers(filtered.map(s=>markers.get(s.id)));if(shouldFit)fit();}
const hash=new URLSearchParams();if(q)hash.set('q',$('search').value.trim());if(b)hash.set('borough',b);try{history.replaceState(null,'',location.pathname+location.search+(hash.size?'#'+hash:''));}catch{}
}
function reset(){closeDetail();$('search').value='';$('borough').value='';render();$('search').focus();}
document.querySelector('.brand').onclick=e=>{e.preventDefault();reset();setView('list');};
$('reset').onclick=reset;$('empty-reset').onclick=reset;
$('search').addEventListener('input',()=>render());$('borough').addEventListener('change',()=>render());$('fit').onclick=fit;
$('list-tab').onclick=()=>setView('list');$('map-tab').onclick=()=>setView('map');
$('about-button').onclick=$('source-button').onclick=()=>$('about').showModal();$('close-about').onclick=()=>$('about').close();
$('about').addEventListener('click',e=>{if(e.target===$('about')){const r=$('about').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('about').close();}});
$('export').onclick=()=>{const cell=v=>typeof v==='number'&&Number.isFinite(v)?String(v):'"'+String(v??'').replace(/^(?:\s*[=+@\-]|[\t\r])/,"'$&").replace(/"/g,'""')+'"';const rows=[['School name','Address','Borough','NYSED code','Latitude','Longitude','Snapshot retrieved','Source'],...filtered.map(s=>[s.name,s.address,s.borough,s.code,s.lat,s.lon,meta.retrievedAt||meta.fetchedAt,s.sourceUrl||meta.sourceUrl])];const blob=new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='nyc-charter-school-records.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
if(window.L && L.markerClusterGroup){
map=L.map('map',{zoomControl:false,preferCanvas:true,zoomSnap:0.25,minZoom:10,maxZoom:19,maxBounds:[[40.40,-74.36],[40.99,-73.60]],maxBoundsViscosity:1}).setView([40.72,-73.94],11);L.control.zoom({position:'bottomright'}).addTo(map);
const localFile=location.protocol==='file:'||new URLSearchParams(location.search).has('offline');
let tileSuccess=0,tileErrors=0;
if(!localFile){
const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19,noWrap:true,bounds:[[40.40,-74.36],[40.99,-73.60]]}).addTo(map);
tiles.on('tileload',()=>{tileSuccess++;if(tileErrors===0)status('');});tiles.on('tileerror',()=>{tileErrors++;status('Some map tiles could not load. School records and filters are still available; check your internet connection.');});
setTimeout(()=>{if(!tileSuccess)status('Background map unavailable. School records remain available; connect to the internet to load map tiles.');},9000);
}else{$('map-status').classList.add('local-base');status('NYC basemap · bundled borough boundaries');}
clusters=L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:42,spiderfyOnMaxZoom:true,zoomToBoundsOnClick:true,iconCreateFunction:cluster=>L.divIcon({className:'atlas-cluster',html:`<span>${cluster.getChildCount()}</span>`,iconSize:[44,44]})}).addTo(map);
for(const s of schools){const marker=L.marker([s.lat,s.lon],{title:s.name,alt:s.name,icon:L.divIcon({className:'atlas-dot',iconSize:[14,14],iconAnchor:[7,7]})}).bindPopup(`<strong>${safe(s.name)}</strong><br>${safe(s.borough)}`,{autoPanPaddingTopLeft:[20,110],autoPanPaddingBottomRight:[20,230]});marker.on('click',()=>selectSchool(s,true));markers.set(s.id,marker);}
}else{status('Map library unavailable. You can still search and browse the bundled school records.');}
window.ATLAS_APP={map,schools,selectSchool,conflictIds,planned,safe};
render();
// Keep the mobile map below the actual controls at different font sizes.
const tabs=document.querySelector('.mobile-tabs');function positionMobileMap(){if(matchMedia('(max-width:750px)').matches){const app=document.querySelector('.app');document.querySelector('.map-wrap').style.top=(tabs.getBoundingClientRect().bottom-app.getBoundingClientRect().top)+'px';}else document.querySelector('.map-wrap').style.top='';map?.invalidateSize();}
new ResizeObserver(positionMobileMap).observe(document.querySelector('.sidebar'));window.addEventListener('resize',positionMobileMap);positionMobileMap();
})();
