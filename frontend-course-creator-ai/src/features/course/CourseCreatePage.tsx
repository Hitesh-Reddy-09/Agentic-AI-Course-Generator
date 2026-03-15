import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { courseApi } from '@/shared/lib/api/endpoints';
import { useAppStore } from '@/shared/lib/store';
import { DashboardLayout } from '@/shared/components/DashboardLayout';
import { CoursePlanPreview } from '@/shared/components/CoursePlanPreview';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { CheckCircle, Edit3, Loader2, Sparkles, XCircle } from 'lucide-react';

const schema = z.object({
  learning_query: z.string().trim().min(5, 'Please describe what you want to learn (min 5 chars)').max(1000),
});

type FormData = z.infer<typeof schema>;

export default function CourseCreatePage() {
  const navigate = useNavigate();
  const { userId, setCoursePlan, addPlanVersion } = useAppStore();
  const [editSuggestions, setEditSuggestions] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { learning_query: '' },
  });

  const mutation = useMutation({
    mutationFn: courseApi.create,
    onSuccess: (data) => {
      const plan = { ...data.course_plan, status: 'awaiting_human_approval' as const };
      setCoursePlan(plan);
      addPlanVersion(plan);
      toast({ title: 'Course plan generated!', description: plan.title });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: courseApi.approve,
    onSuccess: (data) => {
      const current = useAppStore.getState().currentCoursePlan;
      if (current) {
        const normalizedStatus = data.status === 'approved'
          ? 'approved'
          : data.status === 'rejected'
            ? 'rejected'
            : 'awaiting_human_approval';
        const updated = { ...current, status: normalizedStatus };
        setCoursePlan(updated);
        addPlanVersion(updated);
      }

      toast({ title: `Plan ${data.status}`, description: `The course plan has been ${data.status}.` });
      if (data.status === 'approved') {
        navigate('/lesson');
      }
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate({ user_id: userId, query: data.learning_query });
  };

  const handleAction = (action: 'approve' | 'reject' | 'edit') => {
    const current = useAppStore.getState().currentCoursePlan;
    if (!current) return;

    const approved = action === 'approve';
    const userEdits = action === 'edit' ? { suggestions: editSuggestions } : undefined;
    approvalMutation.mutate({
      course_plan_id: current.course_plan_id,
      approved,
      user_edits: userEdits,
    });
  };

  const plan = useAppStore((s) => s.currentCoursePlan);

  return (
    <DashboardLayout>
      <PageHeader title="Create a Course" description="Tell us what you want to learn and our AI will generate a structured course plan." />

      <div className="space-y-6">
        {/* Compact form */}
        <div className="rounded-lg border border-border bg-card p-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <label className="text-sm font-medium text-foreground" htmlFor="learning_query">What do you want to learn?</label>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
              <div className="flex-1">
                <Textarea
                  id="learning_query"
                  {...register('learning_query')}
                  placeholder="e.g. I want to learn machine learning fundamentals with Python"
                  rows={3}
                  className="resize-none"
                />
                {errors.learning_query && <p className="mt-1 text-xs text-destructive">{errors.learning_query.message}</p>}
              </div>
              <Button type="submit" disabled={mutation.isPending} className="gap-2 lg:min-w-[220px]">
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {mutation.isPending ? 'Generating...' : 'Generate Course Plan'}
              </Button>
            </div>
          </form>
        </div>

        {/* Result */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold font-display text-foreground mb-4">Generated Plan</h2>
          {!plan && !mutation.isPending && (
            <p className="text-sm text-muted-foreground">Submit the form to generate a course plan.</p>
          )}
          {mutation.isPending && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="shimmer h-4" style={{ width: `${90 - i * 15}%` }} />)}
            </div>
          )}
          {plan && (
            <div className="space-y-4 animate-slide-up-fade">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-foreground">Plan Preview</h3>
                <StatusBadge status={plan.status} />
              </div>
              <CoursePlanPreview plan={plan} />
              <div>
                <label className="text-sm font-medium text-foreground">Edit Suggestions (optional)</label>
                <Textarea
                  value={editSuggestions}
                  onChange={(e) => setEditSuggestions(e.target.value)}
                  placeholder="Suggest changes to the plan..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleAction('approve')}
                  disabled={approvalMutation.isPending}
                  className="gap-2"
                >
                  {approvalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Approve Plan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAction('edit')}
                  disabled={approvalMutation.isPending || !editSuggestions.trim()}
                  className="gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Request Edits
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAction('reject')}
                  disabled={approvalMutation.isPending}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
