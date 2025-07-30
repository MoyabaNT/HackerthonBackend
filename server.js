const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

// Initialize Firebase Admin SDK
const serviceAccount = require('./service-account-key.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Test endpoint
app.get('/', (req, res) => {
  res.send('Firestore Backend is running');
});

// Create user document
app.post('/api/users', async (req, res) => {
  try {
    const { uid, username, association } = req.body;
    if (!uid || !username || !association) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await db.collection('users').doc(uid).set({
      username,
      association,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});