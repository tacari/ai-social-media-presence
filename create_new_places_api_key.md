# Creating a New Google Places API Key

Since we're still experiencing issues with the existing API key, let's create a brand new one with proper configuration. Follow these step-by-step instructions:

## Step 1: Create a New Google Cloud Project (Recommended)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Name it something clear like "Places API Project"
5. Click "Create"
6. Wait for the project to be created and switch to it when done

## Step 2: Enable the Places API

1. With your new project selected, go to the [API Library](https://console.cloud.google.com/apis/library)
2. Search for "Places API"
3. Click on "Places API" in the results
4. Click the "Enable" button
5. Wait for the API to be enabled

## Step 3: Enable Billing (Required for Places API)

1. You'll be prompted to enable billing if not already set up
2. Go to [Billing](https://console.cloud.google.com/billing)
3. Click "Link a billing account"
4. Follow the steps to set up billing with a credit card
   - Note: You typically won't be charged if you stay within the free tier limits

## Step 4: Create a New API Key

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials"
3. Select "API key"
4. Your new API key will be created and displayed
5. Copy the API key to a safe place

## Step 5: Restrict the API Key (Recommended)

1. In the API key list, find your new key
2. Click "Edit API key"
3. Under "API restrictions", select "Restrict key"
4. From the dropdown, select "Places API"
5. Click "Save"

## Step 6: Update Your Environment Variable

1. Open your `.env.local` file
2. Replace the old API key with your new one:
   ```
   GOOGLE_PLACES_API_KEY=your_new_api_key_here
   ```
3. Save the file

## Step 7: Test the New API Key

Run the test script with your new API key:
```bash
./test_api_directly.sh
```

## Troubleshooting the New Key

If you still encounter issues with the new key:
1. Make sure you created the key in the same project where you enabled the Places API
2. Verify billing is properly set up
3. Check that you don't have overly restrictive application restrictions

## Note on Google Cloud Free Tier

- Google Cloud offers a free tier for the Places API
- You get a monthly $200 credit for Google Cloud services
- Places API costs $17 per 1,000 requests for basic data
- For your use case of fetching reviews, this should be well within the free limits 