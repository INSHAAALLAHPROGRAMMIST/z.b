import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../../firebaseConfig';

const SEOAnalyzer = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);
  const [seoAnalysis, setSeoAnalysis] = useState(null);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState([]);
  const [autoGenerating, setAutoGenerating] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const booksSnapshot = await getDocs(collection(db, COLLECTIONS.BOOKS));
      const booksData = booksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBooks(booksData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading books:', error);
      setLoading(false);
    }
  };

  const analyzeSEO = (book) => {
    const analysis = {
      title: analyzeTitle(book.title),
      description: analyzeDescription(book.description),
      metaTitle: analyzeMetaTitle(book.metaTitle || book.title),
      metaDescription: analyzeMetaDescription(book.metaDescription || book.description),
      keywords: analyzeKeywords(book.keywords || []),
      images: analyzeImages(book),
      url: analyzeURL(book.slug || book.title),
      content: analyzeContent(book),
      overall: 0
    };

    // Calculate overall score
    const scores = Object.values(analysis).filter(item => typeof item === 'object' && item.score);
    analysis.overall = Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length);

    return analysis;
  };

  const analyzeTitle = (title) => {
    const issues = [];
    let score = 100;

    if (!title) {
      issues.push('Sarlavha yo\'q');
      score = 0;
    } else {
      if (title.length < 10) {
        issues.push('Sarlavha juda qisqa (10 belgidan kam)');
        score -= 30;
      }
      if (title.length > 60) {
        issues.push('Sarlavha juda uzun (60 belgidan ko\'p)');
        score -= 20;
      }
      if (!/[А-Яа-яЁё]/.test(title) && !/[A-Za-z]/.test(title)) {
        issues.push('Sarlavhada matn yo\'q');
        score -= 40;
      }
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations: generateTitleRecommendations(title, issues)
    };
  };

  const analyzeDescription = (description) => {
    const issues = [];
    let score = 100;

    if (!description) {
      issues.push('Tavsif yo\'q');
      score = 0;
    } else {
      if (description.length < 50) {
        issues.push('Tavsif juda qisqa (50 belgidan kam)');
        score -= 30;
      }
      if (description.length > 500) {
        issues.push('Tavsif juda uzun (500 belgidan ko\'p)');
        score -= 10;
      }
      if (description.split(' ').length < 10) {
        issues.push('Tavsifda kam so\'z bor');
        score -= 20;
      }
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations: generateDescriptionRecommendations(description, issues)
    };
  };

  const analyzeMetaTitle = (metaTitle) => {
    const issues = [];
    let score = 100;

    if (!metaTitle) {
      issues.push('Meta title yo\'q');
      score -= 50;
    } else {
      if (metaTitle.length < 30) {
        issues.push('Meta title juda qisqa (30 belgidan kam)');
        score -= 20;
      }
      if (metaTitle.length > 60) {
        issues.push('Meta title juda uzun (60 belgidan ko\'p)');
        score -= 30;
      }
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations: generateMetaTitleRecommendations(metaTitle, issues)
    };
  };

  const analyzeMetaDescription = (metaDescription) => {
    const issues = [];
    let score = 100;

    if (!metaDescription) {
      issues.push('Meta description yo\'q');
      score -= 50;
    } else {
      if (metaDescription.length < 120) {
        issues.push('Meta description juda qisqa (120 belgidan kam)');
        score -= 20;
      }
      if (metaDescription.length > 160) {
        issues.push('Meta description juda uzun (160 belgidan ko\'p)');
        score -= 30;
      }
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations: generateMetaDescriptionRecommendations(metaDescription, issues)
    };
  };

  const analyzeKeywords = (keywords) => {
    const issues = [];
    let score = 100;

    if (!keywords || keywords.length === 0) {
      issues.push('Kalit so\'zlar yo\'q');
      score -= 40;
    } else {
      if (keywords.length < 3) {
        issues.push('Kam kalit so\'z (3 tadan kam)');
        score -= 20;
      }
      if (keywords.length > 10) {
        issues.push('Ko\'p kalit so\'z (10 tadan ko\'p)');
        score -= 10;
      }
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations: generateKeywordsRecommendations(keywords, issues)
    };
  };

  const analyzeImages = (book) => {
    const issues = [];
    let score = 100;

    if (!book.imageUrl) {
      issues.push('Asosiy rasm yo\'q');
      score -= 50;
    }

    if (!book.altText) {
      issues.push('Alt text yo\'q');
      score -= 30;
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations: generateImageRecommendations(book, issues)
    };
  };

  const analyzeURL = (slug) => {
    const issues = [];
    let score = 100;

    if (!slug) {
      issues.push('URL slug yo\'q');
      score -= 30;
    } else {
      if (slug.length > 50) {
        issues.push('URL juda uzun');
        score -= 20;
      }
      if (!/^[a-z0-9-]+$/.test(slug)) {
        issues.push('URL da noto\'g\'ri belgilar');
        score -= 30;
      }
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations: generateURLRecommendations(slug, issues)
    };
  };

  const analyzeContent = (book) => {
    const issues = [];
    let score = 100;

    const contentLength = (book.description || '').length + (book.title || '').length;
    
    if (contentLength < 100) {
      issues.push('Kontent juda kam');
      score -= 40;
    }

    if (!book.category) {
      issues.push('Kategoriya belgilanmagan');
      score -= 20;
    }

    if (!book.author) {
      issues.push('Muallif ko\'rsatilmagan');
      score -= 15;
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations: generateContentRecommendations(book, issues)
    };
  };

  // Recommendation generators
  const generateTitleRecommendations = (title, issues) => {
    const recommendations = [];
    
    if (issues.some(issue => issue.includes('qisqa'))) {
      recommendations.push('Sarlavhani 30-60 belgi orasida qiling');
    }
    if (issues.some(issue => issue.includes('uzun'))) {
      recommendations.push('Sarlavhani qisqartiring, 60 belgidan oshmasin');
    }
    if (!title) {
      recommendations.push('Jozibali va ma\'noli sarlavha qo\'shing');
    }

    return recommendations;
  };

  const generateDescriptionRecommendations = (description, issues) => {
    const recommendations = [];
    
    if (issues.some(issue => issue.includes('qisqa'))) {
      recommendations.push('Tavsifni kengaytiring, kamida 100-150 so\'z qiling');
    }
    if (issues.some(issue => issue.includes('uzun'))) {
      recommendations.push('Tavsifni qisqartiring, 300-400 so\'z yetarli');
    }
    if (!description) {
      recommendations.push('Kitob haqida batafsil tavsif yozing');
    }

    return recommendations;
  };

  const generateMetaTitleRecommendations = (metaTitle, issues) => {
    const recommendations = [];
    
    if (!metaTitle) {
      recommendations.push('SEO uchun maxsus meta title yarating');
    }
    if (issues.some(issue => issue.includes('qisqa'))) {
      recommendations.push('Meta title ni 50-60 belgi qiling');
    }
    if (issues.some(issue => issue.includes('uzun'))) {
      recommendations.push('Meta title ni 60 belgidan oshmasin');
    }

    return recommendations;
  };

  const generateMetaDescriptionRecommendations = (metaDescription, issues) => {
    const recommendations = [];
    
    if (!metaDescription) {
      recommendations.push('SEO uchun meta description yarating');
    }
    if (issues.some(issue => issue.includes('qisqa'))) {
      recommendations.push('Meta description ni 140-160 belgi qiling');
    }
    if (issues.some(issue => issue.includes('uzun'))) {
      recommendations.push('Meta description ni 160 belgidan oshmasin');
    }

    return recommendations;
  };

  const generateKeywordsRecommendations = (keywords, issues) => {
    const recommendations = [];
    
    if (!keywords || keywords.length === 0) {
      recommendations.push('Kitob mavzusiga mos kalit so\'zlar qo\'shing');
    }
    if (issues.some(issue => issue.includes('kam'))) {
      recommendations.push('5-7 ta kalit so\'z qo\'shing');
    }
    if (issues.some(issue => issue.includes('ko\'p'))) {
      recommendations.push('Eng muhim kalit so\'zlarni qoldiring');
    }

    return recommendations;
  };

  const generateImageRecommendations = (book, issues) => {
    const recommendations = [];
    
    if (!book.imageUrl) {
      recommendations.push('Yuqori sifatli kitob rasmi qo\'shing');
    }
    if (!book.altText) {
      recommendations.push('Rasm uchun alt text yozing');
    }

    return recommendations;
  };

  const generateURLRecommendations = (slug, issues) => {
    const recommendations = [];
    
    if (!slug) {
      recommendations.push('SEO-friendly URL slug yarating');
    }
    if (issues.some(issue => issue.includes('uzun'))) {
      recommendations.push('URL ni qisqartiring');
    }
    if (issues.some(issue => issue.includes('noto\'g\'ri'))) {
      recommendations.push('Faqat kichik harf, raqam va tire ishlatilng');
    }

    return recommendations;
  };

  const generateContentRecommendations = (book, issues) => {
    const recommendations = [];
    
    if (issues.some(issue => issue.includes('kam'))) {
      recommendations.push('Ko\'proq kontent qo\'shing');
    }
    if (!book.category) {
      recommendations.push('Kitob kategoriyasini belgilang');
    }
    if (!book.author) {
      recommendations.push('Muallif nomini qo\'shing');
    }

    return recommendations;
  };

  const generateAutoSEO = async (book) => {
    setAutoGenerating(true);
    
    try {
      const autoSEO = {
        metaTitle: generateAutoMetaTitle(book),
        metaDescription: generateAutoMetaDescription(book),
        keywords: generateAutoKeywords(book),
        slug: generateAutoSlug(book.title),
        altText: generateAutoAltText(book)
      };

      // Update book with auto-generated SEO
      await updateDoc(doc(db, COLLECTIONS.BOOKS, book.id), {
        metaTitle: autoSEO.metaTitle,
        metaDescription: autoSEO.metaDescription,
        keywords: autoSEO.keywords,
        slug: autoSEO.slug,
        altText: autoSEO.altText,
        updatedAt: new Date()
      });

      // Refresh books list
      await loadBooks();
      
      // Re-analyze the book
      const updatedBook = { ...book, ...autoSEO };
      setSelectedBook(updatedBook);
      setSeoAnalysis(analyzeSEO(updatedBook));

      alert('SEO ma\'lumotlari avtomatik yaratildi!');
    } catch (error) {
      console.error('Auto SEO generation error:', error);
      alert('SEO yaratishda xato yuz berdi');
    } finally {
      setAutoGenerating(false);
    }
  };

  const generateAutoMetaTitle = (book) => {
    const title = book.title || '';
    const author = book.author || '';
    
    if (author) {
      return `${title} - ${author} | Kitob sotib oling`;
    }
    return `${title} | Online kitob do'koni`;
  };

  const generateAutoMetaDescription = (book) => {
    const title = book.title || '';
    const author = book.author || '';
    const category = book.category || 'kitob';
    const price = book.price || '';
    
    let description = `${title}`;
    if (author) description += ` - ${author}`;
    description += ` ${category}ini onlayn xarid qiling.`;
    if (price) description += ` Narxi: ${price} so'm.`;
    description += ' Tez yetkazib berish va sifat kafolati.';
    
    return description.substring(0, 160);
  };

  const generateAutoKeywords = (book) => {
    const keywords = [];
    
    if (book.title) {
      keywords.push(...book.title.toLowerCase().split(' ').filter(word => word.length > 2));
    }
    if (book.author) {
      keywords.push(book.author.toLowerCase());
    }
    if (book.category) {
      keywords.push(book.category.toLowerCase());
    }
    
    keywords.push('kitob', 'onlayn', 'sotib olish', 'yetkazib berish');
    
    return [...new Set(keywords)].slice(0, 8);
  };

  const generateAutoSlug = (title) => {
    if (!title) return '';
    
    return title
      .toLowerCase()
      .replace(/[^a-z0-9а-я\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50);
  };

  const generateAutoAltText = (book) => {
    const title = book.title || '';
    const author = book.author || '';
    
    if (author) {
      return `${title} - ${author} kitobi rasmi`;
    }
    return `${title} kitobi rasmi`;
  };

  const handleBookSelect = (book) => {
    setSelectedBook(book);
    const analysis = analyzeSEO(book);
    setSeoAnalysis(analysis);
    
    // Generate optimization suggestions
    const suggestions = [];
    Object.entries(analysis).forEach(([key, value]) => {
      if (typeof value === 'object' && value.recommendations) {
        value.recommendations.forEach(rec => {
          suggestions.push({
            category: key,
            recommendation: rec,
            priority: value.score < 50 ? 'high' : value.score < 80 ? 'medium' : 'low'
          });
        });
      }
    });
    setOptimizationSuggestions(suggestions);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Yaxshi';
    if (score >= 60) return 'O\'rtacha';
    return 'Yomon';
  };

  if (loading) {
    return (
      <div className="seo-analyzer-loading">
        <div className="loading-spinner"></div>
        <p>Kitoblar yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="seo-analyzer">
      {/* Header */}
      <div className="analyzer-header">
        <div className="header-info">
          <h2>
            <i className="fas fa-search"></i>
            SEO Analyzer
          </h2>
          <p>Kitoblar uchun SEO tahlili va optimization</p>
        </div>
      </div>

      <div className="analyzer-content">
        {/* Books List */}
        <div className="books-panel">
          <h3>Kitoblar ro'yxati ({books.length})</h3>
          <div className="books-list">
            {books.map(book => {
              const quickAnalysis = analyzeSEO(book);
              return (
                <div 
                  key={book.id} 
                  className={`book-item ${selectedBook?.id === book.id ? 'selected' : ''}`}
                  onClick={() => handleBookSelect(book)}
                >
                  <div className="book-info">
                    <h4>{book.title}</h4>
                    <p>{book.author}</p>
                  </div>
                  <div className="book-seo-score">
                    <div 
                      className="score-circle"
                      style={{ 
                        background: `conic-gradient(${getScoreColor(quickAnalysis.overall)} ${quickAnalysis.overall * 3.6}deg, var(--glass-border) 0deg)`
                      }}
                    >
                      <span>{quickAnalysis.overall}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Analysis Panel */}
        <div className="analysis-panel">
          {selectedBook ? (
            <>
              <div className="analysis-header">
                <h3>{selectedBook.title}</h3>
                <div className="header-actions">
                  <button
                    className="auto-seo-btn"
                    onClick={() => generateAutoSEO(selectedBook)}
                    disabled={autoGenerating}
                  >
                    {autoGenerating ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Yaratilmoqda...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-magic"></i>
                        Auto SEO
                      </>
                    )}
                  </button>
                </div>
              </div>

              {seoAnalysis && (
                <>
                  {/* Overall Score */}
                  <div className="overall-score">
                    <div className="score-display">
                      <div 
                        className="score-circle-large"
                        style={{ 
                          background: `conic-gradient(${getScoreColor(seoAnalysis.overall)} ${seoAnalysis.overall * 3.6}deg, var(--glass-border) 0deg)`
                        }}
                      >
                        <div className="score-inner">
                          <span className="score-number">{seoAnalysis.overall}</span>
                          <span className="score-label">{getScoreLabel(seoAnalysis.overall)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="score-info">
                      <h4>SEO Score</h4>
                      <p>Umumiy SEO ko'rsatkichi</p>
                    </div>
                  </div>

                  {/* Detailed Analysis */}
                  <div className="detailed-analysis">
                    <h4>Batafsil Tahlil</h4>
                    
                    {Object.entries(seoAnalysis).map(([key, analysis]) => {
                      if (typeof analysis !== 'object' || !analysis.score) return null;
                      
                      const categoryNames = {
                        title: 'Sarlavha',
                        description: 'Tavsif',
                        metaTitle: 'Meta Title',
                        metaDescription: 'Meta Description',
                        keywords: 'Kalit So\'zlar',
                        images: 'Rasmlar',
                        url: 'URL',
                        content: 'Kontent'
                      };

                      return (
                        <div key={key} className="analysis-item">
                          <div className="analysis-header">
                            <h5>{categoryNames[key]}</h5>
                            <div 
                              className="analysis-score"
                              style={{ color: getScoreColor(analysis.score) }}
                            >
                              {analysis.score}/100
                            </div>
                          </div>
                          
                          {analysis.issues.length > 0 && (
                            <div className="analysis-issues">
                              <h6>Muammolar:</h6>
                              <ul>
                                {analysis.issues.map((issue, index) => (
                                  <li key={index}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {analysis.recommendations.length > 0 && (
                            <div className="analysis-recommendations">
                              <h6>Tavsiyalar:</h6>
                              <ul>
                                {analysis.recommendations.map((rec, index) => (
                                  <li key={index}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Optimization Suggestions */}
                  <div className="optimization-suggestions">
                    <h4>Optimization Tavsiyalari</h4>
                    
                    {optimizationSuggestions.length === 0 ? (
                      <div className="no-suggestions">
                        <i className="fas fa-check-circle"></i>
                        <p>SEO yaxshi optimizatsiya qilingan!</p>
                      </div>
                    ) : (
                      <div className="suggestions-list">
                        {optimizationSuggestions.map((suggestion, index) => (
                          <div key={index} className={`suggestion-item ${suggestion.priority}`}>
                            <div className="suggestion-priority">
                              <i className={
                                suggestion.priority === 'high' ? 'fas fa-exclamation-circle' :
                                suggestion.priority === 'medium' ? 'fas fa-exclamation-triangle' :
                                'fas fa-info-circle'
                              }></i>
                            </div>
                            <div className="suggestion-content">
                              <span className="suggestion-category">{suggestion.category}</span>
                              <p>{suggestion.recommendation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="no-selection">
              <i className="fas fa-mouse-pointer"></i>
              <h3>Kitob tanlang</h3>
              <p>SEO tahlili uchun chap tarafdan kitob tanlang</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SEOAnalyzer;