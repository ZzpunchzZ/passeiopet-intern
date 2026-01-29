import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus,
  Clock,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Sun,
  Repeat,
  ExternalLink,
  Calendar,
  XCircle,
  Trash2,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useSchedule } from '../hooks/useSchedule';
import { useClients } from '../hooks/useClients';
import { useClientPacks } from '../hooks/useClientPacks';
import { Drawer, ConfirmDialog } from './ui/Modal';
import { Button, Select, Input, Card, Skeleton } from './ui/FormElements';

import type { ScheduledServiceWithClient, OperationType, Client, ServiceDuration } from '../types';

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

// Duration options for scheduling
const DURATION_OPTIONS: { value: ServiceDuration; label: string }[] = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2 horas' },
];

// Time slots for scheduling (30 min intervals)
const TIME_SLOTS = [
  { value: '06:50-07:20', label: '06h50', labelFull: '06h50–07h20' },
  { value: '07:30-08:00', label: '07h30', labelFull: '07h30–08h00' },
  { value: '08:00-08:30', label: '08h00', labelFull: '08h00–08h30' },
  { value: '09:00-09:30', label: '09h00', labelFull: '09h00–09h30' },
  { value: '09:30-10:00', label: '09h30', labelFull: '09h30–10h00' },
  { value: '10:30-11:00', label: '10h30', labelFull: '10h30–11h00' },
  { value: '11:00-11:30', label: '11h00', labelFull: '11h00–11h30' },
  { value: '14:30-15:00', label: '14h30', labelFull: '14h30–15h00' },
  { value: '15:00-15:30', label: '15h00', labelFull: '15h00–15h30' },
  { value: '16:00-16:30', label: '16h00', labelFull: '16h00–16h30' },
  { value: '16:30-17:00', label: '16h30', labelFull: '16h30–17h00' },
  { value: '17:30-18:00', label: '17h30', labelFull: '17h30–18h00' },
  { value: '18:00-18:30', label: '18h00', labelFull: '18h00–18h30' },
];

// Helper to format slot for display
function formatTimeSlot(slot: string): string {
  const found = TIME_SLOTS.find(s => s.value === slot);
  return found ? found.label : slot || 'Sem horário';
}

// Helper to format a time range for display (e.g., "07h30–08h30")
function formatTimeRange(startSlot: string, duration: ServiceDuration = 30): string {
  const startIndex = TIME_SLOTS.findIndex(s => s.value === startSlot);
  if (startIndex === -1) return formatTimeSlot(startSlot);
  
  const slotsNeeded = Math.ceil(duration / 30);
  const endIndex = Math.min(startIndex + slotsNeeded - 1, TIME_SLOTS.length - 1);
  
  // Extract start time from first slot (e.g., "07:30" from "07:30-08:00")
  const startTime = startSlot.split('-')[0];
  // Extract end time from last slot
  const endSlot = TIME_SLOTS[endIndex]?.value || startSlot;
  const endTime = endSlot.split('-')[1];
  
  const formatTime = (time: string) => time.replace(':', 'h');
  return `${formatTime(startTime)}–${formatTime(endTime)}`;
}

// Helper to get list of slots occupied by a service
function getOccupiedSlots(startSlot: string, duration: ServiceDuration = 30): string[] {
  const startIndex = TIME_SLOTS.findIndex(s => s.value === startSlot);
  if (startIndex === -1) return [startSlot];
  
  const slotsNeeded = Math.ceil(duration / 30);
  const slots: string[] = [];
  
  for (let i = 0; i < slotsNeeded && startIndex + i < TIME_SLOTS.length; i++) {
    slots.push(TIME_SLOTS[startIndex + i].value);
  }
  
  return slots;
}

// Empty Slot Card Component
interface EmptySlotCardProps {
  slot: { value: string; label: string; labelFull: string };
  onSchedule: (slot: string) => void;
}

function EmptySlotCard({ slot, onSchedule }: EmptySlotCardProps) {
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-800 border border-dashed border-gray-600 rounded-2xl">
      <div className="flex flex-col items-center justify-center min-w-20 h-14 px-2 rounded-xl bg-gray-700">
        <span className="text-sm font-medium text-gray-400">
          {slot.labelFull}
        </span>
      </div>
      <div className="flex-1">
        <span className="text-sm italic text-gray-500">vago</span>
      </div>
      <button
        onClick={() => onSchedule(slot.value)}
        className="p-2 rounded-xl bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900 transition-colors"
        title="Agendar neste horário"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}

// Helper to format operation type label
function formatOperationType(type: OperationType): string {
  const labels: Record<OperationType, string> = {
    walk: 'Passeio',
    full_day: 'Diária',
    partial: 'Parcial',
  };
  return labels[type] || type;
}

// Helper to check if operation is Pet Sitter type
function isPetSitter(type: OperationType): boolean {
  return type === 'full_day' || type === 'partial';
}

// Service type badge component
function ServiceTypeBadge({ type }: { type: OperationType }) {
  const isSitter = isPetSitter(type);
  return (
    <span
      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
        isSitter
          ? 'bg-purple-900/50 text-purple-400'
          : 'bg-blue-900/50 text-blue-400'
      }`}
    >
      {isSitter ? '🏠 Sitter' : '🦮 Passeio'}
    </span>
  );
}

// Dias da semana para recorrência
const WEEKDAYS = [
  { value: 0, label: 'Dom', fullLabel: 'Domingo' },
  { value: 1, label: 'Seg', fullLabel: 'Segunda' },
  { value: 2, label: 'Ter', fullLabel: 'Terça' },
  { value: 3, label: 'Qua', fullLabel: 'Quarta' },
  { value: 4, label: 'Qui', fullLabel: 'Quinta' },
  { value: 5, label: 'Sex', fullLabel: 'Sexta' },
  { value: 6, label: 'Sáb', fullLabel: 'Sábado' },
];

// Schedule Form Component
interface ScheduleFormProps {
  clients: Client[];
  onSubmit: (data: {
    clientId: string;
    packId?: string;
    scheduledDate: Date;
    scheduledTime: string;
    duration: ServiceDuration;
    type: OperationType;
    notes?: string;
    isExtra?: boolean;
  }) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  initialDate?: string;
  initialSlot?: string;
}

function ScheduleForm({ clients, onSubmit, onClose, isLoading, initialDate, initialSlot }: ScheduleFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    clientId: '',
    scheduledDate: initialDate || today,
    scheduledTime: initialSlot || '',
    duration: 60 as ServiceDuration,
    type: 'walk' as OperationType,
    notes: '',
    isExtra: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Estados para recorrência
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [isSubmittingRecurrence, setIsSubmittingRecurrence] = useState(false);
  const [recurrenceProgress, setRecurrenceProgress] = useState({ current: 0, total: 0 });

  // Get packs for selected client
  const { packs } = useClientPacks(formData.clientId);
  const activePacks = packs.filter((p) => p.isActive);

  // Atualiza a duração padrão quando o cliente é selecionado baseado no ciclo ativo
  const activePack = activePacks[0];
  
  // Use effect to update duration when client changes and has an active pack with walkDuration
  useEffect(() => {
    if (activePack?.walkDuration && activePack.serviceType === 'walk') {
      setFormData(prev => ({ ...prev, duration: activePack.walkDuration as ServiceDuration }));
    }
  }, [activePack?.walkDuration, activePack?.serviceType]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.clientId) newErrors.clientId = 'Selecione um cliente';
    if (!formData.scheduledDate) newErrors.scheduledDate = 'Data é obrigatória';
    if (isRecurring) {
      if (selectedWeekdays.length === 0) newErrors.weekdays = 'Selecione pelo menos um dia da semana';
      if (!recurrenceEndDate) newErrors.endDate = 'Data final é obrigatória';
      if (recurrenceEndDate && recurrenceEndDate <= formData.scheduledDate) {
        newErrors.endDate = 'Data final deve ser posterior à data inicial';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Função para gerar datas de recorrência
  const generateRecurringDates = (): Date[] => {
    const dates: Date[] = [];
    const [startYear, startMonth, startDay] = formData.scheduledDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = recurrenceEndDate.split('-').map(Number);
    
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      if (selectedWeekdays.includes(currentDate.getDay())) {
        dates.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 12, 0, 0));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // Toggle de dia da semana
  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isRecurring) {
      // Criar múltiplos agendamentos para recorrência
      const dates = generateRecurringDates();
      setIsSubmittingRecurrence(true);
      setRecurrenceProgress({ current: 0, total: dates.length });
      
      try {
        for (let i = 0; i < dates.length; i++) {
          await onSubmit({
            clientId: formData.clientId,
            packId: activePacks.length > 0 ? activePacks[0].id : undefined,
            scheduledDate: dates[i],
            scheduledTime: formData.scheduledTime,
            duration: formData.duration,
            type: formData.type,
            notes: formData.notes,
            isExtra: formData.isExtra,
          });
          setRecurrenceProgress({ current: i + 1, total: dates.length });
        }
      } finally {
        setIsSubmittingRecurrence(false);
      }
    } else {
      // Parse date correctly to avoid timezone issues
      const [year, month, day] = formData.scheduledDate.split('-').map(Number);
      const scheduledDate = new Date(year, month - 1, day, 12, 0, 0); // Set to noon to avoid timezone issues
      
      await onSubmit({
        clientId: formData.clientId,
        packId: activePacks.length > 0 ? activePacks[0].id : undefined,
        scheduledDate,
        scheduledTime: formData.scheduledTime,
        duration: formData.duration,
        type: formData.type,
        notes: formData.notes,
        isExtra: formData.isExtra,
      });
    }
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
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-3">
          <p className="text-sm text-emerald-400">
            Ciclo ativo: {activePacks[0].totalCredits - activePacks[0].usedCredits} créditos restantes
          </p>
        </div>
      )}

      {formData.clientId && activePacks.length === 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-3">
          <p className="text-sm text-yellow-400">
            ⚠️ Cliente sem ciclo ativo. O serviço será registrado como avulso.
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
        <Select
          label="Horário (opcional)"
          value={formData.scheduledTime}
          onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
          options={[
            { value: '', label: 'Sem horário' },
            ...TIME_SLOTS.map(slot => ({ value: slot.value, label: slot.label }))
          ]}
        />
      </div>

      {/* Duration selector - only show when a time slot is selected */}
      {formData.scheduledTime && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Duração
          </label>
          <div className="grid grid-cols-4 gap-2">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, duration: option.value })}
                className={`py-2 px-3 text-sm font-medium rounded-xl transition-all ${
                  formData.duration === option.value
                    ? 'bg-emerald-600 text-white border-2 border-emerald-500'
                    : 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:border-emerald-500'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {formData.duration > 30 && (
            <p className="text-xs text-emerald-400 mt-2">
              ⏱️ Ocupará {Math.ceil(formData.duration / 30)} slots: {formatTimeRange(formData.scheduledTime, formData.duration)}
            </p>
          )}
        </div>
      )}

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

      {/* Checkbox Extra - apenas se tiver ciclo ativo */}
      {formData.clientId && activePacks.length > 0 && (
        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-orange-700 bg-orange-900/30 cursor-pointer hover:border-orange-600 transition-all">
          <input
            type="checkbox"
            checked={formData.isExtra}
            onChange={(e) => setFormData({ ...formData, isExtra: e.target.checked })}
            className="w-5 h-5 rounded border-orange-600 text-orange-500 focus:ring-orange-500 bg-gray-800"
          />
          <div className="flex-1">
            <span className="font-medium text-orange-400">Passeio Extra</span>
            <p className="text-xs text-orange-500 mt-0.5">
              Serviço adicional fora do pacote. Será cobrado no próximo ciclo.
            </p>
          </div>
          <span className="px-2 py-1 bg-orange-700 text-orange-200 text-xs font-bold rounded-full">
            EXTRA
          </span>
        </label>
      )}

      {/* Toggle de Recorrência */}
      <div className="border-t border-gray-700 pt-4 mt-4">
        <button
          type="button"
          onClick={() => setIsRecurring(!isRecurring)}
          className={`flex items-center gap-2 w-full p-3 rounded-xl border-2 transition-all ${
            isRecurring
              ? 'border-emerald-600 bg-emerald-900/30'
              : 'border-gray-600 bg-gray-800 hover:border-gray-500'
          }`}
        >
          <Repeat className={`w-5 h-5 ${isRecurring ? 'text-emerald-400' : 'text-gray-500'}`} />
          <span className={`font-medium ${isRecurring ? 'text-emerald-400' : 'text-gray-400'}`}>
            Agendamento Recorrente
          </span>
          <div
            className={`ml-auto w-10 h-6 rounded-full transition-colors ${
              isRecurring ? 'bg-emerald-600' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                isRecurring ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'
              }`}
            />
          </div>
        </button>

        {/* Configurações de Recorrência */}
        {isRecurring && (
          <div className="mt-4 space-y-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
            {/* Dias da semana */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Dias da semana
              </label>
              <div className="flex gap-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`flex-1 py-2 px-1 text-xs font-medium rounded-lg transition-all ${
                      selectedWeekdays.includes(day.value)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 border border-gray-600 text-gray-400 hover:border-emerald-500'
                    }`}
                    title={day.fullLabel}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {errors.weekdays && (
                <p className="text-xs text-red-400 mt-1">{errors.weekdays}</p>
              )}
            </div>

            {/* Data final */}
            <Input
              label="Repetir até"
              type="date"
              value={recurrenceEndDate}
              onChange={(e) => setRecurrenceEndDate(e.target.value)}
              error={errors.endDate}
              min={formData.scheduledDate}
            />

            {/* Preview de agendamentos */}
            {selectedWeekdays.length > 0 && recurrenceEndDate && recurrenceEndDate > formData.scheduledDate && (
              <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-3">
                <p className="text-sm text-blue-400">
                  📅 Serão criados <strong>{generateRecurringDates().length}</strong> agendamentos
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  {selectedWeekdays.map(d => WEEKDAYS.find(w => w.value === d)?.fullLabel).join(', ')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progresso de criação de recorrência */}
      {isSubmittingRecurrence && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-3">
          <p className="text-sm text-emerald-400 font-medium">
            Criando agendamentos... {recurrenceProgress.current}/{recurrenceProgress.total}
          </p>
          <div className="mt-2 h-2 bg-emerald-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(recurrenceProgress.current / recurrenceProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={isSubmittingRecurrence}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading || isSubmittingRecurrence} className="flex-1">
          {isRecurring ? 'Criar Agendamentos' : 'Agendar'}
        </Button>
      </div>
    </form>
  );
}

// Reschedule Form Component
interface RescheduleFormProps {
  service: ScheduledServiceWithClient;
  onSubmit: (newDate: string, newTime: string, newDuration: ServiceDuration) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function RescheduleForm({ service, onSubmit, onClose, isLoading }: RescheduleFormProps) {
  const currentDate = service.scheduledDate.toDate().toISOString().split('T')[0];
  const [newDate, setNewDate] = useState(currentDate);
  const [newTime, setNewTime] = useState(service.scheduledTime || '');
  const [newDuration, setNewDuration] = useState<ServiceDuration>((service.duration || 30) as ServiceDuration);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(newDate, newTime, newDuration);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center py-2 bg-gray-800 rounded-xl">
        <p className="text-gray-400 text-sm">Reagendando passeio de</p>
        <p className="font-bold text-lg text-gray-100">{service.client.petName}</p>
        <p className="text-xs text-gray-500">
          Atual: {formatTimeRange(service.scheduledTime, (service.duration || 30) as ServiceDuration)} - {new Intl.DateTimeFormat('pt-BR').format(service.scheduledDate.toDate())}
        </p>
      </div>

      <Input
        label="Nova Data"
        type="date"
        value={newDate}
        onChange={(e) => setNewDate(e.target.value)}
        required
      />

      <Select
        label="Novo Horário"
        value={newTime}
        onChange={(e) => setNewTime(e.target.value)}
        options={[
          { value: '', label: 'Sem horário fixo' },
          ...TIME_SLOTS.map((slot) => ({
            value: slot.value,
            label: slot.label,
          })),
        ]}
      />

      {/* Duration selector */}
      {newTime && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Duração
          </label>
          <div className="grid grid-cols-4 gap-2">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setNewDuration(option.value)}
                className={`py-2 px-3 text-sm font-medium rounded-xl transition-all ${
                  newDuration === option.value
                    ? 'bg-emerald-600 text-white border-2 border-emerald-500'
                    : 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:border-emerald-500'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {newDuration > 30 && (
            <p className="text-xs text-emerald-400 mt-2">
              ⏱️ Ocupará {Math.ceil(newDuration / 30)} slots: {formatTimeRange(newTime, newDuration)}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="flex-1">
          Reagendar
        </Button>
      </div>
    </form>
  );
}

// Service Card Component
interface ServiceCardProps {
  service: ScheduledServiceWithClient;
  slotsSpanned?: number;
  onComplete: () => void;
  onNotDone: () => void;
  onReschedule: () => void;
  isSubmitting: boolean;
}

function ServiceCard({ service, slotsSpanned = 1, onComplete, onNotDone: _onNotDone, onReschedule, isSubmitting }: ServiceCardProps) {
  const isCompleted = service.status === 'completed';
  const isNotDone = service.status === 'not_done';
  const isPending = service.status === 'scheduled';
  const duration = (service.duration || 30) as ServiceDuration;

  // Determine card styling based on status
  const getCardClass = () => {
    if (isCompleted) return 'bg-emerald-900/20 border-emerald-700/50 opacity-80';
    if (isNotDone) return 'bg-red-900/20 border-red-700/50 opacity-80';
    return 'hover:border-gray-600';
  };

  // Determine time slot styling based on status
  const getTimeSlotClass = () => {
    if (isCompleted) return 'bg-emerald-900/60 border-emerald-600/50';
    if (isNotDone) return 'bg-red-900/60 border-red-600/50';
    return 'bg-amber-900/60 border-amber-600/50';
  };

  const getTimeTextClass = () => {
    if (isCompleted) return 'text-emerald-300';
    if (isNotDone) return 'text-red-300';
    return 'text-amber-300';
  };

  const getSubTextClass = () => {
    if (isCompleted) return 'text-emerald-400/80';
    if (isNotDone) return 'text-red-400/80';
    return 'text-amber-400/80';
  };

  return (
    <Card className={`transition-all duration-200 ${getCardClass()}`}>
      <div className="flex items-center gap-4">
        {/* Time slot badge */}
        <div
          className={`flex flex-col items-center justify-center min-w-28 py-2 px-3 rounded-xl border ${getTimeSlotClass()}`}
        >
          <span className={`text-sm font-bold ${getTimeTextClass()}`}>
            {formatTimeRange(service.scheduledTime, duration)}
          </span>
          <span className={`text-[10px] font-medium uppercase tracking-wide ${getSubTextClass()}`}>
            {formatOperationType(service.type)}
          </span>
          {slotsSpanned > 1 && (
            <span className="text-[9px] text-gray-400 mt-1">
              ⏱️ {duration}min
            </span>
          )}
        </div>

        {/* Service info - vertical layout */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Pet name */}
          <h3 className="text-lg font-bold text-gray-100">
            {service.client.petName}
            {service.isExtra && (
              <span className="ml-2 px-2 py-0.5 bg-orange-500/80 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
                Extra
              </span>
            )}
          </h3>
          
          {/* Service type badge */}
          <ServiceTypeBadge type={service.type} />
          
          {/* Owner name */}
          <p className="text-sm text-gray-400">{service.client.ownerName}</p>
          
          {/* Notes */}
          {service.notes && (
            <p className="text-xs text-orange-400/90 truncate italic">📝 {service.notes}</p>
          )}
          
          {/* Status indicators for completed/not done */}
          {isCompleted && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 text-white text-xs font-medium rounded-full">
              <Check className="w-3 h-3" />
              Realizado
            </span>
          )}
          {isNotDone && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-xs font-medium rounded-full">
              <X className="w-3 h-3" />
              Não Realizado
            </span>
          )}
        </div>

        {/* Action buttons - vertical layout, only show for pending services */}
        {isPending && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={onReschedule}
              disabled={isSubmitting}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-900/40 text-red-400 hover:bg-red-800 hover:text-red-300 transition-all disabled:opacity-50 border border-red-700/50"
              title="Cancelar ou reagendar"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={onComplete}
              disabled={isSubmitting}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/50"
              title="Marcar como realizado"
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
        <div key={i} className="bg-gray-800 rounded-2xl border-2 border-gray-700 p-5 flex gap-4">
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
  
  // Parse slot format (e.g., "06:50-07:20") or handle empty
  let startHours = 9, startMinutes = 0, endHours = 10, endMinutes = 0;
  
  if (service.scheduledTime && service.scheduledTime.includes('-')) {
    const [startTime, endTime] = service.scheduledTime.split('-');
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    startHours = sH;
    startMinutes = sM;
    endHours = eH;
    endMinutes = eM;
  }
  
  date.setHours(startHours, startMinutes, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(endHours, endMinutes, 0, 0);

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
    markAsNotDone,
    updateScheduledService,
    deleteScheduledService,
  } = useSchedule();
  const { activeClients } = useClients();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [preselectedSlot, setPreselectedSlot] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmNotDone, setConfirmNotDone] = useState<ScheduledServiceWithClient | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<ScheduledServiceWithClient | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ScheduledServiceWithClient | null>(null);
  const [rescheduleService, setRescheduleService] = useState<ScheduledServiceWithClient | null>(null);
  const [isRescheduleDrawerOpen, setIsRescheduleDrawerOpen] = useState(false);

  // Swipe navigation state
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const minSwipeDistance = 50;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const currentX = e.targetTouches[0].clientX;
    touchEndX.current = currentX;
    const diff = currentX - touchStartX.current;
    // Limit swipe offset for visual feedback
    setSwipeOffset(Math.max(-100, Math.min(100, diff * 0.3)));
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) {
      setSwipeOffset(0);
      return;
    }
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      // Swipe left = next day
      setIsAnimating(true);
      setSwipeOffset(-100);
      setTimeout(() => {
        setSelectedDate(prev => {
          const next = new Date(prev);
          next.setDate(next.getDate() + 1);
          return next;
        });
        setSwipeOffset(0);
        setIsAnimating(false);
      }, 150);
    } else if (isRightSwipe) {
      // Swipe right = previous day
      setIsAnimating(true);
      setSwipeOffset(100);
      setTimeout(() => {
        setSelectedDate(prev => {
          const prevDate = new Date(prev);
          prevDate.setDate(prevDate.getDate() - 1);
          return prevDate;
        });
        setSwipeOffset(0);
        setIsAnimating(false);
      }, 150);
    } else {
      setSwipeOffset(0);
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  }, []);

  // Filter services for selected date
  const servicesForDate = allServices.filter((service) => {
    const serviceDate = service.scheduledDate.toDate();
    return isSameDay(serviceDate, selectedDate);
  });

  // Separate pending and completed
  const pendingServices = servicesForDate.filter((s) => s.status === 'scheduled');

  // Build slots view with support for multi-slot services
  // A service can occupy multiple slots based on its duration
  type SlotViewItem = 
    | { type: 'empty'; slot: { value: string; label: string; labelFull: string } }
    | { type: 'service-start'; slot: { value: string; label: string; labelFull: string }; service: ScheduledServiceWithClient; slotsSpanned: number }
    | { type: 'service-continuation'; slot: { value: string; label: string; labelFull: string }; service: ScheduledServiceWithClient };

  const slotsView: SlotViewItem[] = [];
  const processedSlots = new Set<string>();

  for (const slot of TIME_SLOTS) {
    // Skip if this slot was already processed as part of a multi-slot service
    if (processedSlots.has(slot.value)) {
      continue;
    }

    // Find a service that starts at this slot
    const serviceStartingHere = servicesForDate.find((s) => s.scheduledTime === slot.value);
    
    if (serviceStartingHere) {
      const duration = (serviceStartingHere.duration || 30) as ServiceDuration;
      const occupiedSlots = getOccupiedSlots(slot.value, duration);
      const slotsSpanned = occupiedSlots.length;
      
      // Mark all occupied slots as processed
      occupiedSlots.forEach(s => processedSlots.add(s));
      
      // Add the main service card
      slotsView.push({
        type: 'service-start',
        slot,
        service: serviceStartingHere,
        slotsSpanned,
      });
    } else {
      // Check if this slot is occupied by a service that started earlier
      const serviceOccupyingSlot = servicesForDate.find((s) => {
        if (!s.scheduledTime) return false;
        const duration = (s.duration || 30) as ServiceDuration;
        const occupiedSlots = getOccupiedSlots(s.scheduledTime, duration);
        return occupiedSlots.includes(slot.value) && s.scheduledTime !== slot.value;
      });
      
      if (serviceOccupyingSlot) {
        // This slot is part of a multi-slot service, mark as continuation
        processedSlots.add(slot.value);
        slotsView.push({
          type: 'service-continuation',
          slot,
          service: serviceOccupyingSlot,
        });
      } else {
        // Empty slot
        slotsView.push({
          type: 'empty',
          slot,
        });
      }
    }
  }

  // Services without specific slot (e.g., Diária) - both pending and completed
  const servicesWithoutSlot = servicesForDate.filter(
    (s) => !s.scheduledTime || !TIME_SLOTS.some((slot) => slot.value === s.scheduledTime)
  );

  // Handler to open form with preselected slot
  const handleScheduleSlot = (slotValue: string) => {
    setPreselectedSlot(slotValue);
    setIsFormOpen(true);
  };

  const handleOpenForm = () => {
    setPreselectedSlot('');
    setIsFormOpen(true);
  };

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

  const handleNotDone = async () => {
    if (!confirmNotDone) return;
    setIsSubmitting(true);
    try {
      await markAsNotDone(confirmNotDone.id);
      setConfirmNotDone(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao marcar como não realizado');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler to open reschedule options
  const handleOpenReschedule = (service: ScheduledServiceWithClient) => {
    setRescheduleService(service);
  };

  // Handler to open reschedule drawer (change date/time)
  const handleReschedule = () => {
    setIsRescheduleDrawerOpen(true);
  };

  // Handler to mark as not done from reschedule dialog
  const handleNotDoneFromReschedule = () => {
    if (rescheduleService) {
      setConfirmNotDone(rescheduleService);
      setRescheduleService(null);
    }
  };

  // Handler to delete from reschedule dialog
  const handleDeleteFromReschedule = () => {
    if (rescheduleService) {
      setConfirmDelete(rescheduleService);
      setRescheduleService(null);
    }
  };

  // Handler to confirm delete
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsSubmitting(true);
    try {
      await deleteScheduledService(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir agendamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler to save reschedule
  const handleSaveReschedule = async (newDate: string, newTime: string, newDuration: ServiceDuration) => {
    if (!rescheduleService) return;
    setIsSubmitting(true);
    try {
      const dateObj = new Date(newDate + 'T00:00:00');
      await updateScheduledService(rescheduleService.id, {
        scheduledDate: Timestamp.fromDate(dateObj),
        scheduledTime: newTime,
        duration: newDuration,
      } as any);
      setIsRescheduleDrawerOpen(false);
      setRescheduleService(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao reagendar serviço');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-100">Agenda</h1>
          <button
            onClick={handleOpenForm}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar</span>
          </button>
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-between bg-gray-700 rounded-xl p-2">
          <button
            onClick={() => setSelectedDate(prev)}
            className="p-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-300" />
          </button>
          <div className="text-center">
            <p className="font-bold text-gray-100 capitalize">
              {formatHeaderDate(selectedDate)}
            </p>
            <p className="text-xs text-gray-400">
              {new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }).format(selectedDate)}
            </p>
          </div>
          <button
            onClick={() => setSelectedDate(next)}
            className="p-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </header>

      {/* Content with swipe support */}
      <main 
        ref={contentRef}
        className="p-4 space-y-6 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isAnimating ? 'transform 0.15s ease-out' : 'none',
          opacity: isAnimating ? 0.7 : 1,
        }}
      >
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* All time slots */}
            <section>
              <h2 className="text-lg font-bold text-gray-100 mb-3">
                Horários do Dia
              </h2>
              <div className="space-y-3">
                {slotsView.map((item) => {
                  if (item.type === 'empty') {
                    return (
                      <EmptySlotCard
                        key={item.slot.value}
                        slot={item.slot}
                        onSchedule={handleScheduleSlot}
                      />
                    );
                  }
                  
                  if (item.type === 'service-start') {
                    return (
                      <ServiceCard
                        key={item.service.id}
                        service={item.service}
                        slotsSpanned={item.slotsSpanned}
                        onComplete={() => setConfirmComplete(item.service)}
                        onNotDone={() => setConfirmNotDone(item.service)}
                        onReschedule={() => handleOpenReschedule(item.service)}
                        isSubmitting={isSubmitting}
                      />
                    );
                  }
                  
                  // service-continuation - render a small indicator that this slot is occupied
                  return (
                    <div
                      key={`${item.slot.value}-cont`}
                      className="flex items-center gap-4 p-2 bg-gray-800/50 border border-gray-700/50 rounded-xl opacity-60"
                    >
                      <div className="flex flex-col items-center justify-center min-w-20 h-10 px-2 rounded-lg bg-gray-700/50">
                        <span className="text-xs font-medium text-gray-500">
                          {item.slot.labelFull}
                        </span>
                      </div>
                      <div className="flex-1">
                        <span className="text-xs italic text-gray-500">
                          ↳ {item.service.client.petName} (continuação)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Services without specific slot (e.g., Diária) */}
            {servicesWithoutSlot.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-100 mb-3">
                  Sem Horário Fixo
                </h2>
                <div className="space-y-3">
                  {servicesWithoutSlot.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onComplete={() => setConfirmComplete(service)}
                      onNotDone={() => setConfirmNotDone(service)}
                      onReschedule={() => handleOpenReschedule(service)}
                      isSubmitting={isSubmitting}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Google Calendar link */}
        {pendingServices.length > 0 && (
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
            <button
              onClick={() => {
                if (pendingServices.length > 0) {
                  openGoogleCalendar(pendingServices[0]);
                }
              }}
              className="w-full flex items-center justify-center gap-2 text-blue-400 font-medium"
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
          initialDate={selectedDate.toISOString().split('T')[0]}
          initialSlot={preselectedSlot}
        />
      </Drawer>

      {/* Not Done Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmNotDone}
        onClose={() => setConfirmNotDone(null)}
        onConfirm={handleNotDone}
        title="Marcar como Não Realizado"
        message={`Marcar o passeio de ${confirmNotDone?.client.petName} como não realizado?`}
        confirmText="Não Realizado"
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

      {/* Reschedule Options Dialog */}
      <Drawer
        isOpen={!!rescheduleService && !isRescheduleDrawerOpen}
        onClose={() => setRescheduleService(null)}
        title="O que deseja fazer?"
      >
        {rescheduleService && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <p className="text-gray-400">
                Passeio de <span className="font-semibold text-gray-100">{rescheduleService.client.petName}</span>
              </p>
              <p className="text-sm text-gray-500">
                {formatTimeSlot(rescheduleService.scheduledTime)} - {formatOperationType(rescheduleService.type)}
              </p>
            </div>

            <button
              onClick={handleReschedule}
              className="w-full flex items-center gap-4 p-4 bg-blue-900/30 border border-blue-700 rounded-xl hover:bg-blue-900/50 transition-colors"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-600">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-100">Reagendar</p>
                <p className="text-sm text-gray-400">Alterar data ou horário</p>
              </div>
            </button>

            <button
              onClick={handleNotDoneFromReschedule}
              className="w-full flex items-center gap-4 p-4 bg-red-900/30 border border-red-700 rounded-xl hover:bg-red-900/50 transition-colors"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-600">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-100">Não Realizado</p>
                <p className="text-sm text-gray-400">Marcar que não foi feito</p>
              </div>
            </button>

            <button
              onClick={handleDeleteFromReschedule}
              className="w-full flex items-center gap-4 p-4 bg-gray-800 border border-gray-600 rounded-xl hover:bg-gray-700 transition-colors"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-600">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-100">Excluir</p>
                <p className="text-sm text-gray-400">Remover da agenda</p>
              </div>
            </button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setRescheduleService(null)}
              className="w-full mt-2"
            >
              Voltar
            </Button>
          </div>
        )}
      </Drawer>

      {/* Reschedule Form Drawer */}
      <Drawer
        isOpen={isRescheduleDrawerOpen}
        onClose={() => {
          setIsRescheduleDrawerOpen(false);
          setRescheduleService(null);
        }}
        title="Reagendar"
      >
        {rescheduleService && (
          <RescheduleForm
            service={rescheduleService}
            onSubmit={handleSaveReschedule}
            onClose={() => {
              setIsRescheduleDrawerOpen(false);
              setRescheduleService(null);
            }}
            isLoading={isSubmitting}
          />
        )}
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Agendamento"
        message={`Tem certeza que deseja excluir o agendamento de ${confirmDelete?.client.petName}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
      />
    </div>
  );
}
