import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';

// Mapeamento dos slots antigos para os novos (slot inicial + duração)
const OLD_TO_NEW_SLOTS: Record<string, { newSlot: string; duration: number }> = {
  '06:50-07:20': { newSlot: '06:50-07:20', duration: 30 },
  '07:30-08:30': { newSlot: '07:30-08:00', duration: 60 },
  '09:00-10:00': { newSlot: '09:00-09:30', duration: 60 },
  '10:30-11:30': { newSlot: '10:30-11:00', duration: 60 },
  '14:30-15:30': { newSlot: '14:30-15:00', duration: 60 },
  '16:00-17:00': { newSlot: '16:00-16:30', duration: 60 },
  '17:30-18:30': { newSlot: '17:30-18:00', duration: 60 },
};

// Novos slots válidos (30 min cada)
const NEW_SLOTS = [
  '06:50-07:20',
  '07:30-08:00',
  '08:00-08:30',
  '09:00-09:30',
  '09:30-10:00',
  '10:30-11:00',
  '11:00-11:30',
  '14:30-15:00',
  '15:00-15:30',
  '16:00-16:30',
  '16:30-17:00',
  '17:30-18:00',
  '18:00-18:30',
];

/**
 * Migra serviços agendados do modelo antigo (slots de 1h) para o novo (slots de 30min + duration)
 * @returns Relatório da migração
 */
export async function migrateScheduledServicesToDuration(): Promise<{
  total: number;
  updated: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.SCHEDULED_SERVICES));
    result.total = snapshot.docs.length;

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const currentSlot = data.scheduledTime;
      const currentDuration = data.duration;

      // Se já tem duration definido, pula
      if (currentDuration !== undefined && currentDuration !== null) {
        result.skipped++;
        continue;
      }

      // Se não tem slot de tempo, define duration padrão de 30
      if (!currentSlot) {
        try {
          await updateDoc(doc(db, COLLECTIONS.SCHEDULED_SERVICES, docSnapshot.id), {
            duration: 30,
          });
          result.updated++;
        } catch (err) {
          result.errors.push(`Erro ao atualizar ${docSnapshot.id}: ${err}`);
        }
        continue;
      }

      // Verifica se é um slot antigo que precisa de conversão
      const mapping = OLD_TO_NEW_SLOTS[currentSlot];
      
      if (mapping) {
        try {
          await updateDoc(doc(db, COLLECTIONS.SCHEDULED_SERVICES, docSnapshot.id), {
            scheduledTime: mapping.newSlot,
            duration: mapping.duration,
          });
          result.updated++;
        } catch (err) {
          result.errors.push(`Erro ao atualizar ${docSnapshot.id}: ${err}`);
        }
      } else if (NEW_SLOTS.includes(currentSlot)) {
        // Já está no formato novo, só precisa adicionar duration
        try {
          await updateDoc(doc(db, COLLECTIONS.SCHEDULED_SERVICES, docSnapshot.id), {
            duration: 30,
          });
          result.updated++;
        } catch (err) {
          result.errors.push(`Erro ao atualizar ${docSnapshot.id}: ${err}`);
        }
      } else {
        // Slot desconhecido, define duration padrão
        try {
          await updateDoc(doc(db, COLLECTIONS.SCHEDULED_SERVICES, docSnapshot.id), {
            duration: 30,
          });
          result.updated++;
          result.errors.push(`Slot desconhecido em ${docSnapshot.id}: "${currentSlot}" - definido duration: 30`);
        } catch (err) {
          result.errors.push(`Erro ao atualizar ${docSnapshot.id}: ${err}`);
        }
      }
    }
  } catch (err) {
    result.errors.push(`Erro geral: ${err}`);
  }

  return result;
}

/**
 * Preview da migração - mostra o que seria alterado sem fazer mudanças
 */
export async function previewMigration(): Promise<{
  total: number;
  toUpdate: Array<{ id: string; currentSlot: string; newSlot: string; duration: number }>;
  alreadyMigrated: number;
  noSlot: number;
}> {
  const result = {
    total: 0,
    toUpdate: [] as Array<{ id: string; currentSlot: string; newSlot: string; duration: number }>,
    alreadyMigrated: 0,
    noSlot: 0,
  };

  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.SCHEDULED_SERVICES));
    result.total = snapshot.docs.length;

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const currentSlot = data.scheduledTime;
      const currentDuration = data.duration;

      if (currentDuration !== undefined && currentDuration !== null) {
        result.alreadyMigrated++;
        continue;
      }

      if (!currentSlot) {
        result.noSlot++;
        continue;
      }

      const mapping = OLD_TO_NEW_SLOTS[currentSlot];
      if (mapping) {
        result.toUpdate.push({
          id: docSnapshot.id,
          currentSlot,
          newSlot: mapping.newSlot,
          duration: mapping.duration,
        });
      }
    }
  } catch (err) {
    console.error('Erro no preview:', err);
  }

  return result;
}
