import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../../firebaseConfig';

const SEOMonitoring = () => {
  const [seoMetrics, setSeoMetrics] = useState({
    overallScore: 0,
    totalPages: 0,
    optimizedPages: 0,
    issuesCount: 0,
    keywordRankings: [],
    trafficData: [],
    topPerformingPages: [],
    seoIssues: []
  });
  
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month'); // week, month, quarter
  const [selectedMetric, setSelectedMetric] = useState('traffic'); // traffic, rankings, issues

  useEffect(() => {
    loadSEOData();
  }, [timeRange]);

  const loadSEOData = async () => {
    try {
      setLoading(true);
      
      // Load books for SEO analysis
      const booksSnapshot = await getDocs(collection(db, COLLECTIONS.BOOKS));
      const books = booksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Analyze SEO metrics
      const metrics = analyzeSEOMetrics(books);
      
      // Generate mock traffic data (in real app, this would come from Google Analytics API)
      const trafficData = generateMockTrafficData(timeRange);
      
      // Generate mock keyword rankings
      const keywordRankings = generateMockKeywordRankings(books);
      
      setSeoMetrics({
        ...metrics,
        trafficData,
        keywordRankings
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading SEO data:', error);
      setLoading(false);
    }
  };

  const analyzeSEOMetrics = (books) => {
    let totalScore = 0;
    let optimizedPages = 0;
    const seoIssues = [];
    const topPerformingPages = [];

    books.forEach(book => {
      const bookScore = calculateBookSEOScore(book);
      totalScore += bookScore.score;
      
      if (bookScore.score >= 80) {
        optimizedPages++;
        topPerformingPages.push({
          title: book.title,
          score: bookScore.score,
          traffic: Math.floor(Math.random() * 1000) + 100, // Mock traffic
          keywords: book.keywords?.length || 0
        });
      }
      
      // Collect SEO issues
      bookScore.issues.forEach(issue => {
        seoIssues.push({
          page: book.title,
          issue: issue.type,
          severity: issue.severity,
          description: issue.description
        });
      });
    });

    const overallScore = books.length > 0 ? Math.round(totalScore / books.length) : 0;
    
    return {
      overallScore,
      totalPages: books.length,
      optimizedPages,
      issuesCount: seoIssues.length,
      topPerformingPages: topPerformingPages.sort((a, b) => b.score - a.score).slice(0, 10),
      seoIssues: seoIssues.slice(0, 20)
    };
  };

  const calculateBookSEOScore = (book) => {
    let score = 100;
    const issues = [];

    // Check meta title
    if (!book.metaTitle) {
      score -= 20;
      issues.push({
        type: 'missing_meta_title',
        severity: 'high',
        description: 'Meta title yo\'q'
      });
    } else if (book.metaTitle.length > 60) {
      score -= 10;
      issues.push({
        type: 'long_meta_title',
        severity: 'medium',
        description: 'Meta title juda uzun'
      });
    }

    // Check meta description
    if (!book.metaDescription) {
      score -= 15;
      issues.push({
        type: 'missing_meta_description',
        severity: 'high',
        description: 'Meta description yo\'q'
      });
    } else if (book.metaDescription.length > 160) {
      score -= 8;
      issues.push({
        type: 'long_meta_description',
        severity: 'medium',
        description: 'Meta description juda uzun'
      });
    }

    // Check keywords
    if (!book.keywords || book.keywords.length === 0) {
      score -= 15;
      issues.push({
        type: 'missing_keywords',
        severity: 'medium',
        description: 'Kalit so\'zlar yo\'q'
      });
    }

    // Check images
    if (!book.altText) {
      score -= 10;
      issues.push({
        type: 'missing_alt_text',
        severity: 'medium',
        description: 'Alt text yo\'q'
      });
    }

    // Check URL
    if (!book.slug) {
      score -= 10;
      issues.push({
        type: 'missing_slug',
        severity: 'low',
        description: 'URL slug yo\'q'
      });
    }

    return {
      score: Math.max(0, score),
      issues
    };
  };

  const generateMockTrafficData = (timeRange) => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        organicTraffic: Math.floor(Math.random() * 500) + 200,
        clicks: Math.floor(Math.random() * 300) + 100,
        impressions: Math.floor(Math.random() * 2000) + 1000,
        ctr: (Math.random() * 5 + 2).toFixed(2)
      });
    }
    
    return data;
  };

  const generateMockKeywordRankings = (books) => {
    const keywords = [];
    
    books.forEach(book => {
      if (book.keywords) {
        book.keywords.forEach(keyword => {
          keywords.push({
            keyword,
            position: Math.floor(Math.random() * 50) + 1,
            previousPosition: Math.floor(Math.random() * 50) + 1,
            searchVolume: Math.floor(Math.random() * 1000) + 100,
            difficulty: Math.floor(Math.random() * 100) + 1,
            page: book.title
          });
        });
      }
    });
    
    return keywords.slice(0, 20);
  };

  const getTrafficChartData = () => {
    const labels = seoMetrics.trafficData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });
    });

    return {
      labels,
      datasets: [
        {
          label: 'Organic Traffic',
          data: seoMetrics.trafficData.map(item => item.organicTraffic),
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Clicks',
          data: seoMetrics.trafficData.map(item => item.clicks),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  const getKeywordRankingsChartData = () => {
    const topKeywords = seoMetrics.keywordRankings
      .sort((a, b) => a.position - b.position)
      .slice(0, 10);

    return {
      labels: topKeywords.map(item => item.keyword),
      datasets: [{
        label: 'Position',
        data: topKeywords.map(item => item.position),
        backgroundColor: topKeywords.map(item => 
          item.position <= 10 ? '#10b981' : 
          item.position <= 20 ? '#f59e0b' : '#ef4444'
        ),
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    };
  };

  const getSEOIssuesChartData = () => {
    const issueTypes = {};
    seoMetrics.seoIssues.forEach(issue => {
      issueTypes[issue.issue] = (issueTypes[issue.issue] || 0) + 1;
    });

    return {
      labels: Object.keys(issueTypes),
      datasets: [{
        data: Object.values(issueTypes),
        backgroundColor: [
          '#ef4444',
          '#f59e0b',
          '#3b82f6',
          '#8b5cf6',
          '#10b981'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return 'fas fa-exclamation-circle';
      case 'medium': return 'fas fa-exclamation-triangle';
      case 'low': return 'fas fa-info-circle';
      default: return 'fas fa-question-circle';
    }
  };

  if (loading) {
    return (
      <div className="seo-monitoring-loading">
        <div className="loading-spinner"></div>
        <p>SEO ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="seo-monitoring">
      {/* Header */}
      <div className="monitoring-header">
        <div className="header-info">
          <h2>
            <i className="fas fa-chart-line"></i>
            SEO Monitoring va Reporting
          </h2>
          <p>SEO performance tracking va keyword monitoring</p>
        </div>
        
        <div className="header-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="week">Bu hafta</option>
            <option value="month">Bu oy</option>
            <option value="quarter">Bu chorak</option>
          </select>
        </div>
      </div>

      {/* SEO Overview Cards */}
      <div className="seo-overview">
        <div className="overview-card overall-score">
          <div className="card-icon">
            <i className="fas fa-chart-pie"></i>
          </div>
          <div className="card-content">
            <h3>{seoMetrics.overallScore}</h3>
            <p>Umumiy SEO Score</p>
            <div className={`score-trend ${seoMetrics.overallScore >= 80 ? 'positive' : 'negative'}`}>
              <i className={`fas fa-arrow-${seoMetrics.overallScore >= 80 ? 'up' : 'down'}`}></i>
              <span>{seoMetrics.overallScore >= 80 ? 'Yaxshi' : 'Yaxshilanishi kerak'}</span>
            </div>
          </div>
        </div>

        <div className="overview-card total-pages">
          <div className="card-icon">
            <i className="fas fa-file-alt"></i>
          </div>
          <div className="card-content">
            <h3>{seoMetrics.totalPages}</h3>
            <p>Jami Sahifalar</p>
            <div className="card-detail">
              <span>{seoMetrics.optimizedPages} ta optimizatsiya qilingan</span>
            </div>
          </div>
        </div>

        <div className="overview-card organic-traffic">
          <div className="card-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="card-content">
            <h3>{seoMetrics.trafficData.reduce((sum, item) => sum + item.organicTraffic, 0)}</h3>
            <p>Organic Traffic</p>
            <div className="card-detail">
              <span>Bu {timeRange === 'week' ? 'hafta' : timeRange === 'month' ? 'oy' : 'chorak'}</span>
            </div>
          </div>
        </div>

        <div className="overview-card seo-issues">
          <div className="card-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="card-content">
            <h3>{seoMetrics.issuesCount}</h3>
            <p>SEO Muammolari</p>
            <div className="card-detail">
              <span>Hal qilish kerak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-container traffic-chart">
          <div className="chart-header">
            <h3>Traffic Trendi</h3>
            <p>Organic traffic va clicks dinamikasi</p>
          </div>
          <div className="chart-content">
            <Line 
              data={getTrafficChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="chart-container keywords-chart">
          <div className="chart-header">
            <h3>Top Keyword Positions</h3>
            <p>Eng yaxshi keyword reytinglari</p>
          </div>
          <div className="chart-content">
            <Bar 
              data={getKeywordRankingsChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    reverse: true,
                    title: {
                      display: true,
                      text: 'Position'
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="chart-container issues-chart">
          <div className="chart-header">
            <h3>SEO Issues Distribution</h3>
            <p>Muammolar taqsimoti</p>
          </div>
          <div className="chart-content">
            <Doughnut 
              data={getSEOIssuesChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Top Performing Pages */}
      <div className="top-pages">
        <h3>Eng Yaxshi Sahifalar</h3>
        
        <div className="pages-table">
          <table>
            <thead>
              <tr>
                <th>Sahifa</th>
                <th>SEO Score</th>
                <th>Traffic</th>
                <th>Keywords</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {seoMetrics.topPerformingPages.map((page, index) => (
                <tr key={index}>
                  <td>
                    <div className="page-info">
                      <h4>{page.title}</h4>
                    </div>
                  </td>
                  <td>
                    <div className="score-badge" style={{ 
                      backgroundColor: page.score >= 90 ? '#10b981' : 
                                     page.score >= 70 ? '#f59e0b' : '#ef4444'
                    }}>
                      {page.score}
                    </div>
                  </td>
                  <td>{page.traffic}</td>
                  <td>{page.keywords}</td>
                  <td>
                    <span className={`status-badge ${page.score >= 80 ? 'good' : 'needs-work'}`}>
                      {page.score >= 80 ? 'Yaxshi' : 'Yaxshilanishi kerak'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEO Issues */}
      <div className="seo-issues-section">
        <h3>SEO Muammolari ({seoMetrics.seoIssues.length})</h3>
        
        <div className="issues-list">
          {seoMetrics.seoIssues.map((issue, index) => (
            <div key={index} className={`issue-item ${issue.severity}`}>
              <div className="issue-icon">
                <i 
                  className={getSeverityIcon(issue.severity)}
                  style={{ color: getSeverityColor(issue.severity) }}
                ></i>
              </div>
              <div className="issue-content">
                <h4>{issue.description}</h4>
                <p>Sahifa: {issue.page}</p>
                <div className="issue-meta">
                  <span className={`severity-badge ${issue.severity}`}>
                    {issue.severity === 'high' ? 'Yuqori' : 
                     issue.severity === 'medium' ? 'O\'rtacha' : 'Past'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keyword Rankings Table */}
      <div className="keyword-rankings">
        <h3>Keyword Rankings</h3>
        
        <div className="rankings-table">
          <table>
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Position</th>
                <th>O'zgarish</th>
                <th>Search Volume</th>
                <th>Difficulty</th>
                <th>Sahifa</th>
              </tr>
            </thead>
            <tbody>
              {seoMetrics.keywordRankings.slice(0, 10).map((keyword, index) => {
                const change = keyword.previousPosition - keyword.position;
                
                return (
                  <tr key={index}>
                    <td>
                      <strong>{keyword.keyword}</strong>
                    </td>
                    <td>
                      <div className={`position-badge ${keyword.position <= 10 ? 'top' : keyword.position <= 20 ? 'good' : 'poor'}`}>
                        {keyword.position}
                      </div>
                    </td>
                    <td>
                      <div className={`change-indicator ${change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'}`}>
                        {change > 0 && <i className="fas fa-arrow-up"></i>}
                        {change < 0 && <i className="fas fa-arrow-down"></i>}
                        {change === 0 && <i className="fas fa-minus"></i>}
                        <span>{Math.abs(change)}</span>
                      </div>
                    </td>
                    <td>{keyword.searchVolume}</td>
                    <td>
                      <div className={`difficulty-badge ${keyword.difficulty <= 30 ? 'easy' : keyword.difficulty <= 70 ? 'medium' : 'hard'}`}>
                        {keyword.difficulty}%
                      </div>
                    </td>
                    <td>{keyword.page}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SEOMonitoring;