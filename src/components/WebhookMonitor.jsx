// Webhook monitoring component for admin panel
import React, { useState, useEffect, useCallback } from 'react';
import { checkWebhookSecurity, deleteWebhook, checkBotInfo } from '../utils/webhookSecurity';

const WebhookMonitor = () => {
    const [webhookStatus, setWebhookStatus] = useState(null);
    const [botInfo, setBotInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lastCheck, setLastCheck] = useState(null);
    const [recentAlert, setRecentAlert] = useState(null);
    // UI states
    const [isCompact, setIsCompact] = useState(true);
    const [isVisible, setIsVisible] = useState(true);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

    const checkSecurity = useCallback(async (forceCheck = false) => {
        setLoading(true);
        try {
            const [webhookResult, botResult] = await Promise.all([
                checkWebhookSecurity(false, forceCheck), // Cache'dan foydalanish
                checkBotInfo()
            ]);

            setWebhookStatus(webhookResult);
            setBotInfo(botResult);
            setLastCheck(new Date().toLocaleString('uz-UZ'));
        } catch (error) {
            console.error('Security check failed:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const forceDeleteWebhook = useCallback(async () => {
        setLoading(true);
        try {
            const result = await deleteWebhook(false); // Verbose mode
            if (result.success) {
                await checkSecurity(true); // Force check - cache'ni bypass qilish
            }
        } catch (error) {
            console.error('Webhook delete failed:', error);
        } finally {
            setLoading(false);
        }
    }, [checkSecurity]);

    useEffect(() => {
        // Initial check
        checkSecurity();

        // localStorage'dan so'nggi alertni olish
        const checkRecentAlert = () => {
            const alertData = localStorage.getItem('webhookSecurityAlert');
            if (alertData) {
                try {
                    const alert = JSON.parse(alertData);
                    setRecentAlert(alert);
                } catch (error) {
                    console.error('Alert data parse error:', error);
                }
            }
        };

        checkRecentAlert();

        // Performance optimized interval - faqat component visible bo'lsa
        let interval;
        const startMonitoring = () => {
            if (!autoRefreshEnabled) return;

            interval = setInterval(() => {
                if (document.visibilityState === 'visible' && autoRefreshEnabled) {
                    checkSecurity();
                    checkRecentAlert();
                }
            }, 5 * 60 * 1000); // 5 daqiqa (kamroq)
        };

        // Visibility change listener
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                if (!interval) startMonitoring();
                checkSecurity(); // Tab ochilganda darhol tekshirish
            } else {
                if (interval) {
                    clearInterval(interval);
                    interval = null;
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        startMonitoring();

        return () => {
            if (interval) clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [autoRefreshEnabled]);

    // Agar yashirilgan bo'lsa, hech narsa ko'rsatmaslik
    if (!isVisible) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '20px'
            }}>
                <button
                    onClick={() => setIsVisible(true)}
                    style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        background: 'rgba(106, 138, 255, 0.1)',
                        border: '1px solid rgba(106, 138, 255, 0.3)',
                        borderRadius: '6px',
                        color: '#6A8AFF',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(106, 138, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(106, 138, 255, 0.1)';
                    }}
                    title="Webhook monitorni ko'rsatish"
                >
                    🔐 Bot Xavfsizligi
                </button>
            </div>
        );
    }

    if (isCompact) {
        return (
            <div className="webhook-monitor-compact" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                margin: '0 0 20px 0',
                background: webhookStatus?.safe === false
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))'
                    : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))',
                border: webhookStatus?.safe === false
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                flexWrap: 'wrap',
                gap: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: webhookStatus?.safe === false
                            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.3))'
                            : 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.3))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        color: webhookStatus?.safe === false ? '#ef4444' : '#22c55e'
                    }}>
                        {loading ? '⏳' : webhookStatus?.safe === false ? '⚠️' : '🛡️'}
                    </div>
                    <div>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--text-color)',
                            marginBottom: '2px'
                        }}>
                            Bot Xavfsizligi
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: webhookStatus?.safe === false ? '#ef4444' : '#22c55e',
                            fontWeight: '500'
                        }}>
                            {loading ? 'Tekshirilmoqda...' :
                                webhookStatus?.safe === false ? 'Webhook topildi!' :
                                    webhookStatus?.safe === true ? 'Xavfsiz' : 'Noma\'lum'}
                        </div>
                    </div>
                </div>

                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    flexWrap: 'wrap',
                    minWidth: 0 // Flex shrink uchun
                }}>
                    {/* Auto-refresh indicator */}
                    <div style={{
                        padding: '3px 6px',
                        background: autoRefreshEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        color: autoRefreshEnabled ? '#22c55e' : '#9ca3af',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                    }}>
                        <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: autoRefreshEnabled ? '#22c55e' : '#9ca3af'
                        }}></div>
                        {autoRefreshEnabled ? 'AUTO' : 'MANUAL'}
                    </div>

                    {recentAlert && (
                        <div style={{
                            padding: '4px 8px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: '#ef4444',
                            fontWeight: '500'
                        }}>
                            So'nggi: {new Date(recentAlert.timestamp).toLocaleTimeString('uz-UZ')}
                        </div>
                    )}

                    <button
                        onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                        style={{
                            padding: '6px 8px',
                            fontSize: '12px',
                            background: autoRefreshEnabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                            border: autoRefreshEnabled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(156, 163, 175, 0.3)',
                            borderRadius: '6px',
                            color: autoRefreshEnabled ? '#22c55e' : '#9ca3af',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        title={autoRefreshEnabled ? 'Avtomatik tekshiruvni o\'chirish' : 'Avtomatik tekshiruvni yoqish'}
                    >
                        {autoRefreshEnabled ? '⏸️' : '▶️'}
                    </button>

                    <button
                        onClick={() => setIsCompact(!isCompact)}
                        style={{
                            padding: '6px 8px',
                            fontSize: '12px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            color: 'var(--text-color)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        title="Batafsil ko'rish"
                    >
                        📋
                    </button>
                    <button
                        onClick={() => checkSecurity(true)}
                        disabled={loading}
                        style={{
                            padding: '6px 8px',
                            fontSize: '12px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            color: 'var(--text-color)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        title="Qayta tekshirish"
                    >
                        🔄
                    </button>

                    <button
                        onClick={() => setIsVisible(false)}
                        style={{
                            padding: '6px 8px',
                            fontSize: '14px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            flexShrink: 0, // Tugma kichraymasin
                            fontWeight: 'bold'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(239, 68, 68, 0.15)';
                            e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                            e.target.style.transform = 'scale(1)';
                        }}
                        title="Webhook monitorni yashirish"
                    >
                        ✕
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="webhook-monitor glassmorphism-card" style={{
            padding: '20px',
            margin: '20px 0',
            border: webhookStatus?.safe === false ? '2px solid #ff4444' : '1px solid rgba(255,255,255,0.2)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🔐 Telegram Bot Xavfsizligi
                    {webhookStatus?.safe === true && <span style={{ color: '#4CAF50' }}>✅</span>}
                    {webhookStatus?.safe === false && <span style={{ color: '#ff4444' }}>⚠️</span>}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Auto-refresh toggle */}
                    <button 
                        onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                        style={{ 
                            padding: '6px 10px',
                            fontSize: '12px',
                            background: autoRefreshEnabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                            border: autoRefreshEnabled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(156, 163, 175, 0.3)',
                            borderRadius: '6px',
                            color: autoRefreshEnabled ? '#22c55e' : '#9ca3af',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        title={autoRefreshEnabled ? 'Avtomatik tekshiruvni o\'chirish' : 'Avtomatik tekshiruvni yoqish'}
                    >
                        {autoRefreshEnabled ? '⏸️ AUTO' : '▶️ MANUAL'}
                    </button>
                    
                    {/* Compact mode toggle */}
                    <button
                        onClick={() => setIsCompact(true)}
                        style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            background: 'rgba(106, 138, 255, 0.1)',
                            border: '1px solid rgba(106, 138, 255, 0.3)',
                            borderRadius: '6px',
                            color: '#6A8AFF',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        title="Compact rejimga o'tish"
                    >
                        📋 Compact
                    </button>

                    {/* Refresh button */}
                    <button
                        onClick={() => checkSecurity(true)} // Force check
                        disabled={loading}
                        className="glassmorphism-button"
                        style={{
                            padding: '8px 15px',
                            background: loading ? 'rgba(255,193,7,0.2)' : 'rgba(34,197,94,0.2)',
                            border: loading ? '1px solid rgba(255,193,7,0.3)' : '1px solid rgba(34,197,94,0.3)'
                        }}
                    >
                        {loading ? '⏳ Tekshirilmoqda...' : '🔄 Qayta tekshirish'}
                    </button>

                    {/* Close button */}
                    <button 
                        onClick={() => setIsVisible(false)}
                        style={{ 
                            padding: '8px 12px',
                            fontSize: '14px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontWeight: '600'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(239, 68, 68, 0.15)';
                            e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                            e.target.style.transform = 'scale(1)';
                        }}
                        title="Webhook monitorni yashirish"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Status indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                {lastCheck && (
                    <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                        So'nggi tekshiruv: {lastCheck}
                    </div>
                )}
                
                {/* Auto-refresh status */}
                <div style={{
                    padding: '4px 8px',
                    background: autoRefreshEnabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                    border: autoRefreshEnabled ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(156, 163, 175, 0.2)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: autoRefreshEnabled ? '#22c55e' : '#9ca3af',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: autoRefreshEnabled ? '#22c55e' : '#9ca3af',
                        animation: autoRefreshEnabled ? 'pulse 2s infinite' : 'none'
                    }}></div>
                    {autoRefreshEnabled ? 'Avtomatik tekshiruv faol' : 'Qo\'lda tekshiruv'}
                </div>
            </div>

            {/* Recent Security Alert */}
            {recentAlert && (
                <div style={{
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    border: '1px solid rgba(255, 68, 68, 0.3)',
                    borderRadius: '8px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#ff4444' }}>
                        🚨 So'nggi Xavfsizlik Hodisasi
                    </h4>
                    <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                        <strong>Vaqt:</strong> {new Date(recentAlert.timestamp).toLocaleString('uz-UZ')}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                        <strong>Webhook URL:</strong> {recentAlert.webhookUrl}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                        <strong>Holat:</strong> {recentAlert.deleted ? '✅ Muvaffaqiyatli o\'chirildi' : '❌ O\'chirishda xato'}
                    </p>
                    <button
                        onClick={() => {
                            localStorage.removeItem('webhookSecurityAlert');
                            setRecentAlert(null);
                        }}
                        style={{
                            marginTop: '10px',
                            padding: '5px 10px',
                            backgroundColor: 'transparent',
                            color: '#ff4444',
                            border: '1px solid #ff4444',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                        }}
                    >
                        Ogohlantirishni yopish
                    </button>
                </div>
            )}

            {/* Webhook Status */}
            <div className="status-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🔗 Webhook Holati:
                    {webhookStatus?.safe === true && <span style={{ fontSize: '0.8rem', padding: '2px 8px', backgroundColor: 'rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: '12px' }}>XAVFSIZ</span>}
                    {webhookStatus?.safe === false && <span style={{ fontSize: '0.8rem', padding: '2px 8px', backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '12px' }}>XAVFLI</span>}
                </h4>
                {webhookStatus === null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', backgroundColor: 'rgba(156,163,175,0.1)', borderRadius: '8px' }}>
                        <div className="loading-spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(156,163,175,0.3)', borderTop: '2px solid #9ca3af', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span>Yuklanmoqda...</span>
                    </div>
                ) : webhookStatus.safe ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '15px',
                        backgroundColor: 'rgba(34,197,94,0.1)',
                        border: '1px solid rgba(34,197,94,0.2)',
                        borderRadius: '8px',
                        color: '#22c55e'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                        <div>
                            <strong>Xavfsiz</strong>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>Webhook o'rnatilmagan</p>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        padding: '15px',
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '8px',
                        color: '#ef4444'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                            <div>
                                <strong>XAVFLI - Webhook topildi!</strong>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>Darhol choralar ko'rish kerak</p>
                            </div>
                        </div>
                        {webhookStatus.webhookUrl && (
                            <div style={{ marginTop: '15px', padding: '12px', backgroundColor: 'rgba(239,68,68,0.05)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.1)' }}>
                                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                                    <strong>Webhook URL:</strong>
                                    <code style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '3px', fontSize: '0.8rem' }}>
                                        {webhookStatus.webhookUrl}
                                    </code>
                                </p>
                                <button
                                    onClick={forceDeleteWebhook}
                                    disabled={loading}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: loading ? 'rgba(239,68,68,0.5)' : '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {loading ? '⏳' : '🗑️'} Webhook'ni o'chirish
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>

            {/* Bot Info */}
            <div className="bot-info-section">
                <h4 style={{ margin: '0 0 10px 0' }}>Bot Ma'lumotlari:</h4>
                {botInfo === null ? (
                    <p>Yuklanmoqda...</p>
                ) : botInfo.success ? (
                    <div style={{ fontSize: '0.9rem' }}>
                        <p><strong>Username:</strong> @{botInfo.botInfo.username}</p>
                        <p><strong>Ism:</strong> {botInfo.botInfo.first_name}</p>
                        <p><strong>ID:</strong> {botInfo.botInfo.id}</p>
                        <p><strong>Guruhga qo'shish:</strong> {botInfo.botInfo.can_join_groups ? '✅' : '❌'}</p>
                        <p><strong>Inline queries:</strong> {botInfo.botInfo.supports_inline_queries ? '✅' : '❌'}</p>
                    </div>
                ) : (
                    <div style={{ color: '#ff4444' }}>
                        ❌ Bot ma'lumotlarini olishda xato: {botInfo.error}
                    </div>
                )}
            </div>

            {/* Security Tips */}
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '5px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>💡 Xavfsizlik Maslahatlari:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem' }}>
                    <li>Webhook o'rnatilmaganligini muntazam tekshiring</li>
                    <li>Bot token'ini hech kimga bermang</li>
                    <li>Agar webhook topilsa, darhol o'chiring</li>
                    <li>Bot faqat kerakli chat'larga qo'shilganligini tekshiring</li>
                </ul>
            </div>
        </div>
    );
};

export default WebhookMonitor;