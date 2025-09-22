import React, { useState, useEffect } from 'react';

const SystemHealth = () => {
    const [systemStatus, setSystemStatus] = useState({
        firebase: { status: 'checking', responseTime: 0, lastCheck: null },
        cloudinary: { status: 'checking', responseTime: 0, lastCheck: null },
        telegram: { status: 'checking', responseTime: 0, lastCheck: null },
        database: { status: 'checking', responseTime: 0, lastCheck: null },
        website: { status: 'checking', responseTime: 0, lastCheck: null }
    });

    const [overallHealth, setOverallHealth] = useState('checking');
    const [uptime, setUptime] = useState({ days: 0, hours: 0, minutes: 0 });
    const [performanceMetrics, setPerformanceMetrics] = useState({
        avgResponseTime: 0,
        totalRequests: 0,
        errorRate: 0,
        uptime: 99.9
    });

    useEffect(() => {
        // Start monitoring when component mounts
        startHealthMonitoring();

        // Set up interval for regular health checks
        const interval = setInterval(() => {
            performHealthChecks();
        }, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, []);

    const startHealthMonitoring = () => {
        performHealthChecks();
        calculateUptime();
    };

    const performHealthChecks = async () => {
        const checks = [
            checkFirebaseHealth(),
            checkCloudinaryHealth(),
            checkTelegramHealth(),
            checkDatabaseHealth(),
            checkWebsiteHealth()
        ];

        try {
            const results = await Promise.allSettled(checks);

            const newStatus = {
                firebase: results[0].status === 'fulfilled' ? results[0].value : { status: 'error', responseTime: 0, lastCheck: new Date() },
                cloudinary: results[1].status === 'fulfilled' ? results[1].value : { status: 'error', responseTime: 0, lastCheck: new Date() },
                telegram: results[2].status === 'fulfilled' ? results[2].value : { status: 'error', responseTime: 0, lastCheck: new Date() },
                database: results[3].status === 'fulfilled' ? results[3].value : { status: 'error', responseTime: 0, lastCheck: new Date() },
                website: results[4].status === 'fulfilled' ? results[4].value : { status: 'error', responseTime: 0, lastCheck: new Date() }
            };

            setSystemStatus(newStatus);
            calculateOverallHealth(newStatus);
            updatePerformanceMetrics(newStatus);
        } catch (error) {
            console.error('Health check error:', error);
        }
    };

    const checkFirebaseHealth = async () => {
        const startTime = Date.now();
        try {
            // Simple Firebase connectivity check
            const { db } = await import('../../../../firebaseConfig');
            const { doc, getDoc } = await import('firebase/firestore');

            // Try to read a simple document
            const testDoc = doc(db, 'health', 'test');
            await getDoc(testDoc);

            const responseTime = Date.now() - startTime;
            return {
                status: 'healthy',
                responseTime,
                lastCheck: new Date(),
                details: 'Firebase connection successful'
            };
        } catch (error) {
            return {
                status: 'error',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                details: `Firebase error: ${error.message}`
            };
        }
    };

    const checkCloudinaryHealth = async () => {
        const startTime = Date.now();
        try {
            // Check Cloudinary by trying to access a test image
            const testImageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
            const response = await fetch(testImageUrl, { method: 'HEAD' });

            const responseTime = Date.now() - startTime;
            return {
                status: response.ok ? 'healthy' : 'warning',
                responseTime,
                lastCheck: new Date(),
                details: response.ok ? 'Cloudinary accessible' : 'Cloudinary slow response'
            };
        } catch (error) {
            return {
                status: 'error',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                details: `Cloudinary error: ${error.message}`
            };
        }
    };

    const checkTelegramHealth = async () => {
        const startTime = Date.now();
        try {
            // Check Telegram Bot API
            const botToken = process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
            if (!botToken) {
                return {
                    status: 'warning',
                    responseTime: 0,
                    lastCheck: new Date(),
                    details: 'Telegram bot token not configured'
                };
            }

            const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
            const data = await response.json();

            const responseTime = Date.now() - startTime;
            return {
                status: data.ok ? 'healthy' : 'error',
                responseTime,
                lastCheck: new Date(),
                details: data.ok ? `Bot: ${data.result.first_name}` : 'Telegram bot error'
            };
        } catch (error) {
            return {
                status: 'error',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                details: `Telegram error: ${error.message}`
            };
        }
    };

    const checkDatabaseHealth = async () => {
        const startTime = Date.now();
        try {
            // Check database performance with a simple query
            const { db, COLLECTIONS } = await import('../../../../firebaseConfig');
            const { collection, query, limit, getDocs } = await import('firebase/firestore');

            const testQuery = query(collection(db, COLLECTIONS.BOOKS), limit(1));
            await getDocs(testQuery);

            const responseTime = Date.now() - startTime;
            return {
                status: responseTime < 1000 ? 'healthy' : 'warning',
                responseTime,
                lastCheck: new Date(),
                details: `Database query: ${responseTime}ms`
            };
        } catch (error) {
            return {
                status: 'error',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                details: `Database error: ${error.message}`
            };
        }
    };

    const checkWebsiteHealth = async () => {
        const startTime = Date.now();
        try {
            // Check website performance
            const performance = window.performance;
            const navigation = performance.getEntriesByType('navigation')[0];

            const loadTime = navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;
            const responseTime = Date.now() - startTime;

            return {
                status: loadTime < 3000 ? 'healthy' : 'warning',
                responseTime: loadTime || responseTime,
                lastCheck: new Date(),
                details: `Page load: ${loadTime}ms`
            };
        } catch (error) {
            return {
                status: 'error',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                details: `Website error: ${error.message}`
            };
        }
    };

    const calculateOverallHealth = (status) => {
        const services = Object.values(status);
        const healthyCount = services.filter(s => s.status === 'healthy').length;
        const warningCount = services.filter(s => s.status === 'warning').length;
        const errorCount = services.filter(s => s.status === 'error').length;

        if (errorCount > 0) {
            setOverallHealth('critical');
        } else if (warningCount > 0) {
            setOverallHealth('warning');
        } else if (healthyCount === services.length) {
            setOverallHealth('healthy');
        } else {
            setOverallHealth('checking');
        }
    };

    const updatePerformanceMetrics = (status) => {
        const services = Object.values(status);
        const responseTimes = services.map(s => s.responseTime).filter(t => t > 0);
        const avgResponseTime = responseTimes.length > 0 ?
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

        const healthyServices = services.filter(s => s.status === 'healthy').length;
        const totalServices = services.length;
        const uptime = (healthyServices / totalServices) * 100;

        setPerformanceMetrics(prev => ({
            ...prev,
            avgResponseTime: Math.round(avgResponseTime),
            uptime: uptime.toFixed(1),
            totalRequests: prev.totalRequests + 1,
            errorRate: ((totalServices - healthyServices) / totalServices * 100).toFixed(1)
        }));
    };

    const calculateUptime = () => {
        // Mock uptime calculation (in real app, this would be stored and calculated)
        const startTime = new Date('2024-01-01'); // Mock start time
        const now = new Date();
        const diffTime = Math.abs(now - startTime);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

        setUptime({ days: diffDays, hours: diffHours, minutes: diffMinutes });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return '#10b981';
            case 'warning': return '#f59e0b';
            case 'error': return '#ef4444';
            case 'checking': return '#6b7280';
            default: return '#6b7280';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy': return 'fas fa-check-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            case 'error': return 'fas fa-times-circle';
            case 'checking': return 'fas fa-spinner fa-spin';
            default: return 'fas fa-question-circle';
        }
    };

    const getOverallStatusText = (status) => {
        switch (status) {
            case 'healthy': return 'Barcha tizimlar ishlayapti';
            case 'warning': return 'Ba\'zi tizimlar sekin ishlayapti';
            case 'critical': return 'Tizimda muammolar mavjud';
            case 'checking': return 'Tizim holati tekshirilmoqda';
            default: return 'Noma\'lum holat';
        }
    };

    return (
        <div className="system-health">
            {/* Header */}
            <div className="health-header">
                <div className="header-info">
                    <h2>
                        <i className="fas fa-heartbeat"></i>
                        Tizim Sog'ligi
                    </h2>
                    <p>Real-time system monitoring va performance metrics</p>
                </div>

                <div className="refresh-controls">
                    <button
                        className="refresh-btn"
                        onClick={performHealthChecks}
                    >
                        <i className="fas fa-sync"></i>
                        Yangilash
                    </button>
                </div>
            </div>

            {/* Overall Status */}
            <div className={`overall-status ${overallHealth}`}>
                <div className="status-icon">
                    <i className={getStatusIcon(overallHealth)} style={{ color: getStatusColor(overallHealth) }}></i>
                </div>
                <div className="status-content">
                    <h3>Umumiy Holat</h3>
                    <p>{getOverallStatusText(overallHealth)}</p>
                    <div className="status-details">
                        <span>Oxirgi tekshiruv: {new Date().toLocaleTimeString('uz-UZ')}</span>
                    </div>
                </div>
            </div>

            {/* System Uptime */}
            <div className="system-uptime">
                <div className="uptime-card">
                    <div className="uptime-icon">
                        <i className="fas fa-clock"></i>
                    </div>
                    <div className="uptime-content">
                        <h3>System Uptime</h3>
                        <div className="uptime-display">
                            <span className="uptime-number">{uptime.days}</span>
                            <span className="uptime-label">kun</span>
                            <span className="uptime-number">{uptime.hours}</span>
                            <span className="uptime-label">soat</span>
                            <span className="uptime-number">{uptime.minutes}</span>
                            <span className="uptime-label">daqiqa</span>
                        </div>
                    </div>
                </div>

                <div className="performance-summary">
                    <div className="perf-item">
                        <span className="perf-label">O'rtacha javob vaqti:</span>
                        <span className="perf-value">{performanceMetrics.avgResponseTime}ms</span>
                    </div>
                    <div className="perf-item">
                        <span className="perf-label">Uptime:</span>
                        <span className="perf-value">{performanceMetrics.uptime}%</span>
                    </div>
                    <div className="perf-item">
                        <span className="perf-label">Xato darajasi:</span>
                        <span className="perf-value">{performanceMetrics.errorRate}%</span>
                    </div>
                </div>
            </div>

            {/* Service Status Cards */}
            <div className="services-status">
                <h3>Xizmatlar Holati</h3>

                <div className="services-grid">
                    {Object.entries(systemStatus).map(([serviceName, service]) => (
                        <div key={serviceName} className={`service-card ${service.status}`}>
                            <div className="service-header">
                                <div className="service-info">
                                    <h4>
                                        {serviceName === 'firebase' && 'Firebase Database'}
                                        {serviceName === 'cloudinary' && 'Cloudinary CDN'}
                                        {serviceName === 'telegram' && 'Telegram Bot'}
                                        {serviceName === 'database' && 'Database Query'}
                                        {serviceName === 'website' && 'Website Performance'}
                                    </h4>
                                    <div className="service-status">
                                        <i
                                            className={getStatusIcon(service.status)}
                                            style={{ color: getStatusColor(service.status) }}
                                        ></i>
                                        <span style={{ color: getStatusColor(service.status) }}>
                                            {service.status === 'healthy' && 'Sog\'lom'}
                                            {service.status === 'warning' && 'Ogohlantirish'}
                                            {service.status === 'error' && 'Xato'}
                                            {service.status === 'checking' && 'Tekshirilmoqda'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="service-metrics">
                                <div className="metric">
                                    <span className="metric-label">Javob vaqti:</span>
                                    <span className="metric-value">{service.responseTime}ms</span>
                                </div>
                                <div className="metric">
                                    <span className="metric-label">Oxirgi tekshiruv:</span>
                                    <span className="metric-value">
                                        {service.lastCheck ?
                                            service.lastCheck.toLocaleTimeString('uz-UZ') :
                                            'Hali yo\'q'
                                        }
                                    </span>
                                </div>
                            </div>

                            {service.details && (
                                <div className="service-details">
                                    <small>{service.details}</small>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="performance-metrics">
                <h3>Performance Ko'rsatkichlari</h3>

                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-icon">
                            <i className="fas fa-tachometer-alt"></i>
                        </div>
                        <div className="metric-content">
                            <h4>{performanceMetrics.avgResponseTime}ms</h4>
                            <p>O'rtacha Javob Vaqti</p>
                            <div className={`metric-status ${performanceMetrics.avgResponseTime < 500 ? 'good' : performanceMetrics.avgResponseTime < 1000 ? 'warning' : 'poor'}`}>
                                {performanceMetrics.avgResponseTime < 500 ? 'Yaxshi' :
                                    performanceMetrics.avgResponseTime < 1000 ? 'O\'rtacha' : 'Sekin'}
                            </div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">
                            <i className="fas fa-chart-line"></i>
                        </div>
                        <div className="metric-content">
                            <h4>{performanceMetrics.uptime}%</h4>
                            <p>Tizim Uptime</p>
                            <div className={`metric-status ${parseFloat(performanceMetrics.uptime) > 99 ? 'good' : parseFloat(performanceMetrics.uptime) > 95 ? 'warning' : 'poor'}`}>
                                {parseFloat(performanceMetrics.uptime) > 99 ? 'A\'lo' :
                                    parseFloat(performanceMetrics.uptime) > 95 ? 'Yaxshi' : 'Yomon'}
                            </div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <div className="metric-content">
                            <h4>{performanceMetrics.errorRate}%</h4>
                            <p>Xato Darajasi</p>
                            <div className={`metric-status ${parseFloat(performanceMetrics.errorRate) < 1 ? 'good' : parseFloat(performanceMetrics.errorRate) < 5 ? 'warning' : 'poor'}`}>
                                {parseFloat(performanceMetrics.errorRate) < 1 ? 'Past' :
                                    parseFloat(performanceMetrics.errorRate) < 5 ? 'O\'rtacha' : 'Yuqori'}
                            </div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">
                            <i className="fas fa-server"></i>
                        </div>
                        <div className="metric-content">
                            <h4>{performanceMetrics.totalRequests}</h4>
                            <p>Jami So'rovlar</p>
                            <div className="metric-status good">
                                Bu sessiyada
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemHealth;