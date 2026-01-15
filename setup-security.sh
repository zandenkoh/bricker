#!/bin/bash

# Firebase Security Setup Script
# This script helps you securely manage Firebase credentials

echo "🔒 Firebase Security Setup"
echo "=================================="
echo ""

# Check if .env file exists
if [ -f .env ] || [ -f .env.local ]; then
    echo "⚠️  WARNING: .env file found in repository!"
    echo "This file should NOT be committed to GitHub"
    echo ""
fi

# Check if credentials are in index.js
if grep -q "apiKey.*AIzaSy" index.js 2>/dev/null; then
    echo "⚠️  WARNING: Firebase credentials found in index.js"
    echo "This is a security risk if your GitHub repo is public!"
    echo ""
    echo "Steps to fix:"
    echo "1. Go to Firebase Console → Project Settings"
    echo "2. Delete the exposed API key"
    echo "3. Create a new API key with restrictions"
    echo "4. Move credentials to .env.local (in .gitignore)"
    echo "5. Load credentials from environment variables"
    echo ""
fi

# Check .gitignore
if [ -f .gitignore ]; then
    if grep -q ".env" .gitignore; then
        echo "✅ .gitignore correctly ignores .env files"
    else
        echo "⚠️  .env files are not in .gitignore!"
        echo "Adding them now..."
        echo ".env" >> .gitignore
        echo ".env.local" >> .gitignore
        echo ".env.*.local" >> .gitignore
    fi
else
    echo "⚠️  No .gitignore found. Creating one..."
    echo ".env" > .gitignore
    echo ".env.local" >> .gitignore
fi

echo ""
echo "📋 Next Steps:"
echo "1. Copy .env.example to .env.local"
echo "2. Update .env.local with your new Firebase API key"
echo "3. Update index.js to load credentials from environment"
echo "4. Deploy new database security rules"
echo "5. Test rules using Firebase Console Rules Simulator"
echo ""
echo "✅ Setup complete!"
