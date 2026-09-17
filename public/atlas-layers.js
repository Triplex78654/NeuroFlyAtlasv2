import * as THREE from 'three';
import { decodePairs, combinePairs, fetchRelated } from './synapse-source.js';
const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('fr-FR');
const NAMES={AL:'Lobe antennaire',ME:'Médulla',LA:'Lamina',LO:'Lobula',LOP:'Plaque lobulaire',AME:'Médulla accessoire',AOTU:'Tubercule optique antérieur',CA:'Calice',PED:'Pédoncule',EB:'Corps ellipsoïde',FB:'Corps en éventail',PB:'Pont protocérébral',NO:'Nodules',LH:'Corne latérale',GNG:'Ganglion gnathal'};
const neutral=new THREE.Color('#91a4b2'),preColor=new THREE.Color('#77f0ca'),postColor=new THREE.Color('#ff73ae');
export function createAtlasLayers({scene,toPoint,getFilter,getSelected,focusBox}){
 const regions=new Map(),byLabel=new Map(),hidden=new Set(),synGroup=new THREE.Group();scene.add(synGroup);
 let metadata=null,overview=null,pairs=[],loadedId=null,synRequest=0,controller=null,lastSummary='',regionIndex=null,synLoadState='idle',pointPairs=[[],[]];
 const synGeometry=[new THREE.BufferGeometry(),new THREE.BufferGeometry()];
 // Three.js injects the color attribute when vertexColors is enabled.
 const softPointMaterial=(size,opacity)=>new THREE.ShaderMaterial({uniforms:{pointSize:{value:size},pointOpacity:{value:opacity}},vertexShader:'varying vec3 vColor; uniform float pointSize; void main(){vColor=color; vec4 mvPosition=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mvPosition; gl_PointSize=pointSize;}',fragmentShader:'varying vec3 vColor; uniform float pointOpacity; void main(){float d=distance(gl_PointCoord,vec2(.5)); float alpha=1.0-smoothstep(.38,.5,d); if(alpha<.01)discard; gl_FragColor=vec4(vColor,alpha*pointOpacity);}',transparent:true,vertexColors:true,depthWrite:false,blending:THREE.NormalBlending});
 const synMaterials=[0,1].map(()=>softPointMaterial(7.5,.64));
 synGeometry.forEach((g,i)=>synGroup.add(new THREE.Points(g,synMaterials[i])));
 const fullLabel=r=>{const base=r.label.replace(/\((L|R)\)$/,'');const side=r.label.endsWith('(L)')?' · G':r.label.endsWith('(R)')?' · D':'';return `${NAMES[base]??base}${side}`;};
 const visibleRegion=r=>!hidden.has(r.key)&&(getFilter()==='all'||getFilter()===r.territory);
 function updateRegions(){
  for(const r of regions.values()){const on=visibleRegion(r);if(r.mesh){r.mesh.visible=$('show-regions').checked&&on;r.mesh.material.opacity=Number($('region-opacity').value)*(getSelected() ? 0.45 : 1);}if(r.row)r.row.hidden=(getFilter()!=='all'&&getFilter()!==r.territory)||!`${r.label} ${fullLabel(r)}`.toLowerCase().includes($('region-search').value.toLowerCase());}
  $('region-count').textContent=`${[...regions.values()].filter(visibleRegion).length} / ${regions.size}`;
 }
 function renderSynapses(){
  if(synLoadState!=='ready'){synGroup.visible=false;return;}
  const p=[[],[]],c=[[],[]],seen=[new Set(),new Set()];pointPairs=[[],[]];let displayedPairs=0,unmapped=0;
  const labels=metadata?.properties.find(p=>p.id==='primary_roi')?.enum_labels??[];
  for(const pair of pairs){
   const region=byLabel.get(labels[pair.roi]);
   if(region?!visibleRegion(region):getFilter()!=='all')continue;
   displayedPairs++;if(!region)unmapped++;
   for(let i=0;i<2;i++){
    if(!$(i===0?'show-pre':'show-post').checked)continue;
    const xyz=i===0?pair.pre:pair.post,key=xyz.join(',');if(seen[i].has(key))continue;seen[i].add(key);
    p[i].push(...toPoint(xyz));pointPairs[i].push(pair);const color=$('synapse-color').value==='direction'?(i===0?preColor:postColor):(region?.colorObject??neutral);c[i].push(color.r,color.g,color.b);
   }
  }
  for(let i=0;i<2;i++){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p[i],3));g.setAttribute('color',new THREE.Float32BufferAttribute(c[i],3));g.computeBoundingSphere();synGroup.children[i].geometry.dispose();synGroup.children[i].geometry=g;synMaterials[i].uniforms.pointSize.value=loadedId?6.2:4.6;}
  synGroup.visible=$('show-synapses').checked;
  const counts=`${fmt(seen[0].size)} sites pré · ${fmt(seen[1].size)} sites post`;
  const scope=loadedId?`Neurone ${loadedId} · ${fmt(pairs.length)} connexions uniques chargées (${fmt(pairs.filter(p=>p.preId===loadedId).length)} sortantes, ${fmt(pairs.filter(p=>p.postId===loadedId).length)} entrantes)`:`Vue globale · aperçu limité à ${fmt(pairs.length)} connexions`;
  const filtered=displayedPairs!==pairs.length?` · ${fmt(displayedPairs)} connexions dans les zones affichées`:'';
  lastSummary=`${scope}${filtered}. ${counts}${unmapped?` · ${fmt(unmapped)} connexions sans zone reconnue, en gris`:''}.`;
  $('synapse-status').textContent=$('show-synapses').checked?lastSummary:'Synapses masquées. '+scope+'.';
  $('synapse-viewstatus').textContent=$('show-synapses').checked?(loadedId?`${fmt(displayedPairs)} connexions · neurone ${loadedId}`:`${fmt(displayedPairs)} connexions · aperçu échantillonné`):'Synapses masquées';
  $('synapse-key').textContent=$('synapse-color').value==='direction'?'Vert : présynaptique · rose : postsynaptique':'Synapses : couleurs des régions · gris : zone non annotée';
 }

 function synapseDialog(){
  let dialog=$('synapse-detail');if(dialog)return dialog;
  dialog=document.createElement('dialog');dialog.id='synapse-detail';dialog.className='synapse-detail';dialog.setAttribute('aria-labelledby','synapse-detail-title');
  dialog.innerHTML='<div class="dialog-head"><div><small class="eyebrow">INSPECTION SYNAPTIQUE</small><h2 id="synapse-detail-title">Détail de la connexion</h2></div><button type="button" aria-label="Fermer le détail de la synapse">✕</button></div><div class="synapse-detail-grid"></div><div class="synapse-detail-actions"></div>';
  dialog.querySelector('button').onclick=()=>dialog.close();document.body.append(dialog);return dialog;
 }
 function showSynapseDetails(hit){
  const dialog=synapseDialog(),pair=hit.pair,region=hit.region;dialog.querySelector('h2').textContent=hit.kind==='pre'?'Site présynaptique':'Site postsynaptique';
  const grid=dialog.querySelector('.synapse-detail-grid');grid.replaceChildren();
  const add=(label,value)=>{const item=document.createElement('div'),caption=document.createElement('small'),text=document.createElement('strong');caption.textContent=label;text.textContent=value;item.append(caption,text);grid.append(item);};
  add('Direction',hit.kind==='pre'?'Sortante · pré → post':'Entrante · pré → post');add('Zone anatomique',region?fullLabel(region):'Zone non annotée');add('Neurone présynaptique',pair.preId||'Non renseigné');add('Neurone postsynaptique',pair.postId||'Non renseigné');add('Position pré',pair.pre.map(Math.round).join(' · '));add('Position post',pair.post.map(Math.round).join(' · '));
  const actions=dialog.querySelector('.synapse-detail-actions');actions.replaceChildren();for(const [id,label] of [[pair.preId,'Inspecter le neurone pré'],[pair.postId,'Inspecter le neurone post']])if(id){const button=document.createElement('button');button.type='button';button.className='button-secondary';button.textContent=label+' · '+id;button.onclick=()=>{dialog.close();$('neuron-id').value=id;$('search-form').requestSubmit();};actions.append(button);}
  dialog.showModal();
 }
 function pickSynapse(raycaster){
  if(synLoadState!=='ready'||!$('show-synapses')?.checked)return null;const hit=raycaster.intersectObject(synGroup,true)[0];if(!hit)return null;const side=synGroup.children.indexOf(hit.object),pair=pointPairs[side]?.[hit.index];if(!pair)return null;const labels=metadata?.properties.find(p=>p.id==='primary_roi')?.enum_labels??[];return {pair,kind:side===0?'pre':'post',region:byLabel.get(labels[pair.roi])};
 }
 async function getMeta(){if(!metadata){const response=await fetch('/data/synapse-info.json');if(!response.ok)throw Error('Métadonnées synaptiques indisponibles.');metadata=await response.json();}return metadata;}
 async function inflate(buffer){const bytes=new Uint8Array(buffer);if(bytes[0]!==0x1f||bytes[1]!==0x8b)return buffer;const stream=new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));return new Response(stream).arrayBuffer();}
 async function localPairs(path,signal){const r=await fetch(path,{signal});if(!r.ok)throw Error('Données synaptiques indisponibles.');return decodePairs(await inflate(await r.arrayBuffer()));}
 async function loadSynapses(id=null){
  const request=++synRequest;controller?.abort();const active=new AbortController();controller=active;loadedId=null;pairs=[];
  synLoadState='loading';synGroup.visible=false;$('synapse-retry').hidden=true;$('synapse-status').textContent=id?`Chargement des connexions entrantes et sortantes du neurone ${id}…`:'Chargement de l’aperçu synaptique…';
  $('synapse-viewstatus').textContent=id?`Chargement des synapses · neurone ${id}…`:'Chargement de l’aperçu synaptique…';
  const timer=setTimeout(()=>active.abort(),60000);
  try{
   const meta=await getMeta();let loaded;
   if(id){
    const result=await Promise.all(['pre','post'].map(direction=>id==='12781'?localPairs(`/data/synapses-12781-${direction}.bin`,active.signal):fetchRelated(id,'body_'+direction,meta,active.signal)));
    loaded=combinePairs(result);
   }else{if(!overview)overview=await localPairs('/data/synapses-overview.bin',active.signal);loaded=overview;}
   if(request!==synRequest)return {superseded:true};pairs=loaded;loadedId=id;synLoadState='ready';renderSynapses();
   if(id&&pairs.length){const box=new THREE.Box3();for(const p of pairs){box.expandByPoint(new THREE.Vector3(...toPoint(p.pre)));box.expandByPoint(new THREE.Vector3(...toPoint(p.post)));}if(getSelected()===id)focusBox(box);}
   return {neuron:id,connections:pairs.length,overviewSample:!id};
  }catch(error){
   if(request!==synRequest)return {superseded:true};pairs=[];loadedId=null;synLoadState='error';active.abort();synGroup.visible=false;
   $('synapse-status').textContent=(error.name==='AbortError'?'Le chargement a dépassé une minute.':error.message||'Le chargement a échoué.')+' Aucune synapse de cette sélection n’est affichée.';
   $('synapse-viewstatus').textContent='Synapses non chargées · réessayer dans les réglages';$('synapse-retry').hidden=false;return {error:true};
  }finally{clearTimeout(timer);}
 }
 function makeLegend(){
  const host=$('region-list');host.replaceChildren();
  for(const territory of ['brain','vnc']){
   const heading=document.createElement('h3');heading.textContent=territory==='brain'?'Cerveau':'Chaîne nerveuse ventrale';host.append(heading);
   for(const r of regions.values())if(r.territory===territory){
    const row=document.createElement('div');row.className='region-row';r.row=row;
    const label=document.createElement('label');label.className='region-check';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=!hidden.has(r.key);checkbox.setAttribute('aria-label','Afficher '+r.label);checkbox.onchange=()=>{checkbox.checked?hidden.delete(r.key):hidden.add(r.key);updateRegions();renderSynapses();};
    const dot=document.createElement('i');dot.style.background=r.color;label.append(checkbox,dot);
    const title=document.createElement('span');title.textContent=fullLabel(r);const code=document.createElement('small');code.textContent=r.label;title.append(code);label.append(title);
    const focus=document.createElement('button');focus.textContent='Centrer';focus.className='region-focus';focus.title='Afficher et centrer '+r.label;focus.setAttribute('aria-label','Centrer la région '+r.label);focus.onclick=()=>{hidden.delete(r.key);checkbox.checked=true;$('show-regions').checked=true;updateRegions();renderSynapses();if(r.mesh)focusBox(new THREE.Box3().setFromObject(r.mesh));};row.append(label,focus);host.append(row);
   }
  }
  updateRegions();
 }
 async function loadRegions(){
  try{
   const response=await fetch('/data/regions/index.json');if(!response.ok)throw Error();regionIndex=await response.json();
   for(const record of regionIndex.regions){const r={...record,colorObject:new THREE.Color(record.color)};regions.set(r.key,r);byLabel.set(r.label,r);}
   makeLegend();let next=0,loaded=0;const failed=[];
   async function worker(){while(next<regionIndex.regions.length){const record=regionIndex.regions[next++],r=regions.get(record.key);try{
    const response=await fetch('/data-regions-'+record.file.replace(/\.ngmesh$/i,'.bin'));if(!response.ok)throw Error();const buffer=await inflate(await response.arrayBuffer());if(buffer.byteLength<4)throw Error();const view=new DataView(buffer),n=view.getUint32(0,true),positions=[];
    if(buffer.byteLength<4+n*12||(buffer.byteLength-4-n*12)%12)throw Error();
    for(let i=0;i<n;i++)positions.push(...toPoint([view.getFloat32(4+i*12,true)/8,view.getFloat32(8+i*12,true)/8,view.getFloat32(12+i*12,true)/8]));
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer.slice(4+n*12)),1));geometry.computeVertexNormals();
    const material=new THREE.MeshBasicMaterial({color:r.color,transparent:true,opacity:Number($('region-opacity').value),depthWrite:false,side:THREE.DoubleSide});const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=-1;r.mesh=mesh;scene.add(mesh);loaded++;
   }catch{failed.push(r.label);if(r.row)r.row.title='Contour non chargé';}
   $('region-load-status').textContent=`${loaded} / ${regions.size} contours chargés${failed.length?` · ${failed.length} indisponibles`:''}`;updateRegions();}}
   await Promise.all(Array.from({length:5},worker));if(pairs.length)renderSynapses();
  }catch{$('region-load-status').textContent='Les contours anatomiques n’ont pas pu être chargés. Rechargez la page pour réessayer.';}
 }
 $('show-regions').onchange=updateRegions;$('region-opacity').oninput=()=>{$('region-opacity-value').value=Math.round(Number($('region-opacity').value)*100)+' %';updateRegions();};
 $('region-search').oninput=updateRegions;
 for(const id of ['show-synapses','show-pre','show-post','synapse-color'])$(id).onchange=renderSynapses;
 $('synapse-retry').onclick=()=>loadSynapses(getSelected());
 $('regions-all').onclick=()=>{$('show-regions').checked=true;hidden.clear();for(const r of regions.values())if(r.row)r.row.querySelector('input').checked=true;updateRegions();renderSynapses();};
 $('regions-none').onclick=()=>{for(const r of regions.values()){hidden.add(r.key);if(r.row)r.row.querySelector('input').checked=false;}updateRegions();renderSynapses();};
 return {loadRegions,loadSynapses,showSynapseDetails,pickSynapse,refresh:()=>{updateRegions();if(pairs.length)renderSynapses();},coverage:()=>({regionCount:regions.size,loadedRegions:[...regions.values()].filter(r=>r.mesh).length,loadedConnections:pairs.length,synapseLoadState:synLoadState,synapseNeuron:loadedId,overviewSample:loadedId===null,synapsesVisible:synGroup.visible})};
}
