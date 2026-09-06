(function (scope) {
  'use strict';
  const version='anodos-mac-v1';
  const utf8=new TextEncoder(),decode=new TextDecoder();
  const b64=bytes=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};
  const bytes=text=>{if(typeof text!=='string'||text.length>2800000||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))throw new Error('Invalid encoding');return Uint8Array.from(atob(text),c=>c.charCodeAt(0));};
  const random=length=>scope.crypto.getRandomValues(new Uint8Array(length));
  const hex=length=>Array.from(random(length),b=>b.toString(16).padStart(2,'0')).join('');
  const aad=(envelope,direction)=>utf8.encode([version,envelope.keyId,envelope.sid,envelope.rid,direction].join('\n'));
  async function keys(secret){
    const material=await scope.crypto.subtle.importKey('raw',secret,'HKDF',false,['deriveKey']);
    const derive=direction=>scope.crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:utf8.encode(version),info:utf8.encode(direction)},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    return {request:await derive('request'),response:await derive('response')};
  }
  async function seal(key,value,envelope,direction){const iv=random(12);return {...envelope,iv:b64(iv),data:b64(new Uint8Array(await scope.crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(envelope,direction)},key,utf8.encode(JSON.stringify(value)))))};}
  async function open(key,envelope,direction){const iv=bytes(envelope.iv);if(iv.length!==12)throw new Error('Invalid nonce');return JSON.parse(decode.decode(await scope.crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad(envelope,direction)},key,bytes(envelope.data))));}
  async function client(publicKey,keyId){
    const rsa=await scope.crypto.subtle.importKey('jwk',publicKey,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
    const secret=random(32),pair=await keys(secret),sid=hex(16);
    const wrapped=b64(new Uint8Array(await scope.crypto.subtle.encrypt({name:'RSA-OAEP'},rsa,secret)));
    return {sid,async request(value){return seal(pair.request,value,{v:version,keyId,sid,rid:hex(16),wrapped},'request');},async response(envelope,request){if(envelope.sid!==sid||envelope.rid!==request.rid||envelope.keyId!==keyId||envelope.v!==version)throw new Error('Unexpected encrypted response');return open(pair.response,envelope,'response');}};
  }
  scope.AnodosReviewCrypto=Object.freeze({version,b64,bytes,hex,keys,seal,open,client});
})(globalThis);
