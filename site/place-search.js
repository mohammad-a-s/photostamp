'use strict';
// Search always uses this deployment's Geoapify adapter, never a custom reverse endpoint.
const SEARCH_ENDPOINT = DEFAULT_ENDPOINT ? DEFAULT_ENDPOINT.replace(/\/reverse$/, '/search') : '';
let searchGeneration = 0;
const placeSearchCache = new Map();
function closePlaceSearch() {
 ++searchGeneration;
 $('placeSearchPanel').hidden = true;
 $('placeResults').replaceChildren();
 $('searchStatus').textContent = '';
}
window.addEventListener('photostamp:photochange', () => {
 closePlaceSearch(); $('placeQuery').value = ''; $('chosenLocation').hidden = true;
});
$('openPlaceSearch').addEventListener('click', () => {
 $('placeSearchPanel').hidden = false;
 $('searchStatus').textContent = SEARCH_ENDPOINT ? 'Search, then choose the place you recognise.' : 'Place search is not configured on this copy. You can type the place directly into your caption.';
 $('placeQuery').focus();
});
$('closePlaceSearch').addEventListener('click', () => { closePlaceSearch(); $('openPlaceSearch').focus(); });
$('placeQuery').addEventListener('input', () => {
 ++searchGeneration; $('placeResults').replaceChildren(); $('searchStatus').textContent = '';
});
$('placeQuery').addEventListener('keydown', event => {
 if (event.key === 'Enter') { event.preventDefault(); $('searchPlaces').click(); }
 if (event.key === 'Escape') { closePlaceSearch(); $('openPlaceSearch').focus(); }
});
async function searchPlaces() {
 if (!image || !SEARCH_ENDPOINT || busy || Date.now() < sharedDeadline()) return;
 if (!navigator.onLine) { $('searchStatus').textContent = 'You are offline. Type the place directly into your caption.'; return; }
 const query = $('placeQuery').value.trim();
 if (query.length < 3) { $('searchStatus').textContent = 'Enter at least 3 characters, including a city or country if possible.'; return; }
 const generation = ++searchGeneration, photo = sequence;
 const url = new URL(SEARCH_ENDPOINT); url.searchParams.set('q', query);
 const current = () => photo === sequence && generation === searchGeneration && !!image;
 busy = true; publishDeadline(Date.now()+14000);
 $('placeResults').replaceChildren(); $('searchStatus').textContent = 'Searching…';
 try {
  let results = placeSearchCache.get(query);
  if (!results) {
   const response = await fetch(url,{credentials:'omit',referrerPolicy:'strict-origin-when-cross-origin',signal:AbortSignal.timeout(12000)});
   if (!response.ok) {
    if (response.status === 429) {
     const retry = response.headers.get('Retry-After');
     const deadline = retry ? (/^\d+$/.test(retry) ? Date.now()+Number(retry)*1000 : Date.parse(retry)) : Date.now()+5000;
     cooldown = Math.max(cooldown, Number.isFinite(deadline) ? deadline : Date.now()+5000);
    }
    throw Error(response.status === 429 ? 'Search is busy. Wait for the countdown and try again.' : 'Search is unavailable. Try again later or type a place into the caption.');
   }
   const data = await response.json();
   if (!Array.isArray(data.results)) throw Error('Search returned an unexpected response. Try typing a place instead.');
   results = data.results.filter(r => typeof r.name === 'string' && typeof r.address === 'string' && typeof r.formatted === 'string').slice(0,5);
   if (placeSearchCache.size >= 30) placeSearchCache.delete(placeSearchCache.keys().next().value);
   placeSearchCache.set(query,results);
  }
  if (!current()) return;
  $('searchStatus').textContent = results.length ? 'Choose the correct place. Add a city or country to narrow your search.' : 'No places found. Try a street address or city, or type the place into your caption.';
  for (const result of results) {
   const li=document.createElement('li'), button=document.createElement('button'), title=document.createElement('strong'), detail=document.createElement('span');
   button.className='place-result'; title.textContent=result.name; detail.textContent=result.formatted;
   button.append(title,detail); li.append(button); $('placeResults').append(li);
   button.addEventListener('click', () => {
    if (!current()) return;
    if (($('place').value || $('address').value) && !confirm('Replace the current place and location details with this selection?')) return;
    $('place').value=result.name.slice(0,120); $('address').value=result.address.slice(0,200);
    fieldSources.place=fieldSources.address='manually selected'; sourceLabels(); draw();
    $('chosenLocation').textContent=coordinates ? 'Location selected manually. Optional GPS coordinates still come from the original photo.' : 'Location selected manually. No photo GPS was added.';
    $('chosenLocation').hidden=false; closePlaceSearch(); $('place').focus();
    $('status').textContent='Location added. Check your caption, then save.';
   });
  }
 } catch(error) {
  if (current()) $('searchStatus').textContent=error.name==='TimeoutError' ? 'Search took too long. Try again or type the place directly.' : error.message;
 } finally { busy=false; cooldown=Math.max(cooldown,Date.now()+2000); publishDeadline(cooldown); }
}
$('searchPlaces').addEventListener('click', () => {
 if (navigator.locks) navigator.locks.request('photostamp-lookup',{ifAvailable:true},lock => lock ? searchPlaces() : Promise.resolve()).catch(()=>{$('searchStatus').textContent='Search is busy. Try again.';});
 else searchPlaces();
});
setInterval(() => {
 const remaining=Math.max(0,Math.ceil((sharedDeadline()-Date.now())/1000));
 $('searchPlaces').disabled=!image || !SEARCH_ENDPOINT || busy || remaining>0;
 $('searchPlaces').textContent=busy ? 'Please wait…' : remaining ? `Wait ${remaining}s` : 'Search';
},200);
