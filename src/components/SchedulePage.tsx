import { useState } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Sun,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useSchedule } from '../hooks/useSchedule';
import { useClients } from '../hooks/useClients';
import { useClientPacks } from '../hooks/useClientPacks';
import { Drawer, ConfirmDialog } from './ui/Modal';
import { Button, Select, Input, EmptyState, Card, Skeleton } from './ui/FormElements';
import type { ScheduledServiceWithClient, OperationType, Client } from '../types';

// Operation type options
const OPERATION_OPTIONS: {
  type: OperationType;
  label: string;
  icon: typeof Footprints;
}[] = [
  { type: 'walk', label: 'Passeio', icon: Footprints },
  { type: 'full_day', label: 'Diária', icon: Sun },
  { type: 'partial', label: 'Parcial', icon: Clock },
];

// Helper to format operation type label
function formatOperationType(type: OperationType): string {
  const labels: Record<OperationType, string> = {
    walk: 'Passeio',
    full_day: 'Diária',
    partial: 'Parcial',
  };
  return labels[type] || type;
}

// Schedule Form Component
interface ScheduleFormProps {
  clients: Client[];
  onSubmit: (data: {
    clientId: string;
    packId?: string;
    scheduledDate: Date;
    scheduledTime: string;
    type: OperationType;
    notes?: string;
  }) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function ScheduleForm({ clients, onSubmit, onClose, isLoading }: ScheduleFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    clientId: '',
    scheduledDate: today,
    scheduledTime: '09:00',
    type: 'walk' as OperationType,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get packs for selected client
  const { packs } = useClientPacks(formData.clientId);
  const activePacks = packs.filter((p) => p.isActive);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.clientId) newErrors.clientId = 'Selecione um cliente';
    if (!formData.scheduledDate) newErrors.scheduledDate = 'Data é obrigatória';
    if (!formData.scheduledTime) newErrors.scheduledTime = 'Horário é obrigatório';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Parse date correctly to avoid timezone issues
    const [year, month, day] = formData.scheduledDate.split('-').map(Number);
    const scheduledDate = new Date(year, month - 1, day, 12, 0, 0); // Set to noon to avoid timezone issues
    
    await onSubmit({
      clientId: formData.clientId,
      packId: activePacks.length > 0 ? activePacks[0].id : undefined,
      scheduledDate,
      scheduledTime: formData.scheduledTime,
      type: formData.type,
      notes: formData.notes,
    });
  };

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.petName} (${c.ownerName})`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Cliente"
        value={formData.clientId}
        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
        options={[{ value: '', label: 'Selecione...' }, ...clientOptions]}
        error={errors.clientId}
      />

      {formData.clientId && activePacks.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-sm text-emerald-800">
            Pacote ativo: {activePacks[0].totalCredits - activePacks[0].usedCredits} créditos restantes
          </p>
        </div>
      )}

      {formData.clientId && activePacks.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Cliente sem pacote ativo. O serviço será registrado como avulso.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Data"
          type="date"
          value={formData.scheduledDate}
          onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
          error={errors.scheduledDate}
        />
        <Input
          label="Horário"
          type="time"
          value={formData.scheduledTime}
          onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
          error={errors.scheduledTime}
        />
      </div>

      <Select
        label="Tipo de Serviço"
        value={formData.type}
        onChange={(e) => setFormData({ ...formData, type: e.target.value as OperationType })}
        options={OPERATION_OPTIONS.map((op) => ({ value: op.type, label: op.label }))}
      />

      <Input
        label="Observações (opcional)"
        placeholder="Ex: Levar remédio"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
      />

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="flex-1">
          Agendar
        </Button>
      </div>
    </form>
  );
}

// Service Card Component
interface ServiceCardProps {
  service: ScheduledServiceWithClient;
  onComplete: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function ServiceCard({ service, onComplete, onCancel, isSubmitting }: ServiceCardProps) {
  const isCompleted = service.status === 'completed';

  return (
    <Card
      className={`transition-all ${
        isCompleted ? 'bg-emerald-50 border-emerald-200 opacity-75' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Time badge */}
        <div
          className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl ${
            isCompleted ? 'bg-emerald-100' : 'bg-blue-100'
          }`}
        >
          <span
            className={`text-lg font-bold ${
              isCompleted ? 'text-emerald-700' : 'text-blue-700'
            }`}
          >
            {service.scheduledTime}
          </span>
          <span
            className={`text-xs ${isCompleted ? 'text-emerald-600' : 'text-blue-600'}`}
          >
            {formatOperationType(service.type)}
          </span>
        </div>

        {/* Service info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900 truncate">
              {service.client.petName}
            </h3>
            {isCompleted && (
              <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded-full">
                Feito
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate">{service.client.ownerName}</p>
          {service.client.address && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{service.client.address}</span>
            </div>
          )}
          {service.notes && (
            <p className="text-xs text-orange-600 mt-1 truncate">📝 {service.notes}</p>
          )}
        </div>

        {/* Action buttons */}
        {!isCompleted && (
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={onComplete}
              disabled={isSubmitting}
              className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 p-5 flex gap-4">
          <Skeleton className="w-16 h-16 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Date navigation helper
function getDateRange(baseDate: Date): { prev: Date; next: Date } {
  const prev = new Date(baseDate);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(baseDate);
  next.setDate(next.getDate() + 1);
  return { prev, next };
}

// Format header date
function formatHeaderDate(date: Date): string {
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
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).format(date);
}

// Format date for comparison
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

// Open Google Calendar with event
function openGoogleCalendar(service: ScheduledServiceWithClient) {
  const date = service.scheduledDate.toDate();
  const [hours, minutes] = service.scheduledTime.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(endDate.getHours() + 1);

  const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, '');
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Passeio - ${service.client.petName}`,
    details: `Tutor: ${service.client.ownerName}\n${service.notes || ''}`,
    location: service.client.address || '',
    dates: `${formatGCalDate(date)}/${formatGCalDate(endDate)}`,
  });

  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
}

// Main Schedule Page
export function SchedulePage() {
  const {
    allServices,
    loading,
    error,
    addScheduledService,
    completeService,
    cancelService,
  } = useSchedule();
  const { activeClients } = useClients();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<ScheduledServiceWithClient | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<ScheduledServiceWithClient | null>(null);

  // Filter services for selected date
  const servicesForDate = allServices.filter((service) => {
    const serviceDate = service.scheduledDate.toDate();
    return isSameDay(serviceDate, selectedDate);
  });

  // Separate pending and completed
  const pendingServices = servicesForDate.filter((s) => s.status === 'scheduled');
  const completedServices = servicesForDate.filter((s) => s.status === 'completed');

  const { prev, next } = getDateRange(selectedDate);

  const handleAddService = async (data: {
    clientId: string;
    packId?: string;
    scheduledDate: Date;
    scheduledTime: string;
    type: OperationType;
    notes?: string;
  }) => {
    setIsSubmitting(true);
    try {
      await addScheduledService(data);
      setIsFormOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao agendar serviço');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!confirmComplete) return;
    setIsSubmitting(true);
    try {
      await completeService(confirmComplete);
      setConfirmComplete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao concluir serviço');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirmCancel) return;
    setIsSubmitting(true);
    try {
      await cancelService(confirmCancel.id);
      setConfirmCancel(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao cancelar serviço');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar</span>
          </button>
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-between bg-gray-100 rounded-xl p-2">
          <button
            onClick={() => setSelectedDate(prev)}
            className="p-2 rounded-lg hover:bg-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <p className="font-bold text-gray-900 capitalize">
              {formatHeaderDate(selectedDate)}
            </p>
            <p className="text-xs text-gray-500">
              {new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }).format(selectedDate)}
            </p>
          </div>
          <button
            onClick={() => setSelectedDate(next)}
            className="p-2 rounded-lg hover:bg-white transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : servicesForDate.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-10 h-10 text-gray-400" />}
            title="Nenhum agendamento"
            description="Não há serviços agendados para este dia"
          />
        ) : (
          <>
            {/* Pending services */}
            {pendingServices.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3">
                  A Fazer ({pendingServices.length})
                </h2>
                <div className="space-y-3">
                  {pendingServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onComplete={() => setConfirmComplete(service)}
                      onCancel={() => setConfirmCancel(service)}
                      isSubmitting={isSubmitting}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed services */}
            {completedServices.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3">
                  Concluídos ({completedServices.length})
                </h2>
                <div className="space-y-3">
                  {completedServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onComplete={() => {}}
                      onCancel={() => {}}
                      isSubmitting={false}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Google Calendar link */}
        {servicesForDate.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <button
              onClick={() => {
                if (pendingServices.length > 0) {
                  openGoogleCalendar(pendingServices[0]);
                }
              }}
              className="w-full flex items-center justify-center gap-2 text-blue-600 font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir no Google Calendar
            </button>
          </div>
        )}
      </main>

      {/* Add Schedule Drawer */}
      <Drawer
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Novo Agendamento"
      >
        <ScheduleForm
          clients={activeClients}
          onSubmit={handleAddService}
          onClose={() => setIsFormOpen(false)}
          isLoading={isSubmitting}
        />
      </Drawer>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        onConfirm={handleCancel}
        title="Cancelar Agendamento"
        message={`Tem certeza que deseja cancelar o agendamento de ${confirmCancel?.client.petName}?`}
        confirmText="Cancelar Agendamento"
        variant="danger"
      />

      {/* Complete Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmComplete}
        onClose={() => setConfirmComplete(null)}
        onConfirm={handleComplete}
        title="Confirmar Passeio"
        message={`Confirmar que o passeio de ${confirmComplete?.client.petName} foi realizado?`}
        confirmText="Confirmar"
        variant="default"
      />
    </div>
  );
}
