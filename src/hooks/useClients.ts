import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { Client, ClientFormData, ClientStatus } from '../types';

interface UseClientsReturn {
  clients: Client[];
  activeClients: Client[];
  archivedClients: Client[];
  loading: boolean;
  error: string | null;
  addClient: (data: Omit<ClientFormData, 'status'>) => Promise<string>;
  updateClient: (id: string, data: Partial<ClientFormData>) => Promise<void>;
  archiveClient: (id: string) => Promise<void>;
  restoreClient: (id: string) => Promise<void>;
}

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clientsQuery = query(
      collection(db, COLLECTIONS.CLIENTS),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      clientsQuery,
      (snapshot) => {
        const clientsData: Client[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Client[];

        setClients(clientsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching clients:', err);
        setError('Erro ao carregar clientes');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const activeClients = clients.filter((c) => c.status === 'active');
  const archivedClients = clients.filter((c) => c.status === 'archived');

  const addClient = async (data: Omit<ClientFormData, 'status'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.CLIENTS), {
        ...data,
        status: 'active' as ClientStatus,
        createdAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error adding client:', err);
      throw new Error('Erro ao adicionar cliente');
    }
  };

  const updateClient = async (id: string, data: Partial<ClientFormData>): Promise<void> => {
    try {
      const clientRef = doc(db, COLLECTIONS.CLIENTS, id);
      await updateDoc(clientRef, data);
    } catch (err) {
      console.error('Error updating client:', err);
      throw new Error('Erro ao atualizar cliente');
    }
  };

  const archiveClient = async (id: string): Promise<void> => {
    await updateClient(id, { status: 'archived' });
  };

  const restoreClient = async (id: string): Promise<void> => {
    await updateClient(id, { status: 'active' });
  };

  return {
    clients,
    activeClients,
    archivedClients,
    loading,
    error,
    addClient,
    updateClient,
    archiveClient,
    restoreClient,
  };
}
