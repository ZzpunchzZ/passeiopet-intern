import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { MessageTemplate, MessageTemplateFormData } from '../types';

interface UseMessageTemplatesReturn {
  templates: MessageTemplate[];
  loading: boolean;
  error: string | null;
  addTemplate: (data: MessageTemplateFormData) => Promise<string>;
  updateTemplate: (id: string, data: Partial<MessageTemplateFormData>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export function useMessageTemplates(): UseMessageTemplatesReturn {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const templatesQuery = query(
      collection(db, COLLECTIONS.MESSAGE_TEMPLATES),
      orderBy('title', 'asc')
    );

    const unsubscribe = onSnapshot(
      templatesQuery,
      (snapshot) => {
        const templatesData: MessageTemplate[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MessageTemplate[];

        setTemplates(templatesData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching templates:', err);
        setError('Erro ao carregar templates');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addTemplate = async (data: MessageTemplateFormData): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.MESSAGE_TEMPLATES), data);
      return docRef.id;
    } catch (err) {
      console.error('Error adding template:', err);
      throw new Error('Erro ao adicionar template');
    }
  };

  const updateTemplate = async (id: string, data: Partial<MessageTemplateFormData>): Promise<void> => {
    try {
      const templateRef = doc(db, COLLECTIONS.MESSAGE_TEMPLATES, id);
      await updateDoc(templateRef, data);
    } catch (err) {
      console.error('Error updating template:', err);
      throw new Error('Erro ao atualizar template');
    }
  };

  const deleteTemplate = async (id: string): Promise<void> => {
    try {
      const templateRef = doc(db, COLLECTIONS.MESSAGE_TEMPLATES, id);
      await deleteDoc(templateRef);
    } catch (err) {
      console.error('Error deleting template:', err);
      throw new Error('Erro ao deletar template');
    }
  };

  return {
    templates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

// Utility function to replace placeholders in template
export function processTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let processed = template;
  Object.entries(variables).forEach(([key, value]) => {
    processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return processed;
}
