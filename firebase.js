import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
export default db;
