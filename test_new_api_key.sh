#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

if [ "$#" -ne 1 ]; then
    echo -e "${RED}Usage: $0 <new_api_key>${NC}"
    echo -e "Example: $0 AIzaSyX1a2b3c4d5e6f7g8h9i0j"
    exit 1
fi

NEW_API_KEY=$1

echo -e "${BOLD}Testing New Google Places API Key${NC}"
echo -e "--------------------------------"
echo -e "Using API Key: ${YELLOW}$NEW_API_KEY${NC}"

# Test 1: Text Search API
echo -e "\n${CYAN}${BOLD}Test 1: Text Search API${NC}"
echo -e "This test searches for 'Google Sydney Australia'"
echo -e "${YELLOW}Sending request...${NC}"

TEXT_SEARCH=$(curl -s "https://maps.googleapis.com/maps/api/place/textsearch/json?query=Google%20Sydney%20Australia&key=$NEW_API_KEY")
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

PLACE_DETAILS=$(curl -s "https://maps.googleapis.com/maps/api/place/details/json?place_id=$PLACE_ID&fields=name,formatted_address,rating&key=$NEW_API_KEY")
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
  echo -e "${GREEN}✅ Your new API key works! Now update it in your .env.local file:${NC}"
  echo -e "${CYAN}GOOGLE_PLACES_API_KEY=$NEW_API_KEY${NC}"
elif [[ "$TEXT_SEARCH_STATUS" == "REQUEST_DENIED" || "$PLACE_DETAILS_STATUS" == "REQUEST_DENIED" ]]; then
  echo -e "${RED}❌ API access denied. Make sure you have:${NC}"
  echo -e "1. Enabled the Places API in your project"
  echo -e "2. Enabled billing for your project"
  echo -e "3. Created the API key in the same project as the enabled API"
  echo -e "4. Not set overly restrictive API key restrictions"
else
  echo -e "${YELLOW}⚠️ Some tests failed. Review the specific error messages above.${NC}"
fi 