


require("dotenv").config();
const cors = require("cors");
const express = require("express");
const app = express();
var admin = require("firebase-admin");

const fs = require("fs");

const path = require("path");



const multer = require("multer");
const Stripe = require("stripe");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");


const port = process.env.PORT || 3000;

// Firebase Admin Init
const decoded =Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);

if (!admin.apps.length){
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
}




// ---------- Stripe ----------
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
app.use(express.json());
// ---------- Middlewares ----------
app.use(
  cors({
    origin: ["http://localhost:5173","https://life-insurance-8c230.web.app"], // add more origins if you deploy
    credentials: true,
  })
);


// ---------- Ensure uploads folder exists ----------
// const UPLOAD_DIR = path.join(__dirname, "uploads");

// if (!fs.existsSync(UPLOAD_DIR)) {
//   fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// }

// app.use("/uploads", express.static(UPLOAD_DIR));
// ---------- Ensure uploads folder exists ----------
const UPLOAD_DIR = path.join(process.env.NODE_ENV === 'production' ? '/tmp' : __dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Make sure to also update your static file serving:
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
  claimsCollection,
 newsletterCollection;

async function run() {
  try {
    // await client.connect();
    const db = client.db(process.env.DB_NAME || "life-insurance");

    usersCollection = db.collection("users");
    policiesCollection = db.collection("policies");
    applicationsCollection = db.collection("applications");
    reviewsCollection = db.collection("reviews");
    blogsCollection = db.collection("blogs");
    paymentsCollection = db.collection("payments");
    claimsCollection = db.collection("claims");
     newsletterCollection = db.collection('newsletterSubscribers');

    // console.log("✅ Connected to MongoDB");

    // (optional) helpful indexes
    applicationsCollection.createIndex({ email: 1 }).catch(() => {});
    claimsCollection.createIndex({ email: 1 }).catch(() => {});
    claimsCollection.createIndex({ applicationId: 1 }).catch(() => {});

    // ---------------- HEALTH ----------------
    app.get("/health", (req, res) => {
      res.json({ ok: true, time: new Date() });
    });

    // ------------agent -----------

    app.get('/agents', async (req, res) => {
  try {
    // Fetch 3 users with role 'agent'
    const agents = await usersCollection
      .find({ role: 'agent' })
      .limit(3)
      .toArray();

    res.json(agents);
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
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

    // GET: Get user role by email
        app.get('/users/:email/role', async (req, res) => {
            try {
                const email = req.params.email;

                if (!email) {
                    return res.status(400).send({ message: 'Email is required' });
                }

                const user = await usersCollection.findOne({ email });

                if (!user) {
                    return res.status(404).send({ message: 'User not found' });
                }

                res.send({ role: user.role || 'user' });
            } catch (error) {
                console.error('Error getting user role:', error);
                res.status(500).send({ message: 'Failed to get role' });
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




app.patch("/users/:email", async (req, res) => {
  const { email } = req.params;
  const {
    name,
    photo,
    nid,
    fatherName,
    motherName,
    address,
  } = req.body;

  // 🔍 Log incoming data
  // console.log(`[PATCH] Updating user: ${email}`);
  // console.log("Received payload:", req.body);

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Invalid email" });
  }

  // 🧹 Build update object with only defined values
  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (photo !== undefined) updateFields.photo = photo;
  if (nid !== undefined) updateFields.nid = nid;
  if (fatherName !== undefined) updateFields.fatherName = fatherName;
  if (motherName !== undefined) updateFields.motherName = motherName;
  if (address !== undefined) updateFields.address = address;

  updateFields.updatedAt = new Date();

  try {
    const result = await usersCollection.updateOne(
      { email },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      console.warn("❗ No user found with this email.");
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ User updated successfully");
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("❌ Failed to update user profile:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/users/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
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

app.get("/blogs", async (req, res) => {
  try {
    const { authorEmail } = req.query;

    const filter = authorEmail
      ? { authorEmail: { $regex: new RegExp(`^${authorEmail}$`, "i") } }
      : {};

    const blogs = await blogsCollection
      .find(filter)
      .sort({ publishDate: -1 })
      .toArray();

    res.json(blogs);
  } catch (err) {
    console.error("Failed to fetch blogs:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// =================== CREATE Blog ===================
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
      totalVisit: 0,
    };

    const result = await blogsCollection.insertOne(doc);
    res.status(201).json({ message: "Blog created", insertedId: result.insertedId });
  } catch (err) {
    console.error("Failed to create blog:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// =================== UPDATE Blog ===================
app.patch("/blogs/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid blog ID" });
  }

  try {
    const updates = {};
    const { title, content, image, republish } = req.body;

    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (image !== undefined) updates.image = image;
    if (republish) updates.publishDate = new Date();

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

// =================== DELETE Blog ===================
app.delete("/blogs/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid blog ID" });
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

// =================== PATCH Visit Count ===================
app.patch('/blogs/:id/visit', async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid blog ID" });
  }

  try {
    const result = await blogsCollection.updateOne(
      { _id: toObjectId(id) },
      { $inc: { totalVisit: 1 } }
    );
    res.send({ message: "Visit count updated", result });
  } catch (err) {
    console.error("Failed to update visit count:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

    // Newsletter subscription route
app.post('/newsletter', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Optionally check if email already subscribed
    const existing = await newsletterCollection.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already subscribed' });
    }

    await newsletterCollection.insertOne({ name, email, subscribedAt: new Date() });
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

    
    app.get("/policies", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = Math.min(Math.max(1, parseInt(req.query.limit)), 50) || 9;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const search = req.query.search;

    // Build the filter object
    let filter = {};

    if (category && category !== "All") {
      filter.category = category;
    }

    if (search) {
      // Case-insensitive regex search on title field
      filter.title = { $regex: search, $options: "i" };
    }

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

    // app.patch("/applications/:id/status", async (req, res) => {
    //   const { id } = req.params;
    //   const { status } = req.body;

    //   if (!isValidObjectId(id)) {
    //     return res.status(400).json({ message: "Invalid application id" });
    //   }
    //   if (!["Pending", "Approved", "Rejected"].includes(status)) {
    //     return res.status(400).json({ message: "Invalid status" });
    //   }

    //   try {
    //     const result = await applicationsCollection.updateOne(
    //       { _id: toObjectId(id) },
    //       { $set: { status } }
    //     );
    //     if (result.matchedCount === 0) {
    //       return res.status(404).json({ message: "Application not found" });
    //     }
    //     res.json({ message: "Status updated successfully" });
    //   } catch (error) {
    //     console.error("Failed to update status:", error);
    //     res.status(500).json({ message: "Internal Server Error" });
    //   }
    // });

    app.patch("/applications/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, rejectionFeedback } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid application id" });
  }

  if (!["Pending", "Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  // If status is Rejected, rejectionFeedback should be provided (optional but recommended)
  if (status === "Rejected" && (!rejectionFeedback || rejectionFeedback.trim() === "")) {
    return res.status(400).json({ message: "Rejection feedback is required when rejecting" });
  }

  try {
    // Build update object dynamically
    const updateFields = { status };

    if (status === "Rejected") {
      updateFields.rejectionFeedback = rejectionFeedback.trim();
    } else {
      // Clear rejectionFeedback if status is not Rejected
      updateFields.rejectionFeedback = "";
    }

    const result = await applicationsCollection.updateOne(
      { _id: toObjectId(id) },
      { $set: updateFields }
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
    // app.post("/reviews", async (req, res) => {
    //   const { email, policyId, policyTitle, rating, feedback } = req.body;
    //   if (!email || !policyId || !policyTitle || !rating || !feedback) {
    //     return res.status(400).json({ message: "All fields are required" });
    //   }

    //   try {
    //     const review = {
    //       email,
    //       policyId: toObjectId(policyId),
    //       policyTitle,
    //       rating: parseInt(rating, 10),
    //     feedback,
    //       createdAt: new Date(),
    //     };

    //     const result = await reviewsCollection.insertOne(review);
    //     res.status(201).json({ message: "Review submitted", insertedId: result.insertedId });
    //   } catch (error) {
    //     console.error("Failed to save review:", error);
    //     res.status(500).json({ message: "Internal Server Error" });
    //   }
    // });

    app.post("/reviews", async (req, res) => {
  const { email, policyId, policyTitle, rating, feedback, name, photo } = req.body;

  if (!email || !policyId || !policyTitle || !rating || !feedback || !name || !photo) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const review = {
      email,
      name,
      photo,
      policyId: new ObjectId(policyId),
      policyTitle,
      rating: parseInt(rating, 10),
      feedback,
      createdAt: new Date()
    };

    const result = await reviewsCollection.insertOne(review);
    res.status(201).json({ message: "Review submitted", insertedId: result.insertedId });
  } catch (error) {
    console.error("Failed to save review:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


    
         // GET: Get latest 5 reviews (can be paginated later)
app.get('/reviews', async (req, res) => {
  try {
    const reviews = await reviewsCollection
      .find()
      .sort({ createdAt: -1 }) // most recent first
      .limit(5)
      .toArray();

    res.send(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).send({ message: 'Failed to fetch reviews' });
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
    console.log(`Server is listening on port ${port}`);
});
  } catch (err) {
    // console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

run().catch(console.dir);

// ---------- Global error handler ----------
