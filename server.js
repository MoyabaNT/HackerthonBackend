require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const SibApiV3Sdk = require('@getbrevo/brevo');

const app = express();
app.use(express.json());
app.use(cors({ origin: 'https://farefare.netlify.app' })); // Update with your Netlify URL

// Initialize Firebase Admin SDK with environment variables
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle newlines
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Brevo SMS Setup
const apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalSMSApi();

const apiClient = SibApiV3Sdk.ApiClient.instance;
apiClient.authentications['api-key'].apiKey = apiKey;

// Test endpoint
app.get('/', (req, res) => {
  res.send('Firestore Backend is running');
});

// Create marshall document
app.post('/api/marshalls', async (req, res) => {
  try {
    const { uid, username, email, association } = req.body;
    if (!uid || !username || !email || !association) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await db.collection('marshalls').doc(uid).set({
      username,
      email,
      association,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ message: 'Marshall created successfully' });
  } catch (error) {
    console.error('Error creating marshall:', error);
    res.status(500).json({ error: 'Failed to create marshall' });
  }
});

app.get('/api/marshalls/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const doc = await db.collection('marshalls').doc(uid).get();

    if (doc.exists) {
      res.status(200).json({ exists: true, data: doc.data() });
    } else {
      res.status(404).json({ exists: false });
    }
  } catch (err) {
    console.error('Error getting marshall:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint to send SMS to next of kin
app.post('/api/send-trip-sms', async (req, res) => {
  const { nextOfKinPhone, tripDetails } = req.body;

  if (!nextOfKinPhone || !tripDetails) {
    return res.status(400).json({ error: 'Missing phone number or trip details' });
  }

  const sendSms = new SibApiV3Sdk.SendTransacSms();
  sendSms.sender = 'Farfare'; // Replace with your registered sender ID
  sendSms.recipient = nextOfKinPhone; // e.g., "+1234567890"
  sendSms.content = `Trip Details: ${tripDetails}. Contact support if needed.`;
  sendSms.type = 'transactional';

  try {
    const response = await apiInstance.sendTransacSms(sendSms);
    res.status(200).json({ message: 'SMS sent successfully', data: response });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Vercel requires a handler export for serverless functions
module.exports = app;