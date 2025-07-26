import React from 'react';
import { prepareSearchText } from './transliteration';

/**
 * Matnda qidiruv so'rovini highlight qilish uchun funksiya
 * @param {string} text - Asl matn
 * @param {string} searchTerm - Qidiruv so'rovi
 * @param {string} className - Highlight uchun CSS class nomi
 * @returns {JSX.Element} - Highlight qilingan matn
 */
export function highlightText(text, searchTerm, className = 'highlight-text') {
    if (!text || !searchTerm) {
        return text;
    }

    // Qidiruv so'rovini lotin va kiril alifbolarida tayyorlash
    const [searchTermLower, searchTermAlternate, searchTermXToH, searchTermHToX] = prepareSearchText(searchTerm);
    const searchVariants = [searchTermLower, searchTermAlternate, searchTermXToH, searchTermHToX].filter(Boolean);

    // Matnni qismlarga ajratish
    const parts = [];
    let remainingText = text;
    let lastIndex = 0;
    let found = false;

    // Har bir qidiruv varianti uchun tekshirish
    for (const variant of searchVariants) {
        if (!variant) continue;

        const textLower = text.toLowerCase();
        let index = textLower.indexOf(variant.toLowerCase());

        while (index !== -1) {
            found = true;

            // Qidiruv so'rovidan oldingi qism
            if (index > lastIndex) {
                parts.push(text.substring(lastIndex, index));
            }

            // Qidiruv so'rovi
            parts.push(
                <span key={`highlight-${lastIndex}-${index}`} className={className}>
                    {text.substring(index, index + variant.length)}
                </span>
            );

            // Keyingi qidirish uchun indeksni yangilash
            lastIndex = index + variant.length;
            index = textLower.indexOf(variant.toLowerCase(), lastIndex);
        }

        if (found) break;
    }

    // Qolgan qism
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return found ? <>{parts}</> : text;
}

/**
 * Matnda bir nechta qidiruv so'rovlarini highlight qilish uchun funksiya
 * @param {string} text - Asl matn
 * @param {Array} searchTerms - Qidiruv so'rovlari massivi
 * @param {string} className - Highlight uchun CSS class nomi
 * @returns {JSX.Element} - Highlight qilingan matn
 */
export function highlightMultipleTerms(text, searchTerms, className = 'highlight-text') {
    if (!text || !searchTerms || searchTerms.length === 0) {
        return text;
    }

    // Har bir qidiruv so'rovi uchun highlight qilish
    let result = text;
    for (const term of searchTerms) {
        if (term && term.trim()) {
            result = highlightText(result, term, className);
        }
    }

    return result;
}