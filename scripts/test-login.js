import { chromium } from 'playwright';

async function testLoginProcess() {
  console.log('🔐 Starting login process test...');
  
  // Launch browser
  const browser = await chromium.launch({ headless: false }); // Set to true for headless
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    console.log(`🔍 Browser Console [${msg.type()}]:`, msg.text());
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log(`💥 Page Error:`, error.message);
  });
  
  try {
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'login-page.png', fullPage: true });
    console.log('📸 Screenshot saved: login-page.png');
    
    console.log('📝 Step 2: Filling login form...');
    // Fill login form with admin credentials
    await page.fill('input[type="email"]', 'benatia.asaf@gmail.com');
    await page.fill('input[type="password"]', 'Aa589525!');
    
    // Take screenshot of filled form
    await page.screenshot({ path: 'login-form-filled.png', fullPage: true });
    console.log('📸 Screenshot saved: login-form-filled.png');
    
    console.log('🚀 Step 3: Submitting login form...');
    // Submit login form using the Hebrew text
    await page.click('text=התחבר');
    
    // Wait for navigation or response
    await page.waitForTimeout(5000); // Wait for login process
    
    // Also check for any toast notifications
    const toastVisible = await page.locator('[data-sonner-toaster]').count();
    if (toastVisible > 0) {
      const toastText = await page.locator('[data-sonner-toaster]').textContent();
      console.log('📢 Toast message:', toastText);
    }
    
    // Take screenshot after login attempt
    await page.screenshot({ path: 'after-login-attempt.png', fullPage: true });
    console.log('📸 Screenshot saved: after-login-attempt.png');
    
    // Check current URL to see where we ended up
    const currentUrl = page.url();
    console.log('📍 Current URL after login:', currentUrl);
    
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/users')) {
      console.log('✅ Login successful! Redirected to:', currentUrl);
    } else {
      console.log('ℹ️ Login may have succeeded but didn\'t redirect as expected. Current page:', currentUrl);
    }
    
    console.log('👥 Step 4: Testing access to users page...');
    // Navigate to users page
    await page.goto('http://localhost:5173/users');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of users page
    await page.screenshot({ path: 'users-page-test.png', fullPage: true });
    console.log('📸 Screenshot saved: users-page-test.png');
    
    // Check if we can access the users page or if we're redirected
    const usersPageUrl = page.url();
    console.log('📍 Users page URL:', usersPageUrl);
    
    if (usersPageUrl.includes('/users')) {
      console.log('✅ Users page access successful!');
    } else if (usersPageUrl.includes('/login')) {
      console.log('❌ Redirected to login - user not authenticated');
    } else {
      console.log('ℹ️ Unexpected redirect to:', usersPageUrl);
    }
    
  } catch (error) {
    console.error('❌ Error during login test:', error);
    await page.screenshot({ path: 'login-error-screenshot.png', fullPage: true });
    console.log('📸 Error screenshot saved: login-error-screenshot.png');
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testLoginProcess()
  .then(() => {
    console.log('\n🎉 Login tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Login test failed:', error.message);
    process.exit(1);
  });