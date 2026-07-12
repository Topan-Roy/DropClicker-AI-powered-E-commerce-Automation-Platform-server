    const express = require("express");
    const cors = require("cors");
    const dotenv = require("dotenv");
    const { MongoClient, ServerApiVersion } = require("mongodb");

    dotenv.config();

    const app = express();
    const port = process.env.PORT || 3000;

    // Middleware
    app.use(cors());
    app.use(express.json());

    // MongoDB URI
    const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a6tztk3.mongodb.net/?appName=Cluster0`;

    // Create MongoClient
    const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    });

    async function run() {
    try {
        // await client.connect();
        const db = client.db("dropclickerDB");
        const contactCollection = db.collection("contacts");

       

        console.log("✅ MongoDB Connected Successfully!");
    } catch (err) {
        console.error("❌ DB Connection Error:", err.message);
    }
    }

    run().catch(console.dir);

    // Root route
    app.get("/", (req, res) => {
    res.send("🚀 DropClicker AI powered E-commerce Automation Platform is Running...");
    });

    // Start server
    app.listen(port, () => {
    console.log(`🚀 Server listening on port ${port}`);
    });
