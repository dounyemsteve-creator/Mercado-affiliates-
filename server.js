const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend assets from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Secure Proxy Endpoint for eBay Search
app.get('/api/search', async (req, res) => {
  const query = req.query.q || 'drone';
  const token = process.env.EBAY_TOKEN;

  if (!token) {
    return res.status(500).json({ 
      error: 'EBAY_TOKEN environment variable is not configured on Render.' 
    });
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
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('eBay fetch error:', error);
    res.status(500).json({ error: 'Failed to communicate with eBay API' });
  }
});

// Fallback route to serve index.html for all page loads
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
