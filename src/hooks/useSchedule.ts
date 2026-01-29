import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type {
  ScheduledService,
  ScheduledServiceWithClient,
  Client,
  ScheduleStatus,
  OperationType,
  Pack,
  Operation,
} from '../types';
import { OPERATION_WEIGHTS } from '../types';

interface UseScheduleReturn {
  todayServices: ScheduledServiceWithClient[];
  allServices: ScheduledServiceWithClient[];
  loading: boolean;
  error: string | null;
  addScheduledService: (data: {
    clientId: string;
    packId?: string;
    scheduledDate: Date;
    scheduledTime: string;
    type: OperationType;
    notes?: string;
  }) => Promise<string>;
  updateScheduledService: (
    id: string,
    data: Partial<ScheduledService>
  ) => Promise<void>;
  deleteScheduledService: (id: string) => Promise<void>;
  completeService: (service: ScheduledServiceWithClient) => Promise<void>;
  markAsNotDone: (id: string) => Promise<void>;
  cancelService: (id: string) => Promise<void>;
  revertServiceStatus: (service: ScheduledServiceWithClient) => Promise<void>;
}

// Helper to get start and end of a day
function getDayBounds(date: Date): { start: Timestamp; end: Timestamp } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return {
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
  };
}

export function useSchedule(): UseScheduleReturn {
  const [allServices, setAllServices] = useState<ScheduledServiceWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all scheduled services
  useEffect(() => {
    // Fetch all services without filter, filter client-side to avoid index requirements
    const unsubscribe = onSnapshot(
      collection(db, COLLECTIONS.SCHEDULED_SERVICES),
      async (snapshot) => {
        try {
          const servicesData: ScheduledService[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as ScheduledService[];

          // Filter out cancelled services (keep not_done for visibility)
          const activeServices = servicesData.filter(
            (s) => s.status === 'scheduled' || s.status === 'completed' || s.status === 'not_done'
          );

          // Client-side join: fetch client data for each service
          const servicesWithClients = await Promise.all(
            activeServices.map(async (service) => {
              const clientDoc = await getDoc(
                doc(db, COLLECTIONS.CLIENTS, service.clientId)
              );

              const clientData = clientDoc.exists()
                ? ({ id: clientDoc.id, ...clientDoc.data() } as Client)
                : null;

              return {
                ...service,
                client: clientData,
              } as ScheduledServiceWithClient;
            })
          );

          // Filter out services without valid clients and sort by date/time
          const validServices = servicesWithClients
            .filter((s) => s.client !== null)
            .sort((a, b) => {
              const dateA = a.scheduledDate?.toMillis?.() || 0;
              const dateB = b.scheduledDate?.toMillis?.() || 0;
              if (dateA !== dateB) return dateA - dateB;
              // Services without time go to the end of that day
              const timeA = a.scheduledTime || '99:99';
              const timeB = b.scheduledTime || '99:99';
              return timeA.localeCompare(timeB);
            });

          setAllServices(validServices);
          setLoading(false);
        } catch (err) {
          console.error('Error fetching scheduled services:', err);
          setError('Erro ao carregar agenda');
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

  // Filter today's services
  const todayServices = allServices.filter((service) => {
    const today = new Date();
    const { start, end } = getDayBounds(today);
    const serviceDate = service.scheduledDate?.toMillis?.() || 0;
    return (
      serviceDate >= start.toMillis() &&
      serviceDate <= end.toMillis() &&
      service.status === 'scheduled'
    );
  });

  // Add a new scheduled service
  const addScheduledService = async (data: {
    clientId: string;
    packId?: string;
    scheduledDate: Date;
    scheduledTime: string;
    type: OperationType;
    notes?: string;
  }): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.SCHEDULED_SERVICES), {
        clientId: data.clientId,
        packId: data.packId || null,
        scheduledDate: Timestamp.fromDate(data.scheduledDate),
        scheduledTime: data.scheduledTime,
        type: data.type,
        status: 'scheduled' as ScheduleStatus,
        notes: data.notes || '',
        completedAt: null,
      });
      return docRef.id;
    } catch (err) {
      console.error('Error adding scheduled service:', err);
      throw new Error('Erro ao agendar serviço');
    }
  };

  // Update a scheduled service
  const updateScheduledService = async (
    id: string,
    data: Partial<ScheduledService>
  ): Promise<void> => {
    try {
      const serviceRef = doc(db, COLLECTIONS.SCHEDULED_SERVICES, id);
      await updateDoc(serviceRef, data);
    } catch (err) {
      console.error('Error updating scheduled service:', err);
      throw new Error('Erro ao atualizar agendamento');
    }
  };

  // Delete a scheduled service
  const deleteScheduledService = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.SCHEDULED_SERVICES, id));
    } catch (err) {
      console.error('Error deleting scheduled service:', err);
      throw new Error('Erro ao excluir agendamento');
    }
  };

  // Complete a service (mark as done and optionally register operation)
  const completeService = useCallback(
    async (service: ScheduledServiceWithClient): Promise<void> => {
      const weight = OPERATION_WEIGHTS[service.type];

      try {
        // If service has a pack, update pack credits in a transaction
        if (service.packId) {
          await runTransaction(db, async (transaction) => {
            const packRef = doc(db, COLLECTIONS.PACKS, service.packId!);
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
              packId: service.packId!,
              clientId: service.clientId,
              date: service.scheduledDate, // Usar a data agendada, não a data atual
              type: service.type,
              weight,
            };

            // Update pack used credits
            transaction.update(packRef, {
              usedCredits: newUsedCredits,
              ...(newUsedCredits >= packData.totalCredits && { isActive: false }),
            });

            // Add operation
            transaction.set(operationRef, operationData);

            // Update scheduled service status
            const serviceRef = doc(db, COLLECTIONS.SCHEDULED_SERVICES, service.id);
            transaction.update(serviceRef, {
              status: 'completed' as ScheduleStatus,
              completedAt: Timestamp.now(),
            });
          });
        } else {
          // No pack associated, just mark as completed
          await updateScheduledService(service.id, {
            status: 'completed' as ScheduleStatus,
            completedAt: Timestamp.now(),
          });
        }
      } catch (err) {
        console.error('Error completing service:', err);
        throw err;
      }
    },
    []
  );

  // Mark a service as not done (não realizado)
  const markAsNotDone = async (id: string): Promise<void> => {
    await updateScheduledService(id, { status: 'not_done' as ScheduleStatus });
  };

  // Cancel a service (remove from schedule)
  const cancelService = async (id: string): Promise<void> => {
    await updateScheduledService(id, { status: 'cancelled' as ScheduleStatus });
  };

  // Revert a service status (desfazer completed ou not_done)
  const revertServiceStatus = useCallback(
    async (service: ScheduledServiceWithClient): Promise<void> => {
      const weight = OPERATION_WEIGHTS[service.type];

      try {
        // Se o serviço foi completado e tem pacote, precisamos reverter os créditos
        if (service.status === 'completed' && service.packId) {
          await runTransaction(db, async (transaction) => {
            const packRef = doc(db, COLLECTIONS.PACKS, service.packId!);
            const packDoc = await transaction.get(packRef);

            if (!packDoc.exists()) {
              throw new Error('Pacote não encontrado');
            }

            const packData = packDoc.data() as Pack;
            const newUsedCredits = Math.max(0, packData.usedCredits - weight);

            // Buscar e deletar a operação correspondente
            // A operação tem a mesma data que o scheduledDate do serviço
            const operationsRef = collection(db, COLLECTIONS.OPERATIONS);
            const { getDocs, query, where } = await import('firebase/firestore');
            const operationsQuery = query(
              operationsRef,
              where('packId', '==', service.packId),
              where('clientId', '==', service.clientId),
              where('date', '==', service.scheduledDate)
            );
            const operationsSnapshot = await getDocs(operationsQuery);
            
            // Deletar a operação encontrada
            operationsSnapshot.docs.forEach((opDoc) => {
              transaction.delete(opDoc.ref);
            });

            // Restaurar créditos do pacote
            transaction.update(packRef, {
              usedCredits: newUsedCredits,
              isActive: true, // Reativar o pacote se estava inativo
            });

            // Reverter status do serviço para scheduled
            const serviceRef = doc(db, COLLECTIONS.SCHEDULED_SERVICES, service.id);
            transaction.update(serviceRef, {
              status: 'scheduled' as ScheduleStatus,
              completedAt: null,
            });
          });
        } else {
          // Serviço sem pacote ou marcado como not_done - apenas reverter o status
          await updateScheduledService(service.id, {
            status: 'scheduled' as ScheduleStatus,
            completedAt: null,
          });
        }
      } catch (err) {
        console.error('Error reverting service status:', err);
        throw err;
      }
    },
    []
  );

  return {
    todayServices,
    allServices,
    loading,
    error,
    addScheduledService,
    updateScheduledService,
    deleteScheduledService,
    completeService,
    markAsNotDone,
    cancelService,
    revertServiceStatus,
  };
}

// Utility function to format scheduled time
export function formatScheduledTime(time: string): string {
  return time;
}

// Utility function to format scheduled date
export function formatScheduledDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  if (isToday) return 'Hoje';
  if (isTomorrow) return 'Amanhã';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}
