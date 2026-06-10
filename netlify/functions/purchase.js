// ============================================================
// Netlify Function — Meta Conversions API (CAPI) Server-Side
// Pixel ID : 1620829165645629
// ============================================================

const crypto = require('crypto');

function hash(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function generateEventId() {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': 'https://momybelly.ma',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { event_id, phone, email, fbp, fbc } = body;

    const PIXEL_ID = '1620829165645629';
    const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;

    if (!ACCESS_TOKEN) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Token manquant' }) };
    }

    const client_ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '';
    const client_ua = event.headers['user-agent'] || '';

    const capiPayload = {
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: event_id || generateEventId(),
        event_source_url: 'https://momybelly.ma/merci',
        action_source: 'website',
        user_data: {
          ph: hash(phone),
          em: hash(email),
          client_ip_address: client_ip.split(',')[0].trim(),
          client_user_agent: client_ua,
          fbp: fbp || null,
          fbc: fbc || null,
        },
        custom_data: {
          value: 399.00,
          currency: 'MAD',
          content_name: 'Ceinture Momybelly',
          content_type: 'product',
          content_ids: ['momybelly-ceinture-v1'],
          num_items: 1,
        }
      }]
    };

    const apiUrl = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(capiPayload)
    });

    const result = await response.json();

    if (result.error) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: result.error }) };
    }

    console.log('✅ CAPI Purchase envoyé:', result.events_received);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, events_received: result.events_received })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
