/**
 * O'zbek tilidagi lotin va kiril alifbolarini o'girish uchun funksiyalar
 */

// Lotin-Kiril o'girish uchun harflar jadvali
const latinToCyrillicMap = {
    'a': 'а', 'b': 'б', 'd': 'д', 'e': 'э', 'f': 'ф', 'g': 'г', 'h': 'ҳ',
    'i': 'и', 'j': 'ж', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о',
    'p': 'п', 'q': 'қ', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'v': 'в',
    'x': 'х', 'y': 'й', 'z': 'з', "'": 'ъ',
    'A': 'А', 'B': 'Б', 'D': 'Д', 'E': 'Э', 'F': 'Ф', 'G': 'Г', 'H': 'Ҳ',
    'I': 'И', 'J': 'Ж', 'K': 'К', 'L': 'Л', 'M': 'М', 'N': 'Н', 'O': 'О',
    'P': 'П', 'Q': 'Қ', 'R': 'Р', 'S': 'С', 'T': 'Т', 'U': 'У', 'V': 'В',
    'X': 'Х', 'Y': 'Й', 'Z': 'З',
    // Maxsus harflar
    'sh': 'ш', 'ch': 'ч', 'ng': 'нг', 'ye': 'е',
    'Sh': 'Ш', 'Ch': 'Ч', 'Ng': 'Нг', 'Ye': 'Е',
    'SH': 'Ш', 'CH': 'Ч', 'NG': 'НГ', 'YE': 'Е',
    // Qo'shimcha
    'yo': 'ё', 'yu': 'ю', 'ya': 'я', 'ts': 'ц',
    'Yo': 'Ё', 'Yu': 'Ю', 'Ya': 'Я', 'Ts': 'Ц',
    'YO': 'Ё', 'YU': 'Ю', 'YA': 'Я', 'TS': 'Ц'
};

// Kiril-Lotin o'girish uchun harflar jadvali
const cyrillicToLatinMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'ye', 'ё': 'yo',
    'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': "'",
    'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': "o'", 'қ': 'q',
    'ғ': "g'", 'ҳ': 'h', 'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D',
    'Е': 'Ye', 'Ё': 'Yo', 'Ж': 'J', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K',
    'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S',
    'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'X', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh',
    'Щ': 'Sh', 'Ъ': "'", 'Ы': 'I', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    'Ў': "O'", 'Қ': 'Q', 'Ғ': "G'", 'Ҳ': 'H'
};

/**
 * Lotin alifbosidagi matnni kiril alifbosiga o'giradi
 * @param {string} text - Lotin alifbosidagi matn
 * @returns {string} - Kiril alifbosidagi matn
 */
export function latinToCyrillic(text) {
    if (!text) return '';
    
    // Avval barcha tutuq belgisi variantlarini standart apostrofga o'zgartirish
    let normalizedText = text
        .replace(/`/g, "'")  // Gravis aksentini apostrofga o'zgartirish
        .replace(/'/g, "'"); // Boshqa apostrofni standart apostrofga o'zgartirish
    
    // Maxsus harflar uchun
    let result = normalizedText
        .replace(/sh|Sh|SH/g, match => latinToCyrillicMap[match])
        .replace(/ch|Ch|CH/g, match => latinToCyrillicMap[match])
        .replace(/ng|Ng|NG/g, match => latinToCyrillicMap[match])
        .replace(/g'/g, 'ғ')
        .replace(/G'/g, 'Ғ')
        .replace(/o'/g, 'ў')
        .replace(/O'/g, 'Ў')
        .replace(/ye|Ye|YE/g, match => latinToCyrillicMap[match])
        .replace(/yo|Yo|YO/g, match => latinToCyrillicMap[match])
        .replace(/yu|Yu|YU/g, match => latinToCyrillicMap[match])
        .replace(/ya|Ya|YA/g, match => latinToCyrillicMap[match])
        .replace(/ts|Ts|TS/g, match => latinToCyrillicMap[match]);
    
    // Qolgan harflar uchun
    result = result.split('').map(char => latinToCyrillicMap[char] || char).join('');
    
    return result;
}

/**
 * Kiril alifbosidagi matnni lotin alifbosiga o'giradi
 * @param {string} text - Kiril alifbosidagi matn
 * @returns {string} - Lotin alifbosidagi matn
 */
export function cyrillicToLatin(text) {
    if (!text) return '';
    
    return text.split('').map(char => cyrillicToLatinMap[char] || char).join('');
}

/**
 * Matnni ham lotin, ham kiril alifbosida qidirish uchun tayyorlaydi
 * @param {string} text - Qidirilayotgan matn
 * @returns {Array} - Matnning variantlari (asl, transliteratsiya, x/h almashtirilgan)
 */
export function prepareSearchText(text) {
    if (!text) return ['', '', '', ''];
    
    // Avval barcha tutuq belgisi variantlarini standart apostrofga o'zgartirish
    const normalizedText = text
        .replace(/`/g, "'")  // Gravis aksentini apostrofga o'zgartirish
        .replace(/'/g, "'"); // Boshqa apostrofni standart apostrofga o'zgartirish
    
    const lowerText = normalizedText.toLowerCase();
    
    // Matn lotin alifbosidami yoki kiril alifbosidami aniqlash
    const cyrillicPattern = /[а-яА-ЯЁёҲҳҚқҒғЎў]/;
    const isTextCyrillic = cyrillicPattern.test(lowerText);
    
    let transliteratedText = '';
    let xToHVariant = '';
    let hToXVariant = '';
    
    if (isTextCyrillic) {
        // Agar matn kiril alifbosida bo'lsa, uni lotin alifbosiga o'giramiz
        transliteratedText = cyrillicToLatin(lowerText).toLowerCase();
        
        // Kiril alifbosida x/h almashtirish kerak emas, chunki ular alohida harflar
        xToHVariant = lowerText;
        hToXVariant = lowerText;
    } else {
        // Agar matn lotin alifbosida bo'lsa, uni kiril alifbosiga o'giramiz
        transliteratedText = latinToCyrillic(lowerText).toLowerCase();
        
        // x -> h va h -> x variantlarini yaratish
        xToHVariant = lowerText.replace(/x/g, 'h');
        hToXVariant = lowerText.replace(/h/g, 'x');
    }
    
    return [lowerText, transliteratedText, xToHVariant, hToXVariant];
}