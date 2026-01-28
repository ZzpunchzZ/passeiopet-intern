import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { Pack, PaymentStatus, ServiceType } from '../types';

interface AddPackData {
  clientId: string;
  serviceType: ServiceType;
  totalCredits: number;
  packageValue: number;
  startDate?: Date;
  endDate?: Date | null;
}

interface UpdatePackData {
  serviceType?: ServiceType;
  totalCredits?: number;
  packageValue?: number;
  startDate?: Date;
  endDate?: Date | null;
}

interface UseClientPacksReturn {
  packs: Pack[];
  activePacks: Pack[];
  loading: boolean;
  error: string | null;
  addPack: (data: AddPackData) => Promise<string>;
  updatePaymentStatus: (id: string, paymentStatus: PaymentStatus, paidAmount?: number) => Promise<void>;
  updatePack: (id: string, data: UpdatePackData) => Promise<void>;
  deletePack: (id: string) => Promise<void>;
  closePack: (id: string) => Promise<void>;
}

export function useClientPacks(clientId: string | null): UseClientPacksReturn {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setPacks([]);
      setLoading(false);
      return;
    }

    // Query without orderBy to avoid needing composite index
    // We'll sort client-side instead
    const packsQuery = query(
      collection(db, COLLECTIONS.PACKS),
      where('clientId', '==', clientId)
    );

    const unsubscribe = onSnapshot(
      packsQuery,
      (snapshot) => {
        const packsData: Pack[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Pack[];

        // Sort by startDate descending (client-side)
        packsData.sort((a, b) => {
          const dateA = a.startDate?.toMillis?.() || 0;
          const dateB = b.startDate?.toMillis?.() || 0;
          return dateB - dateA;
        });

        setPacks(packsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching packs:', err);
        setError('Erro ao carregar ciclos');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId]);

  const activePacks = packs.filter((p) => p.isActive);

  const addPack = async (data: AddPackData): Promise<string> => {
    console.log('Adding pack with data:', data);
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.PACKS), {
        clientId: data.clientId,
        serviceType: data.serviceType,
        totalCredits: data.totalCredits,
        usedCredits: 0,
        packageValue: data.packageValue,
        startDate: data.startDate ? Timestamp.fromDate(data.startDate) : Timestamp.now(),
        endDate: data.endDate ? Timestamp.fromDate(data.endDate) : null,
        paymentStatus: 'pending' as PaymentStatus,
        isActive: true,
      });
      console.log('Pack created with ID:', docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('Error adding pack:', err);
      throw new Error('Erro ao adicionar ciclo');
    }
  };

  const updatePaymentStatus = async (id: string, paymentStatus: PaymentStatus, paidAmount?: number): Promise<void> => {
    try {
      const packRef = doc(db, COLLECTIONS.PACKS, id);
      const updateData: Record<string, unknown> = { paymentStatus };
      
      // If marking as paid, also set the payment date
      if (paymentStatus === 'paid') {
        updateData.paymentDate = Timestamp.now();
        updateData.paidAmount = null; // Clear partial amount when fully paid
      } else if (paymentStatus === 'partial') {
        // For partial payment, store the amount paid
        if (paidAmount !== undefined) {
          updateData.paidAmount = paidAmount;
        }
        updateData.paymentDate = null;
      } else {
        // If reverting to pending, clear everything
        updateData.paymentDate = null;
        updateData.paidAmount = null;
      }
      
      await updateDoc(packRef, updateData);
    } catch (err) {
      console.error('Error updating payment status:', err);
      throw new Error('Erro ao atualizar status do pagamento');
    }
  };

  const updatePack = async (id: string, data: UpdatePackData): Promise<void> => {
    try {
      const packRef = doc(db, COLLECTIONS.PACKS, id);
      
      // Convert dates to Firestore Timestamps
      const updateData: Record<string, unknown> = {};
      if (data.serviceType !== undefined) updateData.serviceType = data.serviceType;
      if (data.totalCredits !== undefined) updateData.totalCredits = data.totalCredits;
      if (data.packageValue !== undefined) updateData.packageValue = data.packageValue;
      if (data.startDate !== undefined) updateData.startDate = Timestamp.fromDate(data.startDate);
      if (data.endDate !== undefined) {
        updateData.endDate = data.endDate ? Timestamp.fromDate(data.endDate) : null;
      }
      
      await updateDoc(packRef, updateData);
    } catch (err) {
      console.error('Error updating pack:', err);
      throw new Error('Erro ao atualizar ciclo');
    }
  };

  const closePack = async (id: string): Promise<void> => {
    try {
      const packRef = doc(db, COLLECTIONS.PACKS, id);
      await updateDoc(packRef, { 
        isActive: false,
        endDate: Timestamp.now(),
      });
    } catch (err) {
      console.error('Error closing pack:', err);
      throw new Error('Erro ao encerrar ciclo');
    }
  };

  const deletePack = async (id: string): Promise<void> => {
    try {
      const packRef = doc(db, COLLECTIONS.PACKS, id);
      await deleteDoc(packRef);
    } catch (err) {
      console.error('Error deleting pack:', err);
      throw new Error('Erro ao excluir ciclo');
    }
  };

  return {
    packs,
    activePacks,
    loading,
    error,
    addPack,
    updatePaymentStatus,
    updatePack,
    deletePack,
    closePack,
  };
}
