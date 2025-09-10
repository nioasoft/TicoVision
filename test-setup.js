import { chromium } from 'playwright';

async function testSetupProcess() {
  console.log('🚀 Starting setup process test...');
  
  // Launch browser
  const browser = await chromium.launch({ headless: false }); // Set to true for headless
  const page = await browser.newPage();
  
  try {
    console.log('📍 Step 1: Navigating to setup page...');
    await page.goto('http://localhost:5173/setup');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'setup-step-1.png', fullPage: true });
    console.log('📸 Screenshot saved: setup-step-1.png');
    
    console.log('🔧 Step 2: Creating tenant...');
    // Click the first button "צור Tenant והמשך"
    await page.click('text=צור Tenant והמשך');
    
    // Wait for the button to change and step to advance
    await page.waitForTimeout(3000); // Wait for API call
    
    // Take screenshot after tenant creation
    await page.screenshot({ path: 'setup-step-2.png', fullPage: true });
    console.log('📸 Screenshot saved: setup-step-2.png');
    
    console.log('👤 Step 3: Creating admin user...');
    // Click the second button "צור חשבון Admin"
    await page.click('text=צור חשבון Admin');
    
    // Wait for the setup to complete
    await page.waitForTimeout(5000); // Wait for API calls and demo data
    
    // Take screenshot after admin creation
    await page.screenshot({ path: 'setup-step-3.png', fullPage: true });
    console.log('📸 Screenshot saved: setup-step-3.png');
    
    // Wait for redirect to dashboard
    console.log('🎯 Step 4: Waiting for redirect to dashboard...');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Take screenshot of dashboard
    await page.screenshot({ path: 'dashboard.png', fullPage: true });
    console.log('📸 Screenshot saved: dashboard.png');
    
    console.log('✅ Setup process completed successfully!');
    
    // Now test login process
    console.log('\n🔐 Testing login process...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.fill('input[type="email"]', 'benatia.asaf@gmail.com');
    await page.fill('input[type="password"]', 'Aa589525!');
    
    // Take screenshot of login form
    await page.screenshot({ path: 'login-form.png', fullPage: true });
    console.log('📸 Screenshot saved: login-form.png');
    
    // Submit login form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Take screenshot after login
    await page.screenshot({ path: 'after-login.png', fullPage: true });
    console.log('📸 Screenshot saved: after-login.png');
    
    // Navigate to users page
    console.log('👥 Testing access to users page...');
    await page.goto('http://localhost:5173/users');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of users page
    await page.screenshot({ path: 'users-page.png', fullPage: true });
    console.log('📸 Screenshot saved: users-page.png');
    
    console.log('✅ Login and users page access test completed!');
    
  } catch (error) {
    console.error('❌ Error during setup process:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.log('📸 Error screenshot saved: error-screenshot.png');
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testSetupProcess()
  .then(() => {
    console.log('\n🎉 All tests completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });