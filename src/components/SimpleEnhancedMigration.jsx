import React, { useState } from 'react';
import { migrationService } from '../utils/migration';
import { seedFirebaseData } from '../utils/firebaseSeed';
import { toast } from '../utils/toastUtils';

function SimpleEnhancedMigration() {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(null);
    const [result, setResult] = useState(null);

    const setupFirebaseData = async () => {
        try {
            setLoading(true);
            setProgress({ message: 'Firebase setup boshlandi...', percent: 0 });
            
            console.log('🔥 Firebase setup boshlandi...');
            
            // Check current status
            const status = await migrationService.checkMigrationStatus();
            setProgress({ message: 'Database holati tekshirilmoqda...', percent: 20 });
            
            if (!status.isEmpty) {
                setProgress({ 
                    message: `Ma'lumotlar mavjud: ${status.books} kitob, ${status.authors} muallif, ${status.genres} janr`, 
                    percent: 100 
                });
                setResult({
                    success: true,
                    message: 'Ma\'lumotlar allaqachon mavjud',
                    data: status
                });
                return;
            }
            
            setProgress({ message: 'Sample data yaratilmoqda...', percent: 50 });
            
            // Create sample data
            const setupResult = await migrationService.setupFirebaseData();
            
            setProgress({ message: 'Setup tugallandi!', percent: 100 });
            
            setResult({
                success: true,
                message: 'Firebase setup muvaffaqiyatli tugallandi!',
                data: setupResult
            });
            
            toast.success('🎉 Firebase setup tugallandi!');
            
        } catch (error) {
            console.error('Firebase setup xatosi:', error);
            setResult({
                success: false,
                message: 'Setup xatosi: ' + error.message,
                error: error
            });
            toast.error('❌ Setup xatosi: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const checkDatabaseStatus = async () => {
        try {
            setLoading(true);
            setProgress({ message: 'Database holati tekshirilmoqda...', percent: 50 });
            
            const status = await migrationService.checkMigrationStatus();
            
            setProgress({ message: 'Tekshiruv tugallandi', percent: 100 });
            setResult({
                success: true,
                message: 'Database holati',
                data: status
            });
            
        } catch (error) {
            console.error('Status check xatosi:', error);
            setResult({
                success: false,
                message: 'Status check xatosi: ' + error.message,
                error: error
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            padding: '2rem', 
            maxWidth: '800px', 
            margin: '0 auto',
            background: 'var(--glass-bg-light)',
            borderRadius: '1rem',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(10px)'
        }}>
            <h1 style={{ 
                color: 'var(--text-color)', 
                textAlign: 'center',
                marginBottom: '2rem',
                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
            }}>
                Firebase Database Setup
            </h1>
            
            {/* Firebase Status */}
            <div style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem', 
                background: 'var(--glass-bg-light)', 
                borderRadius: '0.75rem',
                border: '1px solid var(--glass-border)'
            }}>
                <h3 style={{ color: 'var(--text-color)', marginBottom: '1rem' }}>Firebase Status:</h3>
                <p style={{ color: 'var(--text-color)' }}>
                    🔥 Firebase: ✅ Configured
                </p>
                <p style={{ color: 'var(--text-color)' }}>
                    📊 Firestore: ✅ Ready
                </p>
                <p style={{ color: 'var(--text-color)' }}>
                    🔐 Auth: ✅ Ready
                </p>
            </div>

            {/* Action Buttons */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <button
                    onClick={setupFirebaseData}
                    disabled={loading}
                    style={{
                        padding: '1rem 2rem',
                        fontSize: '1.1rem',
                        background: loading 
                            ? 'var(--secondary-color)' 
                            : 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {loading ? '⏳ Jarayon...' : '🚀 Firebase Setup'}
                </button>

                <button
                    onClick={checkDatabaseStatus}
                    disabled={loading}
                    style={{
                        padding: '1rem 2rem',
                        fontSize: '1.1rem',
                        background: loading 
                            ? 'var(--secondary-color)' 
                            : 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {loading ? '⏳ Tekshirilmoqda...' : '📊 Status Tekshirish'}
                </button>
            </div>

            {/* Progress */}
            {progress && (
                <div style={{ 
                    marginBottom: '2rem', 
                    padding: '1.5rem', 
                    background: 'var(--glass-bg-light)', 
                    borderRadius: '0.75rem',
                    border: '1px solid var(--glass-border)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '1rem',
                        color: 'var(--text-color)'
                    }}>
                        <span>🚀 Jarayon: {progress.message}</span>
                        <span>📊 {progress.percent}%</span>
                    </div>
                    <div style={{ 
                        width: '100%', 
                        height: '12px', 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        borderRadius: '6px', 
                        overflow: 'hidden',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <div style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--primary-color), var(--accent-color))',
                            borderRadius: '6px',
                            width: `${progress.percent || 0}%`,
                            transition: 'width 0.3s ease'
                        }}></div>
                    </div>
                </div>
            )}

            {/* Result */}
            {result && (
                <div style={{ 
                    padding: '1.5rem', 
                    background: result.success 
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))' 
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))', 
                    borderRadius: '0.75rem',
                    border: `1px solid ${result.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                    <h3 style={{ 
                        color: result.success ? '#10b981' : '#ef4444',
                        marginBottom: '1rem'
                    }}>
                        {result.success ? '✅ Setup Muvaffaqiyatli!' : '❌ Setup Xatosi'}
                    </h3>
                    <p style={{ color: 'var(--text-color)', marginBottom: '1rem' }}>
                        {result.message}
                    </p>
                    {result.data && (
                        <div style={{ color: 'var(--text-color)' }}>
                            {result.data.books !== undefined && <p>📚 Kitoblar: <strong>{result.data.books}</strong></p>}
                            {result.data.authors !== undefined && <p>👥 Mualliflar: <strong>{result.data.authors}</strong></p>}
                            {result.data.genres !== undefined && <p>🏷️ Janrlar: <strong>{result.data.genres}</strong></p>}
                            {result.data.total !== undefined && <p>📊 Jami: <strong>{result.data.total}</strong></p>}
                        </div>
                    )}
                </div>
            )}

            {/* Instructions */}
            <div style={{ 
                marginTop: '2rem', 
                padding: '1.5rem', 
                background: 'var(--glass-bg-light)', 
                borderRadius: '0.75rem',
                border: '1px solid var(--glass-border)'
            }}>
                <h4 style={{ 
                    color: 'var(--text-color)', 
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <i className="fas fa-info-circle" style={{ color: 'var(--primary-color)' }}></i>
                    Ko'rsatmalar:
                </h4>
                <ol style={{ color: 'var(--text-color)', lineHeight: '1.6' }}>
                    <li>Firebase loyihangiz sozlangan bo'lishi kerak</li>
                    <li>Firebase konfiguratsiyasi .env faylida bo'lishi kerak</li>
                    <li>"Firebase Setup" tugmasini bosing</li>
                    <li>Sample ma'lumotlar avtomatik yaratiladi</li>
                    <li>Admin panel orqali kitoblar qo'shishingiz mumkin</li>
                </ol>
                <div style={{ 
                    marginTop: '1rem', 
                    padding: '1rem', 
                    background: 'rgba(106, 138, 255, 0.1)', 
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(106, 138, 255, 0.2)'
                }}>
                    <p style={{ color: 'var(--text-color)', margin: 0 }}>
                        💡 <strong>Maslahat:</strong> Agar ma'lumotlar allaqachon mavjud bo'lsa, 
                        "Status Tekshirish" tugmasini bosib holatni ko'ring.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default SimpleEnhancedMigration;