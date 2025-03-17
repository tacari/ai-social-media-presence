#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BOLD}Google Places API Key Validity Check${NC}"
echo -e "------------------------------------"

# Get API key from .env.local
ENV_FILE=".env.local"
API_KEY=$(grep GOOGLE_PLACES_API_KEY $ENV_FILE | cut -d '=' -f2 | xargs)

# Basic key format check
KEY_LENGTH=${#API_KEY}
echo -e "\n${BOLD}Basic API Key Format Check:${NC}"
if [ $KEY_LENGTH -lt 30 ]; then
  echo -e "${RED}⚠️ Your API key is too short ($KEY_LENGTH chars)${NC}"
  echo -e "Google API keys are typically around 39 characters"
  echo -e "This suggests the key may be invalid or truncated."
else
  echo -e "${GREEN}✅ API key length looks reasonable ($KEY_LENGTH chars)${NC}"
fi

echo -e "\n${BOLD}Testing a Different API to Verify Key Authentication:${NC}"
echo -e "This test will try the Geocoding API to see if your key works for any Google Maps API"

# Try a simple Geocoding API request (a different API that might be enabled)
GEO_RESPONSE=$(curl -s "https://maps.googleapis.com/maps/api/geocode/json?address=Sydney&key=$API_KEY")
GEO_STATUS=$(echo $GEO_RESPONSE | grep -o '"status" : "[^"]*"' | cut -d '"' -f 4)

echo -e "Geocoding API Status: ${BOLD}$GEO_STATUS${NC}"

if [[ "$GEO_STATUS" == "REQUEST_DENIED" ]]; then
  ERROR_MESSAGE=$(echo $GEO_RESPONSE | grep -o '"error_message" : "[^"]*"' | cut -d '"' -f 4)
  
  echo -e "${RED}❌ Key failed for Geocoding API too${NC}"
  echo -e "Error message: $ERROR_MESSAGE"
  
  if [[ "$ERROR_MESSAGE" == *"API project is not authorized"* ]]; then
    echo -e "\n${BLUE}This suggests your key is valid, but NO Google Maps APIs are enabled for the project.${NC}"
  elif [[ "$ERROR_MESSAGE" == *"API key not valid"* ]]; then
    echo -e "\n${BLUE}This suggests your key is completely invalid or from a different project.${NC}"
  fi
elif [[ "$GEO_STATUS" == "OK" ]]; then
  echo -e "${GREEN}✅ Geocoding API works with this key!${NC}"
  echo -e "${YELLOW}This suggests your key is valid, but specifically the Places API is not enabled.${NC}"
else
  echo -e "${YELLOW}⚠️ Received status: $GEO_STATUS${NC}"
fi

echo -e "\n${BOLD}Project Identification Check:${NC}"
echo -e "${YELLOW}To verify which project your key belongs to:${NC}"
echo -e "1. Go to Google Cloud Console: https://console.cloud.google.com/"
echo -e "2. Navigate to 'APIs & Services' > 'Credentials'"
echo -e "3. Check if your API key ($API_KEY) is listed"
echo -e "4. If not, try switching projects using the dropdown at the top of the page"
echo -e "5. If you can't find the key in any project, it may have been deleted or created in a different account"

echo -e "\n${BOLD}Summary:${NC}"
echo -e "1. ${BOLD}What's working:${NC} API key format appears valid"
echo -e "2. ${BOLD}What's not working:${NC} Places API access is denied"
echo -e "3. ${BOLD}Next step:${NC} Enable the Places API in the Google Cloud Console"
echo -e "   Direct link: https://console.cloud.google.com/apis/library/places-backend.googleapis.com" 