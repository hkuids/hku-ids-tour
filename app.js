'use strict';
const params=new URLSearchParams(location.search),embedMode=params.get('embed')==='1';
const editMode=!embedMode&&(params.get('edit')==='1'||location.pathname.endsWith('/console.html'));
const $=id=>document.getElementById(id),wrap=a=>((a+180)%360+360)%360-180;
let route,nodes,byId,viewer,current,pendingNav=false,modalAction=null,returnFocus=null,previewDirty=false,publishedRevision='';
const storageKey='hku-ids-exit-a-settings-v4';
if(editMode){document.body.classList.add('editor-mode');$('editor').hidden=false;$('aim').hidden=false;}
if(embedMode)document.body.classList.add('embedded-mode');
function formatTime(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
function section(n=current){return route.sections.find(s=>s.segment===n.segment);}
function transfer(n=current){return route.transfers.find(t=>t.nodeId===n.id);}
function nodeTitle(n){
  if(n.title)return n.title;
  if(n.id==='s1-001')return 'HKU Station · Exit A';
  if(n.segment===3){if(n.time<6)return 'Downstairs from P2 to P3';if(n.time<20)return 'P3 · corridor to Office P307';return 'P3 · IDS office entrance';}
  if(n.segment===2){if(n.time>91)return 'Downstairs from P2 to P3';if(n.time>75)return 'Graduate House · P2 entrance';return 'Main Campus · FB/F walkway';}
  return 'Main Campus · G/F walkway';
}
function links(n=current){return RouteCore.links(nodes,n,route).map(l=>{
  if(l.role==='forward'){
    if(transfer(n)){l.label=transfer(n).button||'Enter the lift · press “FB”';l.isLift=true;l.instruction=transfer(n).instruction;}
    else if(route.junctions.some(j=>j.nodeId===n.id)){const choice=RouteCore.choiceFor(route,n);l.label=choice?({left:'Left',right:'Right',downstairs:'Downstairs',straight:'Straight ahead'}[choice.direction]+' · '+choice.label):'Continue';l.showLabel=l.showLabel??true;}
    else if(n.segment===2&&!n.indoor&&n.time>91)l.label='Continue downstairs to P3';
    else l.label='Continue';
  }else{l.label='Go back';const reverse=route.transfers.find(t=>t.target===n.id&&t.nodeId===l.target);if(reverse){l.isLift=true;l.label=reverse.returnButton||'Take the lift back';l.instruction=reverse.returnInstruction||'Return to the previous floor · click to continue';}}
  if(l.customLabel)l.label=l.customLabel;return l;
});}
function persist(){if(!editMode)return;previewDirty=true;versionStatus();try{localStorage.setItem(storageKey,JSON.stringify(RouteCore.settings(route)));}catch(e){$('edit-status').textContent='Download the settings to keep your changes; this browser could not save them.';}}
function versionStatus(){const t=new Date(publishedRevision);$('published-version').textContent='Published '+(Number.isNaN(t.getTime())?publishedRevision:t.toLocaleString());$('preview-status').textContent=editMode?(previewDirty?'Local preview · changes are not published':'Using the published GitHub configuration'):'Changes appear after reloading the tour.';}
function markers(n=current){const walks=links(n);return RouteCore.markers(route,nodes,n).map(m=>{const walk=m.kind==='walk'?walks.find(l=>l.role===m.role):null;return {...m,...walk,label:(walk?.customLabel||m.customLabel||walk?.label||m.label)};});}
function activateMarker(m){if(m.kind==='walk')walk(m.role);else if(m.choice)choose(m.choice);else if(m.info&&RouteCore.externalUrl(m.info.url))window.open(m.info.url,'_blank','noopener,noreferrer');}
function tooltip(div,args){
  div.dataset.role=args.role||args.key;div.dataset.marker=args.key;div.dataset.label=args.label;div.setAttribute('role','button');div.setAttribute('aria-label',args.isLift?args.label+' · '+args.instruction:args.label);div.tabIndex=0;
  if(args.isLift){const icon=document.createElement('span');icon.className='lift-icon';icon.textContent='⇅';icon.setAttribute('aria-hidden','true');const text=document.createElement('span');const title=document.createElement('strong');title.textContent=args.label;const instruction=document.createElement('small');instruction.textContent=args.instruction||'Click to continue';text.append(title,instruction);div.append(icon,text);}
  else{const icon=document.createElement('span');icon.className='arrow-icon';icon.textContent=args.kind==='info'?'i':args.kind==='guidance'?'⇅':'↑';icon.setAttribute('aria-hidden','true');if(args.kind!=='info'&&args.kind!=='guidance')icon.style.transform='rotate('+(args.rotation??(args.role==='back'?180:0))+'deg)';div.append(icon);if(args.showLabel)div.classList.add('label-visible');}
  div.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activateMarker(args);}});
}
function viewHfov(){const element=$('panorama'),width=element.clientWidth||800,height=element.clientHeight||460;return Math.min(100,Math.max(40,2*Math.atan(Math.tan(35*Math.PI/180)*width/height)*180/Math.PI));}
function startingView(n,role){const ls=links(n),direction=ls.find(l=>l.role===role)||(transfer(n)?ls.find(l=>l.role==='forward'):null);return{yaw:direction?direction.yaw:n.initialYaw,pitch:Number.isFinite(n.initialPitch)?n.initialPitch:-8,hfov:viewHfov()};}
function scene(n){const view=startingView(n),minPitch=route.viewLimits?.minPitch??-55;return{minPitch,maxPitch:90,type:'equirectangular',panorama:n.image,autoLoad:true,ignoreGPanoXMP:true,compass:!n.indoor&&n.segment<3,northOffset:n.northOffset,yaw:view.yaw,pitch:view.pitch,hfov:view.hfov,minHfov:40,
  hotSpots:markers(n).map(m=>({id:m.key,type:'info',yaw:m.yaw,pitch:Math.max(minPitch+8,m.pitch),cssClass:'walk-hotspot '+(m.role||m.kind)+(m.isLift?' lift-hotspot':''),createTooltipFunc:tooltip,createTooltipArgs:m,clickHandlerFunc:()=>activateMarker(m)}))};}
function initViewer(role){
  if(viewer)viewer.destroy();pendingNav=true;$('panorama').setAttribute('aria-busy','true');const scenes={};for(const n of nodes)scenes[n.id]=scene(n);
  Object.assign(scenes[current.id],startingView(current,role));
  viewer=pannellum.viewer('panorama',{default:{firstScene:current.id,autoLoad:true,sceneFadeDuration:180,showControls:true,showFullscreenCtrl:true,escapeHTML:true,hfov:viewHfov()},scenes});
  const activeViewer=viewer;
  viewer.on('scenechange',id=>{if(viewer!==activeViewer)return;current=byId.get(id);update();});
  viewer.on('load',()=>{if(viewer!==activeViewer)return;pendingNav=false;$('panorama').setAttribute('aria-busy','false');viewer.setNorthOffset(current.northOffset);update();});
  viewer.on('error',()=>{if(viewer!==activeViewer)return;pendingNav=false;$('panorama').setAttribute('aria-busy','false');$('viewer-error').hidden=false;$('viewer-error').textContent='This picture could not load. Use Reload tour to try again, or choose another stop.';});
  viewer.on('errorcleared',()=>{if(viewer!==activeViewer)return;$('viewer-error').hidden=true;});
}
function go(id,role){
  const n=byId.get(id);if(!n||!nodes.includes(n)||pendingNav)return;pendingNav=true;$('panorama').setAttribute('aria-busy','true');$('viewer-error').hidden=true;current=n;
  const view=startingView(n,role);if(!viewer.isLoaded())initViewer(role);else viewer.loadScene(id,view.pitch,view.yaw,view.hfov);update();
}
function walk(role){const l=links().find(x=>x.role===role);if(!l||pendingNav)return;
  go(l.target,role);
}
function showDialog(title,text,button,action){
  returnFocus=document.activeElement;modalAction=action||null;$('dialog-title').textContent=title;$('dialog-text').textContent=text;$('dialog-action').hidden=!action;$('dialog-action').textContent=button||'Continue';$('route-dialog').showModal();
}
$('dialog-action').onclick=()=>{const action=modalAction;$('route-dialog').close();if(action)action();};
$('dialog-close').onclick=()=>$('route-dialog').close();
$('route-dialog').addEventListener('close',()=>{if(returnFocus&&document.contains(returnFocus))returnFocus.focus();modalAction=null;});
function choose(choice){
  if(choice.url&&RouteCore.externalUrl(choice.url)){window.open(choice.url,'_blank','noopener,noreferrer');return;}
  if(choice.action==='guidance'){$('lift-guidance').hidden=false;$('lift-guidance-title').textContent=choice.label;$('lift-guidance-instruction').textContent=choice.instruction||'Turn left toward the lift. This panorama route has not been added yet.';$('lift-guidance-note').textContent='Directions only';return;}
  const branch=route.routes.find(r=>r.id===choice.routeId);
  if(!branch||branch.status!=='available'||!branch.nodeIds.length){showDialog(choice.label+' · coming soon','This destination is planned, but its panorama route has not been added yet. Stay on this tour to continue to the IDS Office P307.');return;}
  if(route.activeRoute!==branch.id&&!choice.routeIds?.includes(route.activeRoute)){route.activeRoute=branch.id;rebuild(choice.target||branch.nodeIds[0]);}
  else{const target=nodes.find(n=>n.id===choice.target);if(target)go(target.id,'forward');else walk('forward');}
}
function rebuild(preferred=current&&current.id){
  const before=current;nodes=RouteCore.visible(route);byId=new Map(route.nodes.map(n=>[n.id,n]));
  current=nodes.find(n=>n.id===preferred)||nodes.find(n=>before&&n.segment===before.segment&&n.sourceTime>=before.sourceTime)||nodes[nodes.length-1];
  initViewer();update();
}
function refreshScene(n){viewer.removeScene(n.id);viewer.addScene(n.id,scene(n));}
function update(){
  const i=nodes.indexOf(current),ls=links(),back=ls.find(l=>l.role==='back'),forward=ls.find(l=>l.role==='forward');
  $('scene-title').textContent=nodeTitle(current);$('scene-floor').textContent=section().heading+' · '+section().subtitle;$('stop-number').textContent='Stop '+(i+1)+' of '+nodes.length;
  $('progress-fill').style.width=(nodes.length>1?i/(nodes.length-1)*100:100)+'%';$('back').disabled=!back;$('forward').disabled=!forward;
  $('forward').textContent=forward?forward.label:'Destination reached';$('back').textContent=back?back.label:'Go back';$('arrival').hidden=!!forward;
  $('arrival-room').textContent=(route.routes.find(r=>r.id===route.activeRoute)||{}).destination||'IDS Office P307';
  renderFloors();renderRoutePicker();versionStatus();
  $('pace').value=route.pace;for(const option of $('pace').options){const count=RouteCore.visible(route,option.value).length;option.textContent=({detailed:'Detailed',standard:'Standard',fewer:'Fewer pictures'}[option.value])+' · '+count;}
  renderJunction();renderMap();renderStops();
  if(editMode){
    $('segment-offset').value=current.headingOffset??'';$('segment-offset').disabled=current.indoor||current.segment>=3;$('apply-offset').disabled=current.indoor||current.segment>=3;
    $('save-forward').disabled=!forward;$('save-back').disabled=!back;$('hide-stop').disabled=!!current.protected;
    $('hide-note').textContent=current.protected?'This lift, turn, junction or endpoint stays in the tour at every pace.':'Skip this picture if a nearby stop already shows the same view.';
    $('editor-intro').textContent='Point at the next path or doorway, then save the marker. Your supplied direction settings are already applied.';
    $('section-heading').value=section().heading;$('section-subtitle').value=section().subtitle;
    updateArrowEditor();renderHidden();updateHostingEditor();renderBranchEditor();$('bottom-limit').value=route.viewLimits?.minPitch??-55;$('bottom-limit-value').textContent=$('bottom-limit').value+'°';
  }
}
function renderJunction(){
  const junction=route.junctions.find(j=>j.nodeId===current.id);
  const guidance=junction?.accessibility;
  $('lift-guidance').hidden=!guidance;
  if(guidance){$('lift-guidance-title').textContent=guidance.title;$('lift-guidance-instruction').textContent=guidance.instruction;$('lift-guidance-note').textContent=guidance.note||'';}
  $('lift-directions').hidden=!route.junctions.some(j=>j.accessibility&&nodes.some(n=>n.id===j.nodeId));
  $('junction').hidden=!junction;$('junction-choices').replaceChildren();if(!junction)return;
  $('junction-title').textContent=junction.name;$('junction-note').textContent='Use a marker in the panorama, or choose a destination here.';
  for(const choice of junction.choices){const branch=route.routes.find(r=>r.id===choice.routeId);const ready=branch&&branch.status==='available'&&branch.nodeIds.length;
    const b=document.createElement('button');b.className='branch-choice'+(ready?' ready':'');
    const direction=document.createElement('strong');direction.textContent=({left:'← Left',right:'Right →',downstairs:'↓ Downstairs',straight:'↑ Straight ahead'}[choice.direction]||choice.direction);
    const label=document.createElement('span');label.textContent=choice.label;const status=document.createElement('small');status.textContent=choice.url?'Room information ↗':choice.action==='guidance'?'Lift direction only':ready?'Open this route':'Coming soon';b.append(direction,label,status);b.onclick=()=>choose(choice);$('junction-choices').append(b);
  }
}
function renderFloors(){
  const nav=document.querySelector('.floors'),segments=[...new Set(nodes.map(n=>n.segment))];nav.replaceChildren();
  for(const id of segments){const s=route.sections.find(s=>s.segment===id),b=document.createElement('button');b.dataset.floor=id;b.classList.toggle('active',id===current.segment);b.setAttribute('aria-current',id===current.segment?'true':'false');b.append(document.createTextNode(s.heading));const sub=document.createElement('span');sub.textContent=s.subtitle;b.append(sub);b.onclick=()=>{const n=nodes.find(n=>n.segment===id);if(n)go(n.id);};nav.append(b);}
}
function renderRoutePicker(){
  const select=$('destination-route');if(!select.options.length)for(const r of route.routes.filter(r=>r.status==='available')){const option=document.createElement('option');option.value=r.id;option.textContent=r.name;select.append(option);}
  select.value=route.activeRoute;document.querySelector('.brand p').textContent=(route.routes.find(r=>r.id===route.activeRoute)?.destination||'Graduate House');
}
$('destination-route').onchange=()=>{const r=route.routes.find(r=>r.id===$('destination-route').value);if(!r)return;route.activeRoute=r.id;rebuild(r.nodeIds.includes(current.id)?current.id:r.startNodeId||r.nodeIds[0]);};
function updateHostingEditor(){
  $('picture-url').value=current.image;$('image-filename').textContent='WordPress batch filename: '+(current.imageFilename||'hku-ids-exit-a-'+current.id+'.jpg');
}
function setImageUrl(value){
  if(!RouteCore.imageUrl(value))throw Error('Paste a direct image address starting with https://.');
  if(value.startsWith('http:')&&!value.startsWith('http://localhost')&&!value.startsWith('http://127.0.0.1'))throw Error('Use an https:// picture address for the public tour.');
  if(/-scaled\.(jpe?g)(\?|$)/i.test(value))throw Error('This is WordPress’s smaller scaled copy. Use the original full-size image address.');
  return value;
}
$('save-picture-url').onclick=()=>{try{current.image=setImageUrl($('picture-url').value.trim());persist();rebuild();$('edit-status').textContent='This picture address is saved in your browser. Check that it loads, then download route.json to publish.';}catch(e){$('edit-status').textContent=e.message;}};
$('apply-image-folder').onclick=()=>{try{
  const sample=setImageUrl($('image-folder-example').value.trim()),folder=new URL('.',sample);
  if(!/\.jpe?g(?:\?|$)/i.test(sample))throw Error('Paste the direct address of one original JPG from the WordPress upload batch.');
  for(const n of route.nodes)n.image=new URL(n.imageFilename||'hku-ids-exit-a-'+n.id+'.jpg',folder).href;
  persist();rebuild();$('edit-status').textContent='WordPress addresses applied to all '+route.nodes.length+' pictures. This assumes the batch kept its filenames and was uploaded into one folder. Check several stops; fix any renamed file under This picture.';
}catch(e){$('edit-status').textContent=e.message;}};
function renderBranchEditor(){
  const junction=route.junctions.find(j=>j.nodeId===current.id);$('branch-editor').hidden=!junction;if(!junction)return;
  $('junction-name').value=junction.name;$('lift-guidance-label').value=junction.accessibility?.title||'';$('lift-guidance-text').value=junction.accessibility?.instruction||'';const list=$('branch-fields');list.replaceChildren();
  for(const choice of junction.choices){const row=document.createElement('div');row.className='branch-editor-row';row.dataset.choice=choice.id;const label=document.createElement('label');label.textContent='Destination label';const input=document.createElement('input');input.type='text';input.maxLength=120;input.value=choice.label;label.append(input);const directionLabel=document.createElement('label');directionLabel.textContent='Direction';const select=document.createElement('select');for(const [value,text]of Object.entries({left:'Left',right:'Right',downstairs:'Downstairs',straight:'Straight ahead'})){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=choice.direction;directionLabel.append(select);row.append(label,directionLabel);if(choice.url){const urlLabel=document.createElement('label');urlLabel.textContent='Room information link';const url=document.createElement('input');url.type='url';url.value=choice.url;url.className='choice-url';urlLabel.append(url);row.append(urlLabel);}list.append(row);}
}
$('save-junction').onclick=()=>{const junction=route.junctions.find(j=>j.nodeId===current.id);if(!junction)return;const name=$('junction-name').value.trim();const rows=[...$('branch-fields').children];if(!name||rows.some(row=>!row.querySelector('input').value.trim()||(row.querySelector('.choice-url')&&!RouteCore.externalUrl(row.querySelector('.choice-url').value.trim())))){$('edit-status').textContent='Enter all destination labels and valid https:// information links.';return;}junction.name=name.slice(0,120);for(const row of rows){const choice=junction.choices.find(c=>c.id===row.dataset.choice);choice.label=row.querySelector('input').value.trim().slice(0,120);choice.direction=row.querySelector('select').value;const url=row.querySelector('.choice-url');if(url)choice.url=url.value.trim();}const title=$('lift-guidance-label').value.trim(),instruction=$('lift-guidance-text').value.trim();if(title&&instruction)junction.accessibility={...junction.accessibility,title:title.slice(0,120),instruction:instruction.slice(0,600)};else if(!title&&!instruction)delete junction.accessibility;persist();rebuild();$('edit-status').textContent='Junction labels and lift guidance saved in your preview. Publish route.json to share them.';};
function renderHidden(){const list=$('hidden-stops');list.replaceChildren();const hidden=route.nodes.filter(n=>n.hidden&&!n.retired);$('hidden-count').textContent=hidden.length;
  if(!hidden.length){list.textContent='You have not skipped any additional pictures.';return;}
  for(const n of hidden){const b=document.createElement('button');b.className='secondary';b.textContent='Restore '+n.floor.split(',')[0]+' · video '+formatTime(n.sourceTime);b.onclick=()=>{n.hidden=false;persist();rebuild();$('edit-status').textContent='Picture restored. Choose Detailed to see every available picture.';};list.append(b);}
}
function renderStops(){
  const group=nodes.filter(n=>n.segment===current.segment);$('floor-count').textContent=group.length+' stops';const list=$('stops');list.replaceChildren();
  group.forEach((n,i)=>{const b=document.createElement('button');b.className='stop'+(n.id===current.id?' active':'');b.setAttribute('aria-label','Go to '+nodeTitle(n)+', stop '+(i+1));
    const num=document.createElement('span');num.className='stop-number';num.textContent=i+1;const info=document.createElement('span');info.textContent=nodeTitle(n);const small=document.createElement('small');small.textContent=(n.sourceLabel||'Video')+' '+formatTime(n.sourceTime);info.append(small);b.append(num,info);b.onclick=()=>go(n.id);list.append(b);});
  const active=list.querySelector('.active');if(active)list.scrollTop=Math.max(0,active.offsetTop-list.offsetTop-65);
}
function svgEl(name,attrs){const e=document.createElementNS('http://www.w3.org/2000/svg',name);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;}
function renderMap(){
  const svg=$('route-map');svg.replaceChildren();const group=nodes.filter(n=>n.segment===current.segment);$('map-floor').textContent=section().heading;let points;
  if(current.indoor||current.segment>=3){points=group.map((n,i)=>({n,x:70+(i%2)*165,y:35+i/Math.max(1,group.length-1)*240}));$('map-note').textContent='Indoor stops in walking order. This is a route diagram, not a measured floor plan.';}
  else{const cos=Math.cos(group[0].lat*Math.PI/180),xs=group.map(n=>n.lon*111195*cos),ys=group.map(n=>n.lat*111195),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),scale=Math.min(244/Math.max(1,xmax-xmin),235/Math.max(1,ymax-ymin));
    points=group.map((n,i)=>({n,x:33+(xs[i]-xmin)*scale+(244-(xmax-xmin)*scale)/2,y:39+(ymax-ys[i])*scale+(235-(ymax-ymin)*scale)/2}));const north=svgEl('text',{x:278,y:26,'font-size':14,fill:'#64748b'});north.textContent='N';svg.append(north);svg.append(svgEl('path',{d:'M284 47 L284 31 M279 37 L284 31 L289 37',stroke:'#64748b',fill:'none','stroke-width':1.5}));$('map-note').textContent=current.segment===2?'Approximate GPS positions; indoor stops need checking against a floor plan.':'Approximate GPS positions. Click a stop to jump there.';}
  svg.append(svgEl('polyline',{points:points.map(p=>p.x+','+p.y).join(' '),fill:'none',stroke:'#91c7b8','stroke-width':3,'stroke-linejoin':'round'}));
  for(const p of points){const g=svgEl('g',{tabindex:0,role:'button','aria-label':'Go to '+nodeTitle(p.n)}),title=svgEl('title',{});title.textContent=nodeTitle(p.n)+' · '+formatTime(p.n.sourceTime);g.append(title);if(p.n.id===current.id)g.append(svgEl('circle',{cx:p.x,cy:p.y,r:12,fill:'#0d29471c'}));g.append(svgEl('circle',{cx:p.x,cy:p.y,r:p.n.id===current.id?6:4,fill:p.n.id===current.id?'#0d2947':'#2b977d',stroke:'white','stroke-width':2}));g.style.cursor='pointer';g.onclick=()=>go(p.n.id);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go(p.n.id);}};svg.append(g);}
}
function saveMarker(role){
  saveSelectedMarker('link-'+role);
}
function saveSelectedMarker(key=$('arrow-role').value){const original=RouteCore.markerSource(route,current,key);if(!original)return;original.yaw=wrap(viewer.getYaw());original.pitch=Math.max(-47,Math.min(45,viewer.getPitch()));original.verified=true;persist();rebuild();$('edit-status').textContent='Selected marker placed at the crosshair. Download route.json to publish your change.';}
$('save-selected-marker').onclick=()=>saveSelectedMarker();
function updateArrowEditor(){
  const ms=markers(),select=$('arrow-role'),selected=select.value;select.replaceChildren();
  for(const m of ms){const o=document.createElement('option');o.value=m.key;o.textContent=(m.role==='back'?'Back':m.role==='forward'?'Forward':'')+(m.role?' · ':'')+m.label;select.append(o);}
  if(ms.some(m=>m.key===selected))select.value=selected;
  const shown=ms.find(m=>m.key===select.value),l=shown?RouteCore.markerSource(route,current,shown.key):null;
  $('save-selected-marker').disabled=!l;$('save-arrow-style').disabled=!l;if(!l)return;
  $('arrow-label').value=l.customLabel||'';$('arrow-label').placeholder=shown.label;$('arrow-rotation').value=l.rotation??(shown.role==='back'?180:0);$('rotation-value').textContent=$('arrow-rotation').value+'°';$('arrow-visible').checked=!!shown.showLabel;
  $('arrow-rotation').disabled=!!shown.isLift||shown.kind==='info'||shown.kind==='guidance';$('arrow-visible').disabled=!!shown.isLift;
  $('marker-url-label').hidden=shown.kind!=='info';$('marker-url').value=shown.info?.url||shown.choice?.url||'';
}
$('bottom-limit').oninput=()=>{$('bottom-limit-value').textContent=$('bottom-limit').value+'°';};
$('save-bottom-limit').onclick=()=>{route.viewLimits={minPitch:Number($('bottom-limit').value),maxPitch:90};persist();rebuild();$('edit-status').textContent='Lower viewing edge saved. The panorama cannot look below it. This setting does not redact the original image file.';};
$('arrow-role').onchange=()=>{updateArrowEditor();const m=markers().find(m=>m.key===$('arrow-role').value);if(m)viewer.lookAt(m.pitch,m.yaw,viewHfov(),false);};
$('arrow-rotation').oninput=()=>{const angle=$('arrow-rotation').value;$('rotation-value').textContent=angle+'°';const icon=$('panorama').querySelector('[data-marker="'+$('arrow-role').value+'"] .arrow-icon');if(icon)icon.style.transform='rotate('+angle+'deg)';};
$('save-arrow-style').onclick=()=>{const key=$('arrow-role').value,l=RouteCore.markerSource(route,current,key);if(!l)return;const shown=markers().find(m=>m.key===key);if(shown.kind==='info'){const url=$('marker-url').value.trim();if(!RouteCore.externalUrl(url)){$('edit-status').textContent='Use an https:// room information link.';return;}if(shown.info)shown.info.url=url;else shown.choice.url=url;}l.customLabel=$('arrow-label').value.trim().slice(0,120);l.rotation=Number($('arrow-rotation').value)%360;l.showLabel=$('arrow-visible').checked;persist();rebuild();$('edit-status').textContent='Marker text, rotation and information link saved in your preview.';};
$('save-section').onclick=()=>{const heading=$('section-heading').value.trim(),subtitle=$('section-subtitle').value.trim();if(!heading||!subtitle){$('edit-status').textContent='Enter both lines for this section.';return;}section().heading=heading.slice(0,120);section().subtitle=subtitle.slice(0,120);persist();update();$('edit-status').textContent='Both section label lines are saved.';};
$('back').onclick=()=>walk('back');$('forward').onclick=()=>walk('forward');
$('lift-directions').onclick=()=>{const junction=route.junctions.find(j=>j.accessibility&&nodes.some(n=>n.id===j.nodeId));if(junction)go(junction.nodeId,'forward');};
document.querySelectorAll('[data-floor]').forEach(b=>b.onclick=()=>{const n=nodes.find(n=>n.segment===+b.dataset.floor);if(n)go(n.id);});
$('pace').onchange=()=>{route.pace=$('pace').value;persist();rebuild();};
$('save-forward').onclick=()=>saveMarker('forward');$('save-back').onclick=()=>saveMarker('back');
$('save-view').onclick=()=>{current.initialYaw=wrap(viewer.getYaw());current.initialPitch=viewer.getPitch();refreshScene(current);persist();$('edit-status').textContent='Starting view saved for this stop.';};
$('hide-stop').onclick=()=>{if(current.protected)return;const i=nodes.indexOf(current),next=nodes[i+1]||nodes[i-1];current.hidden=true;persist();rebuild(next.id);$('edit-status').textContent='Picture skipped. You can bring it back under Skipped pictures.';};
$('apply-offset').onclick=()=>{const correction=Number($('segment-offset').value);if(!Number.isFinite(correction))return;
  for(const n of route.nodes.filter(n=>n.segment===current.segment)){const delta=correction-(n.headingOffset||0);n.northOffset=((n.northOffset+delta)%360+360)%360;n.headingOffset=correction;for(const l of n.links)if(!l.verified)l.yaw=wrap(l.yaw-delta);const forward=n.links.find(l=>l.role==='forward');if(forward&&!forward.verified)n.initialYaw=forward.yaw;if(nodes.includes(n))refreshScene(n);}
  viewer.setNorthOffset(current.northOffset);persist();$('edit-status').textContent='Segment correction saved. Visually placed markers are preserved.';
};
function downloadJson(data,filename){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=filename;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},10000);}
$('download-settings').onclick=()=>{downloadJson(RouteCore.settings(route),'hku-ids-route-settings.json');$('edit-status').textContent='Optional settings backup downloaded. Publish with the full route.json file; there is no need to send this backup to the assistant.';};
async function fetchPublished(){const res=await fetch('route.json?refresh='+Date.now(),{cache:'no-store'});if(!res.ok)throw Error('The published tour could not be checked. Try again.');const data=await res.json();if(!Array.isArray(data.routes)||!Array.isArray(data.nodes)||!Array.isArray(data.sections))throw Error('The uploaded file is a settings backup. Publish the full file using “Download route.json to publish”.');return data;}
async function publishedRoute(){const latest=await fetchPublished();if(latest.revision!==publishedRevision)throw Error('GitHub has a newer tour. Download a settings backup, reset to the published tour, then restore your backup before publishing. This prevents overwriting the new routes.');const published=JSON.parse(JSON.stringify(route));published.revision=new Date().toISOString();published.activeRoute=route.routes.find(r=>r.status==='available').id;return published;}
$('download-route').onclick=async()=>{try{downloadJson(await publishedRoute(),'route.json');$('edit-status').textContent='Upload this route.json to GitHub, commit it, wait for Actions to show success, then reload the visitor tour. Your WordPress embed updates at the same address.';}catch(e){$('edit-status').textContent=e.message;}};
$('copy-route').onclick=async()=>{try{const data=JSON.stringify(await publishedRoute(),null,2);$('settings-text').value=data;$('copy-panel').hidden=false;try{await navigator.clipboard.writeText(data);$('edit-status').textContent='Full route.json copied. Replace route.json in GitHub and commit the update.';}catch(e){$('settings-text').focus();$('settings-text').select();$('edit-status').textContent='Copy the selected full route.json into the GitHub file editor.';}}catch(e){$('edit-status').textContent=e.message;}};
$('copy-settings').onclick=async()=>{const data=JSON.stringify(RouteCore.settings(route));$('settings-text').value=data;$('copy-panel').hidden=false;try{await navigator.clipboard.writeText(data);$('edit-status').textContent='Optional settings backup copied. Use the full route.json to publish on GitHub.';}catch(e){$('settings-text').focus();$('settings-text').select();$('edit-status').textContent='Copy the selected backup text.';}};
$('refresh-tour').onclick=()=>location.reload();
$('reset-preview').onclick=()=>{localStorage.removeItem(storageKey);localStorage.removeItem('hku-ids-exit-a-settings-v3');location.reload();};
$('import-settings').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;RouteCore.accept(route,JSON.parse(await file.text()));persist();rebuild();$('edit-status').textContent='Your directions, skipped pictures and pace have been restored.';}catch(e){$('edit-status').textContent=e.message;}};
(async()=>{try{
  if(!window.pannellum)throw Error('The panorama viewer could not load. Reload the page.');
  if(window.HKU_IDS_ROUTE)route=window.HKU_IDS_ROUTE;
  else route=await fetchPublished();
  publishedRevision=route.revision;
  let saved;try{saved=JSON.parse(localStorage.getItem(storageKey)||localStorage.getItem('hku-ids-exit-a-settings-v3')||'null');}catch(e){}
  if(editMode&&saved&&saved.revision===route.revision)try{RouteCore.accept(route,saved);previewDirty=true;}catch(e){}
  if(editMode&&saved&&saved.revision!==route.revision)$('edit-status').textContent='A newer GitHub configuration is loaded. An older browser preview was not applied. Restore its settings backup only if you still need those edits.';
  const routeId=params.get('route');if(route.routes.some(r=>r.id===routeId&&r.status==='available'))route.activeRoute=routeId;
  nodes=RouteCore.visible(route);byId=new Map(route.nodes.map(n=>[n.id,n]));current=nodes[0];
  const start=params.get('stop');if(byId.has(start)&&!byId.get(start).hidden&&!byId.get(start).retired){if(!nodes.includes(byId.get(start))){const other=route.routes.find(r=>r.status==='available'&&r.nodeIds.includes(start));if(other)route.activeRoute=other.id;route.pace='detailed';nodes=RouteCore.visible(route);}if(nodes.includes(byId.get(start)))current=byId.get(start);}
  initViewer();update();
}catch(e){$('viewer-error').hidden=false;$('viewer-error').textContent=e.message;}})();
