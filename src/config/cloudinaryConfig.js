// Cloudinary konfiguratsiyasi
const CLOUDINARY_CONFIG = {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
    apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY,
    apiSecret: import.meta.env.VITE_CLOUDINARY_API_SECRET
};

// Cloudinary'ga fayl yuklash funksiyasi
export const uploadToCloudinary = async (file, folder = 'books') => {
    try {
        console.log('Cloudinary yuklash boshlandi:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            cloudName: CLOUDINARY_CONFIG.cloudName,
            folder: folder
        });

        const formData = new FormData();
        formData.append('file', file);
        
        // Upload preset ishlatish
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        
        // Folder parametrini qo'shamiz
        if (folder) {
            formData.append('folder', folder);
        }

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Cloudinary xato javobi:', errorData);
            throw new Error(`Cloudinary yuklashda xato: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        console.log('Cloudinary yuklash muvaffaqiyatli:', data);
        return {
            url: data.secure_url,
            publicId: data.public_id,
            width: data.width,
            height: data.height
        };
    } catch (error) {
        console.error('Cloudinary yuklash xatosi:', error);
        throw error;
    }
};

// Cloudinary'dan fayl o'chirish funksiyasi
export const deleteFromCloudinary = async (publicId) => {
    try {
        // Cloudinary'ning Admin API'sini ishlatish
        const timestamp = Math.round(new Date().getTime() / 1000);

        // Signature yaratish (oddiy hash)
        const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;

        // SHA-1 hash yaratish (browser'da crypto API ishlatish)
        const encoder = new TextEncoder();
        const data = encoder.encode(stringToSign);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('timestamp', timestamp.toString());
        formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
        formData.append('signature', signature);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/destroy`,
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            console.warn('Cloudinary\'dan o\'chirish amalga oshmadi, lekin davom etamiz');
            return true; // Xato bo'lsa ham davom etamiz
        }

        const result = await response.json();
        return result.result === 'ok';
    } catch (error) {
        console.error('Cloudinary o\'chirish xatosi:', error);
        // Xato bo'lsa ham davom etamiz, chunki asosiy ma'lumot Appwrite'da
        return true;
    }
};

export default CLOUDINARY_CONFIG;