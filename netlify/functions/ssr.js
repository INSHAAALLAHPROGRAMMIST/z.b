// SSR function - Server-Side Rendering for SEO
// Generates HTML with meta tags for better SEO

export const handler = async (event, context) => {
  try {
    const { path } = event;
    const url = new URL(event.rawUrl);

    // Basic HTML template with SEO meta tags
    const html = `
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zamon Books – O'zbek Kitoblari Onlayn Do'koni</title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="O'zbekistondagi eng yaxshi kitoblar onlayn do'koni. Zamonaviy va klassik asarlar, ilmiy kitoblar va boshqalar.">
    <meta name="keywords" content="o'zbek kitoblar, onlayn kitob do'koni, kitob sotib olish, o'zbek adabiyoti">
    <meta name="author" content="Zamon Books">
    <meta name="robots" content="index, follow">
    
    <!-- Open Graph -->
    <meta property="og:title" content="Zamon Books – O'zbek Kitoblari Onlayn Do'koni">
    <meta property="og:description" content="O'zbekistondagi eng yaxshi kitoblar onlayn do'koni.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.zamonbooks.uz${path}">
    <meta property="og:image" content="https://www.zamonbooks.uz/icons/android-chrome-512x512.png">
    
    <!-- PWA -->
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#2c3e50">
    
    <!-- Favicon -->
    <link rel="icon" href="/favicon.ico">
    
    <!-- Critical CSS -->
    <style>
        body { 
            font-family: 'Poppins', sans-serif; 
            margin: 0; 
            padding: 0;
            background: linear-gradient(145deg, #0f172a, #1e293b);
            color: #f3f4f6;
        }
        .loading { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            font-size: 1.2rem;
        }
    </style>
</head>
<body>
    <div id="root">
        <div class="loading">
            <div>📚 Zamon Books yuklanmoqda...</div>
        </div>
    </div>
    
    <!-- Client-side app will replace this -->
    <script type="module" src="/src/main.jsx"></script>
    
    <!-- Service Worker -->
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
        }
    </script>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
      },
      body: html
    };

  } catch (error) {
    console.error('SSR Error:', error);

    // Fallback to redirect
    return {
      statusCode: 302,
      headers: {
        'Location': '/',
        'Cache-Control': 'no-cache'
      }
    };
  }
};