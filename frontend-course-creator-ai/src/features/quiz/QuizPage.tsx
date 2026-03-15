import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { courseApi } from '@/shared/lib/api/endpoints';
import { useAppStore } from '@/shared/lib/store';
import { DashboardLayout } from '@/shared/components/DashboardLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuizQuestion, SubmitQuizResponse } from '@/shared/types';
import { Link } from 'react-router-dom';

export default function QuizPage() {
  const location = useLocation();
  const { userId } = useAppStore();
  const questions: QuizQuestion[] = (location.state as any)?.questions || [];
  const lessonId: string = (location.state as any)?.lessonId || '';
  const quizId: string = (location.state as any)?.quizId || lessonId;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitQuizResponse | null>(null);

  const mutation = useMutation({
    mutationFn: courseApi.submitQuiz,
    onSuccess: (data) => {
      setResult(data);
      toast({ title: 'Quiz submitted!', description: `Score: ${data.score}/${data.total}` });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    const formattedAnswers = Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }));
    mutation.mutate({
      quiz_id: quizId,
      user_id: userId,
      answers: formattedAnswers,
    });
  };

  if (questions.length === 0) {
    return (
      <DashboardLayout>
        <PageHeader title="Quiz" />
        <EmptyState
          title="No quiz loaded"
          description="Start a quiz from the lesson viewer."
          action={<Link to="/lesson"><Button>Go to Lessons</Button></Link>}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="Quiz" description={`${questions.length} questions`} />

      {!result ? (
        <div className="max-w-3xl space-y-6">
          {questions.map((q, qi) => (
            <div key={q.question_id} className="rounded-lg border border-border bg-card p-6 animate-slide-up-fade">
              <p className="text-sm font-semibold text-foreground mb-4">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const selected = answers[q.question_id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers({ ...answers, [q.question_id]: opt })}
                      className={cn(
                        'w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-border text-foreground hover:bg-muted'
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || Object.keys(answers).length < questions.length}
            className="gap-2"
            size="lg"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Submit Quiz
          </Button>
        </div>
      ) : (
        <div className="max-w-xl animate-slide-up-fade space-y-6">
          {/* Score */}
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <div className={cn(
              'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full',
              result.score / result.total >= 0.7 ? 'bg-success/10' : 'bg-warning/10'
            )}>
              {result.score / result.total >= 0.7
                ? <CheckCircle2 className="h-8 w-8 text-success" />
                : <AlertTriangle className="h-8 w-8 text-warning" />
              }
            </div>
            <p className="text-3xl font-bold font-display text-foreground">{result.score}/{result.total}</p>
            <p className="mt-2 text-sm text-muted-foreground">{result.recommendation}</p>
          </div>

          {/* Weak topics */}
          {result.weak_topics.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Areas to Improve
              </h3>
              <ul className="space-y-2">
                {result.weak_topics.map((topic) => (
                  <li key={topic} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                    {topic}
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-lg bg-warning/5 border border-warning/20 p-4">
                <p className="text-xs text-muted-foreground">
                  We recommend revisiting these topics before continuing. Use the Doubt Assistant or Tutor Chat for help.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link to="/lesson"><Button variant="outline">Back to Lessons</Button></Link>
            <Link to="/doubt"><Button>Ask Doubt Assistant</Button></Link>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
