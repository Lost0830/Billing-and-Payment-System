import mongoose from "mongoose";

const BILLING_MONGO_URI = process.env.BILLING_MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URI || "";

async function clearData() {
  try {
    if (!BILLING_MONGO_URI) {
      console.error("❌ BILLING_MONGO_URI not set. Set it in your .env before running this script.");
      process.exit(1);
    }

    console.log("Connecting to Billing MongoDB...");
    const conn = await mongoose.connect(BILLING_MONGO_URI);
    const db = conn.connection.db;

    console.log("Listing collections...");
    const collections = await db.listCollections().toArray();
    console.log("Found collections:", collections.map(c => c.name).join(", "));

    console.log("");
    let totalDeleted = 0;
    for (const collection of collections) {
      try {
        const result = await db.collection(collection.name).deleteMany({});
        console.log("✓ Cleared", collection.name, "- deleted", result.deletedCount, "documents");
        totalDeleted += result.deletedCount;
      } catch (e) {
        console.log("! Could not clear", collection.name, "-", e.message);
      }
    }

    await mongoose.connection.close();
    console.log("");
    console.log("✓ SUCCESS! Total documents deleted:", totalDeleted);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message || error);
    process.exit(1);
  }
}

clearData();
