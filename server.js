const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors'); // Add this

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' })); // Allow requests from frontend origin

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceaccountkey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

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
      res.status(404).json({ exists: false }); // This is what your frontend is receiving
    }
  } catch (err) {
    console.error('Error getting marshall:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});