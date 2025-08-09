// O'zbek tilidagi qidiruv utilities
// O'zbek tilida keng tarqalgan xatolarni tuzatish va qidiruv yaxshilash

// O'zbek tilidagi umumiy xatolar va ularning to'g'ri variantlari
const UZBEK_CORRECTIONS = {
  // Lotin-Kiril aralashmasi
  'китоб': 'kitob',
  'китаб': 'kitab', 
  'муаллиф': 'muallif',
  'жанр': 'janr',
  'адабиёт': 'adabiyot',
  'роман': 'roman',
  'ҳикоя': 'hikoya',
  'шеър': 'she\'r',
  
  // Umumiy xatolar
  'kitob': 'kitab',
  'hikoya': 'hikoya',
  'she\'r': 'sher',
  'adabiyot': 'adabiyot',
  
  // X/H almashinuvi
  'xikoya': 'hikoya',
  'xaqida': 'haqida',
  'xarid': 'harid',
  'xalq': 'halq',
  'hikoyat': 'hikoya',
  
  // G'/Q almashinuvi  
  'qadim': 'qadim',
  'g\'adim': 'qadim',
  'qissa': 'qissa',
  'g\'issa': 'qissa',
  
  // O'/U almashinuvi
  'o\'zbek': 'o\'zbek',
  'uzbek': 'o\'zbek',
  'o\'qish': 'o\'qish',
  'uqish': 'o\'qish',
  
  // Inglizcha-o'zbekcha
  'book': 'kitab',
  'author': 'muallif',
  'novel': 'roman',
  'story': 'hikoya',
  'poem': 'she\'r',
  'literature': 'adabiyot',
  'genre': 'janr',
  'read': 'o\'qish',
  'buy': 'sotib olish',
  'price': 'narx',
  'new': 'yangi',
  'old': 'eski',
  'popular': 'mashhur',
  'famous': 'mashhur',
  
  // Ruscha-o'zbekcha
  'книга': 'kitab',
  'автор': 'muallif', 
  'роман': 'roman',
  'рассказ': 'hikoya',
  'стих': 'she\'r',
  'литература': 'adabiyot',
  'жанр': 'janr',
  'читать': 'o\'qish',
  'купить': 'sotib olish',
  'цена': 'narx',
  'новый': 'yangi',
  'старый': 'eski',
  'популярный': 'mashhur',
  'известный': 'mashhur'
};

// Mashhur mualliflar va ularning turli yozilish variantlari
const AUTHOR_CORRECTIONS = {
  'abdulla qodiriy': 'Abdulla Qodiriy',
  'abdulla qadiriy': 'Abdulla Qodiriy',
  'qodiriy': 'Abdulla Qodiriy',
  'qadiriy': 'Abdulla Qodiriy',
  
  'cholpon': 'Cho\'lpon',
  'chulpon': 'Cho\'lpon',
  'cho\'lpon': 'Cho\'lpon',
  
  'fitrat': 'Abdurauf Fitrat',
  'abdurauf fitrat': 'Abdurauf Fitrat',
  'fitrat abdurauf': 'Abdurauf Fitrat',
  
  'oybek': 'Oybek',
  'oybekov': 'Oybek',
  'musa toshmuhammad ogli': 'Oybek',
  
  'gafur gulom': 'G\'afur G\'ulom',
  'gafur gulam': 'G\'afur G\'ulom',
  'g\'afur g\'ulom': 'G\'afur G\'ulom',
  'gulom': 'G\'afur G\'ulom',
  
  'hamid olimjon': 'Hamid Olimjon',
  'olimjon': 'Hamid Olimjon',
  'hamid alimjan': 'Hamid Olimjon',
  
  'erkin vohidov': 'Erkin Vohidov',
  'vohidov': 'Erkin Vohidov',
  'erkin vahidov': 'Erkin Vohidov',
  
  'abdulla aripov': 'Abdulla Oripov',
  'oripov': 'Abdulla Oripov',
  'aripov': 'Abdulla Oripov',
  
  'zulfiya': 'Zulfiya',
  'zulfia': 'Zulfiya',
  'zulfiye': 'Zulfiya'
};

// Kitob nomlari va ularning turli yozilish variantlari
const BOOK_CORRECTIONS = {
  'mehrobdan chayon': 'Mehrobdan chayon',
  'mehrobdan chayan': 'Mehrobdan chayon',
  'chayon': 'Mehrobdan chayon',
  
  'otkan kunlar': 'O\'tkan kunlar',
  'utkan kunlar': 'O\'tkan kunlar',
  'o\'tgan kunlar': 'O\'tkan kunlar',
  
  'qiyomat': 'Qiyomat',
  'qiyamat': 'Qiyomat',
  'kiyomat': 'Qiyomat',
  
  'shaytanat': 'Shaytanat',
  'shaytonat': 'Shaytanat',
  'shayton': 'Shaytanat',
  
  'ikki eshik orasi': 'Ikki eshik orasi',
  'iki eshik orasi': 'Ikki eshik orasi',
  '2 eshik orasi': 'Ikki eshik orasi',
  
  'sariq devni minib': 'Sariq devni minib',
  'sarik devni minib': 'Sariq devni minib',
  'sariq dev': 'Sariq devni minib'
};

// Matnni tuzatish funksiyasi
export function correctUzbekText(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Boshida va oxiridagi probellarni olib tashlash
  let correctedText = text.trim().toLowerCase();
  
  // Agar bo'sh string bo'lsa, qaytarish
  if (!correctedText) return correctedText;
  
  // Asosiy so'zlarni tuzatish
  Object.keys(UZBEK_CORRECTIONS).forEach(wrong => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    correctedText = correctedText.replace(regex, UZBEK_CORRECTIONS[wrong]);
  });
  
  // Mualliflar nomini tuzatish
  Object.keys(AUTHOR_CORRECTIONS).forEach(wrong => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    correctedText = correctedText.replace(regex, AUTHOR_CORRECTIONS[wrong]);
  });
  
  // Kitob nomlarini tuzatish
  Object.keys(BOOK_CORRECTIONS).forEach(wrong => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    correctedText = correctedText.replace(regex, BOOK_CORRECTIONS[wrong]);
  });
  
  return correctedText;
}

// Qidiruv so'zlarini ajratish va tuzatish
export function parseSearchQuery(query) {
  if (!query || typeof query !== 'string') return [];
  
  // Boshida va oxiridagi probellarni olib tashlash
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];
  
  // Tuzatilgan matnni olish
  const correctedQuery = correctUzbekText(trimmedQuery);
  
  // So'zlarni ajratish (probel, vergul, nuqta bo'yicha)
  const words = correctedQuery
    .split(/[\s,.\-+]+/)
    .filter(word => word && word.length > 1)
    .map(word => word.trim())
    .filter(word => word); // Bo'sh stringlarni olib tashlash
  
  return words;
}

// Multi-field search uchun query yaratish
export function createSearchQueries(originalQuery) {
  // Boshida va oxiridagi probellarni olib tashlash
  const trimmedQuery = originalQuery ? originalQuery.trim() : '';
  if (!trimmedQuery) {
    return {
      original: originalQuery,
      corrected: '',
      words: [],
      titleSearch: '',
      authorSearch: '',
      combinedSearch: '',
      shortTerms: [],
      longTerms: []
    };
  }
  
  const correctedQuery = correctUzbekText(trimmedQuery);
  const words = parseSearchQuery(correctedQuery);
  
  return {
    original: originalQuery,
    corrected: correctedQuery,
    words: words,
    
    // Turli kombinatsiyalar
    titleSearch: correctedQuery,
    authorSearch: words.join(' '),
    combinedSearch: `${correctedQuery} ${words.join(' ')}`,
    
    // Qisqa so'zlar (kitob nomi uchun)
    shortTerms: words.filter(word => word.length <= 15),
    
    // Uzun so'zlar (muallif nomi uchun)  
    longTerms: words.filter(word => word.length > 3)
  };
}

// Relevance scoring uchun
export function calculateUzbekRelevance(book, searchQueries) {
  let score = 0;
  const { corrected, words, titleSearch, authorSearch } = searchQueries;
  
  if (!book) return score;
  
  const bookTitle = (book.title || '').toLowerCase();
  const bookAuthor = (book.authorName || '').toLowerCase();
  const bookDescription = (book.description || '').toLowerCase();
  
  // Title exact match (eng yuqori ball)
  if (bookTitle.includes(corrected.toLowerCase())) {
    score += 20;
    
    // Boshida kelsa qo'shimcha ball
    if (bookTitle.startsWith(corrected.toLowerCase())) {
      score += 15;
    }
  }
  
  // Title word matches
  words.forEach(word => {
    if (bookTitle.includes(word.toLowerCase())) {
      score += 10;
    }
  });
  
  // Author exact match
  if (bookAuthor.includes(authorSearch.toLowerCase())) {
    score += 15;
  }
  
  // Author word matches
  words.forEach(word => {
    if (bookAuthor.includes(word.toLowerCase())) {
      score += 8;
    }
  });
  
  // Description matches
  words.forEach(word => {
    if (bookDescription.includes(word.toLowerCase())) {
      score += 3;
    }
  });
  
  // Popularity bonus
  if (book.salesCount) {
    score += Math.min(book.salesCount * 0.1, 5);
  }
  
  // Availability bonus
  if (book.isAvailable && book.stock > 0) {
    score += 2;
  }
  
  return score;
}

// Search suggestions uchun
export function generateSearchSuggestions(query) {
  // Boshida va oxiridagi probellarni olib tashlash
  const trimmedQuery = query ? query.trim() : '';
  if (!trimmedQuery) return [];
  
  const corrected = correctUzbekText(trimmedQuery);
  const suggestions = [];
  
  // Agar tuzatish bo'lgan bo'lsa, tuzatilgan variantni taklif qilish
  if (corrected !== trimmedQuery.toLowerCase()) {
    suggestions.push({
      type: 'correction',
      text: corrected,
      label: `"${corrected}" deb qidirmoqchimisiz?`
    });
  }
  
  // Mashhur qidiruv variantlari
  const popularSearches = [
    'o\'zbek adabiyoti',
    'zamonaviy romanlar', 
    'she\'riy to\'plamlar',
    'tarixiy kitoblar',
    'bolalar adabiyoti',
    'ilmiy kitoblar'
  ];
  
  popularSearches.forEach(search => {
    if (search.includes(corrected) || corrected.includes(search.split(' ')[0])) {
      suggestions.push({
        type: 'popular',
        text: search,
        label: search
      });
    }
  });
  
  return suggestions.slice(0, 3); // Faqat 3 ta taklif
}