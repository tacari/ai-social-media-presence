#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BOLD}Direct Google Places API Testing${NC}"
echo -e "--------------------------------"

# Get API key from .env.local
ENV_FILE=".env.local"
API_KEY=$(grep GOOGLE_PLACES_API_KEY $ENV_FILE | cut -d '=' -f2 | xargs)

# Test 1: Text Search API
echo -e "\n${CYAN}${BOLD}Test 1: Text Search API${NC}"
echo -e "This test searches for 'Google Sydney Australia'"
echo -e "${YELLOW}Sending request...${NC}"

TEXT_SEARCH=$(curl -s "https://maps.googleapis.com/maps/api/place/textsearch/json?query=Google%20Sydney%20Australia&key=$API_KEY")
TEXT_SEARCH_STATUS=$(echo $TEXT_SEARCH | grep -o '"status" : "[^"]*"' | cut -d '"' -f 4)

echo -e "Status: ${BOLD}$TEXT_SEARCH_STATUS${NC}"

if [[ "$TEXT_SEARCH_STATUS" == "OK" ]]; then
  echo -e "${GREEN}✅ Text Search API is working!${NC}"
  
  # Extract place_id from the first result for Test 2
  PLACE_ID=$(echo $TEXT_SEARCH | grep -o '"place_id" : "[^"]*"' | head -1 | cut -d '"' -f 4)
  echo -e "Found Place ID: $PLACE_ID"
else
  echo -e "${RED}❌ Text Search API failed${NC}"
  ERROR_MESSAGE=$(echo $TEXT_SEARCH | grep -o '"error_message" : "[^"]*"' | cut -d '"' -f 4)
  
  if [[ ! -z "$ERROR_MESSAGE" ]]; then
    echo -e "Error message: $ERROR_MESSAGE"
  fi
  
  # Use a default place ID for Test 2
  PLACE_ID="ChIJN1t_tDeuEmsRUsoyG83frY4"
  echo -e "Using default Place ID for next test: $PLACE_ID"
fi

# Test 2: Place Details API
echo -e "\n${CYAN}${BOLD}Test 2: Place Details API${NC}"
echo -e "This test gets details for Place ID: $PLACE_ID"
echo -e "${YELLOW}Sending request...${NC}"

PLACE_DETAILS=$(curl -s "https://maps.googleapis.com/maps/api/place/details/json?place_id=$PLACE_ID&fields=name,formatted_address,rating&key=$API_KEY")
PLACE_DETAILS_STATUS=$(echo $PLACE_DETAILS | grep -o '"status" : "[^"]*"' | cut -d '"' -f 4)

echo -e "Status: ${BOLD}$PLACE_DETAILS_STATUS${NC}"

if [[ "$PLACE_DETAILS_STATUS" == "OK" ]]; then
  echo -e "${GREEN}✅ Place Details API is working!${NC}"
  
  # Extract place name and address
  PLACE_NAME=$(echo $PLACE_DETAILS | grep -o '"name" : "[^"]*"' | cut -d '"' -f 4)
  PLACE_ADDRESS=$(echo $PLACE_DETAILS | grep -o '"formatted_address" : "[^"]*"' | cut -d '"' -f 4)
  PLACE_RATING=$(echo $PLACE_DETAILS | grep -o '"rating" : [0-9.]*' | cut -d ':' -f 2 | xargs)
  
  echo -e "Place: $PLACE_NAME"
  echo -e "Address: $PLACE_ADDRESS"
  echo -e "Rating: $PLACE_RATING ⭐"
else
  echo -e "${RED}❌ Place Details API failed${NC}"
  ERROR_MESSAGE=$(echo $PLACE_DETAILS | grep -o '"error_message" : "[^"]*"' | cut -d '"' -f 4)
  
  if [[ ! -z "$ERROR_MESSAGE" ]]; then
    echo -e "Error message: $ERROR_MESSAGE"
  fi
fi

# Summary
echo -e "\n${BOLD}Test Summary:${NC}"
if [[ "$TEXT_SEARCH_STATUS" == "OK" && "$PLACE_DETAILS_STATUS" == "OK" ]]; then
  echo -e "${GREEN}✅ All tests passed! Google Places API is working properly.${NC}"
  echo -e "${GREEN}✅ Your API key is correctly configured and the Places API is enabled.${NC}"
elif [[ "$TEXT_SEARCH_STATUS" == "REQUEST_DENIED" || "$PLACE_DETAILS_STATUS" == "REQUEST_DENIED" ]]; then
  echo -e "${RED}❌ API access denied. You need to:${NC}"
  echo -e "1. Enable the Places API: https://console.cloud.google.com/apis/library/places-backend.googleapis.com"
  echo -e "2. Ensure billing is enabled for your project"
  echo -e "3. Check if your API key has the correct permissions"
else
  echo -e "${YELLOW}⚠️ Some tests failed. Review the specific error messages above.${NC}"
fi

echo -e "\n${BOLD}Next Steps:${NC}"
echo -e "1. Check the Google Cloud Console: https://console.cloud.google.com/"
echo -e "2. Verify the Places API is enabled"
echo -e "3. Ensure billing is set up"
echo -e "4. Review your API key restrictions (if any)" 