import { Timestamp } from 'firebase/firestore';

// Status types
export type ClientStatus = 'active' | 'archived';
export type PaymentStatus = 'pending' | 'paid' | 'partial';
export type ServiceType = 'walk' | 'sitter';
export type OperationType = 'walk' | 'full_day' | 'partial';
export type ScheduleStatus = 'scheduled' | 'completed' | 'cancelled' | 'not_done';

// Weight rules for operations
export const OPERATION_WEIGHTS: Record<OperationType, number> = {
  walk: 1,
  full_day: 2,
  partial: 1,
};

// Firestore Collections Interfaces

export interface Client {
  id: string;
  ownerName: string;
  petName: string;
  address: string;
  phone: string;
  photoUrl?: string; // URL da foto do pet
  status: ClientStatus;
  createdAt: Timestamp;
}

export interface Pack {
  id: string;
  clientId: string;
  serviceType: ServiceType;
  totalCredits: number;
  usedCredits: number;
  packageValue: number; // Valor do ciclo em centavos
  paidAmount?: number; // Valor já pago em centavos (para pagamentos parciais)
  startDate: Timestamp;
  endDate?: Timestamp | null; // Para Pet Sitter: data pré-contratada; Para Passeio: null (até o momento)
  paymentStatus: PaymentStatus;
  paymentDate?: Timestamp | null; // Data em que o pagamento foi realizado
  isActive: boolean; // Se o ciclo está ativo ou encerrado
  cycleNumber?: number; // Número sequencial do ciclo para o cliente
}

export interface Operation {
  id: string;
  packId: string;
  clientId: string;
  date: Timestamp;
  type: OperationType;
  weight: number;
  isExtra?: boolean; // Indica se é um serviço extra (fora do pacote)
}

// Agendamento de serviços (Agenda)
export interface ScheduledService {
  id: string;
  clientId: string;
  packId?: string; // Pode ser null se for serviço avulso
  scheduledDate: Timestamp;
  scheduledTime: string; // Formato "HH:mm"
  type: OperationType;
  status: ScheduleStatus;
  notes?: string;
  completedAt?: Timestamp | null;
  isExtra?: boolean; // Indica se é um serviço extra (fora do pacote normal do ciclo)
}

// Scheduled service with client data joined
export interface ScheduledServiceWithClient extends ScheduledService {
  client: Client;
}

// Extended types for UI (with joined data)
export interface PackWithClient extends Pack {
  client: Client;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
}

// Form types (without id and timestamp for creation)
export type ClientFormData = Omit<Client, 'id' | 'createdAt'>;
export type PackFormData = Omit<Pack, 'id'>;
export type OperationFormData = Omit<Operation, 'id'>;
export type MessageTemplateFormData = Omit<MessageTemplate, 'id'>;
export type ScheduledServiceFormData = Omit<ScheduledService, 'id' | 'completedAt'>;
