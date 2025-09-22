async function globalTeardown() {
  console.log('🧹 Starting E2E test cleanup...');
  
  try {
    // Cleanup test data if needed
    console.log('📝 Cleaning up test data...');
    
    // You can add cleanup logic here
    // For example, remove test users, books, etc.
    
    console.log('✅ E2E test cleanup completed');
    
  } catch (error) {
    console.error('❌ E2E test cleanup failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;