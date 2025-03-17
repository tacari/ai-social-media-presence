#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BOLD}Checking for API Key Configuration Information${NC}"
echo -e "---------------------------------------------"

# Get API key from .env.local
ENV_FILE=".env.local"
API_KEY=$(grep GOOGLE_PLACES_API_KEY $ENV_FILE | cut -d '=' -f2 | xargs)

echo -e "${YELLOW}NOTE: This script cannot directly check which APIs are enabled on your Google Cloud project.${NC}"
echo -e "${YELLOW}You'll need to check that manually in the Google Cloud Console.${NC}"
echo -e "URL: https://console.cloud.google.com/apis/dashboard"

echo -e "\n${BOLD}API Key Metadata Check:${NC}"
# Call a standard API endpoint that might give helpful info
META_RESPONSE=$(curl -s "https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJN1t_tDeuEmsRUsoyG83frY4&fields=name&key=$API_KEY")

# Extract error message if there is one
ERROR_MESSAGE=$(echo $META_RESPONSE | grep -o '"error_message" : "[^"]*"' | cut -d '"' -f 4)

if [[ ! -z "$ERROR_MESSAGE" ]]; then
  echo -e "${RED}Error from Google API:${NC} $ERROR_MESSAGE"
  
  # Process common error messages
  if [[ "$ERROR_MESSAGE" == *"not authorized to use this API"* ]]; then
    echo -e "\n${BOLD}Solution:${NC}"
    echo -e "1. Go to: https://console.cloud.google.com/apis/library/places-backend.googleapis.com"
    echo -e "2. Make sure you've selected the correct project"
    echo -e "3. Click 'Enable' to activate the Places API for your project"
    echo -e "4. Ensure billing is enabled for your project"
  elif [[ "$ERROR_MESSAGE" == *"API key not valid"* ]]; then
    echo -e "\n${BOLD}Solution:${NC}"
    echo -e "Your API key appears to be invalid. Generate a new API key in the Google Cloud Console."
  elif [[ "$ERROR_MESSAGE" == *"exceeded"* ]]; then
    echo -e "\n${BOLD}Solution:${NC}"
    echo -e "You've exceeded your quota limits. Check your usage in the Google Cloud Console."
  fi
fi

echo -e "\n${BOLD}Billing Check:${NC}"
echo -e "${YELLOW}⚠️ Important: The Places API requires billing to be enabled${NC}"
echo -e "To check if billing is enabled:"
echo -e "1. Go to: https://console.cloud.google.com/billing/linkedaccount"
echo -e "2. Verify that your project is linked to a billing account"
echo -e "3. If not, add a billing account (credit card required)"

echo -e "\n${BOLD}Checklist for Google Places API:${NC}"
echo -e "□ Places API is enabled for your project"
echo -e "□ Billing is enabled for your project"
echo -e "□ API key has correct permissions"
echo -e "□ You are within your quota limits" 