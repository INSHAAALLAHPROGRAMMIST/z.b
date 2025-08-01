// Webhook security utility
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;

// Performance cache
let lastCheckResult = null;
let lastCheckTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 daqiqa cache

/**
 * Webhook holatini tekshirish va himoya qilish
 * @param {boolean} silent - Console log'larni yashirish
 */
export const checkWebhookSecurity = async (silent = false, forceCheck = false) => {
    try {
        // Cache check - performance optimization
        const now = Date.now();
        if (!forceCheck && lastCheckResult && (now - lastCheckTime) < CACHE_DURATION) {
            if (!silent) console.log('📋 Cache\'dan webhook holati olinmoqda...');
            return lastCheckResult;
        }
        
        if (!silent) console.log('🔍 Webhook xavfsizligini tekshirish...');

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
        const data = await response.json();

        if (!data.ok) {
            if (!silent) console.error('❌ Webhook ma\'lumotlarini olishda xato:', data.description);
            return { safe: false, error: data.description };
        }

        const webhookInfo = data.result;

        // Webhook o'rnatilgan bo'lsa
        if (webhookInfo.url && webhookInfo.url !== '') {
            // EMERGENCY: Har doim log qilish (xavfsizlik uchun)
            console.warn('🚨 XAVFLI: Webhook topildi va o\'chirilmoqda!', {
                url: webhookInfo.url,
                timestamp: new Date().toISOString()
            });
            
            if (!silent) {
                console.warn('⚠️ Batafsil ma\'lumot:', {
                    has_custom_certificate: webhookInfo.has_custom_certificate,
                    pending_update_count: webhookInfo.pending_update_count,
                    last_error_date: webhookInfo.last_error_date,
                    last_error_message: webhookInfo.last_error_message,
                    max_connections: webhookInfo.max_connections,
                    allowed_updates: webhookInfo.allowed_updates
                });
            }

            // Webhook'ni o'chirish
            const deleteResult = await deleteWebhook(silent);

            // Admin uchun localStorage'ga saqlash
            localStorage.setItem('webhookSecurityAlert', JSON.stringify({
                timestamp: new Date().toISOString(),
                webhookUrl: webhookInfo.url,
                deleted: deleteResult.success
            }));

            const result = {
                safe: false,
                webhookFound: true,
                webhookUrl: webhookInfo.url,
                deleteResult
            };
            
            // Cache update (webhook topilganda cache'ni tozalash)
            lastCheckResult = null;
            lastCheckTime = 0;
            
            return result;
        }

        if (!silent) console.log('✅ Xavfsiz: Webhook o\'rnatilmagan');
        
        // Eski alertlarni tozalash
        localStorage.removeItem('webhookSecurityAlert');
        
        const result = { safe: true, webhookFound: false };
        
        // Cache update
        lastCheckResult = result;
        lastCheckTime = now;
        
        return result;

    } catch (error) {
        if (!silent) console.error('❌ Webhook tekshirishda xato:', error);
        return { safe: false, error: error.message };
    }
};

/**
 * Webhook'ni o'chirish
 * @param {boolean} silent - Console log'larni yashirish
 */
export const deleteWebhook = async (silent = false) => {
    try {
        if (!silent) console.log('🗑️ Webhook o\'chirilmoqda...');

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                drop_pending_updates: true // Kutilayotgan yangilanishlarni ham o'chirish
            })
        });

        const data = await response.json();

        if (data.ok) {
            if (!silent) console.log('✅ Webhook muvaffaqiyatli o\'chirildi');
            return { success: true };
        } else {
            if (!silent) console.error('❌ Webhook o\'chirishda xato:', data.description);
            return { success: false, error: data.description };
        }

    } catch (error) {
        if (!silent) console.error('❌ Webhook o\'chirishda xato:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Muntazam webhook tekshiruvi
 */
export const startWebhookMonitoring = () => {
    // Dastlab tekshirish
    checkWebhookSecurity();

    // Har 5 daqiqada tekshirish
    const interval = setInterval(() => {
        checkWebhookSecurity();
    }, 5 * 60 * 1000); // 5 daqiqa

    // Cleanup function
    return () => clearInterval(interval);
};

/**
 * Bot ma'lumotlarini tekshirish (qo'shimcha xavfsizlik)
 */
export const checkBotInfo = async () => {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
        const data = await response.json();

        if (data.ok) {
            console.log('🤖 Bot ma\'lumotlari:', {
                id: data.result.id,
                username: data.result.username,
                first_name: data.result.first_name,
                can_join_groups: data.result.can_join_groups,
                can_read_all_group_messages: data.result.can_read_all_group_messages,
                supports_inline_queries: data.result.supports_inline_queries
            });

            return { success: true, botInfo: data.result };
        } else {
            console.error('❌ Bot ma\'lumotlarini olishda xato:', data.description);
            return { success: false, error: data.description };
        }

    } catch (error) {
        console.error('❌ Bot ma\'lumotlarini olishda xato:', error);
        return { success: false, error: error.message };
    }
};

export default {
    checkWebhookSecurity,
    deleteWebhook,
    startWebhookMonitoring,
    checkBotInfo
};