// Script temporário para executar a migração
// Execute com: npx tsx src/lib/run-migration.ts

import { config } from 'dotenv';
config(); // Carrega variáveis do .env

import { initializeApp } from 'firebase/app';
import { collection, getDocs, updateDoc, doc, getFirestore } from 'firebase/firestore';

// Firebase config usando process.env
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTIONS = {
  SCHEDULED_SERVICES: 'scheduled_services',
};

// Mapeamento dos slots antigos para os novos
const OLD_TO_NEW_SLOTS: Record<string, { newSlot: string; duration: number }> = {
  '06:50-07:20': { newSlot: '06:50-07:20', duration: 30 },
  '07:30-08:30': { newSlot: '07:30-08:00', duration: 60 },
  '09:00-10:00': { newSlot: '09:00-09:30', duration: 60 },
  '10:30-11:30': { newSlot: '10:30-11:00', duration: 60 },
  '14:30-15:30': { newSlot: '14:30-15:00', duration: 60 },
  '16:00-17:00': { newSlot: '16:00-16:30', duration: 60 },
  '17:30-18:30': { newSlot: '17:30-18:00', duration: 60 },
};

const NEW_SLOTS = [
  '06:50-07:20', '07:30-08:00', '08:00-08:30', '09:00-09:30', '09:30-10:00',
  '10:30-11:00', '11:00-11:30', '14:30-15:00', '15:00-15:30', '16:00-16:30',
  '16:30-17:00', '17:30-18:00', '18:00-18:30',
];

async function migrateScheduledServicesToDuration() {
  const result = { total: 0, updated: 0, skipped: 0, errors: [] as string[] };

  const snapshot = await getDocs(collection(db, COLLECTIONS.SCHEDULED_SERVICES));
  result.total = snapshot.docs.length;

  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data();
    const currentSlot = data.scheduledTime;
    const currentDuration = data.duration;

    if (currentDuration !== undefined && currentDuration !== null) {
      result.skipped++;
      continue;
    }

    if (!currentSlot) {
      await updateDoc(doc(db, COLLECTIONS.SCHEDULED_SERVICES, docSnapshot.id), { duration: 30 });
      result.updated++;
      continue;
    }

    const mapping = OLD_TO_NEW_SLOTS[currentSlot];
    
    if (mapping) {
      await updateDoc(doc(db, COLLECTIONS.SCHEDULED_SERVICES, docSnapshot.id), {
        scheduledTime: mapping.newSlot,
        duration: mapping.duration,
      });
      result.updated++;
    } else if (NEW_SLOTS.includes(currentSlot)) {
      await updateDoc(doc(db, COLLECTIONS.SCHEDULED_SERVICES, docSnapshot.id), { duration: 30 });
      result.updated++;
    } else {
      await updateDoc(doc(db, COLLECTIONS.SCHEDULED_SERVICES, docSnapshot.id), { duration: 30 });
      result.updated++;
      result.errors.push(`Slot desconhecido: "${currentSlot}"`);
    }
  }

  return result;
}

async function main() {
  console.log('🚀 Iniciando migração dos slots...\n');
  
  const result = await migrateScheduledServicesToDuration();
  
  console.log('\n✅ Migração concluída!');
  console.log('----------------------------');
  console.log(`Total de registros: ${result.total}`);
  console.log(`Atualizados: ${result.updated}`);
  console.log(`Ignorados (já migrados): ${result.skipped}`);
  
  if (result.errors.length > 0) {
    console.log(`\n⚠️ Avisos (${result.errors.length}):`);
    result.errors.forEach(err => console.log(`  - ${err}`));
  }
  
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
