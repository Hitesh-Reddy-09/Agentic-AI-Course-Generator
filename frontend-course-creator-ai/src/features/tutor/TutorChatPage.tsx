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

const QUICK_PROMPTS = [
  'What is the next lesson?',
  'Explain that again',
  'Summarize this module',
  'Give me a harder quiz',
  'What are my weak areas?',
];

export default function TutorChatPage() {
  const { userId, currentCoursePlan, tutorMessages, addTutorMessage } = useAppStore();
  const [coursePlanId, setCoursePlanId] = useState(currentCoursePlan?.course_plan_id || '');

  const mutation = useMutation({
    mutationFn: tutorApi.chat,
    onSuccess: (data) => {
      const msg: ChatMessage = { role: 'assistant', content: data.reply, timestamp: Date.now() };
      addTutorMessage(msg);
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleSend = (message: string) => {
    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: Date.now() };
    addTutorMessage(userMsg);
    mutation.mutate({
      user_id: userId,
      course_plan_id: coursePlanId,
      message,
      history: tutorMessages.map((m) => ({ role: m.role, content: m.content })),
    });
  };

  return (
    <DashboardLayout>
      <PageHeader title="Tutor Chat" description="Your personal AI tutor for guidance and explanations." />
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
          messages={tutorMessages}
          onSend={handleSend}
          isLoading={mutation.isPending}
          placeholder="Ask your tutor anything..."
          quickPrompts={QUICK_PROMPTS}
        />
      </div>
    </DashboardLayout>
  );
}
