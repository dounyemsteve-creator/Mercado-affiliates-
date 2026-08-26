const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cache variables for automatic OAuth token management
let cachedToken = null;
let tokenExpirationTime = 0;

// Function to automatically fetch a fresh eBay Application Access Token
async function getEbayAccessToken() {
  const now = Date.now();
  
  // Return cached token if it is still valid (with a 60-second buffer)
  if (cachedToken && now < tokenExpirationTime - 60000) {
    return cachedToken;
  }

  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;

  if (!appId || !certId) {
    throw new Error('EBAY_APP_ID or EBAY_CERT_ID missing in environment variables.');
  }

  // Base64 encode the App ID and Cert ID for Basic Authentication
  const credentials = Buffer.from(`${appId}:${certId}`).toString('base64');

  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Failed to retrieve eBay token:', data);
    throw new Error('Could not generate eBay OAuth token');
  }

  cachedToken = data.access_token;
  // Set expiration time based on returned expires_in (seconds)
  tokenExpirationTime = now + (data.expires_in * 1000);

  return cachedToken;
}

// Secure Proxy Endpoint for eBay Search
app.get('/api/search', async (req, res) => {
  const query = req.query.q || 'drone';

  try {
    const token = await getEbayAccessToken();

    const response = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=12`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('eBay API search error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to communicate with eBay API' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
