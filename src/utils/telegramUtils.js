// Telegram Utilities

/**
 * Telegram username'dan link yaratish
 * @param {string} username - Telegram username (@ bilan yoki @ siz)
 * @returns {string} Telegram link
 */
export const createTelegramLink = (username) => {
    if (!username || username === 'Kiritilmagan') {
        return null;
    }
    
    // @ belgisini olib tashlash
    const cleanUsername = username.replace('@', '');
    
    return `https://t.me/${cleanUsername}`;
};

/**
 * Telegram username'ni format qilish (@ bilan)
 * @param {string} username - Telegram username
 * @returns {string} Formatted username
 */
export const formatTelegramUsername = (username) => {
    if (!username || username === 'Kiritilmagan') {
        return 'Kiritilmagan';
    }
    
    // Agar @ bilan boshlanmasa, qo'shish
    return username.startsWith('@') ? username : `@${username}`;
};

/**
 * Telegram username validation
 * @param {string} username - Telegram username
 * @returns {Object} Validation result
 */
export const validateTelegramUsername = (username) => {
    if (!username || !username.trim()) {
        return {
            valid: false,
            message: 'Telegram username kiritish majburiy!'
        };
    }
    
    // @ belgisini olib tashlash
    const cleanUsername = username.replace('@', '').trim();
    
    // Telegram username regex (5-32 belgi, faqat harflar, raqamlar va _)
    const telegramRegex = /^[a-zA-Z0-9_]{5,32}$/;
    
    if (!telegramRegex.test(cleanUsername)) {
        return {
            valid: false,
            message: 'Telegram username noto\'g\'ri formatda! Faqat harflar, raqamlar va _ ishlatish mumkin (5-32 ta belgi).'
        };
    }
    
    return {
        valid: true,
        username: cleanUsername,
        formatted: `@${cleanUsername}`,
        link: `https://t.me/${cleanUsername}`
    };
};

/**
 * Telegram link component yaratish (React uchun)
 * @param {string} username - Telegram username
 * @param {Object} style - CSS style object
 * @returns {Object} Link props
 */
export const createTelegramLinkProps = (username, style = {}) => {
    const link = createTelegramLink(username);
    
    if (!link) {
        return null;
    }
    
    return {
        href: link,
        target: '_blank',
        rel: 'noopener noreferrer',
        style: {
            color: '#0088cc',
            textDecoration: 'none',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            ...style
        },
        onMouseEnter: (e) => {
            e.target.style.textDecoration = 'underline';
            e.target.style.transform = 'scale(1.05)';
        },
        onMouseLeave: (e) => {
            e.target.style.textDecoration = 'none';
            e.target.style.transform = 'scale(1)';
        }
    };
};

/**
 * Telegram HTML link yaratish (Telegram bot uchun)
 * @param {string} username - Telegram username
 * @returns {string} HTML link
 */
export const createTelegramHTMLLink = (username) => {
    if (!username || username === 'Kiritilmagan') {
        return '<code>Kiritilmagan</code>';
    }
    
    const cleanUsername = username.replace('@', '');
    return `<a href="https://t.me/${cleanUsername}">@${cleanUsername}</a>`;
};