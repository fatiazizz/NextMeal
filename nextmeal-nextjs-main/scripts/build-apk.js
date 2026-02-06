#!/usr/bin/env node

/**
 * NextMeal APK Builder
 * ====================
 * 
 * This script builds an APK from the PWA for demo purposes.
 * 
 * Prerequisites:
 * 1. Java JDK 11+ installed
 * 2. Node.js 18+
 * 
 * Usage:
 *   npm run build:apk
 *   
 * Or with custom URL:
 *   node scripts/build-apk.js --url https://your-app.com
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`\n${colors.cyan}[${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    url: 'http://localhost:3000',
    output: 'nextmeal.apk',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      options.url = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[i + 1];
      i++;
    }
  }

  return options;
}

// Check if Java is installed
function checkJava() {
  try {
    execSync('java -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Check if Android SDK is available
function checkAndroidSDK() {
  return process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
}

// Create TWA manifest for Bubblewrap
function createTWAManifest(url) {
  const manifest = {
    packageId: 'com.nextmeal.app',
    host: new URL(url).host,
    name: 'NextMeal',
    launcherName: 'NextMeal',
    display: 'standalone',
    themeColor: '#f97316',
    navigationColor: '#0f172a',
    backgroundColor: '#0f172a',
    enableNotifications: true,
    startUrl: '/',
    iconUrl: `${url}/icons/icon-512x512.png`,
    maskableIconUrl: `${url}/icons/icon-512x512.png`,
    splashScreenFadeOutDuration: 300,
    appVersionCode: 1,
    appVersionName: '1.0.0',
    shortcuts: [],
    fallbackType: 'customtabs',
    enableSiteSettingsShortcut: true,
    orientation: 'portrait',
    fingerprints: [],
  };

  return manifest;
}

// Main build function
async function buildAPK() {
  console.log('\n');
  log('🍽️  NextMeal APK Builder', 'cyan');
  log('========================\n', 'cyan');

  const options = parseArgs();

  // Step 1: Check prerequisites
  logStep('1/5', 'Checking prerequisites...');

  if (!checkJava()) {
    logError('Java is not installed!');
    log('\nPlease install Java JDK 11 or higher:', 'yellow');
    log('  macOS: brew install openjdk@11');
    log('  Ubuntu: sudo apt install openjdk-11-jdk');
    log('  Windows: Download from https://adoptium.net/');
    process.exit(1);
  }
  logSuccess('Java is installed');

  const androidSDK = checkAndroidSDK();
  if (!androidSDK) {
    logWarning('ANDROID_HOME not set. Bubblewrap will download a minimal SDK.');
  } else {
    logSuccess(`Android SDK found at: ${androidSDK}`);
  }

  // Step 2: Create build directory
  logStep('2/5', 'Setting up build directory...');
  
  const buildDir = path.join(process.cwd(), 'android-build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  logSuccess(`Build directory: ${buildDir}`);

  // Step 3: Create TWA manifest
  logStep('3/5', 'Creating TWA manifest...');
  
  const manifestPath = path.join(buildDir, 'twa-manifest.json');
  const manifest = createTWAManifest(options.url);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  logSuccess('TWA manifest created');

  // Step 4: Show instructions
  logStep('4/5', 'Build Instructions');
  
  console.log('\n' + '─'.repeat(50));
  log('\n📱 To build the APK, you have two options:\n', 'cyan');
  
  log('Option 1: Use PWABuilder (Easiest - Recommended for Demo)', 'green');
  log('─'.repeat(50));
  log('1. First, deploy your app to a public URL (Vercel, Netlify, etc.)');
  log('2. Go to: https://www.pwabuilder.com');
  log('3. Enter your deployed URL');
  log('4. Click "Build My PWA" → Select "Android"');
  log('5. Download the APK!\n');

  log('Option 2: Use Bubblewrap CLI (Local Build)', 'green');
  log('─'.repeat(50));
  log('Run these commands:\n');
  log('  # Install Bubblewrap globally', 'yellow');
  log('  npm install -g @nicolo-ribaudo/pwa-to-apk\n');
  log('  # Navigate to build directory', 'yellow');
  log(`  cd ${buildDir}\n`);
  log('  # Initialize and build', 'yellow');
  log('  npx @nicolo-ribaudo/pwa-to-apk --url ' + options.url + ' --name NextMeal --package com.nextmeal.app\n');

  log('Option 3: Quick Demo APK (Using Android Studio)', 'green');
  log('─'.repeat(50));
  log('1. Download Android Studio: https://developer.android.com/studio');
  log('2. Create a new project → Empty Activity');
  log('3. Use WebView to load your PWA URL');
  log('4. Build APK from Build → Build Bundle(s) / APK(s) → Build APK\n');

  // Step 5: Create a simple WebView wrapper project structure
  logStep('5/5', 'Creating WebView wrapper template...');
  
  const webviewDir = path.join(buildDir, 'webview-wrapper');
  fs.mkdirSync(webviewDir, { recursive: true });
  
  // Create a README with instructions
  const readmeContent = `# NextMeal Android WebView Wrapper

This folder contains a template for creating a simple Android WebView wrapper.

## Quick Start with Android Studio

1. Open Android Studio
2. Create New Project → Empty Activity
3. Package name: com.nextmeal.app
4. Language: Kotlin
5. Minimum SDK: API 21

## MainActivity.kt

Replace the content with:

\`\`\`kotlin
package com.nextmeal.app

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        setContentView(webView)
        
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()
        
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            cacheMode = WebSettings.LOAD_DEFAULT
        }
        
        webView.loadUrl("${options.url}")
    }
    
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
\`\`\`

## AndroidManifest.xml

Add internet permission:

\`\`\`xml
<uses-permission android:name="android.permission.INTERNET" />
\`\`\`

## Build APK

1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. Find APK in: app/build/outputs/apk/debug/app-debug.apk
`;

  fs.writeFileSync(path.join(webviewDir, 'README.md'), readmeContent);
  logSuccess('WebView wrapper template created');

  console.log('\n' + '─'.repeat(50));
  log('\n✅ Setup complete!\n', 'green');
  log(`📁 Build files are in: ${buildDir}`, 'cyan');
  log(`📄 WebView wrapper template: ${webviewDir}/README.md\n`, 'cyan');
  
  log('For a quick demo APK, we recommend using PWABuilder:', 'yellow');
  log('  1. Deploy your Next.js app to Vercel/Netlify', 'yellow');
  log('  2. Go to https://www.pwabuilder.com', 'yellow');
  log('  3. Enter your URL and download the Android APK!\n', 'yellow');
}

// Run the build
buildAPK().catch(console.error);
