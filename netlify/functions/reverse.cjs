// Netlify Lambda-compatible function. Never return or log the provider key.
exports.handler = async event => {
  let origin = event.headers?.origin || '';
  // Same-origin GETs may omit Origin; accept only an explicitly allowed Referer origin.
  if (!origin && event.headers?.referer) { try { origin = new URL(event.headers.referer).origin; } catch {} }
  const allowed = (process.env.ALLOWED_ORIGINS || 'https://mohammad-a-s.github.io').split(',').map(s => s.trim());
  const headers = {'Content-Type':'application/json', 'Cache-Control':'no-store', 'Vary':'Origin'};
  if (!allowed.includes(origin)) return {statusCode:403,headers,body:JSON.stringify({error:'Origin not allowed'})};
  headers['Access-Control-Allow-Origin'] = origin;
  headers['Access-Control-Expose-Headers'] = 'Retry-After';
  const reply = (statusCode, body) => ({statusCode,headers,body:JSON.stringify(body)});
  if (event.httpMethod !== 'GET') return reply(405,{error:'GET required'});
  const q = event.queryStringParameters || {};
  if (!q.lat?.trim() || !q.lon?.trim()) return reply(400,{error:'Coordinates required'});
  const lat = Number(q.lat), lon = Number(q.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) return reply(400,{error:'Invalid coordinates'});
  if (!process.env.GEOAPIFY_API_KEY) return reply(503,{error:'Provider is not configured'});
  const url = new URL('https://api.geoapify.com/v1/geocode/reverse');
  url.search = new URLSearchParams({lat:String(lat),lon:String(lon),format:'json',apiKey:process.env.GEOAPIFY_API_KEY}).toString();
  try {
    const response = await fetch(url,{signal:AbortSignal.timeout(9000)});
    if (!response.ok) {
      if (response.status === 429) { headers['Retry-After'] = response.headers.get('Retry-After') || '60'; return reply(429,{error:'Provider limit reached'}); }
      return reply(502,{error:'Provider unavailable'});
    }
    const data = await response.json(), result = data.results?.[0];
    if (!result || typeof result.formatted !== 'string') return reply(404,{error:'No address found'});
    const name = result.name || result.address_line1 || result.city || '';
    const address = [...new Set([result.city || result.town || result.village, result.state, result.country].filter(Boolean))].filter(part => part.toLowerCase() !== name.toLowerCase()).join(', ');
    return reply(200,{name,display_name:result.formatted,address});
  } catch { return reply(502,{error:'Lookup unavailable'}); }
};
