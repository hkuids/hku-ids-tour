'use strict';
// Shared route rules; direction placements stay attached to the original picture.
window.RouteCore={
  uiDefaults:{locationLabel:true,sectionLabel:true,sceneLabel:true,junctionTitle:true,navigation:true,progress:true,descriptions:true,junctionCards:true,liftCards:true,arrows:true,infoIcons:true,hints:false,arrival:true,arrowStyle:'chevron'},
  markerVisible(route,n,m){const ui={...this.uiDefaults,...route.ui,...n.ui};return m.visible!==false&&(m.kind==='info'?ui.infoIcons:ui.arrows)!==false;},
  validate(route){
    if(!route||!Array.isArray(route.nodes)||!Array.isArray(route.routes)||!Array.isArray(route.sections)||!Array.isArray(route.junctions)||!Array.isArray(route.transfers))throw Error('Use a full route.json exported from this console.');
    const ids=new Set(),sections=new Set(route.sections.map(s=>s.segment));
    const checkMarker=m=>{if(!m||!Number.isFinite(m.yaw)||!Number.isFinite(m.pitch)||Math.abs(m.pitch)>90)throw Error('A marker has an invalid position.');};
    for(const n of route.nodes){if(typeof n.id!=='string'||!n.id||ids.has(n.id))throw Error('Scene IDs must be unique.');ids.add(n.id);if(!this.imageUrl(n.image)||!sections.has(n.segment)||!Array.isArray(n.links))throw Error('A scene has an invalid image, section or links.');for(const l of n.links)checkMarker(l);for(const info of n.info||[]){checkMarker(info.marker);if(!this.externalUrl(info.url))throw Error('A room link must use https://.');}if(n.viewLimits&&(!Number.isFinite(n.viewLimits.minPitch)||n.viewLimits.minPitch< -85||n.viewLimits.minPitch>0))throw Error('Invalid scene viewing limit.');}
    const routes=new Set();for(const r of route.routes){if(routes.has(r.id)||!Array.isArray(r.nodeIds)||r.nodeIds.some(id=>!ids.has(id)))throw Error('A route has duplicate IDs or unknown scenes.');routes.add(r.id);}
    if(!route.routes.some(r=>r.status==='available'&&r.nodeIds.length))throw Error('At least one route must be available.');
    for(const j of route.junctions){if(!ids.has(j.nodeId)||!Array.isArray(j.choices))throw Error('A junction has an unknown scene.');for(const choice of j.choices){if(choice.marker)checkMarker(choice.marker);if(choice.target&&!ids.has(choice.target))throw Error('A branch points to an unknown scene.');if(choice.url&&!this.externalUrl(choice.url))throw Error('Invalid branch link.');}}
    for(const t of route.transfers)if(!ids.has(t.nodeId)||!ids.has(t.target))throw Error('A lift transfer has an unknown scene.');
    return route;
  },
  imageUrl(value){
    if(typeof value!=='string')return false;
    if(/^images\/[a-z0-9._-]+\.jpe?g$/i.test(value))return true;
    try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch(e){return false;}
  },
  externalUrl(value){
    try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch(e){return false;}
  },
  choiceFor(route,n){
    return route.junctions.find(j=>j.nodeId===n.id)?.choices.find(c=>c.routeId===route.activeRoute||c.routeIds?.includes(route.activeRoute));
  },
  visible(route,pace=route.pace||'standard',routeId=route.activeRoute){
    const path=route.routes.find(r=>r.id===routeId&&r.status==='available')||route.routes[0];
    const known=new Map(route.nodes.map(n=>[n.id,n]));
    const candidates=path.nodeIds.map(id=>known.get(id)).filter(n=>n&&!n.hidden&&!n.retired);
    if(pace==='detailed')return candidates;
    const standard=candidates.filter((n,i)=>n.protected||n.recommended||i===0||i===candidates.length-1);
    if(pace!=='fewer')return standard;
    let last;
    return standard.filter((n,i)=>{
      const keep=n.protected||i===0||i===standard.length-1||!last||n.segment!==last.segment||n.sourceVideo!==last.sourceVideo||(n.walkTime??n.sourceTime)-(last.walkTime??last.sourceTime)>=10;
      if(keep)last=n;
      return keep;
    });
  },
  links(nodes,n,route){
    const i=nodes.indexOf(n);if(i<0)return[];
    return ['back','forward'].flatMap(role=>{
      const target=nodes[i+(role==='back'?-1:1)];if(!target)return[];
      const choice=role==='forward'&&route?this.choiceFor(route,n):null;
      const original=choice?.marker&&!choice.useForwardMarker?{...choice.marker,role}:n.links.find(l=>l.role===role);
      if(!original)return[];
      return [{...original,target:target.id,choiceId:choice?.id}];
    });
  },
  markers(route,nodes,n){
    const markers=this.links(nodes,n,route).map(l=>({...l,key:'link-'+l.role,kind:'walk'}));
    const active=this.choiceFor(route,n),junction=route.junctions.find(j=>j.nodeId===n.id);
    for(const c of junction?.choices||[]){
      if(c===active&&markers.some(m=>m.role==='forward'))continue;
      if(!c.marker)continue;
      markers.push({...c.marker,key:'choice-'+c.id,kind:c.status==='coming-soon'||c.action==='planned'?'soon':c.url?'info':c.action==='guidance'?'guidance':'branch',choice:c,label:c.label,showLabel:c.marker.showLabel??true});
    }
    for(const info of n.info||[])markers.push({...info.marker,key:'info-'+info.id,kind:'info',info,label:info.label,showLabel:info.marker.showLabel??true});
    return markers;
  },
  markerSource(route,n,key){
    if(key.startsWith('choice-'))return route.junctions.find(j=>j.nodeId===n.id)?.choices.find(c=>c.id===key.slice(7))?.marker;
    if(key.startsWith('info-'))return n.info?.find(i=>i.id===key.slice(5))?.marker;
    const role=key.slice(5),choice=role==='forward'?this.choiceFor(route,n):null;
    return choice?.marker&&!choice.useForwardMarker?choice.marker:n.links.find(l=>l.role===role);
  },
  accept(route,saved){
    if(!saved||!Array.isArray(saved.nodes))throw Error('Choose the downloaded route settings file.');
    const known=new Map(route.nodes.map(n=>[n.id,n]));let count=0;
    for(const s of saved.nodes){const n=known.get(s.id);if(!n)continue;
      for(const key of ['northOffset','initialYaw','initialPitch','headingOffset']){
        if(typeof s[key]==='number'&&Number.isFinite(s[key]))n[key]=s[key];
        else if(key==='headingOffset'&&s[key]===null)n[key]=null;
      }
      if(s.ui&&typeof s.ui==='object')n.ui={...s.ui};if(s.viewLimits&&Number.isFinite(s.viewLimits.minPitch))n.viewLimits={minPitch:Math.max(-75,Math.min(-10,s.viewLimits.minPitch)),maxPitch:90};
      if(typeof s.headingVerified==='boolean')n.headingVerified=s.headingVerified;
      if(this.imageUrl(s.image))n.image=s.image;
      if(typeof s.hidden==='boolean'&&!n.protected)n.hidden=s.hidden;
      for(const l of s.links||[]){
        const link=n.links.find(x=>l.role?x.role===l.role:x.target===l.target);
        if(link&&Number.isFinite(l.yaw)&&Number.isFinite(l.pitch)){
          link.yaw=((l.yaw+180)%360+360)%360-180;link.pitch=Math.max(-85,Math.min(85,l.pitch));link.verified=!!l.verified;
        }
        if(link){this.acceptMarker(link,l);
          if(typeof l.customLabel==='string')link.customLabel=l.customLabel.slice(0,120);
          if(Number.isFinite(l.rotation))link.rotation=((l.rotation%360)+360)%360;
          if(typeof l.showLabel==='boolean')link.showLabel=l.showLabel;
        }
      }count++;
    }
    if(!count)throw Error('This settings file does not match this tour.');
    if(saved.ui&&typeof saved.ui==='object')route.ui={...saved.ui};
    for(const incoming of saved.transfers||[]){const t=route.transfers.find(t=>t.nodeId===incoming.nodeId);if(t){for(const key of ['title','returnTitle','instruction','returnInstruction','button','returnButton'])if(typeof incoming[key]==='string')t[key]=incoming[key].slice(0,240);if(['round','rounded-square'].includes(incoming.buttonShape))t.buttonShape=incoming.buttonShape;}}
    if(['standard','detailed','fewer'].includes(saved.pace))route.pace=saved.pace;
    if(saved.viewLimits&&Number.isFinite(saved.viewLimits.minPitch))route.viewLimits={minPitch:Math.max(-75,Math.min(-10,saved.viewLimits.minPitch)),maxPitch:90};
    for(const section of Array.isArray(saved.sections)?saved.sections:[]){
      const knownSection=route.sections.find(s=>s.segment===section.segment);if(!knownSection)continue;
      for(const key of ['heading','subtitle'])if(typeof section[key]==='string'&&section[key].trim())knownSection[key]=section[key].trim().slice(0,120);
    }
    for(const incoming of Array.isArray(saved.junctions)?saved.junctions:[]){
      const junction=route.junctions.find(j=>j.nodeId===incoming.nodeId);if(!junction)continue;
      if(typeof incoming.name==='string'&&incoming.name.trim())junction.name=incoming.name.trim().slice(0,120);
      if(Object.prototype.hasOwnProperty.call(incoming,'accessibility')){
        const guide=incoming.accessibility;
        if(guide&&typeof guide.title==='string'&&guide.title.trim()&&typeof guide.instruction==='string'&&guide.instruction.trim())junction.accessibility={title:guide.title.trim().slice(0,120),instruction:guide.instruction.trim().slice(0,600),note:typeof guide.note==='string'?guide.note.slice(0,240):''};
        else if(guide===null)delete junction.accessibility;
      }
      for(const c of Array.isArray(incoming.choices)?incoming.choices:[]){
        const choice=junction.choices.find(x=>c.id?x.id===c.id:x.routeId===c.routeId);if(!choice)continue;
        if(typeof c.label==='string'&&c.label.trim())choice.label=c.label.trim().slice(0,120);
        if(['left','right','downstairs','straight'].includes(c.direction))choice.direction=c.direction;
        if(this.externalUrl(c.url))choice.url=c.url;
        for(const key of ['showCard','showDescription'])if(typeof c[key]==='boolean')choice[key]=c[key];
        if(c.marker&&choice.marker)this.acceptMarker(choice.marker,c.marker);
      }
    }
    for(const s of saved.nodes){const n=known.get(s.id);if(!n)continue;for(const info of s.info||[]){const knownInfo=n.info?.find(i=>i.id===info.id);if(!knownInfo)continue;if(typeof info.label==='string')knownInfo.label=info.label.slice(0,120);if(this.externalUrl(info.url))knownInfo.url=info.url;if(info.marker&&knownInfo.marker)this.acceptMarker(knownInfo.marker,info.marker);}}
    return count;
  },
  acceptMarker(marker,saved){
    if(Number.isFinite(saved.yaw))marker.yaw=((saved.yaw+180)%360+360)%360-180;
    if(Number.isFinite(saved.pitch))marker.pitch=Math.max(-85,Math.min(85,saved.pitch));
    if(Number.isFinite(saved.rotation))marker.rotation=((saved.rotation%360)+360)%360;
    if(typeof saved.verified==='boolean')marker.verified=saved.verified;
    if(typeof saved.customLabel==='string')marker.customLabel=saved.customLabel.slice(0,120);
    if(typeof saved.showLabel==='boolean')marker.showLabel=saved.showLabel;
    if(typeof saved.visible==='boolean')marker.visible=saved.visible;
    if(['chevron','line','ring','ground'].includes(saved.style))marker.style=saved.style;
    if(['auto','arrow','chevron','stairs','lift'].includes(saved.type))marker.type=saved.type;
  },
  settings(route){return{schemaVersion:6,ui:{...route.ui},transfers:JSON.parse(JSON.stringify(route.transfers)),revision:route.revision,title:route.title,branch:route.branch,pace:route.pace,viewLimits:{...route.viewLimits},sections:route.sections.map(s=>({...s})),junctions:JSON.parse(JSON.stringify(route.junctions)),nodes:route.nodes.map(n=>({id:n.id,image:n.image,ui:n.ui?{...n.ui}:undefined,viewLimits:n.viewLimits?{...n.viewLimits}:undefined,hidden:!!n.hidden,northOffset:n.northOffset,initialYaw:n.initialYaw,initialPitch:n.initialPitch,headingOffset:n.headingOffset,headingVerified:n.headingVerified,info:n.info?JSON.parse(JSON.stringify(n.info)):undefined,links:n.links.map(l=>({...l}))}))};}
};
