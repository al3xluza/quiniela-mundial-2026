// Netlify Function: proxy a la API pública de ESPN para el Mundial 2026.
// El navegador no puede llamar a ESPN directo (lo bloquea), pero este
// servidor sí. Devuelve el JSON con CORS abierto hacia nuestro propio sitio.
//
// Uso desde el front:
//   /.netlify/functions/espn?type=scoreboard&dates=YYYYMMDD
//   /.netlify/functions/espn?type=summary&event=EVENTID
//
// No toca el Sheet ni el scoring. Capa de datos en vivo, aislada.

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=15'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const q = event.queryStringParameters || {};
  const type = (q.type || '').toLowerCase();

  let url;
  if (type === 'scoreboard') {
    const dates = (q.dates || '').replace(/[^0-9]/g, '');
    url = `${ESPN_BASE}/scoreboard${dates ? `?dates=${dates}` : ''}`;
  } else if (type === 'summary') {
    const id = (q.event || '').replace(/[^0-9A-Za-z]/g, '');
    if (!id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing event id' }) };
    }
    url = `${ESPN_BASE}/summary?event=${id}`;
  } else {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid type (use scoreboard|summary)' }) };
  }

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QuinielaMundial/1.0)',
        'Accept': 'application/json'
      }
    });
    if (!r.ok) {
      return { statusCode: r.status, headers, body: JSON.stringify({ error: 'espn ' + r.status }) };
    }
    const data = await r.text();
    return { statusCode: 200, headers, body: data };
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: String(e) }) };
  }
};
