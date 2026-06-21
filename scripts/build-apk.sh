#!/bin/bash
# Sada — Build Android APK script
# Usage: ./scripts/build-apk.sh [debug|release]

set -e

BUILD_TYPE=${1:-debug}
PROJECT_ROOT="/home/z/my-project"
ANDROID_SDK="${ANDROID_HOME:-/home/z/android-sdk}"
JAVA_HOME="${JAVA_HOME:-/home/z/jdk}"

export ANDROID_HOME="$ANDROID_SDK"
export ANDROID_SDK_ROOT="$ANDROID_SDK"
export JAVA_HOME="$JAVA_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_SDK/cmdline-tools/latest/bin:$ANDROID_SDK/platform-tools:$PATH"

echo "🎙️  Sada APK Builder"
echo "===================="
echo "Build type: $BUILD_TYPE"
echo "JAVA_HOME: $JAVA_HOME"
echo "ANDROID_HOME: $ANDROID_HOME"
echo ""

# Step 1: Build Next.js
echo "📦 Step 1/4: Building Next.js..."
cd "$PROJECT_ROOT"
npm run build

# Step 2: Sync Capacitor
echo ""
echo "🔄 Step 2/4: Syncing Capacitor..."
npx cap sync android

# Step 3: Build APK
echo ""
echo "🏗️  Step 3/4: Building APK..."
cd "$PROJECT_ROOT/android"
if [ "$BUILD_TYPE" = "release" ]; then
    ./gradlew assembleRelease
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
else
    ./gradlew assembleDebug
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

# Step 4: Copy to download folder
echo ""
echo "📋 Step 4/4: Copying APK..."
mkdir -p "$PROJECT_ROOT/download"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_NAME="Sada-v1.0-${BUILD_TYPE}-${TIMESTAMP}.apk"
cp "$PROJECT_ROOT/android/$APK_PATH" "$PROJECT_ROOT/download/$OUTPUT_NAME"

echo ""
echo "✅ Success!"
echo "===================="
echo "APK saved to: $PROJECT_ROOT/download/$OUTPUT_NAME"
ls -lh "$PROJECT_ROOT/download/$OUTPUT_NAME"
echo ""
echo "📱 Install on device:"
echo "   adb install $PROJECT_ROOT/download/$OUTPUT_NAME"
echo ""
echo "📦 Share with users:"
echo "   Upload to Google Drive / WeTransfer and share the link"
