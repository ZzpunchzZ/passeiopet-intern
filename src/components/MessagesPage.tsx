import { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useMessageTemplates } from '../hooks/useMessageTemplates';
import { Drawer, ConfirmDialog } from './ui/Modal';
import { Input, Textarea, Button, Card, EmptyState, Skeleton } from './ui/FormElements';
import type { MessageTemplate } from '../types';

// Template Form Component
interface TemplateFormProps {
  template?: MessageTemplate;
  onSubmit: (data: { title: string; content: string }) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function TemplateForm({ template, onSubmit, onClose, isLoading }: TemplateFormProps) {
  const [formData, setFormData] = useState({
    title: template?.title || '',
    content: template?.content || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Título é obrigatório';
    if (!formData.content.trim()) newErrors.content = 'Conteúdo é obrigatório';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Título do Template"
        placeholder="Ex: Lembrete de Passeio"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        error={errors.title}
      />
      <Textarea
        label="Conteúdo da Mensagem"
        placeholder="Olá {{tutor}}, amanhã é dia de passeio do {{pet}}!"
        value={formData.content}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        error={errors.content}
      />

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="flex-1">
          {template ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
}

// Template Card Component
interface TemplateCardProps {
  template: MessageTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

function TemplateCard({ template, onEdit, onDelete, onCopy }: TemplateCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(template.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy();
  };

  return (
    <Card className="!p-3">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1 text-gray-400"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <h3 className="font-medium text-gray-100 truncate">{template.title}</h3>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Copiar"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 hover:bg-red-900/40 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{template.content}</p>
        </div>
      )}
    </Card>
  );
}

// Loading skeleton
function TemplatesLoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-gray-800 rounded-2xl border-2 border-gray-700 p-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Main Messages Page
export function MessagesPage() {
  const { templates, loading, error, addTemplate, updateTemplate, deleteTemplate } = useMessageTemplates();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<MessageTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTemplate = async (data: { title: string; content: string }) => {
    setIsSubmitting(true);
    try {
      await addTemplate(data);
      setIsFormOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTemplate = async (data: { title: string; content: string }) => {
    if (!editingTemplate) return;
    setIsSubmitting(true);
    try {
      await updateTemplate(editingTemplate.id, data);
      setEditingTemplate(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;
    setIsSubmitting(true);
    try {
      await deleteTemplate(deletingTemplate.id);
      setDeletingTemplate(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Mensagens</h1>
            <p className="text-sm text-gray-400">
              {templates.length} template{templates.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
            Novo
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-3">
        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {loading ? (
          <TemplatesLoadingSkeleton />
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="w-10 h-10 text-gray-400" />}
            title="Nenhum template"
            description="Crie templates para enviar mensagens rapidamente"
            action={
              <Button onClick={() => setIsFormOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
                Criar Template
              </Button>
            }
          />
        ) : (
          templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => setEditingTemplate(template)}
              onDelete={() => setDeletingTemplate(template)}
              onCopy={() => {}}
            />
          ))
        )}
      </main>

      {/* Add Template Drawer */}
      <Drawer
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Novo Template"
        subtitle="Crie um template de mensagem"
      >
        <TemplateForm
          onSubmit={handleAddTemplate}
          onClose={() => setIsFormOpen(false)}
          isLoading={isSubmitting}
        />
      </Drawer>

      {/* Edit Template Drawer */}
      <Drawer
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        title="Editar Template"
        subtitle={editingTemplate?.title}
      >
        {editingTemplate && (
          <TemplateForm
            template={editingTemplate}
            onSubmit={handleEditTemplate}
            onClose={() => setEditingTemplate(null)}
            isLoading={isSubmitting}
          />
        )}
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingTemplate}
        onClose={() => setDeletingTemplate(null)}
        onConfirm={handleDeleteTemplate}
        title="Excluir Template"
        message={`Deseja excluir o template "${deletingTemplate?.title}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}
