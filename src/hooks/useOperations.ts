import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { Operation } from '../types';

interface UseOperationsReturn {
  operations: Operation[];
  loading: boolean;
  error: string | null;
}

export function useOperations(
  packId?: string,
  clientId?: string,
  limitCount: number = 50
): UseOperationsReturn {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let operationsQuery;

    // Queries without orderBy to avoid needing composite indexes
    // We'll sort client-side instead
    if (packId) {
      operationsQuery = query(
        collection(db, COLLECTIONS.OPERATIONS),
        where('packId', '==', packId),
        limit(limitCount)
      );
    } else if (clientId) {
      operationsQuery = query(
        collection(db, COLLECTIONS.OPERATIONS),
        where('clientId', '==', clientId),
        limit(limitCount)
      );
    } else {
      // For all operations, we can still use limit but no orderBy
      operationsQuery = query(
        collection(db, COLLECTIONS.OPERATIONS),
        limit(limitCount)
      );
    }

    const unsubscribe = onSnapshot(
      operationsQuery,
      (snapshot) => {
        const operationsData: Operation[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Operation[];

        // Sort by date descending (client-side)
        operationsData.sort((a, b) => {
          const dateA = a.date?.toMillis?.() || 0;
          const dateB = b.date?.toMillis?.() || 0;
          return dateB - dateA;
        });

        setOperations(operationsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching operations:', err);
        setError('Erro ao carregar operações');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [packId, clientId, limitCount]);

  return { operations, loading, error };
}

// Utility function to format operation type
export function formatOperationType(type: Operation['type']): string {
  const types = {
    walk: 'Passeio',
    full_day: 'Diária',
    partial: 'Parcial',
  };
  return types[type] || type;
}

// Utility function to format date
export function formatDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatShortDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}
