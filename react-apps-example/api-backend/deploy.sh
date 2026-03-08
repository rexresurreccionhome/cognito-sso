#!/bin/bash

# Lambda Deployment Script for Cognito SSO API
# This script creates a production-ready deployment package for AWS Lambda

echo "🚀 Creating Lambda deployment package..."

# Install production dependencies only
echo "📦 Installing production dependencies..."
npm install --production --silent

# Create deployment zip with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ZIPFILE="lambda-deployment-${TIMESTAMP}.zip"

echo "📁 Creating deployment zip: $ZIPFILE"

# Create zip excluding development files
zip -r "$ZIPFILE" . -x \
  "*.git*" \
  "*.env*" \
  "Dockerfile" \
  "README.md" \
  "serverless.yml" \
  "*.zip" \
  "deploy.sh" \
  "node_modules/*/test/*" \
  "node_modules/*/tests/*" \
  "node_modules/*/*.md" \
  "node_modules/*/README*" \
  "node_modules/*/CHANGELOG*" \
  "node_modules/*/LICENSE*" \
  > /dev/null

# Check if zip was created successfully
if [ -f "$ZIPFILE" ]; then
    FILE_SIZE=$(ls -lah "$ZIPFILE" | awk '{print $5}')
    echo "✅ Deployment package created successfully!"
    echo "📦 File: $ZIPFILE"
    echo "📏 Size: $FILE_SIZE"
    echo ""
    echo "🌐 Ready to upload to AWS Lambda!"
    echo "💡 You can now upload this zip file to your Lambda function via:"
    echo "   - AWS Console (Functions → Upload from → .zip file)"
    echo "   - AWS CLI: aws lambda update-function-code --function-name YOUR_FUNCTION --zip-file fileb://$ZIPFILE"
else
    echo "❌ Error: Failed to create deployment package"
    exit 1
fi