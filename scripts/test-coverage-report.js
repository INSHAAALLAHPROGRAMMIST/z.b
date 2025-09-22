/**
 * Test Coverage Report Generator
 * Generates comprehensive test coverage reports and analysis
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

class TestCoverageReporter {
    constructor() {
        this.projectRoot = process.cwd();
        this.coverageDir = path.join(this.projectRoot, 'coverage');
        this.reportsDir = path.join(this.projectRoot, 'test-reports');
        
        // Ensure reports directory exists
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    /**
     * Run all tests and generate coverage
     */
    async runTestsWithCoverage() {
        console.log('🧪 Running tests with coverage...');
        
        try {
            // Run unit tests with coverage
            console.log('📋 Running unit tests...');
            execSync('npm run test:coverage', { stdio: 'inherit' });
            
            // Run integration tests
            console.log('🔗 Running integration tests...');
            execSync('npm run test:run -- src/__tests__/integration/', { stdio: 'inherit' });
            
            // Run E2E tests (if available)
            try {
                console.log('🎭 Running E2E tests...');
                execSync('npx playwright test --reporter=json', { stdio: 'inherit' });
            } catch (error) {
                console.warn('⚠️ E2E tests failed or not available:', error.message);
            }
            
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            throw error;
        }
    }

    /**
     * Parse coverage data
     */
    parseCoverageData() {
        const coverageFile = path.join(this.coverageDir, 'coverage-summary.json');
        
        if (!fs.existsSync(coverageFile)) {
            console.warn('⚠️ Coverage file not found, running tests first...');
            return null;
        }
        
        try {
            const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
            return coverageData;
        } catch (error) {
            console.error('❌ Failed to parse coverage data:', error.message);
            return null;
        }
    }

    /**
     * Generate detailed coverage report
     */
    generateCoverageReport(coverageData) {
        if (!coverageData) return null;
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: coverageData.total,
            files: {},
            recommendations: []
        };
        
        // Analyze file-level coverage
        Object.entries(coverageData).forEach(([filePath, data]) => {
            if (filePath === 'total') return;
            
            const relativePath = path.relative(this.projectRoot, filePath);
            report.files[relativePath] = {
                lines: data.lines,
                functions: data.functions,
                branches: data.branches,
                statements: data.statements
            };
            
            // Generate recommendations for low coverage files
            if (data.lines.pct < 70) {
                report.recommendations.push({
                    type: 'low_coverage',
                    file: relativePath,
                    coverage: data.lines.pct,
                    message: `Low line coverage (${data.lines.pct}%) - consider adding more tests`
                });
            }
            
            if (data.branches.pct < 60) {
                report.recommendations.push({
                    type: 'low_branch_coverage',
                    file: relativePath,
                    coverage: data.branches.pct,
                    message: `Low branch coverage (${data.branches.pct}%) - test edge cases`
                });
            }
        });
        
        return report;
    }

    /**
     * Analyze test quality metrics
     */
    analyzeTestQuality() {
        const testFiles = this.findTestFiles();
        
        const analysis = {
            totalTests: 0,
            testsByType: {
                unit: 0,
                integration: 0,
                e2e: 0
            },
            testFiles: testFiles.length,
            averageTestsPerFile: 0,
            recommendations: []
        };
        
        testFiles.forEach(filePath => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Count test cases
                const testMatches = content.match(/\b(test|it)\s*\(/g) || [];
                const describeMatches = content.match(/\bdescribe\s*\(/g) || [];
                
                analysis.totalTests += testMatches.length;
                
                // Categorize tests
                if (filePath.includes('integration')) {
                    analysis.testsByType.integration += testMatches.length;
                } else if (filePath.includes('e2e') || filePath.includes('spec.js')) {
                    analysis.testsByType.e2e += testMatches.length;
                } else {
                    analysis.testsByType.unit += testMatches.length;
                }
                
                // Check for test quality issues
                if (testMatches.length === 0) {
                    analysis.recommendations.push({
                        type: 'empty_test_file',
                        file: path.relative(this.projectRoot, filePath),
                        message: 'Test file contains no test cases'
                    });
                }
                
                if (testMatches.length > 50) {
                    analysis.recommendations.push({
                        type: 'large_test_file',
                        file: path.relative(this.projectRoot, filePath),
                        message: 'Test file is very large - consider splitting'
                    });
                }
                
                // Check for missing describe blocks
                if (testMatches.length > 5 && describeMatches.length === 0) {
                    analysis.recommendations.push({
                        type: 'missing_describe',
                        file: path.relative(this.projectRoot, filePath),
                        message: 'Consider organizing tests with describe blocks'
                    });
                }
                
            } catch (error) {
                console.warn(`⚠️ Could not analyze test file ${filePath}:`, error.message);
            }
        });
        
        analysis.averageTestsPerFile = analysis.totalTests / Math.max(analysis.testFiles, 1);
        
        return analysis;
    }

    /**
     * Find all test files
     */
    findTestFiles() {
        const testFiles = [];
        
        const searchDirs = [
            path.join(this.projectRoot, 'src'),
            path.join(this.projectRoot, 'e2e'),
            path.join(this.projectRoot, 'tests')
        ];
        
        const findTestsInDir = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            const items = fs.readdirSync(dir);
            
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    findTestsInDir(fullPath);
                } else if (item.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/)) {
                    testFiles.push(fullPath);
                }
            });
        };
        
        searchDirs.forEach(findTestsInDir);
        
        return testFiles;
    }

    /**
     * Generate performance test report
     */
    generatePerformanceReport() {
        const performanceFile = path.join(this.reportsDir, 'performance-report.json');
        
        if (!fs.existsSync(performanceFile)) {
            return {
                message: 'No performance data available',
                recommendations: ['Run performance tests to get detailed metrics']
            };
        }
        
        try {
            const performanceData = JSON.parse(fs.readFileSync(performanceFile, 'utf8'));
            return performanceData;
        } catch (error) {
            console.warn('⚠️ Could not parse performance report:', error.message);
            return null;
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateComprehensiveReport() {
        console.log('📊 Generating comprehensive test report...');
        
        const coverageData = this.parseCoverageData();
        const coverageReport = this.generateCoverageReport(coverageData);
        const testQuality = this.analyzeTestQuality();
        const performanceReport = this.generatePerformanceReport();
        
        const comprehensiveReport = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: testQuality.totalTests,
                testFiles: testQuality.testFiles,
                coverage: coverageReport?.summary || null,
                grade: this.calculateOverallGrade(coverageReport, testQuality)
            },
            coverage: coverageReport,
            testQuality,
            performance: performanceReport,
            recommendations: this.generateRecommendations(coverageReport, testQuality)
        };
        
        // Save report
        const reportPath = path.join(this.reportsDir, 'comprehensive-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(comprehensiveReport, null, 2));
        
        // Generate HTML report
        this.generateHTMLReport(comprehensiveReport);
        
        return comprehensiveReport;
    }

    /**
     * Calculate overall testing grade
     */
    calculateOverallGrade(coverageReport, testQuality) {
        let score = 100;
        const issues = [];
        
        // Coverage scoring
        if (coverageReport?.summary) {
            const coverage = coverageReport.summary;
            
            if (coverage.lines.pct < 80) {
                score -= 20;
                issues.push('Low line coverage');
            }
            
            if (coverage.branches.pct < 70) {
                score -= 15;
                issues.push('Low branch coverage');
            }
            
            if (coverage.functions.pct < 80) {
                score -= 10;
                issues.push('Low function coverage');
            }
        } else {
            score -= 30;
            issues.push('No coverage data available');
        }
        
        // Test quality scoring
        if (testQuality.totalTests < 50) {
            score -= 15;
            issues.push('Insufficient number of tests');
        }
        
        if (testQuality.testsByType.integration < 5) {
            score -= 10;
            issues.push('Few integration tests');
        }
        
        if (testQuality.testsByType.e2e < 3) {
            score -= 10;
            issues.push('Few E2E tests');
        }
        
        // Grade calculation
        let grade = 'A';
        if (score < 90) grade = 'B';
        if (score < 80) grade = 'C';
        if (score < 70) grade = 'D';
        if (score < 60) grade = 'F';
        
        return {
            score: Math.max(0, score),
            grade,
            issues
        };
    }

    /**
     * Generate actionable recommendations
     */
    generateRecommendations(coverageReport, testQuality) {
        const recommendations = [];
        
        // Coverage recommendations
        if (coverageReport?.recommendations) {
            recommendations.push(...coverageReport.recommendations);
        }
        
        // Test quality recommendations
        if (testQuality?.recommendations) {
            recommendations.push(...testQuality.recommendations);
        }
        
        // General recommendations
        if (testQuality.testsByType.unit < testQuality.totalTests * 0.7) {
            recommendations.push({
                type: 'test_distribution',
                message: 'Consider adding more unit tests for better test pyramid'
            });
        }
        
        if (testQuality.testsByType.e2e > testQuality.totalTests * 0.3) {
            recommendations.push({
                type: 'test_distribution',
                message: 'Too many E2E tests - consider moving some to integration level'
            });
        }
        
        return recommendations;
    }

    /**
     * Generate HTML report
     */
    generateHTMLReport(report) {
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Coverage Report - Zamon Books</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .grade { font-size: 3em; font-weight: bold; margin: 10px 0; }
        .grade.A { color: #4CAF50; }
        .grade.B { color: #8BC34A; }
        .grade.C { color: #FFC107; }
        .grade.D { color: #FF9800; }
        .grade.F { color: #F44336; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .section { margin: 30px 0; }
        .section h2 { border-bottom: 2px solid #333; padding-bottom: 10px; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; }
        .recommendation { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #ffc107; }
        .timestamp { color: #666; font-size: 0.9em; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .coverage-bar { width: 100px; height: 20px; background: #e0e0e0; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #f44336 0%, #ff9800 50%, #4caf50 100%); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Coverage Report</h1>
            <div class="grade ${report.summary.grade.grade}">${report.summary.grade.grade}</div>
            <div>Score: ${report.summary.grade.score}/100</div>
            <div class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</div>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.testFiles}</div>
                <div class="metric-label">Test Files</div>
            </div>
            ${report.summary.coverage ? `
            <div class="metric">
                <div class="metric-value">${report.summary.coverage.lines.pct}%</div>
                <div class="metric-label">Line Coverage</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.coverage.branches.pct}%</div>
                <div class="metric-label">Branch Coverage</div>
            </div>
            ` : ''}
        </div>
        
        ${report.recommendations.length > 0 ? `
        <div class="section">
            <h2>Recommendations</h2>
            <div class="recommendations">
                ${report.recommendations.map(rec => `
                    <div class="recommendation">
                        <strong>${rec.type || 'General'}:</strong> ${rec.message}
                        ${rec.file ? `<br><small>File: ${rec.file}</small>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="section">
            <h2>Test Distribution</h2>
            <table>
                <tr>
                    <th>Test Type</th>
                    <th>Count</th>
                    <th>Percentage</th>
                </tr>
                <tr>
                    <td>Unit Tests</td>
                    <td>${report.testQuality.testsByType.unit}</td>
                    <td>${((report.testQuality.testsByType.unit / report.testQuality.totalTests) * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td>Integration Tests</td>
                    <td>${report.testQuality.testsByType.integration}</td>
                    <td>${((report.testQuality.testsByType.integration / report.testQuality.totalTests) * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td>E2E Tests</td>
                    <td>${report.testQuality.testsByType.e2e}</td>
                    <td>${((report.testQuality.testsByType.e2e / report.testQuality.totalTests) * 100).toFixed(1)}%</td>
                </tr>
            </table>
        </div>
    </div>
</body>
</html>`;
        
        const htmlPath = path.join(this.reportsDir, 'test-report.html');
        fs.writeFileSync(htmlPath, htmlContent);
        
        console.log(`📄 HTML report generated: ${htmlPath}`);
    }

    /**
     * Display report summary
     */
    displaySummary(report) {
        console.log('\n📊 Test Coverage Report Summary');
        console.log('================================');
        console.log(`Overall Grade: ${report.summary.grade.grade} (${report.summary.grade.score}/100)`);
        console.log(`Total Tests: ${report.summary.totalTests}`);
        console.log(`Test Files: ${report.summary.testFiles}`);
        
        if (report.summary.coverage) {
            console.log(`Line Coverage: ${report.summary.coverage.lines.pct}%`);
            console.log(`Branch Coverage: ${report.summary.coverage.branches.pct}%`);
            console.log(`Function Coverage: ${report.summary.coverage.functions.pct}%`);
        }
        
        console.log('\nTest Distribution:');
        console.log(`  Unit Tests: ${report.testQuality.testsByType.unit}`);
        console.log(`  Integration Tests: ${report.testQuality.testsByType.integration}`);
        console.log(`  E2E Tests: ${report.testQuality.testsByType.e2e}`);
        
        if (report.recommendations.length > 0) {
            console.log('\n💡 Top Recommendations:');
            report.recommendations.slice(0, 5).forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec.message}`);
            });
        }
        
        console.log(`\n📄 Detailed report: ${path.join(this.reportsDir, 'test-report.html')}`);
    }

    /**
     * Run complete test coverage analysis
     */
    async run() {
        try {
            console.log('🚀 Starting comprehensive test coverage analysis...\n');
            
            // Run tests with coverage
            await this.runTestsWithCoverage();
            
            // Generate comprehensive report
            const report = this.generateComprehensiveReport();
            
            // Display summary
            this.displaySummary(report);
            
            console.log('\n✅ Test coverage analysis completed successfully!');
            
            return report;
            
        } catch (error) {
            console.error('\n❌ Test coverage analysis failed:', error.message);
            process.exit(1);
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const reporter = new TestCoverageReporter();
    reporter.run();
}

export default TestCoverageReporter;