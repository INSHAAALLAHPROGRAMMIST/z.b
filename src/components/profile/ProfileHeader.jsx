import React, { memo } from 'react';

const ProfileHeader = memo(({ authUser, dbUser, isAdmin }) => {
    return (
        <div className="profile-header glassmorphism-card" style={{
            padding: '30px',
            marginBottom: '30px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(106, 138, 255, 0.1), rgba(139, 255, 106, 0.1))',
            border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
            <div className="profile-avatar" style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '2.5rem',
                color: 'white',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                <i className="fas fa-user"></i>
            </div>

            <h1 style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                marginBottom: '10px',
                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
            }}>
                {dbUser?.fullName || authUser?.name || 'Foydalanuvchi'}
            </h1>

            <p style={{
                fontSize: '1.1rem',
                opacity: '0.8',
                marginBottom: '15px'
            }}>
                {authUser?.email}
            </p>

            {isAdmin && (
                <div className="admin-badge" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}>
                    <i className="fas fa-crown"></i>
                    Administrator
                </div>
            )}
        </div>
    );
});

ProfileHeader.displayName = 'ProfileHeader';

export default ProfileHeader;