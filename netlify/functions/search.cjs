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
  const query = typeof q.q === 'string' ? q.q.trim() : '';
  if (query.length < 3 || query.length > 200 || /[\x00-\x1f]/.test(query)) return reply(400,{error:'Enter a place between 3 and 200 characters'});
  if (!process.env.GEOAPIFY_API_KEY) return reply(503,{error:'Provider is not configured'});
  const url = new URL('https://api.geoapify.com/v1/geocode/search');
  url.search = new URLSearchParams({text:query,format:'json',limit:'5',apiKey:process.env.GEOAPIFY_API_KEY}).toString();
  try {
    const response = await fetch(url,{signal:AbortSignal.timeout(9000)});
    if (!response.ok) {
      if (response.status === 429) { headers['Retry-After'] = response.headers.get('Retry-After') || '60'; return reply(429,{error:'Provider limit reached'}); }
      return reply(502,{error:'Provider unavailable'});
    }
    const data = await response.json();
    if (!Array.isArray(data.results)) return reply(502,{error:'Invalid provider response'});
    const results = data.results.filter(r => typeof r.formatted === 'string').slice(0,5).map(r => {
      const name = r.name || r.address_line1 || r.city || r.formatted;
      const address = [...new Set([r.city || r.town || r.village, r.state, r.country].filter(v => typeof v === 'string'))].filter(v => v.toLowerCase() !== name.toLowerCase()).join(', ');
      return {name,address,formatted:r.formatted};
    });
    return reply(200,{results});
  } catch { return reply(502,{error:'Lookup unavailable'}); }
};
