import { useEffect, useState } from 'react';
import { generateSlug } from '../utils/slugUtils';

// Hook for automatic slug generation
export const useAutoSlug = (title, author) => {
    const [slug, setSlug] = useState('');

    useEffect(() => {
        if (title) {
            const generatedSlug = generateSlug(title, author);
            setSlug(generatedSlug);
        } else {
            setSlug('');
        }
    }, [title, author]);

    return slug;
};

// Hook for manual slug editing with auto-generation fallback
export const useEditableSlug = (initialSlug, title, author) => {
    const [slug, setSlug] = useState(initialSlug || '');
    const [isManuallyEdited, setIsManuallyEdited] = useState(false);
    const autoSlug = useAutoSlug(title, author);

    useEffect(() => {
        // If not manually edited, use auto-generated slug
        if (!isManuallyEdited) {
            setSlug(autoSlug);
        }
    }, [autoSlug, isManuallyEdited]);

    const handleSlugChange = (newSlug) => {
        setSlug(newSlug);
        setIsManuallyEdited(true);
    };

    const resetToAuto = () => {
        setSlug(autoSlug);
        setIsManuallyEdited(false);
    };

    return {
        slug,
        setSlug: handleSlugChange,
        resetToAuto,
        isManuallyEdited,
        autoSlug
    };
};