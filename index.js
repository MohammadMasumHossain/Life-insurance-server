// server.js
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.da72plu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoDB client setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ----- tiny helpers -----
const isValidObjectId = (id) => ObjectId.isValid(id);
const toObjectId = (id) => new ObjectId(id);

// Build a policy object from req.body, safely (no Joi here to keep deps light)
function buildPolicyFromBody(body, isUpdate = false) {
  const {
    title,
    category,
    policyType,
    description,
    image,
    coverageAmount,
    termDuration, // string e.g. "30 years"
    popularity,
    eligibility = {},
    healthConditionsExcluded = [],
    benefits = {},
    premiumCalculation = {},
    paymentOptions = [],
    termLengthOptions = [],
    renewable,
    convertible,
  } = body;

  // For POST, these must be present
  if (!isUpdate) {
    if (!title || !category || !policyType || !description) {
      return { error: 'title, category, policyType & description are required' };
    }
  }

  const doc = {};
  if (title !== undefined) doc.title = title;
  if (category !== undefined) doc.category = category;
  if (policyType !== undefined) doc.policyType = policyType;
  if (description !== undefined) doc.description = description;
  if (image !== undefined) doc.image = image;

  if (coverageAmount !== undefined) doc.coverageAmount = Number(coverageAmount);
  if (termDuration !== undefined) doc.termDuration = termDuration;
  if (popularity !== undefined) doc.popularity = Number(popularity) || 0;

  if (eligibility !== undefined) {
    doc.eligibility = {
      minAge: Number(eligibility.minAge ?? 0),
      maxAge: Number(eligibility.maxAge ?? 0),
      residency: eligibility.residency ?? '',
      medicalExamRequired: !!eligibility.medicalExamRequired,
    };
  }

  if (Array.isArray(healthConditionsExcluded)) {
    doc.healthConditionsExcluded = healthConditionsExcluded;
  }

  if (benefits !== undefined) {
    doc.benefits = {
      deathBenefit: benefits.deathBenefit ?? '',
      taxBenefits: benefits.taxBenefits ?? '',
      accidentalDeathRider: !!benefits.accidentalDeathRider,
      criticalIllnessRider: !!benefits.criticalIllnessRider,
      waiverOfPremium: benefits.waiverOfPremium ?? '',
    };
  }

  if (premiumCalculation !== undefined) {
    doc.premiumCalculation = {
      baseRatePerThousand: Number(premiumCalculation.baseRatePerThousand ?? 0),
      ageFactor: premiumCalculation.ageFactor || {}, // object of ranges -> factor
      smokerSurchargePercent: Number(premiumCalculation.smokerSurchargePercent ?? 0),
      formula: premiumCalculation.formula ?? '',
    };
  }

  if (Array.isArray(paymentOptions)) doc.paymentOptions = paymentOptions;
  if (Array.isArray(termLengthOptions)) doc.termLengthOptions = termLengthOptions;

  if (renewable !== undefined) doc.renewable = !!renewable;
  if (convertible !== undefined) doc.convertible = !!convertible;

  return { doc };
}

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB successfully!');

    const db = client.db('life-insurance');
    const usersCollection = db.collection('users');
    const policiesCollection = db.collection('policies');
    const applicationsCollection = db.collection('applications');
    const reviewsCollection = db.collection('reviews');

    // ---------------- USERS ----------------

    // Get all users (optionally filter by role, case-insensitive)
    app.get('/users', async (req, res) => {
      try {
        const { role } = req.query;
        const filter = role
          ? { role: { $regex: new RegExp(`^${role}$`, 'i') } }
          : {};
        const users = await usersCollection.find(filter).sort({ createdAt: -1 }).toArray();
        res.json(users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Create a user
    app.post('/users', async (req, res) => {
      const { email, name, role = 'customer', photo } = req.body;
      if (!email || !name) {
        return res.status(400).json({ message: 'Name and email are required' });
      }

      try {
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
          return res.status(409).json({ message: 'User already exists' });
        }

        const result = await usersCollection.insertOne({
          email,
          name,
          role,
          photo,
          createdAt: new Date(),
        });
        res.status(201).json({ message: 'User created', insertedId: result.insertedId });
      } catch (err) {
        console.error('Failed to create user:', err);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Update user role
    app.patch('/users/:id/role', async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;

      if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid user id' });
      if (!['customer', 'agent', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      try {
        const result = await usersCollection.updateOne(
          { _id: toObjectId(id) },
          { $set: { role } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Role updated successfully' });
      } catch (err) {
        console.error('Failed to update role:', err);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Delete a user (optional)
    app.delete('/users/:id', async (req, res) => {
      const { id } = req.params;
      if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid user id' });

      try {
        const result = await usersCollection.deleteOne({ _id: toObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
      } catch (err) {
        console.error('Failed to delete user:', err);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // ---------------- POLICIES ----------------

    // List (with pagination + optional category filter)
    app.get('/policies', async (req, res) => {
      try {
        const page = Math.max(1, parseInt(req.query.page)) || 1;
        const limit = Math.min(Math.max(1, parseInt(req.query.limit)), 50) || 9;
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

    // Get single policy
    app.get('/policies/:id', async (req, res) => {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid policy ID format' });
      }

      try {
        const policy = await policiesCollection.findOne({ _id: toObjectId(id) });
        if (!policy) {
          return res.status(404).json({ message: 'Policy not found' });
        }
        res.json(policy);
      } catch (error) {
        console.error('Failed to fetch policy by ID:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Create policy
    app.post('/policies', async (req, res) => {
      try {
        const { error, doc } = buildPolicyFromBody(req.body, false);
        if (error) return res.status(400).json({ message: error });

        doc.createdAt = new Date();
        doc.updatedAt = new Date();

        const result = await policiesCollection.insertOne(doc);
        res.status(201).json({ message: 'Policy created', insertedId: result.insertedId });
      } catch (error) {
        console.error('Failed to create policy:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Update policy (full replace style)
    app.put('/policies/:id', async (req, res) => {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid policy ID format' });
      }

      try {
        const { error, doc } = buildPolicyFromBody(req.body, true);
        if (error) return res.status(400).json({ message: error });

        doc.updatedAt = new Date();

        const result = await policiesCollection.updateOne(
          { _id: toObjectId(id) },
          { $set: doc }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Policy not found' });
        }

        res.json({ message: 'Policy updated successfully' });
      } catch (error) {
        console.error('Failed to update policy:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Delete policy
    app.delete('/policies/:id', async (req, res) => {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid policy ID format' });
      }

      try {
        const result = await policiesCollection.deleteOne({ _id: toObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'Policy not found' });
        }
        res.json({ message: 'Policy deleted successfully' });
      } catch (error) {
        console.error('Failed to delete policy:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // ---------------- APPLICATIONS ----------------

    // Create an application
    app.post('/applications', async (req, res) => {
      const application = req.body;
      if (!application.fullName || !application.email) {
        return res.status(400).json({ message: 'Full Name and Email are required' });
      }

      try {
        application.submittedAt = application.submittedAt || new Date();
        application.status = application.status || 'Pending';

        const result = await applicationsCollection.insertOne(application);
        res.status(201).json({ message: 'Application submitted', insertedId: result.insertedId });
      } catch (error) {
        console.error('Failed to save application:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    /**
     * If ?email= is present -> return only that user's applications (Customer MyPolicy)
     * Else -> return all applications (Admin ManageApplications)
     */
    app.get('/applications', async (req, res) => {
      try {
        const { email } = req.query;
        let filter = {};
        if (email) {
          filter = { email: { $regex: new RegExp(`^${email}$`, 'i') } };
        }
        const applications = await applicationsCollection
          .find(filter)
          .sort({ submittedAt: -1 })
          .toArray();
        res.json(applications);
      } catch (error) {
        console.error('Failed to fetch applications:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    app.get('/applications/:id', async (req, res) => {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid application ID format' });
      }
      try {
        const application = await applicationsCollection.findOne({ _id: toObjectId(id) });
        if (!application) {
          return res.status(404).json({ message: 'Application not found' });
        }
        res.json(application);
      } catch (error) {
        console.error('Failed to fetch application:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Update application status (generic/admin)
    app.patch('/applications/:id/status', async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid application id' });
      }
      if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      try {
        const result = await applicationsCollection.updateOne(
          { _id: toObjectId(id) },
          { $set: { status } }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Application not found' });
        }
        res.json({ message: 'Status updated successfully' });
      } catch (error) {
        console.error('Failed to update status:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Assign an agent (derive from DB, ignore agentName/email to avoid spoofing)
    app.patch('/applications/:id/assign-agent', async (req, res) => {
      const { id } = req.params;
      const { agentId } = req.body;

      if (!isValidObjectId(id) || !isValidObjectId(agentId)) {
        return res.status(400).json({ message: 'Invalid id(s)' });
      }

      try {
        const agent = await usersCollection.findOne({
          _id: toObjectId(agentId),
          role: { $regex: /^agent$/i },
        });

        if (!agent) {
          return res.status(404).json({ message: 'Agent not found' });
        }

        const update = {
          assignedAgent: {
            id: agent._id,
            name: agent.name,
            email: agent.email,
          },
        };

        const result = await applicationsCollection.updateOne(
          { _id: toObjectId(id) },
          { $set: update }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Application not found' });
        }

        res.json({ message: 'Agent assigned successfully' });
      } catch (error) {
        console.error('Failed to assign agent:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // ---------------- AGENT ENDPOINTS (NEW) ----------------

    // Get all applications assigned to an agent (by agentId or email)
    app.get('/agent/applications', async (req, res) => {
      try {
        const { agentId, email } = req.query;

        if (!agentId && !email) {
          return res.status(400).json({ message: "agentId or email is required" });
        }

        const filter = agentId
          ? { 'assignedAgent.id': toObjectId(agentId) }
          : { 'assignedAgent.email': { $regex: new RegExp(`^${email}$`, 'i') } };

        const apps = await applicationsCollection
          .find(filter)
          .sort({ submittedAt: -1 })
          .toArray();

        res.json(apps);
      } catch (err) {
        console.error('Failed to fetch assigned applications:', err);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Agent updates application status; if Approved (from non-Approved), increment policy popularity
    app.patch('/agent/applications/:id/status', async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid application id' });
      }
      if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      try {
        const appDoc = await applicationsCollection.findOne({ _id: toObjectId(id) });
        if (!appDoc) return res.status(404).json({ message: 'Application not found' });

        const prevStatus = appDoc.status;

        // Update the status in the application
        const updateResult = await applicationsCollection.updateOne(
          { _id: toObjectId(id) },
          { $set: { status } }
        );

        // If transitioning to Approved, bump popularity on the policy
        if (prevStatus !== 'Approved' && status === 'Approved' && appDoc.policyId) {
          const policyFilter = isValidObjectId(appDoc.policyId)
            ? { _id: toObjectId(appDoc.policyId) }
            : { id: String(appDoc.policyId) }; // In case you stored string ids like "1", "2", "3"

          await policiesCollection.updateOne(policyFilter, { $inc: { popularity: 1 } });
        }

        res.json({ message: 'Status updated', matched: updateResult.matchedCount });
      } catch (err) {
        console.error('Failed to update status (agent):', err);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // ---------------- REVIEWS ----------------

    // Create a review
    app.post('/reviews', async (req, res) => {
      const { email, policyId, policyTitle, rating, feedback } = req.body;
      if (!email || !policyId || !policyTitle || !rating || !feedback) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      try {
        const review = {
          email,
          policyId: toObjectId(policyId),
          policyTitle,
          rating: parseInt(rating, 10),
          feedback,
          createdAt: new Date(),
        };

        const result = await reviewsCollection.insertOne(review);
        res.status(201).json({ message: 'Review submitted', insertedId: result.insertedId });
      } catch (error) {
        console.error('Failed to save review:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // Get latest reviews (for homepage / testimonials)
    app.get('/reviews', async (req, res) => {
      try {
        const reviews = await reviewsCollection
          .find({})
          .sort({ createdAt: -1 })
          .limit(20)
          .toArray();
        res.json(reviews);
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // --------------- Health Check ---------------
    app.get('/health', (req, res) => {
      res.json({ ok: true, time: new Date() });
    });

  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Life Insurance Platform API Running!');
});

app.listen(port, () => {
  console.log(`Life Insurance app listening on port ${port}`);
});
