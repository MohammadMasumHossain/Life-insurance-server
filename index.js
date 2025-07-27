// // server.js



// const express = require('express');
// const cors = require('cors');
// const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// require('dotenv').config();
// const path = require("path");
// const multer = require("multer");



// const app = express();
// const port = process.env.PORT || 3000;

// const Stripe = require('stripe');
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// // app.use(cors());
// app.use(cors({
//   origin: "http://localhost:5173", // your Vite dev server
//   credentials: true,
// }));
// app.use(express.json());

// // MongoDB connection URI
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.da72plu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// // MongoDB client setup
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// // ----- tiny helpers -----
// const isValidObjectId = (id) => ObjectId.isValid(id);
// const toObjectId = (id) => new ObjectId(id);

// // payment 


// // Build a policy object from req.body, safely (no Joi here to keep deps light)
// function buildPolicyFromBody(body, isUpdate = false) {
//   const {
//     title,
//     category,
//     policyType,
//     description,
//     image,
//     coverageAmount,
//     termDuration, // string e.g. "30 years"
//     popularity,
//     eligibility = {},
//     healthConditionsExcluded = [],
//     benefits = {},
//     premiumCalculation = {},
//     paymentOptions = [],
//     termLengthOptions = [],
//     renewable,
//     convertible,
//   } = body;

//   // For POST, these must be present
//   if (!isUpdate) {
//     if (!title || !category || !policyType || !description) {
//       return { error: 'title, category, policyType & description are required' };
//     }
//   }

//   const doc = {};
//   if (title !== undefined) doc.title = title;
//   if (category !== undefined) doc.category = category;
//   if (policyType !== undefined) doc.policyType = policyType;
//   if (description !== undefined) doc.description = description;
//   if (image !== undefined) doc.image = image;

//   if (coverageAmount !== undefined) doc.coverageAmount = Number(coverageAmount);
//   if (termDuration !== undefined) doc.termDuration = termDuration;
//   if (popularity !== undefined) doc.popularity = Number(popularity) || 0;

//   if (eligibility !== undefined) {
//     doc.eligibility = {
//       minAge: Number(eligibility.minAge ?? 0),
//       maxAge: Number(eligibility.maxAge ?? 0),
//       residency: eligibility.residency ?? '',
//       medicalExamRequired: !!eligibility.medicalExamRequired,
//     };
//   }

//   if (Array.isArray(healthConditionsExcluded)) {
//     doc.healthConditionsExcluded = healthConditionsExcluded;
//   }

//   if (benefits !== undefined) {
//     doc.benefits = {
//       deathBenefit: benefits.deathBenefit ?? '',
//       taxBenefits: benefits.taxBenefits ?? '',
//       accidentalDeathRider: !!benefits.accidentalDeathRider,
//       criticalIllnessRider: !!benefits.criticalIllnessRider,
//       waiverOfPremium: benefits.waiverOfPremium ?? '',
//     };
//   }

//   if (premiumCalculation !== undefined) {
//     doc.premiumCalculation = {
//       baseRatePerThousand: Number(premiumCalculation.baseRatePerThousand ?? 0),
//       ageFactor: premiumCalculation.ageFactor || {}, // object of ranges -> factor
//       smokerSurchargePercent: Number(premiumCalculation.smokerSurchargePercent ?? 0),
//       formula: premiumCalculation.formula ?? '',
//     };
//   }

//   if (Array.isArray(paymentOptions)) doc.paymentOptions = paymentOptions;
//   if (Array.isArray(termLengthOptions)) doc.termLengthOptions = termLengthOptions;

//   if (renewable !== undefined) doc.renewable = !!renewable;
//   if (convertible !== undefined) doc.convertible = !!convertible;

//   return { doc };
// }
 



// // store uploads locally (simple demo)
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, path.join(__dirname, "uploads")),
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
//   },
// });
// const upload = multer({ storage });

// // expose uploads folder
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// async function run() {
//   try {
//     await client.connect();
//     console.log('Connected to MongoDB successfully!');

//     const db = client.db('life-insurance');
//     const usersCollection = db.collection('users');
//     const policiesCollection = db.collection('policies');
//     const applicationsCollection = db.collection('applications');
//     const reviewsCollection = db.collection('reviews');
//     const blogsCollection = db.collection('blogs');
//     const paymentsCollection = db.collection('payments'); // <- NEW
//     const claimsCollection = db.collection("claims");
//  // ------------- ------------claim ----
//  /**
//  * Create a claim
//  * Body (multipart/form-data):
//  *  - applicationId (string, required)
//  *  - policyName (string, required)
//  *  - email (string, required)
//  *  - reason (string, required)
//  *  - file (optional) -> pdf/image
//  * Status will be "Pending" by default
//  */
// app.post("/claims", upload.single("file"), async (req, res) => {
//   try {
//     const { applicationId, policyName, email, reason } = req.body;

//     if (!applicationId || !policyName || !email || !reason) {
//       return res.status(400).json({ message: "All fields are required" });
//     }
//     if (!isValidObjectId(applicationId)) {
//       return res.status(400).json({ message: "Invalid applicationId" });
//     }

//     const claimDoc = {
//       applicationId: toObjectId(applicationId),
//       policyName,
//       email,
//       reason,
//       status: "Pending",
//       filePath: req.file ? `/uploads/${req.file.filename}` : null,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };

//     const result = await claimsCollection.insertOne(claimDoc);
//     res.status(201).json({ message: "Claim submitted", insertedId: result.insertedId });
//   } catch (err) {
//     console.error("Create claim failed:", err);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });

// /**
//  * Get claims
//  * - If ?email= is provided -> return user's claims
//  * - If ?applicationId= is provided -> filter by that
//  * - Admin/Agent can call without query to get all (add auth later)
//  */
// app.get("/claims", async (req, res) => {
//   try {
//     const { email, applicationId } = req.query;
//     const filter = {};
//     if (email) filter.email = { $regex: new RegExp(`^${email}$`, "i") };
//     if (applicationId && isValidObjectId(applicationId)) {
//       filter.applicationId = toObjectId(applicationId);
//     }

//     const claims = await claimsCollection
//       .find(filter)
//       .sort({ createdAt: -1 })
//       .toArray();

//     res.json(claims);
//   } catch (err) {
//     console.error("Fetch claims failed:", err);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });

// /**
//  * (For Agent/Admin)
//  * Update claim status
//  * Body: { status: "Approved" | "Rejected" }
//  */
// app.patch("/claims/:id/status", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;

//     if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid claim id" });
//     if (!["Pending", "Approved", "Rejected"].includes(status)) {
//       return res.status(400).json({ message: "Invalid status" });
//     }

//     const result = await claimsCollection.updateOne(
//       { _id: toObjectId(id) },
//       { $set: { status, updatedAt: new Date() } }
//     );

//     if (result.matchedCount === 0) {
//       return res.status(404).json({ message: "Claim not found" });
//     }

//     res.json({ message: "Claim status updated" });
//   } catch (err) {
//     console.error("Update claim status failed:", err);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });


//  // ---------------- PAYMENTS ----------------

// /**
//  * Create a Stripe PaymentIntent
//  * Body: {
//  *   applicationId: string,
//  *   amountUsdCents: number,
//  *   amountUSD: number,
//  *   amountBDT: number,
//  *   currency: 'usd'
//  * }
//  */
// app.post('/payments/create-intent', async (req, res) => {
//   try {
//     const {
//       applicationId,
//       amountUsdCents,
//       currency = 'usd',
//       amountUSD,
//       amountBDT,
//       frequency,
//     } = req.body;

//     if (!applicationId || !amountUsdCents) {
//       return res.status(400).json({ message: 'applicationId & amountUsdCents are required' });
//     }
//     if (!isValidObjectId(applicationId)) {
//       return res.status(400).json({ message: 'Invalid applicationId' });
//     }

//     // Ensure the application exists & is Approved
//     const appDoc = await applicationsCollection.findOne({ _id: toObjectId(applicationId) });
//     if (!appDoc) {
//       return res.status(404).json({ message: 'Application not found' });
//     }
//     if (appDoc.status !== 'Approved') {
//       return res.status(400).json({ message: 'Application is not approved for payment' });
//     }

//     // Create PaymentIntent in Stripe (USD cents)
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: amountUsdCents,
//       currency,
//       description: `Premium payment for application ${applicationId}`,
//       metadata: {
//         applicationId,
//         amountBDT: amountBDT ?? 0,
//         amountUSD: amountUSD ?? 0,
//         frequency: frequency ?? '',
//       },
//     });

//     res.json({ clientSecret: paymentIntent.client_secret });
//   } catch (err) {
//     console.error('Error creating payment intent:', err);
//     res.status(500).json({ message: 'Stripe error' });
//   }
// });

// /**
//  * Confirm payment & update DB
//  * Body: {
//  *   applicationId: string,
//  *   paymentIntentId: string,
//  *   amountBDT: number,
//  *   amountUSD: number,
//  *   frequency: 'monthly' | 'yearly',
//  *   status: 'Paid'
//  * }
//  */
// app.post('/payments/confirm', async (req, res) => {
//   try {
//     const {
//       applicationId,
//       paymentIntentId,
//       amountBDT,
//       amountUSD,
//       frequency,
//       status,
//     } = req.body;

//     if (!applicationId || !paymentIntentId || !status) {
//       return res.status(400).json({ message: 'applicationId, paymentIntentId & status are required' });
//     }
//     if (!isValidObjectId(applicationId)) {
//       return res.status(400).json({ message: 'Invalid applicationId' });
//     }

//     const appDoc = await applicationsCollection.findOne({ _id: toObjectId(applicationId) });
//     if (!appDoc) {
//       return res.status(404).json({ message: 'Application not found' });
//     }

//     // (Optional but good) Verify the PI really succeeded on Stripe
//     let intent;
//     try {
//       intent = await stripe.paymentIntents.retrieve(paymentIntentId);
//       if (intent.status !== 'succeeded') {
//         return res.status(400).json({ message: 'PaymentIntent not succeeded on Stripe' });
//       }
//     } catch (e) {
//       console.error('Stripe PI retrieve failed:', e);
//       return res.status(400).json({ message: 'Cannot verify Stripe PaymentIntent' });
//     }

//     // Update the application doc
//     const update = {
//       paymentStatus: status, // "Paid"
//       frequency,
//       activatedAt: new Date(),
//       paymentInfo: {
//         paymentIntentId,
//         amountBDT,
//         amountUSD,
//         stripeCurrency: intent.currency,
//         stripeAmount: intent.amount,
//         createdAt: new Date(),
//       },
//     };

//     await applicationsCollection.updateOne(
//       { _id: toObjectId(applicationId) },
//       { $set: update }
//     );

//     // Save a payment record (optional but recommended)
//     await paymentsCollection.insertOne({
//       applicationId: toObjectId(applicationId),
//       userEmail: appDoc.email,
//       paymentIntentId,
//       amountBDT,
//       amountUSD,
//       frequency,
//       stripe: {
//         id: intent.id,
//         amount: intent.amount,
//         currency: intent.currency,
//         status: intent.status,
//       },
//       createdAt: new Date(),
//     });

//     res.json({ ok: true, message: 'Payment confirmed & application updated' });
//   } catch (err) {
//     console.error('Confirm payment failed:', err);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });


//     // ---------------- BLOGS (NEW) ----------------

//   // ---------------- BLOGS (with image support) ----------------

// // GET /blogs?authorEmail=... (admin omits this to get all)
// app.get('/blogs', async (req, res) => {
//   try {
//     const { authorEmail, search, page = 1, limit = 50 } = req.query;

//     const filter = {};
//     if (authorEmail) {
//       filter.authorEmail = { $regex: new RegExp(`^${authorEmail}$`, 'i') };
//     }
//     if (search) {
//       filter.$or = [
//         { title: { $regex: search, $options: 'i' } },
//         { content: { $regex: search, $options: 'i' } },
//         { author: { $regex: search, $options: 'i' } },
//       ];
//     }

//     const _page = Math.max(1, parseInt(page)) || 1;
//     const _limit = Math.min(Math.max(1, parseInt(limit)), 100) || 50;
//     const skip = (_page - 1) * _limit;

//     const total = await blogsCollection.countDocuments(filter);
//     const items = await blogsCollection
//       .find(filter)
//       .sort({ publishDate: -1 })
//       .skip(skip)
//       .limit(_limit)
//       .toArray();

//     res.json({ total, page: _page, limit: _limit, items });
//   } catch (err) {
//     console.error('Failed to fetch blogs:', err);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

// // (Optional, but handy) GET /blogs/:id
// app.get('/blogs/:id', async (req, res) => {
//   const { id } = req.params;
//   if (!isValidObjectId(id)) {
//     return res.status(400).json({ message: 'Invalid blog id' });
//   }

//   try {
//     const blog = await blogsCollection.findOne({ _id: toObjectId(id) });
//     if (!blog) return res.status(404).json({ message: 'Blog not found' });
//     res.json(blog);
//   } catch (err) {
//     console.error('Failed to fetch blog by id:', err);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

// // POST /blogs  (now accepts `image`)
// app.post('/blogs', async (req, res) => {
//   try {
//     const { title, content, author, authorEmail, image } = req.body;

//     if (!title || !content || !author || !authorEmail) {
//       return res
//         .status(400)
//         .json({ message: 'title, content, author, authorEmail are required' });
//     }

//     const blog = {
//       title,
//       content,
//       author,
//       authorEmail: authorEmail.toLowerCase(),
//       image: image || "",          // <-- store the image URL (optional)
//       publishDate: new Date(),
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };

//     const result = await blogsCollection.insertOne(blog);
//     res.status(201).json({ ...blog, _id: result.insertedId });
//   } catch (err) {
//     console.error('Failed to create blog:', err);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

// // PATCH /blogs/:id  (can update `image`, optionally republish)
// app.patch('/blogs/:id', async (req, res) => {
//   const { id } = req.params;
//   if (!isValidObjectId(id)) {
//     return res.status(400).json({ message: 'Invalid blog id' });
//   }

//   try {
//     const updates = {};
//     const { title, content, image, republish } = req.body;

//     if (title !== undefined) updates.title = title;
//     if (content !== undefined) updates.content = content;
//     // You can send `image: ""` to clear it
//     if (image !== undefined) updates.image = image;

//     if (republish) {
//       updates.publishDate = new Date();
//     }

//     if (Object.keys(updates).length === 0) {
//       return res.status(400).json({ message: 'Nothing to update' });
//     }

//     updates.updatedAt = new Date();

//     const result = await blogsCollection.updateOne(
//       { _id: toObjectId(id) },
//       { $set: updates }
//     );

//     if (result.matchedCount === 0) {
//       return res.status(404).json({ message: 'Blog not found' });
//     }

//     res.json({ message: 'Blog updated successfully' });
//   } catch (err) {
//     console.error('Failed to update blog:', err);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

// // DELETE /blogs/:id
// app.delete('/blogs/:id', async (req, res) => {
//   const { id } = req.params;
//   if (!isValidObjectId(id)) {
//     return res.status(400).json({ message: 'Invalid blog id' });
//   }

//   try {
//     const result = await blogsCollection.deleteOne({ _id: toObjectId(id) });
//     if (result.deletedCount === 0) {
//       return res.status(404).json({ message: 'Blog not found' });
//     }
//     res.json({ message: 'Blog deleted successfully' });
//   } catch (err) {
//     console.error('Failed to delete blog:', err);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

//     // ---------------- USERS ----------------

//     // Get all users (optionally filter by role, case-insensitive)
//     app.get('/users', async (req, res) => {
//       try {
//         const { role } = req.query;
//         const filter = role
//           ? { role: { $regex: new RegExp(`^${role}$`, 'i') } }
//           : {};
//         const users = await usersCollection.find(filter).sort({ createdAt: -1 }).toArray();
//         res.json(users);
//       } catch (error) {
//         console.error('Failed to fetch users:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // Create a user
//     app.post('/users', async (req, res) => {
//       const { email, name, role = 'customer', photo } = req.body;
//       if (!email || !name) {
//         return res.status(400).json({ message: 'Name and email are required' });
//       }

//       try {
//         const existingUser = await usersCollection.findOne({ email });
//         if (existingUser) {
//           return res.status(409).json({ message: 'User already exists' });
//         }

//         const result = await usersCollection.insertOne({
//           email,
//           name,
//           role,
//           photo,
//           createdAt: new Date(),
//         });
//         res.status(201).json({ message: 'User created', insertedId: result.insertedId });
//       } catch (err) {
//         console.error('Failed to create user:', err);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // Update user role
//     app.patch('/users/:id/role', async (req, res) => {
//       const { id } = req.params;
//       const { role } = req.body;

//       if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid user id' });
//       if (!['customer', 'agent', 'admin'].includes(role)) {
//         return res.status(400).json({ message: 'Invalid role' });
//       }

//       try {
//         const result = await usersCollection.updateOne(
//           { _id: toObjectId(id) },
//           { $set: { role } }
//         );
//         if (result.matchedCount === 0) return res.status(404).json({ message: 'User not found' });
//         res.json({ message: 'Role updated successfully' });
//       } catch (err) {
//         console.error('Failed to update role:', err);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // Delete a user (optional)
//     app.delete('/users/:id', async (req, res) => {
//       const { id } = req.params;
//       if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid user id' });

//       try {
//         const result = await usersCollection.deleteOne({ _id: toObjectId(id) });
//         if (result.deletedCount === 0) return res.status(404).json({ message: 'User not found' });
//         res.json({ message: 'User deleted successfully' });
//       } catch (err) {
//         console.error('Failed to delete user:', err);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // ---------------- POLICIES ----------------

//     // List (with pagination + optional category filter)
//     app.get('/policies', async (req, res) => {
//       try {
//         const page = Math.max(1, parseInt(req.query.page)) || 1;
//         const limit = Math.min(Math.max(1, parseInt(req.query.limit)), 50) || 9;
//         const skip = (page - 1) * limit;
//         const category = req.query.category;

//         const filter = category && category !== 'All' ? { category } : {};
//         const total = await policiesCollection.countDocuments(filter);
//         const data = await policiesCollection.find(filter).skip(skip).limit(limit).toArray();

//         res.json({ total, page, limit, data });
//       } catch (error) {
//         console.error('Failed to fetch policies:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // Get single policy
//     app.get('/policies/:id', async (req, res) => {
//       const { id } = req.params;
//       if (!isValidObjectId(id)) {
//         return res.status(400).json({ message: 'Invalid policy ID format' });
//       }

//       try {
//         const policy = await policiesCollection.findOne({ _id: toObjectId(id) });
//         if (!policy) {
//           return res.status(404).json({ message: 'Policy not found' });
//         }
//         res.json(policy);
//       } catch (error) {
//         console.error('Failed to fetch policy by ID:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // Create policy
//     app.post('/policies', async (req, res) => {
//       try {
//         const { error, doc } = buildPolicyFromBody(req.body, false);
//         if (error) return res.status(400).json({ message: error });

//         doc.createdAt = new Date();
//         doc.updatedAt = new Date();

//         const result = await policiesCollection.insertOne(doc);
//         res.status(201).json({ message: 'Policy created', insertedId: result.insertedId });
//       } catch (error) {
//         console.error('Failed to create policy:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // Update policy (full replace style)
//     app.put('/policies/:id', async (req, res) => {
//       const { id } = req.params;
//       if (!isValidObjectId(id)) {
//         return res.status(400).json({ message: 'Invalid policy ID format' });
//       }

//       try {
//         const { error, doc } = buildPolicyFromBody(req.body, true);
//         if (error) return res.status(400).json({ message: error });

//         doc.updatedAt = new Date();

//         const result = await policiesCollection.updateOne(
//           { _id: toObjectId(id) },
//           { $set: doc }
//         );

//         if (result.matchedCount === 0) {
//           return res.status(404).json({ message: 'Policy not found' });
//         }

//         res.json({ message: 'Policy updated successfully' });
//       } catch (error) {
//         console.error('Failed to update policy:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // Delete policy
//     app.delete('/policies/:id', async (req, res) => {
//       const { id } = req.params;
//       if (!isValidObjectId(id)) {
//         return res.status(400).json({ message: 'Invalid policy ID format' });
//       }

//       try {
//         const result = await policiesCollection.deleteOne({ _id: toObjectId(id) });
//         if (result.deletedCount === 0) {
//           return res.status(404).json({ message: 'Policy not found' });
//         }
//         res.json({ message: 'Policy deleted successfully' });
//       } catch (error) {
//         console.error('Failed to delete policy:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // ---------------- APPLICATIONS ----------------

//     // Create an application
//     app.post('/applications', async (req, res) => {
//       const application = req.body;
//       if (!application.fullName || !application.email) {
//         return res.status(400).json({ message: 'Full Name and Email are required' });
//       }

//       try {
//         application.submittedAt = application.submittedAt || new Date();
//         application.status = application.status || 'Pending';

//         const result = await applicationsCollection.insertOne(application);
//         res.status(201).json({ message: 'Application submitted', insertedId: result.insertedId });
//       } catch (error) {
//         console.error('Failed to save application:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     /**
//      * If ?email= is present -> return only that user's applications (Customer MyPolicy)
//      * Else -> return all applications (Admin ManageApplications)
//      */
//     app.get('/applications', async (req, res) => {
//       try {
//         const { email } = req.query;
//         let filter = {};
//         if (email) {
//           filter = { email: { $regex: new RegExp(`^${email}$`, 'i') } };
//         }
//         const applications = await applicationsCollection
//           .find(filter)
//           .sort({ submittedAt: -1 })
//           .toArray();
//         res.json(applications);
//       } catch (error) {
//         console.error('Failed to fetch applications:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     app.get('/applications/:id', async (req, res) => {
//       const { id } = req.params;
//       if (!isValidObjectId(id)) {
//         return res.status(400).json({ message: 'Invalid application ID format' });
//       }
//       try {
//         const application = await applicationsCollection.findOne({ _id: toObjectId(id) });
//         if (!application) {
//           return res.status(404).json({ message: 'Application not found' });
//         }
//         res.json(application);
//       } catch (error) {
//         console.error('Failed to fetch application:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // Update application status (generic/admin)
//     app.patch('/applications/:id/status', async (req, res) => {
//       const { id } = req.params;
//       const { status } = req.body;

//       if (!isValidObjectId(id)) {
//         return res.status(400).json({ message: 'Invalid application id' });
//       }
//       if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
//         return res.status(400).json({ message: 'Invalid status' });
//       }

//       try {
//         const result = await applicationsCollection.updateOne(
//           { _id: toObjectId(id) },
//           { $set: { status } }
//         );
//         if (result.matchedCount === 0) {
//           return res.status(404).json({ message: 'Application not found' });
//         }
//         res.json({ message: 'Status updated successfully' });
//       } catch (error) {
//         console.error('Failed to update status:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // Assign an agent (derive from DB, ignore agentName/email to avoid spoofing)
//     app.patch('/applications/:id/assign-agent', async (req, res) => {
//       const { id } = req.params;
//       const { agentId } = req.body;

//       if (!isValidObjectId(id) || !isValidObjectId(agentId)) {
//         return res.status(400).json({ message: 'Invalid id(s)' });
//       }

//       try {
//         const agent = await usersCollection.findOne({
//           _id: toObjectId(agentId),
//           role: { $regex: /^agent$/i },
//         });

//         if (!agent) {
//           return res.status(404).json({ message: 'Agent not found' });
//         }

//         const update = {
//           assignedAgent: {
//             id: agent._id,
//             name: agent.name,
//             email: agent.email,
//           },
//         };

//         const result = await applicationsCollection.updateOne(
//           { _id: toObjectId(id) },
//           { $set: update }
//         );

//         if (result.matchedCount === 0) {
//           return res.status(404).json({ message: 'Application not found' });
//         }

//         res.json({ message: 'Agent assigned successfully' });
//       } catch (error) {
//         console.error('Failed to assign agent:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // ---------------- AGENT ENDPOINTS (NEW) ----------------

//     // Get all applications assigned to an agent (by agentId or email)
//     app.get('/agent/applications', async (req, res) => {
//       try {
//         const { agentId, email } = req.query;

//         if (!agentId && !email) {
//           return res.status(400).json({ message: "agentId or email is required" });
//         }

//         const filter = agentId
//           ? { 'assignedAgent.id': toObjectId(agentId) }
//           : { 'assignedAgent.email': { $regex: new RegExp(`^${email}$`, 'i') } };

//         const apps = await applicationsCollection
//           .find(filter)
//           .sort({ submittedAt: -1 })
//           .toArray();

//         res.json(apps);
//       } catch (err) {
//         console.error('Failed to fetch assigned applications:', err);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // Agent updates application status; if Approved (from non-Approved), increment policy popularity
//     app.patch('/agent/applications/:id/status', async (req, res) => {
//       const { id } = req.params;
//       const { status } = req.body;

//       if (!isValidObjectId(id)) {
//         return res.status(400).json({ message: 'Invalid application id' });
//       }
//       if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
//         return res.status(400).json({ message: 'Invalid status' });
//       }

//       try {
//         const appDoc = await applicationsCollection.findOne({ _id: toObjectId(id) });
//         if (!appDoc) return res.status(404).json({ message: 'Application not found' });

//         const prevStatus = appDoc.status;

//         // Update the status in the application
//         const updateResult = await applicationsCollection.updateOne(
//           { _id: toObjectId(id) },
//           { $set: { status } }
//         );

//         // If transitioning to Approved, bump popularity on the policy
//         if (prevStatus !== 'Approved' && status === 'Approved' && appDoc.policyId) {
//           const policyFilter = isValidObjectId(appDoc.policyId)
//             ? { _id: toObjectId(appDoc.policyId) }
//             : { id: String(appDoc.policyId) }; // In case you stored string ids like "1", "2", "3"

//           await policiesCollection.updateOne(policyFilter, { $inc: { popularity: 1 } });
//         }

//         res.json({ message: 'Status updated', matched: updateResult.matchedCount });
//       } catch (err) {
//         console.error('Failed to update status (agent):', err);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // ---------------- REVIEWS ----------------

//     // Create a review
//     app.post('/reviews', async (req, res) => {
//       const { email, policyId, policyTitle, rating, feedback } = req.body;
//       if (!email || !policyId || !policyTitle || !rating || !feedback) {
//         return res.status(400).json({ message: 'All fields are required' });
//       }

//       try {
//         const review = {
//           email,
//           policyId: toObjectId(policyId),
//           policyTitle,
//           rating: parseInt(rating, 10),
//           feedback,
//           createdAt: new Date(),
//         };

//         const result = await reviewsCollection.insertOne(review);
//         res.status(201).json({ message: 'Review submitted', insertedId: result.insertedId });
//       } catch (error) {
//         console.error('Failed to save review:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     // Get latest reviews (for homepage / testimonials)
//     app.get('/reviews', async (req, res) => {
//       try {
//         const reviews = await reviewsCollection
//           .find({})
//           .sort({ createdAt: -1 })
//           .limit(20)
//           .toArray();
//         res.json(reviews);
//       } catch (error) {
//         console.error('Failed to fetch reviews:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//       }
//     });

//     //------------paymetn--------


//     // --------------- Health Check ---------------
//     app.get('/health', (req, res) => {
//       res.json({ ok: true, time: new Date() });
//     });

//   } catch (err) {
//     console.error('MongoDB connection failed:', err);
//     process.exit(1);
//   }
// }

// run().catch(console.dir);

// app.get('/', (req, res) => {
//   res.send('Life Insurance Platform API Running!');
// });

// app.listen(port, () => {
//   console.log(`Life Insurance app listening on port ${port}`);
// });



// server.js
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Stripe = require("stripe");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// ---------- Stripe ----------
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ---------- Middlewares ----------
app.use(
  cors({
    origin: ["http://localhost:5173"], // add more origins if you deploy
    credentials: true,
  })
);
app.use(express.json());

// ---------- Ensure uploads folder exists ----------
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOAD_DIR));

// ---------- Multer ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const fileFilter = (req, file, cb) => {
  const allowed = /pdf|jpeg|jpg|png/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error("Only PDF or Image files are allowed!"));
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ---------- Helpers ----------
const isValidObjectId = (id) => ObjectId.isValid(id);
const toObjectId = (id) => new ObjectId(id);

// Build a policy object safely
function buildPolicyFromBody(body, isUpdate = false) {
  const {
    title,
    category,
    policyType,
    description,
    image,
    coverageAmount,
    termDuration,
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

  if (!isUpdate) {
    if (!title || !category || !policyType || !description) {
      return { error: "title, category, policyType & description are required" };
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
      residency: eligibility.residency ?? "",
      medicalExamRequired: !!eligibility.medicalExamRequired,
    };
  }

  if (Array.isArray(healthConditionsExcluded)) {
    doc.healthConditionsExcluded = healthConditionsExcluded;
  }

  if (benefits !== undefined) {
    doc.benefits = {
      deathBenefit: benefits.deathBenefit ?? "",
      taxBenefits: benefits.taxBenefits ?? "",
      accidentalDeathRider: !!benefits.accidentalDeathRider,
      criticalIllnessRider: !!benefits.criticalIllnessRider,
      waiverOfPremium: benefits.waiverOfPremium ?? "",
    };
  }

  if (premiumCalculation !== undefined) {
    doc.premiumCalculation = {
      baseRatePerThousand: Number(premiumCalculation.baseRatePerThousand ?? 0),
      ageFactor: premiumCalculation.ageFactor || {},
      smokerSurchargePercent: Number(premiumCalculation.smokerSurchargePercent ?? 0),
      formula: premiumCalculation.formula ?? "",
    };
  }

  if (Array.isArray(paymentOptions)) doc.paymentOptions = paymentOptions;
  if (Array.isArray(termLengthOptions)) doc.termLengthOptions = termLengthOptions;

  if (renewable !== undefined) doc.renewable = !!renewable;
  if (convertible !== undefined) doc.convertible = !!convertible;

  return { doc };
}

// ---------- Mongo ----------
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.da72plu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let usersCollection,
  policiesCollection,
  applicationsCollection,
  reviewsCollection,
  blogsCollection,
  paymentsCollection,
  claimsCollection;

async function run() {
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || "life-insurance");

    usersCollection = db.collection("users");
    policiesCollection = db.collection("policies");
    applicationsCollection = db.collection("applications");
    reviewsCollection = db.collection("reviews");
    blogsCollection = db.collection("blogs");
    paymentsCollection = db.collection("payments");
    claimsCollection = db.collection("claims");

    console.log("✅ Connected to MongoDB");

    // (optional) helpful indexes
    applicationsCollection.createIndex({ email: 1 }).catch(() => {});
    claimsCollection.createIndex({ email: 1 }).catch(() => {});
    claimsCollection.createIndex({ applicationId: 1 }).catch(() => {});

    // ---------------- HEALTH ----------------
    app.get("/health", (req, res) => {
      res.json({ ok: true, time: new Date() });
    });

    // ---------------- USERS ----------------
    app.get("/users", async (req, res) => {
      try {
        const { role } = req.query;
        const filter = role ? { role: { $regex: new RegExp(`^${role}$`, "i") } } : {};
        const users = await usersCollection.find(filter).sort({ createdAt: -1 }).toArray();
        res.json(users);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.post("/users", async (req, res) => {
      const { email, name, role = "customer", photo } = req.body;
      if (!email || !name) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      try {
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
          return res.status(409).json({ message: "User already exists" });
        }

        const result = await usersCollection.insertOne({
          email,
          name,
          role,
          photo,
          createdAt: new Date(),
        });
        res.status(201).json({ message: "User created", insertedId: result.insertedId });
      } catch (err) {
        console.error("Failed to create user:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.patch("/users/:id/role", async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;

      if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });
      if (!["customer", "agent", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      try {
        const result = await usersCollection.updateOne({ _id: toObjectId(id) }, { $set: { role } });
        if (result.matchedCount === 0) return res.status(404).json({ message: "User not found" });
        res.json({ message: "Role updated successfully" });
      } catch (err) {
        console.error("Failed to update role:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.delete("/users/:id", async (req, res) => {
      const { id } = req.params;
      if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });

      try {
        const result = await usersCollection.deleteOne({ _id: toObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ message: "User not found" });
        res.json({ message: "User deleted successfully" });
      } catch (err) {
        console.error("Failed to delete user:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // ---------------- BLOGS ----------------
    app.get("/blogs", async (req, res) => {
      try {
        const { authorEmail } = req.query;
        const filter = authorEmail ? { authorEmail: { $regex: new RegExp(`^${authorEmail}$`, "i") } } : {};
        const blogs = await blogsCollection.find(filter).sort({ publishDate: -1 }).toArray();
        res.json(blogs);
      } catch (err) {
        console.error("Failed to fetch blogs:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.post("/blogs", async (req, res) => {
      try {
        const { title, content, authorEmail, authorName, image } = req.body;
        if (!title || !content || !authorEmail) {
          return res.status(400).json({ message: "title, content and authorEmail are required" });
        }

        const doc = {
          title,
          content,
          authorEmail,
          authorName: authorName || "",
          image: image || "",
          publishDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await blogsCollection.insertOne(doc);
        res.status(201).json({ message: "Blog created", insertedId: result.insertedId });
      } catch (err) {
        console.error("Failed to create blog:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.patch("/blogs/:id", async (req, res) => {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid blog id" });
      }

      try {
        const updates = {};
        const { title, content, image, republish } = req.body;

        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (image !== undefined) updates.image = image;

        if (republish) {
          updates.publishDate = new Date();
        }

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ message: "Nothing to update" });
        }

        updates.updatedAt = new Date();

        const result = await blogsCollection.updateOne(
          { _id: toObjectId(id) },
          { $set: updates }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Blog not found" });
        }

        res.json({ message: "Blog updated successfully" });
      } catch (err) {
        console.error("Failed to update blog:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.delete("/blogs/:id", async (req, res) => {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid blog id" });
      }

      try {
        const result = await blogsCollection.deleteOne({ _id: toObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Blog not found" });
        }
        res.json({ message: "Blog deleted successfully" });
      } catch (err) {
        console.error("Failed to delete blog:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // ---------------- POLICIES ----------------
    app.get("/policies", async (req, res) => {
      try {
        const page = Math.max(1, parseInt(req.query.page)) || 1;
        const limit = Math.min(Math.max(1, parseInt(req.query.limit)), 50) || 9;
        const skip = (page - 1) * limit;
        const category = req.query.category;

        const filter = category && category !== "All" ? { category } : {};
        const total = await policiesCollection.countDocuments(filter);
        const data = await policiesCollection.find(filter).skip(skip).limit(limit).toArray();

        res.json({ total, page, limit, data });
      } catch (error) {
        console.error("Failed to fetch policies:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.get("/policies/:id", async (req, res) => {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid policy ID format" });
      }

      try {
        const policy = await policiesCollection.findOne({ _id: toObjectId(id) });
        if (!policy) {
          return res.status(404).json({ message: "Policy not found" });
        }
        res.json(policy);
      } catch (error) {
        console.error("Failed to fetch policy by ID:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.post("/policies", async (req, res) => {
      try {
        const { error, doc } = buildPolicyFromBody(req.body, false);
        if (error) return res.status(400).json({ message: error });

        doc.createdAt = new Date();
        doc.updatedAt = new Date();

        const result = await policiesCollection.insertOne(doc);
        res.status(201).json({ message: "Policy created", insertedId: result.insertedId });
      } catch (error) {
        console.error("Failed to create policy:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.put("/policies/:id", async (req, res) => {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid policy ID format" });
      }

      try {
        const { error, doc } = buildPolicyFromBody(req.body, true);
        if (error) return res.status(400).json({ message: error });

        doc.updatedAt = new Date();

        const result = await policiesCollection.updateOne({ _id: toObjectId(id) }, { $set: doc });

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Policy not found" });
        }

        res.json({ message: "Policy updated successfully" });
      } catch (error) {
        console.error("Failed to update policy:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.delete("/policies/:id", async (req, res) => {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid policy ID format" });
      }

      try {
        const result = await policiesCollection.deleteOne({ _id: toObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Policy not found" });
        }
        res.json({ message: "Policy deleted successfully" });
      } catch (error) {
        console.error("Failed to delete policy:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // ---------------- APPLICATIONS ----------------
    app.post("/applications", async (req, res) => {
      const application = req.body;
      if (!application.fullName || !application.email) {
        return res.status(400).json({ message: "Full Name and Email are required" });
      }

      try {
        application.submittedAt = application.submittedAt || new Date();
        application.status = application.status || "Pending";

        const result = await applicationsCollection.insertOne(application);
        res.status(201).json({ message: "Application submitted", insertedId: result.insertedId });
      } catch (error) {
        console.error("Failed to save application:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.get("/applications", async (req, res) => {
      try {
        const { email } = req.query;
        let filter = {};
        if (email) {
          filter = { email: { $regex: new RegExp(`^${email}$`, "i") } };
        }
        const applications = await applicationsCollection
          .find(filter)
          .sort({ submittedAt: -1 })
          .toArray();
        res.json(applications);
      } catch (error) {
        console.error("Failed to fetch applications:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.get("/applications/:id", async (req, res) => {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid application ID format" });
      }
      try {
        const application = await applicationsCollection.findOne({ _id: toObjectId(id) });
        if (!application) {
          return res.status(404).json({ message: "Application not found" });
        }
        res.json(application);
      } catch (error) {
        console.error("Failed to fetch application:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.patch("/applications/:id/status", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid application id" });
      }
      if (!["Pending", "Approved", "Rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      try {
        const result = await applicationsCollection.updateOne(
          { _id: toObjectId(id) },
          { $set: { status } }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Application not found" });
        }
        res.json({ message: "Status updated successfully" });
      } catch (error) {
        console.error("Failed to update status:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // Assign an agent
    app.patch("/applications/:id/assign-agent", async (req, res) => {
      const { id } = req.params;
      const { agentId } = req.body;

      if (!isValidObjectId(id) || !isValidObjectId(agentId)) {
        return res.status(400).json({ message: "Invalid id(s)" });
      }

      try {
        const agent = await usersCollection.findOne({
          _id: toObjectId(agentId),
          role: { $regex: /^agent$/i },
        });

        if (!agent) {
          return res.status(404).json({ message: "Agent not found" });
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
          return res.status(404).json({ message: "Application not found" });
        }

        res.json({ message: "Agent assigned successfully" });
      } catch (error) {
        console.error("Failed to assign agent:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // ---------------- AGENT ENDPOINTS ----------------
    app.get("/agent/applications", async (req, res) => {
      try {
        const { agentId, email } = req.query;

        if (!agentId && !email) {
          return res.status(400).json({ message: "agentId or email is required" });
        }

        const filter = agentId
          ? { "assignedAgent.id": toObjectId(agentId) }
          : { "assignedAgent.email": { $regex: new RegExp(`^${email}$`, "i") } };

        const apps = await applicationsCollection
          .find(filter)
          .sort({ submittedAt: -1 })
          .toArray();

        res.json(apps);
      } catch (err) {
        console.error("Failed to fetch assigned applications:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.patch("/agent/applications/:id/status", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid application id" });
      }
      if (!["Pending", "Approved", "Rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      try {
        const appDoc = await applicationsCollection.findOne({ _id: toObjectId(id) });
        if (!appDoc) return res.status(404).json({ message: "Application not found" });

        const prevStatus = appDoc.status;

        const updateResult = await applicationsCollection.updateOne(
          { _id: toObjectId(id) },
          { $set: { status } }
        );

        if (prevStatus !== "Approved" && status === "Approved" && appDoc.policyId) {
          const policyFilter = isValidObjectId(appDoc.policyId)
            ? { _id: toObjectId(appDoc.policyId) }
            : { id: String(appDoc.policyId) };

          await policiesCollection.updateOne(policyFilter, { $inc: { popularity: 1 } });
        }

        res.json({ message: "Status updated", matched: updateResult.matchedCount });
      } catch (err) {
        console.error("Failed to update status (agent):", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // ---------------- REVIEWS ----------------
    app.post("/reviews", async (req, res) => {
      const { email, policyId, policyTitle, rating, feedback } = req.body;
      if (!email || !policyId || !policyTitle || !rating || !feedback) {
        return res.status(400).json({ message: "All fields are required" });
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
        res.status(201).json({ message: "Review submitted", insertedId: result.insertedId });
      } catch (error) {
        console.error("Failed to save review:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.get("/reviews", async (req, res) => {
      try {
        const reviews = await reviewsCollection
          .find({})
          .sort({ createdAt: -1 })
          .limit(20)
          .toArray();
        res.json(reviews);
      } catch (error) {
        console.error("Failed to fetch reviews:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // ---------------- CLAIMS ----------------
    // Create claim — now stores coverageAmount (and more) from the application
    app.post("/claims", upload.single("file"), async (req, res) => {
      try {
        const { applicationId, policyName, email, reason } = req.body;

        if (!applicationId || !policyName || !email || !reason) {
          return res.status(400).json({ message: "All fields are required" });
        }
        if (!isValidObjectId(applicationId)) {
          return res.status(400).json({ message: "Invalid applicationId" });
        }

        // pull coverageAmount, termDuration, policyType from application
        const appDoc = await applicationsCollection.findOne(
          { _id: toObjectId(applicationId) },
          { projection: { coverageAmount: 1, termDuration: 1, policyType: 1 } }
        );
        if (!appDoc) {
          return res.status(404).json({ message: "Application not found" });
        }

        const claimDoc = {
          applicationId: toObjectId(applicationId),
          policyName,
          email,
          reason,
          status: "Pending",
          coverageAmount: appDoc.coverageAmount ?? null,
          termDuration: appDoc.termDuration ?? null,
          policyType: appDoc.policyType ?? null,
          filePath: req.file ? `/uploads/${req.file.filename}` : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await claimsCollection.insertOne(claimDoc);
        res.status(201).json({ message: "Claim submitted", insertedId: result.insertedId });
      } catch (err) {
        console.error("Create claim failed:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // Get claims — enrich old ones that don't have coverageAmount
    app.get("/claims", async (req, res) => {
      try {
        const { email, applicationId } = req.query;
        const filter = {};
        if (email) filter.email = { $regex: new RegExp(`^${email}$`, "i") };
        if (applicationId && isValidObjectId(applicationId)) {
          filter.applicationId = toObjectId(applicationId);
        }

        const claims = await claimsCollection.find(filter).sort({ createdAt: -1 }).toArray();

        // find which claims need enrichment
        const missing = claims.filter((c) => c.coverageAmount == null && c.applicationId);
        if (missing.length === 0) {
          return res.json(claims);
        }

        const appIds = [...new Set(missing.map((m) => m.applicationId))];
        const apps = await applicationsCollection
          .find(
            { _id: { $in: appIds } },
            { projection: { coverageAmount: 1, termDuration: 1, policyType: 1 } }
          )
          .toArray();

        const appMap = Object.fromEntries(apps.map((a) => [a._id.toString(), a]));

        const enriched = claims.map((c) => {
          if (c.coverageAmount != null) return c;
          const app = appMap[c.applicationId?.toString()];
          if (!app) return c;
          return {
            ...c,
            coverageAmount: app.coverageAmount ?? null,
            termDuration: app.termDuration ?? null,
            policyType: app.policyType ?? null,
          };
        });

        res.json(enriched);
      } catch (err) {
        console.error("Fetch claims failed:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.patch("/claims/:id/status", async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid claim id" });
        if (!["Pending", "Approved", "Rejected"].includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }

        const result = await claimsCollection.updateOne(
          { _id: toObjectId(id) },
          { $set: { status, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Claim not found" });
        }

        res.json({ message: "Claim status updated" });
      } catch (err) {
        console.error("Update claim status failed:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    //-----------------transaction------------
    // ---------------- TRANSACTIONS / PAYMENTS ----------------

/**
 * GET /payments
 * Query:
 *   page   (default 1)
 *   limit  (default 20, max 100)
 *   email  (optional, filter by customer email)
 */
app.get('/payments', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip  = (page - 1) * limit;
    const { email } = req.query;

    const filter = {};
    if (email) {
      filter.userEmail = { $regex: new RegExp(`^${email}$`, 'i') };
    }

    const pipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'applications',
          localField: 'applicationId',
          foreignField: '_id',
          as: 'application'
        }
      },
      { $unwind: { path: '$application', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          transactionId: '$paymentIntentId',
          email: '$userEmail',
          policyName: { $ifNull: ['$application.policyTitle', '$application.policyType'] },
          amountUSD: 1,
          amountBDT: 1,
          frequency: 1,
          status: '$stripe.status',
          stripeAmount: '$stripe.amount',
          stripeCurrency: '$stripe.currency',
          createdAt: 1
        }
      },
      { $skip: skip },
      { $limit: limit }
    ];

    const [data, total] = await Promise.all([
      paymentsCollection.aggregate(pipeline).toArray(),
      paymentsCollection.countDocuments(filter)
    ]);

    res.json({ total, page, limit, data });
  } catch (err) {
    console.error('GET /payments failed:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * GET /payments/:id
 */
app.get('/payments/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid payment id' });
  }

  try {
    const pipeline = [
      { $match: { _id: toObjectId(id) } },
      {
        $lookup: {
          from: 'applications',
          localField: 'applicationId',
          foreignField: '_id',
          as: 'application'
        }
      },
      { $unwind: { path: '$application', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          transactionId: '$paymentIntentId',
          email: '$userEmail',
          policyName: { $ifNull: ['$application.policyTitle', '$application.policyType'] },
          amountUSD: 1,
          amountBDT: 1,
          frequency: 1,
          status: '$stripe.status',
          stripeAmount: '$stripe.amount',
          stripeCurrency: '$stripe.currency',
          createdAt: 1,
          rawStripe: '$stripe',
          application: 1
        }
      }
    ];

    const docs = await paymentsCollection.aggregate(pipeline).toArray();
    if (!docs.length) return res.status(404).json({ message: 'Payment not found' });

    res.json(docs[0]);
  } catch (err) {
    console.error('GET /payments/:id failed:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * GET /payments/summary
 * Quick totals (sum in BDT & USD, count)
 */
// Example Express route for summary
app.get('/payments/summary', async (req, res) => {
  try {
    const summary = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalUSD: { $sum: "$amountUSD" },
          totalBDT: { $sum: "$amountBDT" },
          count: { $sum: 1 },
        },
      },
    ]);

    if (summary.length === 0) {
      return res.json({ totalUSD: 0, totalBDT: 0, count: 0 });
    }
    res.json({
      totalUSD: summary[0].totalUSD,
      totalBDT: summary[0].totalBDT,
      count: summary[0].count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


    // ---------------- PAYMENTS ----------------
    app.post("/payments/create-intent", async (req, res) => {
      try {
        const {
          applicationId,
          amountUsdCents,
          currency = "usd",
          amountUSD,
          amountBDT,
          frequency,
        } = req.body;

        if (!applicationId || !amountUsdCents) {
          return res
            .status(400)
            .json({ message: "applicationId & amountUsdCents are required" });
        }
        if (!isValidObjectId(applicationId)) {
          return res.status(400).json({ message: "Invalid applicationId" });
        }

        const appDoc = await applicationsCollection.findOne({ _id: toObjectId(applicationId) });
        if (!appDoc) {
          return res.status(404).json({ message: "Application not found" });
        }
        if (appDoc.status !== "Approved") {
          return res.status(400).json({ message: "Application is not approved for payment" });
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountUsdCents,
          currency,
          description: `Premium payment for application ${applicationId}`,
          metadata: {
            applicationId,
            amountBDT: amountBDT ?? 0,
            amountUSD: amountUSD ?? 0,
            frequency: frequency ?? "",
          },
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (err) {
        console.error("Error creating payment intent:", err);
        res.status(500).json({ message: "Stripe error" });
      }
    });

    app.post("/payments/confirm", async (req, res) => {
      try {
        const {
          applicationId,
          paymentIntentId,
          amountBDT,
          amountUSD,
          frequency,
          status,
        } = req.body;

        if (!applicationId || !paymentIntentId || !status) {
          return res
            .status(400)
            .json({ message: "applicationId, paymentIntentId & status are required" });
        }
        if (!isValidObjectId(applicationId)) {
          return res.status(400).json({ message: "Invalid applicationId" });
        }

        const appDoc = await applicationsCollection.findOne({ _id: toObjectId(applicationId) });
        if (!appDoc) {
          return res.status(404).json({ message: "Application not found" });
        }

        let intent;
        try {
          intent = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (intent.status !== "succeeded") {
            return res.status(400).json({ message: "PaymentIntent not succeeded on Stripe" });
          }
        } catch (e) {
          console.error("Stripe PI retrieve failed:", e);
          return res.status(400).json({ message: "Cannot verify Stripe PaymentIntent" });
        }

        const update = {
          paymentStatus: status,
          frequency,
          activatedAt: new Date(),
          paymentInfo: {
            paymentIntentId,
            amountBDT,
            amountUSD,
            stripeCurrency: intent.currency,
            stripeAmount: intent.amount,
            createdAt: new Date(),
          },
        };

        await applicationsCollection.updateOne({ _id: toObjectId(applicationId) }, { $set: update });

        await paymentsCollection.insertOne({
          applicationId: toObjectId(applicationId),
          userEmail: appDoc.email,
          paymentIntentId,
          amountBDT,
          amountUSD,
          frequency,
          stripe: {
            id: intent.id,
            amount: intent.amount,
            currency: intent.currency,
            status: intent.status,
          },
          createdAt: new Date(),
        });

        res.json({ ok: true, message: "Payment confirmed & application updated" });
      } catch (err) {
        console.error("Confirm payment failed:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // ---------------- ROOT ----------------
    app.get("/", (req, res) => {
      res.send("Life Insurance Platform API Running!");
    });

    // ---------------- START ----------------
    app.listen(port, () => {
      console.log(`🚀 Life Insurance app listening on port ${port}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

run().catch(console.dir);

// ---------- Global error handler ----------
app.use((err, req, res, next) => {
  console.error("🔥 Global error:", err);
  if (err.name === "MulterError") {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err instanceof Error) {
    return res.status(500).json({ message: err.message });
  }
  next();
});
