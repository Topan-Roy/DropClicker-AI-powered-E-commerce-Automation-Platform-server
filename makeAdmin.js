const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://dropclicker:8cQlGXg3jSehMOSW@cluster0.a6tztk3.mongodb.net/dropclickerDB?retryWrites=true&w=majority&appName=Cluster0";

async function makeAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");
    
    // Find the first user or a specific user
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Update the first user we find
    const result = await usersCollection.findOneAndUpdate(
      {}, 
      { $set: { role: 'admin' } },
      { returnDocument: 'after' }
    );
    
    if (result) {
      console.log(`Successfully updated user to admin. Email: ${result.email}, Role: ${result.role}`);
    } else {
      console.log("No users found to update.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

makeAdmin();
