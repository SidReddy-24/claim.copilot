const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    console.log('Databases on cluster:', dbs.databases.map(d => d.name));
    
    for (const dbInfo of dbs.databases) {
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      const colNames = collections.map(c => c.name);
      
      if (colNames.includes('users')) {
        console.log(`\nFound 'users' collection in database: ${dbInfo.name}`);
        const users = await db.collection('users').find({}).toArray();
        users.forEach((u, i) => {
          console.log(`  ${i + 1}. Name: ${u.name}, Email: ${u.email}, ID: ${u._id}`);
        });
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

run();
