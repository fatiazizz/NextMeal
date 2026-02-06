#!/bin/bash

# NextMeal PWA to APK Build Script
# =================================
# This script helps you build an APK from your PWA using Bubblewrap

set -e

echo "🍽️  NextMeal APK Builder"
echo "========================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Java is installed
check_java() {
    if ! command -v java &> /dev/null; then
        echo -e "${RED}❌ Java is not installed.${NC}"
        echo "Please install JDK 11 or higher:"
        echo "  - macOS: brew install openjdk@11"
        echo "  - Ubuntu: sudo apt install openjdk-11-jdk"
        exit 1
    fi
    echo -e "${GREEN}✓ Java is installed${NC}"
}

# Check if Android SDK is set up
check_android_sdk() {
    if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
        echo -e "${YELLOW}⚠️  ANDROID_HOME is not set.${NC}"
        echo ""
        echo "For demo purposes, Bubblewrap can download a minimal Android SDK."
        echo "But for production, install Android Studio and set ANDROID_HOME."
        echo ""
    else
        echo -e "${GREEN}✓ Android SDK found${NC}"
    fi
}

# Check if Bubblewrap is installed
check_bubblewrap() {
    if ! command -v bubblewrap &> /dev/null; then
        echo -e "${YELLOW}📦 Installing Bubblewrap CLI...${NC}"
        npm install -g @nicolo-ribaudo/pwa-to-apk @nicolo-ribaudo/pwa-to-apk 2>/dev/null || npm install -g @nicolo-ribaudo/pwa-to-apk
        # Fallback to bubblewrap
        if ! command -v bubblewrap &> /dev/null; then
            npm install -g @nicolo-ribaudo/pwa-to-apk
        fi
    fi
    echo -e "${GREEN}✓ Bubblewrap/PWA-to-APK ready${NC}"
}

# Main build function
build_apk() {
    echo ""
    echo -e "${YELLOW}🔨 Building APK...${NC}"
    echo ""
    
    # Create android directory if it doesn't exist
    mkdir -p android-build
    cd android-build
    
    # Check if twa-manifest exists in parent
    if [ -f "../twa-manifest.json" ]; then
        cp ../twa-manifest.json ./twa-manifest.json
    fi
    
    echo "Starting Bubblewrap build process..."
    echo ""
    
    # Initialize TWA project
    if [ ! -d "app" ]; then
        echo "Initializing new TWA project..."
        bubblewrap init --manifest ../twa-manifest.json
    fi
    
    # Build the APK
    bubblewrap build
    
    # Copy APK to output directory
    if [ -f "app-release-signed.apk" ]; then
        cp app-release-signed.apk ../nextmeal.apk
        echo ""
        echo -e "${GREEN}✅ APK built successfully!${NC}"
        echo -e "📱 APK location: ${YELLOW}nextmeal.apk${NC}"
    elif [ -f "app-release-unsigned.apk" ]; then
        cp app-release-unsigned.apk ../nextmeal-unsigned.apk
        echo ""
        echo -e "${GREEN}✅ Unsigned APK built!${NC}"
        echo -e "📱 APK location: ${YELLOW}nextmeal-unsigned.apk${NC}"
    fi
    
    cd ..
}

# Quick build using pwa-to-apk
quick_build() {
    echo ""
    echo -e "${YELLOW}🚀 Quick APK Build (for demo)${NC}"
    echo ""
    
    # Get the URL
    URL=${1:-"http://localhost:3000"}
    
    echo "Building APK for: $URL"
    echo ""
    
    npx @nicolo-ribaudo/pwa-to-apk --url "$URL" --name "NextMeal" --package "com.nextmeal.app" --output ./nextmeal.apk
    
    if [ -f "nextmeal.apk" ]; then
        echo ""
        echo -e "${GREEN}✅ APK built successfully!${NC}"
        echo -e "📱 APK location: ${YELLOW}./nextmeal.apk${NC}"
    fi
}

# Show help
show_help() {
    echo "Usage: ./build-apk.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  --quick [URL]    Quick build using pwa-to-apk (default: localhost:3000)"
    echo "  --full           Full build using Bubblewrap"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./build-apk.sh --quick"
    echo "  ./build-apk.sh --quick https://your-app.com"
    echo "  ./build-apk.sh --full"
}

# Main
main() {
    echo ""
    check_java
    check_android_sdk
    
    case "${1:-}" in
        --quick)
            quick_build "${2:-http://localhost:3000}"
            ;;
        --full)
            check_bubblewrap
            build_apk
            ;;
        --help)
            show_help
            ;;
        *)
            echo ""
            echo "No option specified. Use --help for usage info."
            echo ""
            echo "For a quick demo APK, run:"
            echo -e "  ${YELLOW}./scripts/build-apk.sh --quick${NC}"
            echo ""
            ;;
    esac
}

main "$@"
