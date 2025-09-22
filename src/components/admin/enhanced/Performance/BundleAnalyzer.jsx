import React, { useState, useEffect } from 'react';

const BundleAnalyzer = () => {
  const [bundleData, setBundleData] = useState({
    totalSize: 0,
    gzippedSize: 0,
    chunks: [],
    dependencies: [],
    unusedCode: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [viewMode, setViewMode] = useState('chunks'); // chunks, dependencies, unused

  useEffect(() => {
    analyzeBundleSize();
  }, []);

  const analyzeBundleSize = async () => {
    try {
      setLoading(true);
      
      // Simulate bundle analysis (in real app, this would come from webpack-bundle-analyzer or similar)
      const mockBundleData = {
        totalSize: 2847, // KB
        gzippedSize: 892, // KB
        chunks: [
          {
            id: 'main',
            name: 'main.js',
            size: 1245,
            gzippedSize: 387,
            modules: [
              { name: 'react', size: 145, type: 'dependency' },
              { name: 'react-dom', size: 234, type: 'dependency' },
              { name: 'firebase', size: 456, type: 'dependency' },
              { name: 'chart.js', size: 234, type: 'dependency' },
              { name: 'src/components', size: 176, type: 'source' }
            ]
          },
          {
            id: 'vendor',
            name: 'vendor.js',
            size: 892,
            gzippedSize: 278,
            modules: [
              { name: 'lodash', size: 234, type: 'dependency' },
              { name: 'moment', size: 156, type: 'dependency' },
              { name: 'axios', size: 89, type: 'dependency' },
              { name: 'react-router', size: 123, type: 'dependency' },
              { name: 'other-libs', size: 290, type: 'dependency' }
            ]
          },
          {
            id: 'dashboard',
            name: 'dashboard.js',
            size: 456,
            gzippedSize: 142,
            modules: [
              { name: 'Dashboard components', size: 234, type: 'source' },
              { name: 'Analytics components', size: 123, type: 'source' },
              { name: 'Chart utilities', size: 99, type: 'source' }
            ]
          },
          {
            id: 'admin',
            name: 'admin.js',
            size: 254,
            gzippedSize: 85,
            modules: [
              { name: 'Admin components', size: 145, type: 'source' },
              { name: 'Security components', size: 109, type: 'source' }
            ]
          }
        ],
        dependencies: [
          { name: 'react', size: 145, version: '18.2.0', used: true },
          { name: 'react-dom', size: 234, version: '18.2.0', used: true },
          { name: 'firebase', size: 456, version: '9.15.0', used: true },
          { name: 'chart.js', size: 234, version: '4.2.1', used: true },
          { name: 'lodash', size: 234, version: '4.17.21', used: false },
          { name: 'moment', size: 156, version: '2.29.4', used: false },
          { name: 'axios', size: 89, version: '1.3.0', used: true },
          { name: 'react-router', size: 123, version: '6.8.0', used: true }
        ],
        unusedCode: [
          { file: 'lodash', size: 234, reason: 'Not imported in any component' },
          { file: 'moment', size: 156, reason: 'Replaced with native Date methods' },
          { file: 'src/utils/oldHelpers.js', size: 23, reason: 'Dead code - no references' },
          { file: 'src/components/OldComponent.jsx', size: 45, reason: 'Component not used' }
        ]
      };

      setBundleData(mockBundleData);
    } catch (error) {
      console.error('Error analyzing bundle:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (sizeInKB) => {
    if (sizeInKB > 1024) {
      return `${(sizeInKB / 1024).toFixed(1)}MB`;
    }
    return `${sizeInKB}KB`;
  };

  const getCompressionRatio = () => {
    return ((1 - bundleData.gzippedSize / bundleData.totalSize) * 100).toFixed(1);
  };

  const getSizeColor = (size) => {
    if (size > 500) return 'text-red-600';
    if (size > 200) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getOptimizationScore = () => {
    let score = 100;
    
    // Penalize large total size
    if (bundleData.totalSize > 3000) score -= 30;
    else if (bundleData.totalSize > 2000) score -= 20;
    else if (bundleData.totalSize > 1000) score -= 10;
    
    // Penalize unused dependencies
    const unusedDeps = bundleData.dependencies.filter(dep => !dep.used);
    score -= unusedDeps.length * 5;
    
    // Penalize unused code
    score -= bundleData.unusedCode.length * 3;
    
    // Reward good compression
    const compressionRatio = parseFloat(getCompressionRatio());
    if (compressionRatio > 70) score += 10;
    else if (compressionRatio > 60) score += 5;
    
    return Math.max(0, Math.min(100, score));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const optimizationScore = getOptimizationScore();

  return (
    <div className="bundle-analyzer">
      <div className="bundle-header">
        <h2>Bundle Analyzer</h2>
        <p>Analyze bundle size, dependencies, and optimization opportunities</p>
        
        <div className="view-mode-selector">
          <button
            onClick={() => setViewMode('chunks')}
            className={`mode-btn ${viewMode === 'chunks' ? 'active' : ''}`}
          >
            📦 Chunks
          </button>
          <button
            onClick={() => setViewMode('dependencies')}
            className={`mode-btn ${viewMode === 'dependencies' ? 'active' : ''}`}
          >
            📚 Dependencies
          </button>
          <button
            onClick={() => setViewMode('unused')}
            className={`mode-btn ${viewMode === 'unused' ? 'active' : ''}`}
          >
            🗑️ Unused Code
          </button>
        </div>
      </div>

      {/* Bundle Overview */}
      <div className="bundle-overview">
        <div className="overview-card">
          <div className="overview-icon">📊</div>
          <div className="overview-content">
            <h4>Total Bundle Size</h4>
            <span className={`overview-value ${getSizeColor(bundleData.totalSize)}`}>
              {formatSize(bundleData.totalSize)}
            </span>
            <span className="overview-label">Uncompressed</span>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">🗜️</div>
          <div className="overview-content">
            <h4>Gzipped Size</h4>
            <span className="overview-value text-green-600">
              {formatSize(bundleData.gzippedSize)}
            </span>
            <span className="overview-label">{getCompressionRatio()}% compression</span>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">📈</div>
          <div className="overview-content">
            <h4>Optimization Score</h4>
            <span className={`overview-value ${optimizationScore > 80 ? 'text-green-600' : optimizationScore > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
              {optimizationScore}/100
            </span>
            <span className="overview-label">Bundle efficiency</span>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">🧹</div>
          <div className="overview-content">
            <h4>Unused Code</h4>
            <span className="overview-value text-red-600">
              {formatSize(bundleData.unusedCode.reduce((total, item) => total + item.size, 0))}
            </span>
            <span className="overview-label">Can be removed</span>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'chunks' && (
        <div className="chunks-view">
          <h3>Bundle Chunks</h3>
          <div className="chunks-grid">
            {bundleData.chunks.map(chunk => (
              <div 
                key={chunk.id} 
                className={`chunk-card ${selectedChunk?.id === chunk.id ? 'selected' : ''}`}
                onClick={() => setSelectedChunk(chunk)}
              >
                <div className="chunk-header">
                  <h4>{chunk.name}</h4>
                  <span className={`chunk-size ${getSizeColor(chunk.size)}`}>
                    {formatSize(chunk.size)}
                  </span>
                </div>
                <div className="chunk-details">
                  <div className="chunk-stat">
                    <span className="stat-label">Gzipped:</span>
                    <span className="stat-value">{formatSize(chunk.gzippedSize)}</span>
                  </div>
                  <div className="chunk-stat">
                    <span className="stat-label">Modules:</span>
                    <span className="stat-value">{chunk.modules.length}</span>
                  </div>
                </div>
                <div className="chunk-modules">
                  {chunk.modules.slice(0, 3).map((module, index) => (
                    <div key={index} className="module-item">
                      <span className="module-name">{module.name}</span>
                      <span className="module-size">{formatSize(module.size)}</span>
                    </div>
                  ))}
                  {chunk.modules.length > 3 && (
                    <div className="module-more">+{chunk.modules.length - 3} more</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'dependencies' && (
        <div className="dependencies-view">
          <h3>Dependencies Analysis</h3>
          <div className="dependencies-table">
            <table>
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Version</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bundleData.dependencies.map((dep, index) => (
                  <tr key={index} className={!dep.used ? 'unused' : ''}>
                    <td>
                      <div className="dep-name">
                        <span className={`dep-icon ${dep.used ? 'used' : 'unused'}`}>
                          {dep.used ? '✅' : '❌'}
                        </span>
                        {dep.name}
                      </div>
                    </td>
                    <td>{dep.version}</td>
                    <td>
                      <span className={getSizeColor(dep.size)}>
                        {formatSize(dep.size)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${dep.used ? 'used' : 'unused'}`}>
                        {dep.used ? 'Used' : 'Unused'}
                      </span>
                    </td>
                    <td>
                      {!dep.used && (
                        <button className="action-btn remove">
                          Remove
                        </button>
                      )}
                      {dep.used && (
                        <button className="action-btn optimize">
                          Optimize
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'unused' && (
        <div className="unused-view">
          <h3>Unused Code Detection</h3>
          <div className="unused-list">
            {bundleData.unusedCode.map((item, index) => (
              <div key={index} className="unused-item">
                <div className="unused-icon">🗑️</div>
                <div className="unused-content">
                  <h4>{item.file}</h4>
                  <p className="unused-reason">{item.reason}</p>
                  <div className="unused-stats">
                    <span className="unused-size">Size: {formatSize(item.size)}</span>
                  </div>
                </div>
                <div className="unused-actions">
                  <button className="action-btn remove">
                    Remove File
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Recommendations */}
      <div className="optimization-recommendations">
        <h3>🚀 Optimization Recommendations</h3>
        <div className="recommendations-grid">
          {bundleData.totalSize > 2000 && (
            <div className="recommendation warning">
              <div className="rec-icon">📦</div>
              <div className="rec-content">
                <h4>Large Bundle Size</h4>
                <p>Consider implementing code splitting and lazy loading to reduce initial bundle size.</p>
                <div className="rec-actions">
                  <button className="rec-btn">Implement Code Splitting</button>
                </div>
              </div>
            </div>
          )}

          {bundleData.dependencies.filter(dep => !dep.used).length > 0 && (
            <div className="recommendation error">
              <div className="rec-icon">🗑️</div>
              <div className="rec-content">
                <h4>Unused Dependencies</h4>
                <p>Remove {bundleData.dependencies.filter(dep => !dep.used).length} unused dependencies to reduce bundle size.</p>
                <div className="rec-actions">
                  <button className="rec-btn">Remove Unused Deps</button>
                </div>
              </div>
            </div>
          )}

          {bundleData.unusedCode.length > 0 && (
            <div className="recommendation warning">
              <div className="rec-icon">🧹</div>
              <div className="rec-content">
                <h4>Dead Code</h4>
                <p>Remove {bundleData.unusedCode.length} unused files to clean up your codebase.</p>
                <div className="rec-actions">
                  <button className="rec-btn">Remove Dead Code</button>
                </div>
              </div>
            </div>
          )}

          {parseFloat(getCompressionRatio()) < 60 && (
            <div className="recommendation info">
              <div className="rec-icon">🗜️</div>
              <div className="rec-content">
                <h4>Improve Compression</h4>
                <p>Enable better compression algorithms or optimize assets for better gzip compression.</p>
                <div className="rec-actions">
                  <button className="rec-btn">Optimize Compression</button>
                </div>
              </div>
            </div>
          )}

          {optimizationScore > 85 && (
            <div className="recommendation success">
              <div className="rec-icon">✅</div>
              <div className="rec-content">
                <h4>Well Optimized</h4>
                <p>Your bundle is well optimized! Keep monitoring for future improvements.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BundleAnalyzer;