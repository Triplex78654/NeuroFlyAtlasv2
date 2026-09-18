// Neuroglancer precomputed annotation/shard formats (Google, Apache-2.0 documentation).
// Each source record describes one directed presynaptic -> postsynaptic pair.
export const SOURCE_PREFIX='v1.0/male-cns-v1.0-synapses-precomputed/';
const U32=0xffffffffn;
const rot=(x,n)=>(x<<n)|(x>>>(32-n));
function mix(x){x^=x>>>16;x=Math.imul(x,0x85ebca6b);x^=x>>>13;x=Math.imul(x,0xc2b2ae35);x^=x>>>16;return x>>>0;}
export function hash64(value){
 let k1=Number(value&U32),k2=Number((value>>32n)&U32),h1=0,h2=0,h3=0,h4=0;
 k2=Math.imul(k2,0xab0e9789);k2=rot(k2,16);k2=Math.imul(k2,0x38b34ae5);h2^=k2;
 k1=Math.imul(k1,0x239b961b);k1=rot(k1,15);k1=Math.imul(k1,0xab0e9789);h1^=k1;
 h1^=8;h2^=8;h3^=8;h4^=8;h1=(h1+h2+h3+h4)|0;h2=(h2+h1)|0;h3=(h3+h1)|0;h4=(h4+h1)|0;
 h1=mix(h1);h2=mix(h2);h3=mix(h3);h4=mix(h4);h1=(h1+h2+h3+h4)>>>0;h2=(h2+h1)>>>0;
 return (BigInt(h2)<<32n)|BigInt(h1);
}
export function shardLocation(id,spec){const h=hash64(BigInt(id)>>BigInt(spec.preshift_bits));const mini=Number(h&((1n<<BigInt(spec.minishard_bits))-1n));const shard=Number((h>>BigInt(spec.minishard_bits))&((1n<<BigInt(spec.shard_bits))-1n));return {mini,file:shard.toString(16).padStart(Math.ceil(spec.shard_bits/4),'0')+'.shard',indexSize:2**spec.minishard_bits*16};}
const safe=b=>{const n=Number(b);if(!Number.isSafeInteger(n))throw Error('Offset de données hors limites.');return n;};
export function findChunk(buffer,id,indexSize){const view=new DataView(buffer);if(buffer.byteLength%24)throw Error('Index synaptique invalide.');const n=buffer.byteLength/24;let key=0n,offset=BigInt(indexSize);for(let i=0;i<n;i++){key+=view.getBigUint64(i*8,true);offset+=view.getBigUint64((n+i)*8,true);const size=view.getBigUint64((2*n+i)*8,true);if(key===BigInt(id))return {start:safe(offset),size:safe(size)};offset+=size;}return null;}
export function decodePairs(buffer){const view=new DataView(buffer);if(buffer.byteLength<8)throw Error('Données synaptiques tronquées.');const count=safe(view.getBigUint64(0,true));if(buffer.byteLength!==8+72*count)throw Error('Format synaptique inattendu.');const pairs=new Array(count);for(let i=0;i<count;i++){const o=8+i*64;const xyz=Array.from({length:6},(_,j)=>view.getFloat32(o+j*4,true));if(!xyz.every(Number.isFinite))throw Error('Coordonnées synaptiques invalides.');pairs[i]={pre:xyz.slice(0,3),post:xyz.slice(3),preId:String(view.getUint32(o+40,true)),postId:String(view.getUint32(o+44,true)),roi:view.getInt16(o+48,true),id:view.getBigUint64(8+count*64+i*8,true).toString()};}return pairs;}
export function combinePairs(batches){const map=new Map();for(const batch of batches)for(const pair of batch)map.set(pair.id,pair);return [...map.values()];}
async function unzip(bytes){if(typeof DecompressionStream==='undefined')throw Error('Votre navigateur ne prend pas en charge le chargement compressé.');return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
async function range(path,start,size,signal){if(size===0)return new ArrayBuffer(0);if(size>64000000)throw Error('Ce bloc synaptique dépasse la limite de chargement de cette vue.');const url='https://storage.googleapis.com/storage/v1/b/flyem-male-cns/o/'+encodeURIComponent(path)+'?alt=media';const response=await fetch(url,{headers:{Range:`bytes=${start}-${start+size-1}`},signal});if(response.status===404)return null;if(response.status!==206)throw Error('Le serveur ne permet pas de lire ce bloc de synapses.');const data=await response.arrayBuffer();if(data.byteLength!==size)throw Error('Bloc de synapses incomplet.');return data;}
export async function fetchRelated(id,relation,metadata,signal){
 const rel=metadata.relationships.find(r=>r.id===relation);if(!rel)throw Error('Relation synaptique inconnue.');
 const loc=shardLocation(id,rel.sharding),path=SOURCE_PREFIX+rel.key+'/'+loc.file;
 const header=await range(path,loc.mini*16,16,signal);if(header===null)throw Error('Index synaptique indisponible sur la source.');
 const v=new DataView(header),start=safe(v.getBigUint64(0,true)),end=safe(v.getBigUint64(8,true));if(start===end)return [];
 const compressedIndex=await range(path,loc.indexSize+start,end-start,signal);if(compressedIndex===null)throw Error('Index synaptique indisponible.');
 const hit=findChunk(await unzip(compressedIndex),id,loc.indexSize);if(!hit)return [];
 const compressed=await range(path,hit.start,hit.size,signal);if(compressed===null)throw Error('Données synaptiques indisponibles.');
 const pairs=decodePairs(await unzip(compressed));const field=relation==='body_pre'?'preId':'postId';if(pairs.some(p=>p[field]!==id))throw Error('Les synapses reçues ne correspondent pas au neurone.');return pairs;
}
