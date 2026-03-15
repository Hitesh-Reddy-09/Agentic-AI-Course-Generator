import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { courseApi } from '@/shared/lib/api/endpoints';
import { useAppStore } from '@/shared/lib/store';
import { DashboardLayout } from '@/shared/components/DashboardLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { ErrorState } from '@/shared/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Award, CheckCircle2, XCircle, Download, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuizQuestion, ExamResult } from '@/shared/types';

export default function ExamCertPage() {
  const { userId, currentCoursePlan } = useAppStore();
  const [cpId, setCpId] = useState(currentCoursePlan?.course_plan_id || '');
  const [uid, setUid] = useState(userId || '');

  // Exam state
  const [examQuestions, setExamQuestions] = useState<QuizQuestion[]>([]);
  const [examId, setExamId] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [showCert, setShowCert] = useState(false);

  // Start exam
  const startMutation = useMutation({
    mutationFn: courseApi.startExam,
    onSuccess: (data) => {
      setExamQuestions(data.questions);
      setExamId(data.exam_id);
      setAnswers({});
      setExamResult(null);
      setShowCert(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Submit exam (reusing submitQuiz endpoint)
  const submitMutation = useMutation({
    mutationFn: courseApi.submitQuiz,
    onSuccess: (data) => {
      const result: ExamResult = {
        score: data.score,
        total: data.total,
        passed: data.score / data.total >= 0.7,
        certificate_eligible: data.score / data.total >= 0.7,
      };
      setExamResult(result);
      toast({ title: result.passed ? 'Congratulations!' : 'Keep trying', description: `Score: ${data.score}/${data.total}` });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Fetch certificate
  const { data: certificate, isLoading: certLoading, isError: certError, error: certErr, refetch: refetchCert } = useQuery({
    queryKey: ['certificate', cpId, uid],
    queryFn: () => courseApi.getCertificate(cpId, uid),
    enabled: showCert && !!cpId && !!uid,
  });

  const handleStartExam = () => {
    startMutation.mutate({ course_plan_id: cpId, user_id: uid });
  };

  const handleSubmitExam = () => {
    const formattedAnswers = Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }));
    submitMutation.mutate({ quiz_id: examId, user_id: uid, answers: formattedAnswers });
  };

  return (
    <DashboardLayout>
      <PageHeader title="Exam & Certificate" description="Take the final exam and earn your certificate." />

      <div className="flex flex-wrap gap-3 mb-8">
        <Input value={cpId} onChange={(e) => setCpId(e.target.value)} placeholder="Course Plan ID" className="max-w-[200px]" />
        <Input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="User ID" className="max-w-[200px]" />
        <Button onClick={handleStartExam} disabled={startMutation.isPending || !cpId || !uid} className="gap-2">
          {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
          Start Exam
        </Button>
      </div>

      {/* Exam questions */}
      {examQuestions.length > 0 && !examResult && (
        <div className="max-w-3xl space-y-6 animate-slide-up-fade">
          {examQuestions.map((q, qi) => (
            <div key={q.question_id} className="rounded-lg border border-border bg-card p-6">
              <p className="text-sm font-semibold text-foreground mb-4">{qi + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const selected = answers[q.question_id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers({ ...answers, [q.question_id]: opt })}
                      className={cn(
                        'w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors',
                        selected ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border text-foreground hover:bg-muted'
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <Button onClick={handleSubmitExam} disabled={submitMutation.isPending || Object.keys(answers).length < examQuestions.length} className="gap-2" size="lg">
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Submit Exam
          </Button>
        </div>
      )}

      {/* Exam result */}
      {examResult && (
        <div className="max-w-xl animate-slide-up-fade space-y-6">
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <div className={cn(
              'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full',
              examResult.passed ? 'bg-success/10' : 'bg-destructive/10'
            )}>
              {examResult.passed ? <CheckCircle2 className="h-8 w-8 text-success" /> : <XCircle className="h-8 w-8 text-destructive" />}
            </div>
            <p className="text-3xl font-bold font-display text-foreground">{examResult.score}/{examResult.total}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{examResult.passed ? 'Passed!' : 'Not Passed'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {examResult.passed ? 'You are eligible for a certificate.' : 'Review the material and try again.'}
            </p>
            {examResult.passed && (
              <Button onClick={() => setShowCert(true)} className="mt-6 gap-2">
                <Award className="h-4 w-4" />
                View Certificate
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Certificate */}
      {showCert && (
        <div className="mt-8 max-w-xl animate-slide-up-fade">
          {certLoading && <div className="shimmer h-64 rounded-lg" />}
          {certError && <ErrorState message={(certErr as Error).message} onRetry={refetchCert} />}
          {certificate && (
            <div className="rounded-lg border-2 border-primary/20 bg-card p-8 text-center space-y-4">
              <div className="flex justify-center">
                <Award className="h-12 w-12 text-primary" />
              </div>
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">Certificate of Completion</p>
              <h3 className="text-xl font-bold font-display text-foreground">{certificate.title}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-border">
                <div><span className="text-muted-foreground">User:</span> <span className="font-medium text-foreground">{certificate.user_id}</span></div>
                <div><span className="text-muted-foreground">Level:</span> <span className="font-medium text-foreground">{certificate.level}</span></div>
                <div><span className="text-muted-foreground">Score:</span> <span className="font-medium text-foreground">{certificate.score}%</span></div>
                <div><span className="text-muted-foreground">Issued:</span> <span className="font-medium text-foreground">{new Date(certificate.issued_date).toLocaleDateString()}</span></div>
              </div>
              <Button variant="outline" className="gap-2 mt-4">
                <Download className="h-4 w-4" />
                Download Certificate (PDF)
              </Button>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
