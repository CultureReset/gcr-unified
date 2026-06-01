const fetch = require('node-fetch');

(async () => {
  try {
    // Check if page loads
    const res = await fetch('http://localhost:5173/restaurants');
    console.log('✅ /restaurants page responds:', res.status);
    
    // Check if API is available
    try {
      const apiRes = await fetch('http://localhost:3000/api/gcr/entities?limit=5');
      if (apiRes.ok) {
        const data = await apiRes.json();
        console.log('✅ API available, entities count:', data.entities?.length || 0);
      }
    } catch (err) {
      console.log('⚠️ API not available:', err.message);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
