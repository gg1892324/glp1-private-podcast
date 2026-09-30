// Sends podcast signups to Flodesk. Needs FLODESK_API_KEY in Netlify environment variables.
const API = 'https://api.flodesk.com/v1';
const DEFAULT_SEGMENT = '6abb24acf50c852557702f05'; // GLP-1 private podcast

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  const key = process.env.FLODESK_API_KEY;
  if (!key) return { statusCode: 500, body: JSON.stringify({ error: 'FLODESK_API_KEY not set' }) };

  let data = {};
  try { data = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, body: 'Bad JSON' }; }
  const email = String(data.email || '').trim().toLowerCase();
  const firstName = String(data.firstName || '').trim();
  const segment = String(data.segment || DEFAULT_SEGMENT).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email' }) };

  const headers = {
    'Authorization': 'Basic ' + Buffer.from(key + ':').toString('base64'),
    'Content-Type': 'application/json',
    'User-Agent': 'GeorgieBeames GLP1 Podcast (info@georgiebeames.com)'
  };

  try {
    // 1. Create or update the subscriber
    const r1 = await fetch(API + '/subscribers', {
      method: 'POST', headers,
      body: JSON.stringify({ email, first_name: firstName })
    });
    const t1 = await r1.text();
    if (!r1.ok) {
      console.error('Flodesk create failed', r1.status, t1);
      return { statusCode: 502, body: JSON.stringify({ error: 'Flodesk create failed' }) };
    }
    let sub = {}; try { sub = JSON.parse(t1); } catch (e) {}
    const id = sub.id || email;

    // 2. Add to the segment using the subscriber's Flodesk ID
    const r2 = await fetch(API + '/subscribers/' + encodeURIComponent(id) + '/segments', {
      method: 'POST', headers, body: JSON.stringify({ segment_ids: [segment] })
    });
    if (!r2.ok) {
      console.error('Flodesk segment failed', r2.status, await r2.text());
      return { statusCode: 502, body: JSON.stringify({ error: 'Flodesk segment failed' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
