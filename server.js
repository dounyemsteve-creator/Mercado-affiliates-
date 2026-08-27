const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint using EBAY_TOKEN
app.get('/api/search', async (req, res) => {
  const query = req.query.q || 'drone';
  const token = process.env.EBAY_TOKEN;

  if (!token) {
    console.error('EBAY_TOKEN environment variable is missing.');
    return res.status(500).json({ error: 'EBAY_TOKEN missing on server environment.' });
  }

  try {
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
      console.error('eBay API returned error:', data);
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
