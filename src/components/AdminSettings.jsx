import React, { useState, useEffect } from 'react';
import { databases, ID } from '../appwriteConfig';
import { uploadToCloudinary } from '../config/cloudinaryConfig';
import siteConfig from '../config/siteConfig';
import SystemStatus from './SystemStatus';
import '../index.css';
import '../styles/admin.css';

// Appwrite konsolidan olingan ID'lar
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const SETTINGS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_SETTINGS_ID;

function AdminSettings() {
    const [settings, setSettings] = useState({
        siteName: 'Zamon Books',
        siteDescription: 'Online kitoblar do\'koni',
        contactEmail: 'info@zamonbooks.uz',
        contactPhone: '+998 90 123 45 67',
        address: 'Toshkent shahri, Chilonzor tumani',
        facebookUrl: 'https://facebook.com/zamonbooks',
        instagramUrl: 'https://instagram.com/zamonbooks',
        telegramUrl: 'https://t.me/zamonbooks',
        logoFile: null,
        logoUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1752356041/favicon_maovuy.svg',
        faviconFile: null,
        faviconUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1752356041/favicon_maovuy.svg',
        heroImage: null,
        heroImageUrl: '',
        primaryColor: '#6a8aff',
        accentColor: '#8bff6a',
        shippingCost: 15000,
        freeShippingThreshold: 200000
    });
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [settingsId, setSettingsId] = useState(null);
    
    // Fetch settings
    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    SETTINGS_COLLECTION_ID
                );
                
                if (response.documents.length > 0) {
                    const settingsData = response.documents[0];
                    setSettingsId(settingsData.$id);
                    setSettings({
                        siteName: settingsData.siteName || 'Zamon Books',
                        siteDescription: settingsData.siteDescription || 'Online kitoblar do\'koni',
                        contactEmail: settingsData.contactEmail || 'info@zamonbooks.uz',
                        contactPhone: settingsData.contactPhone || '+998 90 123 45 67',
                        address: settingsData.address || 'Toshkent shahri, Chilonzor tumani',
                        facebookUrl: settingsData.facebookUrl || 'https://facebook.com/zamonbooks',
                        instagramUrl: settingsData.instagramUrl || 'https://instagram.com/zamonbooks',
                        telegramUrl: settingsData.telegramUrl || 'https://t.me/zamonbooks',
                        logoFile: null,
                        logoUrl: settingsData.logoUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1752356041/favicon_maovuy.svg',
                        faviconFile: null,
                        faviconUrl: settingsData.faviconUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1752356041/favicon_maovuy.svg',
                        heroImage: null,
                        heroImageUrl: settingsData.heroImageUrl || '',
                        primaryColor: settingsData.primaryColor || '#6a8aff',
                        accentColor: settingsData.accentColor || '#8bff6a',
                        shippingCost: settingsData.shippingCost || 15000,
                        freeShippingThreshold: settingsData.freeShippingThreshold || 200000
                    });
                }
                
                setLoading(false);
            } catch (err) {
                console.error("Sozlamalarni yuklashda xato:", err);
                setError(err.message || "Sozlamalarni yuklashda noma'lum xato yuz berdi.");
                setLoading(false);
            }
        };
        
        fetchSettings();
    }, []);

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value, type, files } = e.target;
        
        if (type === 'file') {
            setSettings({
                ...settings,
                [name]: files[0]
            });
        } else if (type === 'number') {
            setSettings({
                ...settings,
                [name]: parseFloat(value)
            });
        } else {
            setSettings({
                ...settings,
                [name]: value
            });
        }
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        setSaving(true);
        setError(null);
        setSuccess(false);
        
        try {
            let logoUrl = settings.logoUrl;
            let faviconUrl = settings.faviconUrl;
            let heroImageUrl = settings.heroImageUrl;
            
            // Upload logo to Cloudinary if provided
            if (settings.logoFile) {
                const uploadResult = await uploadToCloudinary(settings.logoFile, 'settings/logos');
                logoUrl = uploadResult.url;
            }
            
            // Upload favicon to Cloudinary if provided
            if (settings.faviconFile) {
                const uploadResult = await uploadToCloudinary(settings.faviconFile, 'settings/favicons');
                faviconUrl = uploadResult.url;
            }
            
            // Upload hero image to Cloudinary if provided
            if (settings.heroImage) {
                const uploadResult = await uploadToCloudinary(settings.heroImage, 'settings/hero');
                heroImageUrl = uploadResult.url;
            }
            
            const settingsData = {
                siteName: settings.siteName,
                siteDescription: settings.siteDescription,
                contactEmail: settings.contactEmail,
                contactPhone: settings.contactPhone,
                address: settings.address,
                facebookUrl: settings.facebookUrl,
                instagramUrl: settings.instagramUrl,
                telegramUrl: settings.telegramUrl,
                logoUrl: logoUrl,
                faviconUrl: faviconUrl,
                heroImageUrl: heroImageUrl,
                primaryColor: settings.primaryColor,
                accentColor: settings.accentColor,
                shippingCost: settings.shippingCost,
                freeShippingThreshold: settings.freeShippingThreshold
            };
            
            if (settingsId) {
                // Update existing settings
                await databases.updateDocument(
                    DATABASE_ID,
                    SETTINGS_COLLECTION_ID,
                    settingsId,
                    settingsData
                );
            } else {
                // Create new settings
                const response = await databases.createDocument(
                    DATABASE_ID,
                    SETTINGS_COLLECTION_ID,
                    ID.unique(),
                    settingsData
                );
                
                setSettingsId(response.$id);
            }
            
            setSuccess(true);
            setSaving(false);
            
            // Reset file inputs
            setSettings(prev => ({
                ...prev,
                logoFile: null,
                faviconFile: null,
                heroImage: null,
                logoUrl: logoUrl,
                faviconUrl: faviconUrl,
                heroImageUrl: heroImageUrl
            }));
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                setSuccess(false);
            }, 3000);
            
        } catch (err) {
            console.error("Sozlamalarni saqlashda xato:", err);
            setError(err.message || "Sozlamalarni saqlashda noma'lum xato yuz berdi.");
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="admin-loading">Yuklanmoqda...</div>;
    }

    return (
        <div className="admin-settings" style={{ marginTop: `${siteConfig.layout.contentSpacing}px` }}>
            {/* System Status */}
            <SystemStatus />
            
            <div className="admin-card">
                <div className="card-header">
                    <h3>Sayt sozlamalari</h3>
                </div>
                
                <div className="card-content">
                    {error && (
                        <div className="admin-error">
                            <i className="fas fa-exclamation-circle"></i> {error}
                        </div>
                    )}
                    
                    {success && (
                        <div className="admin-success">
                            <i className="fas fa-check-circle"></i> Sozlamalar muvaffaqiyatli saqlandi!
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="admin-form settings-form">
                        <div className="settings-section">
                            <h4>Asosiy ma'lumotlar</h4>
                            
                            <div className="form-group">
                                <label htmlFor="siteName">Sayt nomi</label>
                                <input
                                    type="text"
                                    id="siteName"
                                    name="siteName"
                                    value={settings.siteName}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="siteDescription">Sayt tavsifi</label>
                                <textarea
                                    id="siteDescription"
                                    name="siteDescription"
                                    value={settings.siteDescription}
                                    onChange={handleInputChange}
                                    rows="3"
                                ></textarea>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="logoFile">Logotip</label>
                                    <div className="image-upload-container">
                                        {settings.logoUrl && (
                                            <div className="image-preview logo-preview">
                                                <img
                                                    src={settings.logoFile 
                                                        ? URL.createObjectURL(settings.logoFile) 
                                                        : settings.logoUrl}
                                                    alt="Logotip"
                                                />
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            id="logoFile"
                                            name="logoFile"
                                            onChange={handleInputChange}
                                            accept="image/*"
                                        />
                                        <label htmlFor="logoFile" className="file-upload-btn">
                                            <i className="fas fa-upload"></i> Logotip tanlash
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="faviconFile">Favicon</label>
                                    <div className="image-upload-container">
                                        {settings.faviconUrl && (
                                            <div className="image-preview favicon-preview">
                                                <img
                                                    src={settings.faviconFile 
                                                        ? URL.createObjectURL(settings.faviconFile) 
                                                        : settings.faviconUrl}
                                                    alt="Favicon"
                                                />
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            id="faviconFile"
                                            name="faviconFile"
                                            onChange={handleInputChange}
                                            accept="image/*"
                                        />
                                        <label htmlFor="faviconFile" className="file-upload-btn">
                                            <i className="fas fa-upload"></i> Favicon tanlash
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="heroImage">Bosh sahifa banner rasmi</label>
                                <div className="image-upload-container">
                                    {(settings.heroImageUrl || settings.heroImage) && (
                                        <div className="image-preview hero-preview">
                                            <img
                                                src={settings.heroImage 
                                                    ? URL.createObjectURL(settings.heroImage) 
                                                    : settings.heroImageUrl}
                                                alt="Banner rasmi"
                                            />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        id="heroImage"
                                        name="heroImage"
                                        onChange={handleInputChange}
                                        accept="image/*"
                                    />
                                    <label htmlFor="heroImage" className="file-upload-btn">
                                        <i className="fas fa-upload"></i> Banner rasmi tanlash
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="settings-section">
                            <h4>Aloqa ma'lumotlari</h4>
                            
                            <div className="form-group">
                                <label htmlFor="contactEmail">Email</label>
                                <input
                                    type="email"
                                    id="contactEmail"
                                    name="contactEmail"
                                    value={settings.contactEmail}
                                    onChange={handleInputChange}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="contactPhone">Telefon</label>
                                <input
                                    type="text"
                                    id="contactPhone"
                                    name="contactPhone"
                                    value={settings.contactPhone}
                                    onChange={handleInputChange}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="address">Manzil</label>
                                <textarea
                                    id="address"
                                    name="address"
                                    value={settings.address}
                                    onChange={handleInputChange}
                                    rows="2"
                                ></textarea>
                            </div>
                        </div>
                        
                        <div className="settings-section">
                            <h4>Ijtimoiy tarmoqlar</h4>
                            
                            <div className="form-group">
                                <label htmlFor="facebookUrl">Facebook URL</label>
                                <input
                                    type="url"
                                    id="facebookUrl"
                                    name="facebookUrl"
                                    value={settings.facebookUrl}
                                    onChange={handleInputChange}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="instagramUrl">Instagram URL</label>
                                <input
                                    type="url"
                                    id="instagramUrl"
                                    name="instagramUrl"
                                    value={settings.instagramUrl}
                                    onChange={handleInputChange}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="telegramUrl">Telegram URL</label>
                                <input
                                    type="url"
                                    id="telegramUrl"
                                    name="telegramUrl"
                                    value={settings.telegramUrl}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                        
                        <div className="settings-section">
                            <h4>Dizayn sozlamalari</h4>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="primaryColor">Asosiy rang</label>
                                    <div className="color-picker-container">
                                        <input
                                            type="color"
                                            id="primaryColor"
                                            name="primaryColor"
                                            value={settings.primaryColor}
                                            onChange={handleInputChange}
                                            className="color-picker"
                                        />
                                        <span className="color-value">{settings.primaryColor}</span>
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="accentColor">Qo'shimcha rang</label>
                                    <div className="color-picker-container">
                                        <input
                                            type="color"
                                            id="accentColor"
                                            name="accentColor"
                                            value={settings.accentColor}
                                            onChange={handleInputChange}
                                            className="color-picker"
                                        />
                                        <span className="color-value">{settings.accentColor}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="settings-section">
                            <h4>Yetkazib berish sozlamalari</h4>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="shippingCost">Yetkazib berish narxi (so'm)</label>
                                    <input
                                        type="number"
                                        id="shippingCost"
                                        name="shippingCost"
                                        value={settings.shippingCost}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="1000"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="freeShippingThreshold">Bepul yetkazib berish chegarasi (so'm)</label>
                                    <input
                                        type="number"
                                        id="freeShippingThreshold"
                                        name="freeShippingThreshold"
                                        value={settings.freeShippingThreshold}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="10000"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="form-actions">
                            <button type="submit" className="submit-btn" disabled={saving}>
                                {saving ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i> Saqlanmoqda...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-save"></i> Saqlash
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdminSettings;