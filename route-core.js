'use strict';
// Shared route rules; direction placements stay attached to the original picture.
window.RouteCore={
  imageUrl(value){
    if(typeof value!=='string')return false;
    if(/^images\/[a-z0-9._-]+\.jpe?g$/i.test(value))return true;
    try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch(e){return false;}
  },
  visible(route,pace=route.pace||'standard',routeId=route.activeRoute){
    const path=route.routes.find(r=>r.id===routeId&&r.status==='available')||route.routes[0];
    const known=new Map(route.nodes.map(n=>[n.id,n]));
    const candidates=path.nodeIds.map(id=>known.get(id)).filter(n=>n&&!n.hidden);
    if(pace==='detailed')return candidates;
    const standard=candidates.filter((n,i)=>n.protected||n.recommended||i===0||i===candidates.length-1);
    if(pace!=='fewer')return standard;
    let last;
    return standard.filter((n,i)=>{
      const keep=n.protected||i===0||i===standard.length-1||!last||n.segment!==last.segment||n.sourceTime-last.sourceTime>=10;
      if(keep)last=n;
      return keep;
    });
  },
  links(nodes,n){
    const i=nodes.indexOf(n);if(i<0)return[];
    return ['back','forward'].flatMap(role=>{
      const target=nodes[i+(role==='back'?-1:1)];if(!target)return[];
      const original=n.links.find(l=>l.role===role);
      if(!original)return[];
      return [{...original,target:target.id}];
    });
  },
  accept(route,saved){
    if(!saved||!Array.isArray(saved.nodes))throw Error('Choose the downloaded route settings file.');
    const known=new Map(route.nodes.map(n=>[n.id,n]));let count=0;
    for(const s of saved.nodes){const n=known.get(s.id);if(!n)continue;
      for(const key of ['northOffset','initialYaw','initialPitch','headingOffset']){
        if(typeof s[key]==='number'&&Number.isFinite(s[key]))n[key]=s[key];
        else if(key==='headingOffset'&&s[key]===null)n[key]=null;
      }
      if(typeof s.headingVerified==='boolean')n.headingVerified=s.headingVerified;
      if(this.imageUrl(s.image))n.image=s.image;
      if(typeof s.hidden==='boolean'&&!n.protected)n.hidden=s.hidden;
      for(const l of s.links||[]){
        const link=n.links.find(x=>l.role?x.role===l.role:x.target===l.target);
        if(link&&Number.isFinite(l.yaw)&&Number.isFinite(l.pitch)){
          link.yaw=((l.yaw+180)%360+360)%360-180;link.pitch=Math.max(-85,Math.min(85,l.pitch));link.verified=!!l.verified;
        }
        if(link){
          if(typeof l.customLabel==='string')link.customLabel=l.customLabel.slice(0,120);
          if(Number.isFinite(l.rotation))link.rotation=((l.rotation%360)+360)%360;
          if(typeof l.showLabel==='boolean')link.showLabel=l.showLabel;
        }
      }count++;
    }
    if(!count)throw Error('This settings file does not match this tour.');
    if(['standard','detailed','fewer'].includes(saved.pace))route.pace=saved.pace;
    if(saved.viewLimits&&Number.isFinite(saved.viewLimits.minPitch))route.viewLimits={minPitch:Math.max(-60,Math.min(-10,saved.viewLimits.minPitch)),maxPitch:90};
    for(const section of Array.isArray(saved.sections)?saved.sections:[]){
      const knownSection=route.sections.find(s=>s.segment===section.segment);if(!knownSection)continue;
      for(const key of ['heading','subtitle'])if(typeof section[key]==='string'&&section[key].trim())knownSection[key]=section[key].trim().slice(0,120);
    }
    for(const incoming of Array.isArray(saved.junctions)?saved.junctions:[]){
      const junction=route.junctions.find(j=>j.nodeId===incoming.nodeId);if(!junction)continue;
      if(typeof incoming.name==='string'&&incoming.name.trim())junction.name=incoming.name.trim().slice(0,120);
      for(const c of Array.isArray(incoming.choices)?incoming.choices:[]){
        const choice=junction.choices.find(x=>x.routeId===c.routeId);if(!choice)continue;
        if(typeof c.label==='string'&&c.label.trim())choice.label=c.label.trim().slice(0,120);
        if(['left','right','downstairs','straight'].includes(c.direction))choice.direction=c.direction;
      }
    }
    return count;
  },
  settings(route){return{schemaVersion:4,revision:route.revision,title:route.title,branch:route.branch,pace:route.pace,viewLimits:{...route.viewLimits},sections:route.sections.map(s=>({...s})),junctions:route.junctions.map(j=>({...j,choices:j.choices.map(c=>({...c}))})),nodes:route.nodes.map(n=>({id:n.id,image:n.image,hidden:!!n.hidden,northOffset:n.northOffset,initialYaw:n.initialYaw,initialPitch:n.initialPitch,headingOffset:n.headingOffset,headingVerified:n.headingVerified,links:n.links.map(l=>({role:l.role,target:l.target,yaw:l.yaw,pitch:l.pitch,verified:l.verified,customLabel:l.customLabel||'',rotation:l.rotation??(l.role==='back'?180:0),showLabel:!!l.showLabel}))}))};}
};
