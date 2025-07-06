# 🔥 Firebase Setup Guide for New Project

## Step 1: Get Firebase Web App Configuration (Frontend)

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your NEW project** (not tf-25-registration-form)
3. **Add a web app**:

   - Click the web icon `</>`
   - Give it a name like "Tech Fiesta Frontend"
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"

4. **Copy the config object** - it will look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop",
  measurementId: "G-XXXXXXXXXX",
};
```

5. **Update your frontend `.env.local`** with these values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Step 2: Get Service Account Key (Backend)

1. **In the same Firebase project**, go to **Project Settings** ⚙️
2. **Navigate to Service Accounts tab**
3. **Generate new private key**:

   - Click "Generate new private key"
   - A JSON file will be downloaded

4. **Open the downloaded JSON file** (it should look like this):

```json
{
  "type": "service_account",
  "project_id": "your-new-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwgg...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-new-project-id.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-new-project-id.iam.gserviceaccount.com"
}
```

5. **Update your backend `.env`** with:

```env
FIREBASE_PROJECT_ID=your-new-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-new-project-id",...entire JSON here...}
```

## Step 3: Enable Required Firebase Services

### 3a. Enable Firestore Database

1. **Go to Firestore Database** in Firebase Console
2. **Create database**
3. **Choose "Start in test mode"** for development
4. **Select a location** (choose closest to your users)

### 3b. Enable Authentication

1. **Go to Authentication** in Firebase Console
2. **Get Started** (if first time)
3. **Sign-in method tab**
4. **Enable Google** provider:
   - Click on Google
   - Enable it
   - Add `localhost:3000` to authorized domains
   - Save

## Step 4: Test Your Configuration

1. **Update both .env files** with your new project details
2. **Test backend**:

```bash
cd backend
npm run dev
```

You should see:

```
✅ Firebase Admin SDK initialized successfully
Server running on port 5000
```

3. **Test frontend**:

```bash
cd frontend
npm run dev
```

Visit http://localhost:3000 and try to access the registration page.

## 🚨 Security Notes

- **Never commit** the actual service account key to version control
- **Keep the .env file** in .gitignore
- **Use environment variables** in production
- **Rotate keys regularly** in production environments

## 📋 Quick Setup Checklist

- [ ] Downloaded Firebase service account JSON
- [ ] Updated FIREBASE_SERVICE_ACCOUNT_KEY in backend/.env
- [ ] Created Firestore database
- [ ] Enabled Google authentication
- [ ] Added localhost:3000 to authorized domains
- [ ] Tested backend server startup
- [ ] Verified Firebase Admin SDK initialization

## 🆘 Troubleshooting

**Error: "Firebase Admin SDK not initialized"**

- Check that FIREBASE_SERVICE_ACCOUNT_KEY is properly formatted JSON
- Ensure the private key includes \n characters
- Verify the project_id matches your Firebase project

**Error: "Permission denied"**

- Ensure Firestore rules allow read/write access
- Check that the service account has proper permissions

**Error: "Authentication failed"**

- Verify Google authentication is enabled in Firebase Console
- Check that your domain is in the authorized domains list
