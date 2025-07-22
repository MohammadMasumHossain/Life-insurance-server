const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB connection URI with environment variables
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.da72plu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoDB client setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect to MongoDB cluster
    await client.connect();
    console.log('Connected to MongoDB successfully!');

    const db = client.db('life-insurance');
    const usersCollection = db.collection('users');
    const policiesCollection = db.collection('policies');
    const applicationsCollection = db.collection('applications');  // Collection for applications

    // Get all users
    app.get('/users', async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.json(users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Get policies with pagination and optional category filter
    app.get('/policies', async (req, res) => {
      try {
        const page = Math.max(1, parseInt(req.query.page)) || 1;
        const limit = Math.min(Math.max(1, parseInt(req.query.limit)), 50) || 9; // max 50 per page
        const skip = (page - 1) * limit;
        const category = req.query.category;

        const filter = category && category !== 'All' ? { category } : {};

        const total = await policiesCollection.countDocuments(filter);
        const data = await policiesCollection.find(filter).skip(skip).limit(limit).toArray();

        res.json({ total, page, limit, data });
      } catch (error) {
        console.error('Failed to fetch policies:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Get a single policy by ID
    app.get('/policies/:id', async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid policy ID format' });
      }

      try {
        const policy = await policiesCollection.findOne({ _id: new ObjectId(id) });
        if (!policy) {
          return res.status(404).json({ message: 'Policy not found' });
        }
        res.json(policy);
      } catch (error) {
        console.error('Failed to fetch policy by ID:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // POST a user (create if doesn't exist)
    app.post('/users', async (req, res) => {
      const { email, name, role = 'customer', photo } = req.body;

      if (!email || !name) {
        return res.status(400).json({ message: 'Name and email are required' });
      }

      const existingUser = await usersCollection.findOne({ email });

      if (existingUser) {
        return res.status(409).json({ message: 'User already exists' });
      }

      const result = await usersCollection.insertOne({ email, name, role, photo });
      res.status(201).json({ message: 'User created', insertedId: result.insertedId });
    });

    // POST insurance application form data
    app.post('/applications', async (req, res) => {
      const application = req.body;

      if (!application.fullName || !application.email) {
        return res.status(400).json({ message: 'Full Name and Email are required' });
      }

      try {
        // Add submittedAt timestamp if not present
        if (!application.submittedAt) {
          application.submittedAt = new Date();
        }
        // Default status to Pending if not provided
        if (!application.status) {
          application.status = 'Pending';
        }

        const result = await applicationsCollection.insertOne(application);
        res.status(201).json({ message: 'Application submitted', insertedId: result.insertedId });
      } catch (error) {
        console.error('Failed to save application:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1); // Exit process with failure code
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Life Insurance Platform API Running!');
});

app.listen(port, () => {
  console.log(`Life Insurance app listening on port ${port}`);
});
