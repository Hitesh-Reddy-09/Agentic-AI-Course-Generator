import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { courseApi } from '@/shared/lib/api/endpoints';
import { useAppStore } from '@/shared/lib/store';
import { DashboardLayout } from '@/shared/components/DashboardLayout';
import { CoursePlanPreview } from '@/shared/components/CoursePlanPreview';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { EmptyState } from '@/shared/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Edit3, Loader2, History } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ApprovalPage() {
  const navigate = useNavigate();
  const { currentCoursePlan, setCoursePlan, addPlanVersion, planHistory } = useAppStore();
  const [editSuggestions, setEditSuggestions] = useState('');

  const mutation = useMutation({
    mutationFn: courseApi.approve,
    onSuccess: (data) => {
      if (currentCoursePlan) {
        const normalizedStatus = data.status === 'approved'
          ? 'approved'
          : data.status === 'rejected'
            ? 'rejected'
            : 'awaiting_human_approval';
        const updated = { ...currentCoursePlan, status: normalizedStatus };
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

  const handleAction = (action: 'approve' | 'reject' | 'edit') => {
    if (!currentCoursePlan) return;

    const approved = action === 'approve';
    const userEdits = action === 'edit' ? { suggestions: editSuggestions } : undefined;
    mutation.mutate({
      course_plan_id: currentCoursePlan.course_plan_id,
      approved,
      user_edits: userEdits,
    });

    if (action === 'edit') {
      const updated = {
        ...currentCoursePlan,
        status: 'awaiting_human_approval' as const,
      };
      setCoursePlan(updated);
      addPlanVersion(updated);
    }
  };

  if (!currentCoursePlan) {
    return (
      <DashboardLayout>
        <PageHeader title="Human Approval" />
        <EmptyState
          title="No course plan to review"
          description="Create a course first to review and approve the plan."
          action={<Link to="/create"><Button>Create Course</Button></Link>}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="Human Approval" description="Review and approve the AI-generated course plan." />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Plan details */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-display text-foreground">Course Plan Review</h2>
            <StatusBadge status={currentCoursePlan.status} />
          </div>
          <CoursePlanPreview plan={currentCoursePlan} />

          {/* Edit suggestions */}
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

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleAction('approve')}
              disabled={mutation.isPending}
              className="gap-2"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve Plan
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction('edit')}
              disabled={mutation.isPending || !editSuggestions.trim()}
              className="gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Request Edits
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction('reject')}
              disabled={mutation.isPending}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>

        {/* Version history */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Version History</h3>
          </div>
          {planHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground">No versions yet.</p>
          ) : (
            <div className="space-y-3">
              {planHistory.map((ver, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-xs font-medium text-foreground">v{i + 1}</p>
                    <p className="text-xs text-muted-foreground">{ver.title}</p>
                  </div>
                  <StatusBadge status={ver.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
