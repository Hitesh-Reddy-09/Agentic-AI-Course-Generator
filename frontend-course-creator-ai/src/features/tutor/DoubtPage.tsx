import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { tutorApi } from '@/shared/lib/api/endpoints';
import { useAppStore } from '@/shared/lib/store';
import { DashboardLayout } from '@/shared/components/DashboardLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { ChatWindow } from '@/shared/components/ChatWindow';
import { Input } from '@/components/ui/input';
import type { ChatMessage } from '@/shared/types';

export default function DoubtPage() {
  const { userId, currentCoursePlan, doubtMessages, addDoubtMessage } = useAppStore();
  const [coursePlanId, setCoursePlanId] = useState(currentCoursePlan?.course_plan_id || '');
  const [sourceCtx, setSourceCtx] = useState('');

  const mutation = useMutation({
    mutationFn: tutorApi.askDoubt,
    onSuccess: (data) => {
      const msg: ChatMessage = { role: 'assistant', content: data.answer, timestamp: Date.now() };
      addDoubtMessage(msg);
      if (data.source_context) setSourceCtx(data.source_context);
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleSend = (message: string) => {
    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: Date.now() };
    addDoubtMessage(userMsg);
    mutation.mutate({
      user_id: userId,
      course_plan_id: coursePlanId,
      question: message,
    });
  };

  return (
    <DashboardLayout>
      <PageHeader title="Doubt Assistant" description="Ask questions about your course content. Powered by RAG." />
      <div className="mb-4">
        <Input
          value={coursePlanId}
          onChange={(e) => setCoursePlanId(e.target.value)}
          placeholder="Course Plan ID"
          className="max-w-sm"
        />
      </div>
      <div className="h-[calc(100vh-280px)] min-h-[400px]">
        <ChatWindow
          messages={doubtMessages}
          onSend={handleSend}
          isLoading={mutation.isPending}
          placeholder="Ask a doubt about your course..."
          sourceContext={sourceCtx}
        />
      </div>
    </DashboardLayout>
  );
}
