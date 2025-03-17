#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BOLD}Google Places API Key Troubleshooting${NC}"
echo -e "---------------------------------------------"

# Get API key from .env.local and check for format issues
ENV_FILE=".env.local"
RAW_KEY=$(grep GOOGLE_PLACES_API_KEY $ENV_FILE | cut -d '=' -f2)

# Check for whitespace or quotes that might be causing issues
TRIMMED_KEY=$(echo "$RAW_KEY" | xargs)
if [ "$RAW_KEY" != "$TRIMMED_KEY" ]; then
  echo -e "${RED}⚠️ Warning: Your API key has leading/trailing whitespace or quotes${NC}"
  echo -e "Original: '$RAW_KEY'"
  echo -e "Trimmed:  '$TRIMMED_KEY'"
  
  # Use the trimmed key for testing
  API_KEY=$TRIMMED_KEY
else
  echo -e "${GREEN}✅ API key format looks good${NC}"
  API_KEY=$RAW_KEY
fi

# Check for API key length (Google Cloud API keys are typically 39 characters)
KEY_LENGTH=${#API_KEY}
if [ $KEY_LENGTH -lt 30 ]; then
  echo -e "${RED}⚠️ Warning: Your API key seems too short ($KEY_LENGTH chars)${NC}"
  echo -e "Google API keys are typically around 39 characters"
fi

echo -e "\n${BOLD}Trying simplified API test:${NC}"
echo -e "(This test ignores restrictions and just checks basic connectivity)"

# Simple test with minimal parameters
SIMPLE_TEST_RESPONSE=$(curl -s "https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJN1t_tDeuEmsRUsoyG83frY4&fields=name&key=$API_KEY")
STATUS=$(echo $SIMPLE_TEST_RESPONSE | grep -o '"status" : "[^"]*"' | cut -d '"' -f 4)

echo -e "API Status: $STATUS"

if [ "$STATUS" = "REQUEST_DENIED" ]; then
  ERROR_MESSAGE=$(echo $SIMPLE_TEST_RESPONSE | grep -o '"error_message" : "[^"]*"' | cut -d '"' -f 4)
  echo -e "${RED}❌ API test failed${NC}"
  echo -e "Error message: $ERROR_MESSAGE"
  
  echo -e "\n${BOLD}Likely issues:${NC}"
  echo -e "1. Places API not enabled in Google Cloud Console"
  echo -e "2. Billing not enabled for your Google Cloud project"
  echo -e "3. API key not authorized for Places API"
  echo -e "4. The API key might have been revoked or is invalid"
elif [ "$STATUS" = "INVALID_REQUEST" ]; then
  echo -e "${YELLOW}⚠️ Invalid request - check parameters${NC}"
elif [ "$STATUS" = "OK" ]; then
  echo -e "${GREEN}✅ API key works!${NC}"
  echo -e "The problem might be with the specific parameters in your application."
else
  echo -e "${YELLOW}⚠️ Received status: $STATUS${NC}"
fi

echo -e "\n${BOLD}API Troubleshooting Steps:${NC}"
echo -e "1. Go to the Google Cloud Console: https://console.cloud.google.com/"
echo -e "2. Select your project"
echo -e "3. Navigate to 'APIs & Services' > 'Dashboard'"
echo -e "4. Check if 'Places API' is enabled (if not, click '+ ENABLE APIS AND SERVICES')"
echo -e "5. Go to 'APIs & Services' > 'Credentials'"
echo -e "6. Check your API key and ensure it has Places API in the 'API restrictions' (if any)"
echo -e "7. Make sure billing is enabled for your project" 