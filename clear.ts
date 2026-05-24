import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function clear() {
  const cDocs = await getDocs(collection(db, 'clients'));
  for (let d of cDocs.docs) {
    await deleteDoc(doc(db, 'clients', d.id));
  }
  console.log('cleared clients:', cDocs.docs.length);
  const jDocs = await getDocs(collection(db, 'jobs'));
  for (let d of jDocs.docs) {
    await deleteDoc(doc(db, 'jobs', d.id));
  }
  console.log('cleared jobs:', jDocs.docs.length);
}
clear().then(() => console.log('cleared')).catch(console.error).then(() => process.exit(0));
