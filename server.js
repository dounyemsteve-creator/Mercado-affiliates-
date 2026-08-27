const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// In-memory token storage
let cachedToken = null;
let tokenExpirationTime = 0;

// Function to fetch or reuse an eBay OAuth token
async function getEbayAccessToken() {
  const now = Date.now();

  // Reuse token if still valid (with a 60-second buffer)
  if (cachedToken && now < tokenExpirationTime - 60000) {
    return cachedToken;
  }

  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;

  if (!appId || !certId) {
    throw new Error('EBAY_APP_ID or EBAY_CERT_ID is missing in environment variables.');
  }

  // Base64 encode credentials (AppID:CertID)
  const credentials = Buffer.from(`${appId}:${certId}`).toString('base64');

  console.log('Generating fresh OAuth token from eBay...');

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
    console.error('Failed to generate eBay token:', data);
    throw new Error('Failed to fetch token from eBay API');
  }

  // Cache token and set expiration timestamp
  cachedToken = data.access_token;
  tokenExpirationTime = now + (data.expires_in * 1000);

  return cachedToken;
}

// Search endpoint used by your site's search bar
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
      console.error('eBay Search API returned error:', data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Search Proxy Error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch items from eBay' });
  }
});

// Fallback to serve your frontend index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
