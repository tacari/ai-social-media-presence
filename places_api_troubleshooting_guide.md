# Google Places API Troubleshooting Guide

## Current Status
Your Google Places API is returning the error:
```
This API project is not authorized to use this API.
```

This specific error indicates that the Places API is not enabled for your Google Cloud project.

## Step-by-Step Troubleshooting

### 1. Verify API Key Format ✅
- Your API key format looks good
- The key is correctly stored in `.env.local`
- The application correctly reads the key

### 2. Enable the Places API in Google Cloud Console ❓
Follow these steps to enable the Places API:

1. **Sign in to your Google Cloud Console**
   - Go to: https://console.cloud.google.com/

2. **Select the correct project**
   - Check the project dropdown at the top of the page
   - Make sure you're working with the project that owns your API key

3. **Navigate to the API Library**
   - Go to: APIs & Services > Library
   - Direct link: https://console.cloud.google.com/apis/library

4. **Find and enable the Places API**
   - Search for "Places API"
   - Select "Places API" from the results
   - Click the "ENABLE" button
   - Direct link: https://console.cloud.google.com/apis/library/places-backend.googleapis.com

### 3. Check Billing Status ❓
The Places API requires that billing is enabled on your Google Cloud project:

1. **Go to Billing**
   - Navigate to: Billing
   - Direct link: https://console.cloud.google.com/billing

2. **Link a billing account to your project**
   - If you don't have a billing account, create one
   - Link it to your project
   - Note: A credit card is required, but Google offers a free tier with credits

### 4. Check API Key Restrictions (Optional) ✅
You mentioned that your API key doesn't have restrictions, which is fine for testing:

1. **To verify API key settings:**
   - Go to: APIs & Services > Credentials
   - Find your API key in the list
   - Check if there are any API restrictions or application restrictions

2. **For production, consider adding restrictions:**
   - API restrictions: Limit to Places API only
   - Application restrictions: Limit to your website/server

### 5. Check for Quota Issues ❓
If you've recently enabled the API, verify you haven't hit quotas:

1. **Go to API Dashboard**
   - Navigate to: APIs & Services > Dashboard
   - Select "Places API" from the list
   - Check quota usage

### 6. Test After Making Changes
After making any changes in the Google Cloud Console, run the test script again:
```bash
./test_api_directly.sh
```

## Common Issues & Solutions

### 1. Wrong Project Selected
Make sure you're enabling the Places API on the same project that contains your API key.

### 2. Billing Not Set Up
Even if you're within the free tier, you must set up billing for the Places API.

### 3. API Key From Different Project
Verify that your API key belongs to the project where you enabled the Places API.

### 4. Propagation Delay
After enabling the API, it can take a few minutes to propagate.

### 5. Key Restrictions Too Tight
If you have API restrictions, make sure "Places API" is selected.

## Verifying Success
When the API is properly enabled and working, you should see:
```
✅ All tests passed! Google Places API is working properly.
```

## Additional Resources
- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Troubleshooting API Key Issues](https://developers.google.com/maps/documentation/javascript/error-messages)

---

## Need More Help?
If you've followed all these steps and still have issues:

1. Check the error message for any changes or additional details
2. Verify the project ID in Google Cloud Console matches the project that owns your API key
3. Try creating a new API key specifically for Places API testing
4. Check Google Cloud Status Dashboard for any outages: https://status.cloud.google.com/ 