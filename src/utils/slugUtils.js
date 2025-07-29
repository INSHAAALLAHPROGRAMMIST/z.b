// Slug generation utility
export const generateSlug = (title, author = '') => {
    if (!title) return '';
    
    // Title'ni tozalash - KITOB NOMI BIRINCHI!
    const cleanTitle = title
        .toLowerCase()
        .replace(/['"«»]/g, '') // Qo'shtirnoqlar
        .replace(/[ʻʼ]/g, '') // O'zbek apostrof
        .replace(/[^\w\s-]/g, '') // Maxsus belgilar
        .replace(/\s+/g, '-') // Bo'shliqlarni tire bilan almashtirish
        .replace(/-+/g, '-') // Ko'p tirelerini bitta qilish
        .replace(/^-+|-+$/g, '') // Boshi va oxiridagi tirelerini olib tashlash
        .trim();
    
    // Agar author bor bo'lsa, uni oxirida qo'shish
    if (author) {
        const cleanAuthor = author
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .trim();
        
        // KITOB NOMI - MUALLIF (kitob nomi birinchi!)
        return `${cleanTitle}-${cleanAuthor}`;
    }
    
    return cleanTitle;
};

// Author slug generator
export const generateAuthorSlug = (name) => {
    if (!name) return '';
    
    return name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
};

// Genre slug generator  
export const generateGenreSlug = (name) => {
    if (!name) return '';
    
    return name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
};

// Test function
export const testSlugGeneration = () => {
    console.log('Book slug:', generateSlug("O'tgan Kunlar", "Abdulla Qodiriy")); // otgan-kunlar-abdulla-qodiriy
    console.log('Book slug:', generateSlug("Nafs muolajasi", "Abu Homid G'azzoliy")); // nafs-muolajasi-abu-homid-gazzoliy
    console.log('Author slug:', generateAuthorSlug("Abdulla Qodiriy"));
    console.log('Genre slug:', generateGenreSlug("Tarixiy Roman"));
};