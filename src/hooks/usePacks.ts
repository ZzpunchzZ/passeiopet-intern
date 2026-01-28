import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { Pack, Client, PackWithClient, OperationType, Operation } from '../types';
import { OPERATION_WEIGHTS } from '../types';

interface UsePacksReturn {
  packs: PackWithClient[];
  loading: boolean;
  error: string | null;
  registerOperation: (
    packId: string,
    clientId: string,
    operationType: OperationType
  ) => Promise<void>;
}

export function usePacks(): UsePacksReturn {
  const [packs, setPacks] = useState<PackWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Query active packs
    const packsQuery = query(
      collection(db, COLLECTIONS.PACKS),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(
      packsQuery,
      async (snapshot) => {
        try {
          const packsData: Pack[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Pack[];

          // Client-side join: fetch client data for each pack
          const packsWithClients = await Promise.all(
            packsData.map(async (pack) => {
              const clientDoc = await getDoc(
                doc(db, COLLECTIONS.CLIENTS, pack.clientId)
              );

              const clientData = clientDoc.exists()
                ? ({ id: clientDoc.id, ...clientDoc.data() } as Client)
                : null;

              return {
                ...pack,
                client: clientData,
              } as PackWithClient;
            })
          );

          // Filter out packs without valid clients
          const validPacks = packsWithClients.filter(
            (pack) => pack.client !== null
          );

          setPacks(validPacks);
          setLoading(false);
        } catch (err) {
          console.error('Error fetching packs:', err);
          setError('Erro ao carregar pacotes');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Snapshot error:', err);
        setError('Erro de conexão com o banco de dados');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Register a new operation and atomically update pack credits
  const registerOperation = async (
    packId: string,
    clientId: string,
    operationType: OperationType
  ): Promise<void> => {
    const weight = OPERATION_WEIGHTS[operationType];

    try {
      await runTransaction(db, async (transaction) => {
        const packRef = doc(db, COLLECTIONS.PACKS, packId);
        const packDoc = await transaction.get(packRef);

        if (!packDoc.exists()) {
          throw new Error('Pacote não encontrado');
        }

        const packData = packDoc.data() as Pack;
        const newUsedCredits = packData.usedCredits + weight;

        if (newUsedCredits > packData.totalCredits) {
          throw new Error('Créditos insuficientes no pacote');
        }

        // Create operation document
        const operationRef = doc(collection(db, COLLECTIONS.OPERATIONS));
        const operationData: Omit<Operation, 'id'> = {
          packId,
          clientId,
          date: Timestamp.now(),
          type: operationType,
          weight,
        };

        // Update pack used credits
        transaction.update(packRef, {
          usedCredits: newUsedCredits,
          // If all credits used, mark as inactive
          ...(newUsedCredits >= packData.totalCredits && { isActive: false }),
        });

        // Add operation
        transaction.set(operationRef, operationData);
      });
    } catch (err) {
      console.error('Error registering operation:', err);
      throw err;
    }
  };

  return { packs, loading, error, registerOperation };
}
