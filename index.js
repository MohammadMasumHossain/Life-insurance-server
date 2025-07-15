const express = require('express');
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ MongoDB URI with environment variables
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.da72plu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// ✅ MongoDB client setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const db = client.db("lifeInsurance");
    const usersCollection = db.collection("users");

    // ✅ Example route to get users (you can build more routes this way)
    app.get('/users', async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Life Insurance Platform API Running!');
});

app.listen(port, () => {
  console.log(`Life Insurance app listening on port ${port}`);
});
