import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { courseApi, tutorApi } from '@/shared/lib/api/endpoints';
import { DashboardLayout } from '@/shared/components/DashboardLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { SkeletonBlock } from '@/shared/components/SkeletonBlock';
import { ErrorState } from '@/shared/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayCircle, FileText, List, HelpCircle, CheckCircle2, MessageCircleQuestion, ExternalLink, Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/shared/lib/store';
import { EmptyState } from '@/shared/components/EmptyState';
import { ChatWindow } from '@/shared/components/ChatWindow';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import type { ChatMessage, SubmitQuizResponse } from '@/shared/types';

type LessonOption = {
  lessonKey: string;
  lessonTitle: string;
  moduleTitle: string;
};

function safeParse(rawPlan: unknown): any | null {
  if (!rawPlan) return null;
  if (typeof rawPlan !== 'string') return rawPlan;
  const cleaned = rawPlan.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function extractLessons(rawPlan: unknown): LessonOption[] {
  const parsed = safeParse(rawPlan);
  const modules = Array.isArray(parsed?.modules) ? parsed.modules : [];
  const options: LessonOption[] = [];

  modules.forEach((moduleItem: any, moduleIndex: number) => {
    const moduleTitle = String(moduleItem?.module_name ?? moduleItem?.title ?? `Module ${moduleIndex + 1}`);
    const lessons = Array.isArray(moduleItem?.lessons) ? moduleItem.lessons : [];

    lessons.forEach((lessonItem: any, lessonIndex: number) => {
      if (typeof lessonItem === 'string') {
        options.push({
          lessonKey: `${moduleIndex + 1}.${lessonIndex + 1}`,
          lessonTitle: lessonItem,
          moduleTitle,
        });
        return;
      }

      const lessonId = lessonItem?.lesson_id;
      const lessonTitle = String(
        lessonItem?.lesson_name ??
        lessonItem?.lesson_title ??
        lessonItem?.title ??
        `Lesson ${lessonIndex + 1}`
      );
      options.push({
        lessonKey: String(lessonId ?? `${moduleIndex + 1}.${lessonIndex + 1}`),
        lessonTitle,
        moduleTitle,
      });
    });
  });

  return options;
}

export default function LessonViewerPage() {
  const currentCoursePlan = useAppStore((s) => s.currentCoursePlan);
  const userId = useAppStore((s) => s.userId);
  const lessonOptions = useMemo(() => extractLessons(currentCoursePlan?.raw_plan), [currentCoursePlan?.raw_plan]);
  const [queryId, setQueryId] = useState('');
  const [queryTopic, setQueryTopic] = useState('');
  const [passedLessonMap, setPassedLessonMap] = useState<Record<string, boolean>>({});
  const [completedVideoMap, setCompletedVideoMap] = useState<Record<string, boolean>>({});
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<SubmitQuizResponse | null>(null);
  const [doubtOpen, setDoubtOpen] = useState(false);
  const [doubtMessages, setDoubtMessages] = useState<ChatMessage[]>([]);
  const [sourceCtx, setSourceCtx] = useState('');

  const progressStorageKey = useMemo(
    () => `lesson-quiz-progress-${currentCoursePlan?.course_plan_id || 'default'}`,
    [currentCoursePlan?.course_plan_id],
  );

  useEffect(() => {
    if (!queryId && lessonOptions.length > 0) {
      setQueryId(lessonOptions[0].lessonKey);
      setQueryTopic(lessonOptions[0].lessonTitle);
    }
  }, [lessonOptions, queryId]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(progressStorageKey);
      if (!raw) {
        setPassedLessonMap({});
        setCompletedVideoMap({});
        return;
      }
      const parsed = JSON.parse(raw) as {
        passedLessonMap?: Record<string, boolean>;
        completedVideoMap?: Record<string, boolean>;
      };
      setPassedLessonMap(parsed.passedLessonMap || {});
      setCompletedVideoMap(parsed.completedVideoMap || {});
    } catch {
      setPassedLessonMap({});
      setCompletedVideoMap({});
    }
  }, [progressStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(
      progressStorageKey,
      JSON.stringify({
        passedLessonMap,
        completedVideoMap,
      }),
    );
  }, [progressStorageKey, passedLessonMap, completedVideoMap]);

  useEffect(() => {
    setQuizOpen(false);
    setQuizAnswers({});
    setQuizResult(null);
  }, [queryId]);

  const { data: lesson, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['lesson', queryId, queryTopic],
    queryFn: () => courseApi.getLesson(queryId, queryTopic, userId, currentCoursePlan?.course_plan_id),
    enabled: !!queryId,
    retry: 2,
  });

  const doubtMutation = useMutation({
    mutationFn: tutorApi.askDoubt,
    onSuccess: (data) => {
      const msg: ChatMessage = { role: 'assistant', content: data.answer, timestamp: Date.now() };
      setDoubtMessages((prev) => [...prev, msg]);
      setSourceCtx(data.source_context || '');
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: courseApi.submitQuiz,
    onSuccess: (data) => {
      setQuizResult(data);
      if (data.passed) {
        setPassedLessonMap((prev) => ({ ...prev, [queryId]: true }));
        toast({
          title: 'Quiz passed',
          description: 'Great work. You can continue to the next lesson.',
        });
      } else {
        toast({
          title: 'Quiz not passed yet',
          description: 'Please review this lesson and retry the quiz.',
          variant: 'destructive',
        });
      }
    },
    onError: (err: Error) => {
      toast({ title: 'Quiz submission failed', description: err.message, variant: 'destructive' });
    },
  });

  const currentLessonIndex = useMemo(
    () => lessonOptions.findIndex((item) => item.lessonKey === queryId),
    [lessonOptions, queryId],
  );

  const nextLesson = currentLessonIndex >= 0 ? lessonOptions[currentLessonIndex + 1] : undefined;

  const isLessonUnlocked = (index: number): boolean => {
    if (index <= 0) return true;
    for (let i = 0; i < index; i += 1) {
      const previousLessonKey = lessonOptions[i]?.lessonKey;
      if (!previousLessonKey || !passedLessonMap[previousLessonKey]) {
        return false;
      }
    }
    return true;
  };

  const handleVideoComplete = () => {
    if (!queryId) return;
    setCompletedVideoMap((prev) => ({ ...prev, [queryId]: true }));
    setQuizAnswers({});
    setQuizResult(null);
    setQuizOpen(true);
  };

  const handleQuizSubmit = () => {
    if (!lesson || !queryId) return;
    const formattedAnswers = Object.entries(quizAnswers).map(([question_id, answer]) => ({ question_id, answer }));
    submitQuizMutation.mutate({
      quiz_id: lesson.quiz_id || lesson.lesson_id,
      user_id: userId,
      course_plan_id: currentCoursePlan?.course_plan_id,
      answers: formattedAnswers,
    });
  };

  const handleDoubtSend = (message: string) => {
    if (!currentCoursePlan?.course_plan_id) {
      toast({
        title: 'Course not ready',
        description: 'Generate and approve a course plan before asking doubts.',
        variant: 'destructive',
      });
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: Date.now() };
    setDoubtMessages((prev) => [...prev, userMsg]);

    const enrichedQuestion = queryTopic ? `${message}\n\nLesson context: ${queryTopic}` : message;
    doubtMutation.mutate({
      user_id: userId,
      course_plan_id: currentCoursePlan.course_plan_id,
      question: enrichedQuestion,
    });
  };

  return (
    <DashboardLayout>
      <PageHeader title="Lesson Viewer" description="Choose a lesson from your generated course plan." />

      {lessonOptions.length === 0 && (
        <EmptyState
          title="No lessons available yet"
          description="Create and approve a course plan first, then lessons will appear here automatically."
          action={<Link to="/create"><Button>Create Course</Button></Link>}
        />
      )}

      {lessonOptions.length > 0 && (
        <div className="mb-5 rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Course Lessons</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {lessonOptions.map((item, index) => {
              const active = queryId === item.lessonKey;
              const unlocked = isLessonUnlocked(index);
              const passed = Boolean(passedLessonMap[item.lessonKey]);
              return (
                <button
                  key={`${item.lessonKey}-${item.lessonTitle}`}
                  type="button"
                  onClick={() => {
                    if (!unlocked) {
                      toast({
                        title: 'Lesson locked',
                        description: 'Pass the previous lesson quiz to unlock this lesson.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    setQueryId(item.lessonKey);
                    setQueryTopic(item.lessonTitle);
                  }}
                  className={cn(
                    'min-w-[240px] rounded-md border p-3 text-left transition-colors',
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted',
                    !unlocked && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  <p className="text-xs text-muted-foreground">{item.moduleTitle}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{item.lessonTitle}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {passed ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                      </span>
                    ) : unlocked ? (
                      <span className="text-muted-foreground">Unlocked</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" /> Locked
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isLoading && <SkeletonBlock lines={6} />}
      {isError && <ErrorState message={(error as Error).message} onRetry={refetch} />}

      {lesson && (
        <div className="space-y-4 animate-slide-up-fade">
          <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Now Learning</p>
              <p className="text-base font-semibold text-foreground">{queryTopic || lesson.title || 'Selected Lesson'}</p>
            </div>
            <div className="flex items-center gap-2">
              {nextLesson && (
                <Button
                  size="sm"
                  onClick={() => {
                    setQueryId(nextLesson.lessonKey);
                    setQueryTopic(nextLesson.lessonTitle);
                  }}
                  disabled={!passedLessonMap[queryId]}
                  className="gap-2"
                >
                  Next Lesson
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {lesson.selected_video?.url && (
                <a href={lesson.selected_video.url} target="_blank" rel="noreferrer" className="inline-flex">
                  <Button variant="outline" size="sm" className="gap-2">
                    Open on YouTube
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
          {/* Main content - 3 cols */}
          <div className="xl:col-span-8 space-y-4">
            {/* Video */}
            {lesson.selected_video && (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="aspect-video bg-foreground/5 flex items-center justify-center">
                  <iframe
                    src={lesson.selected_video.url.replace('watch?v=', 'embed/')}
                    title={lesson.selected_video.title}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
                <div className="p-4">
                  <p className="font-medium text-sm text-foreground">{lesson.selected_video.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" className="gap-2" onClick={handleVideoComplete}>
                      <CheckCircle2 className="h-4 w-4" />
                      Mark Video Completed
                    </Button>
                    <p className="text-xs text-muted-foreground self-center">
                      Completing video opens the lesson quiz. Pass it to unlock the next lesson.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs for notes */}
            <Tabs defaultValue="summary" className="rounded-lg border border-border bg-card">
              <TabsList className="w-full border-b border-border rounded-none bg-transparent px-4 pt-2">
                <TabsTrigger value="summary" className="gap-2 text-xs"><FileText className="h-3.5 w-3.5" />Summary</TabsTrigger>
                <TabsTrigger value="notes" className="gap-2 text-xs"><FileText className="h-3.5 w-3.5" />Notes</TabsTrigger>
                <TabsTrigger value="transcript" className="gap-2 text-xs"><List className="h-3.5 w-3.5" />Transcript</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="p-4">
                <p className="text-sm text-foreground leading-relaxed">{lesson.short_summary}</p>
              </TabsContent>
              <TabsContent value="notes" className="p-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{lesson.detailed_notes}</p>
              </TabsContent>
              <TabsContent value="transcript" className="p-4 max-h-80 overflow-y-auto">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{lesson.transcript}</p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - 2 cols */}
          <div className="xl:col-span-4 space-y-4">
            {/* Key Points */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <List className="h-4 w-4 text-primary" />
                  Key Points
                </h3>
                <Sheet open={doubtOpen} onOpenChange={setDoubtOpen}>
                  <SheetTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
                      <MessageCircleQuestion className="h-4 w-4" />
                      Ask Doubt
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-xl p-0">
                    <div className="h-full flex flex-col">
                      <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
                        <SheetTitle>Doubt Assistant</SheetTitle>
                        <SheetDescription>
                          Ask questions while watching this lesson.
                          {queryTopic ? ` Current lesson: ${queryTopic}.` : ''}
                        </SheetDescription>
                      </SheetHeader>
                      <div className="flex-1 p-4 min-h-0">
                        <ChatWindow
                          messages={doubtMessages}
                          onSend={handleDoubtSend}
                          isLoading={doubtMutation.isPending}
                          placeholder="Ask a doubt from this lesson..."
                          sourceContext={sourceCtx}
                        />
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              <ul className="space-y-2 max-h-[260px] overflow-auto pr-1">
                {lesson.key_points.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quiz preview */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Quiz ({lesson.quiz_questions.length} questions)
              </h3>
              {lesson.quiz_questions.slice(0, 2).map((q, i) => (
                <p key={i} className="text-xs text-muted-foreground mb-2 truncate">
                  {i + 1}. {q.question}
                </p>
              ))}
              <Button
                onClick={() => {
                  setQuizAnswers({});
                  setQuizResult(null);
                  setQuizOpen(true);
                }}
                className="w-full mt-3 gap-2"
                size="sm"
                disabled={Boolean(lesson.selected_video?.url) && !completedVideoMap[queryId]}
              >
                <PlayCircle className="h-4 w-4" />
                {Boolean(lesson.selected_video?.url) && !completedVideoMap[queryId] ? 'Complete Video First' : 'Start Quiz'}
              </Button>
              {!completedVideoMap[queryId] && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Complete the video first, then take and pass this quiz to continue.
                </p>
              )}
            </div>

            {/* Vector status */}
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                Vector Indexing: <span className="font-semibold text-foreground">{lesson.vector_indexing_status}</span>
              </p>
            </div>
          </div>
          </div>
        </div>
      )}

      {lesson && (
        <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lesson Quiz</DialogTitle>
              <DialogDescription>
                This quiz is generated for the current lesson. Pass score is 70%.
              </DialogDescription>
            </DialogHeader>

            {!quizResult ? (
              <div className="space-y-4">
                {lesson.quiz_questions.map((q, qi) => (
                  <div key={q.question_id} className="rounded-md border border-border p-4">
                    <p className="text-sm font-semibold text-foreground mb-3">
                      {qi + 1}. {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const selected = quizAnswers[q.question_id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.question_id]: opt }))}
                            className={cn(
                              'w-full rounded-md border px-3 py-2 text-left text-sm transition-colors',
                              selected ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted'
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
                  className="w-full"
                  disabled={
                    submitQuizMutation.isPending ||
                    lesson.quiz_questions.length === 0 ||
                    Object.keys(quizAnswers).length < lesson.quiz_questions.length
                  }
                  onClick={handleQuizSubmit}
                >
                  {submitQuizMutation.isPending ? 'Submitting...' : 'Submit Quiz'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border border-border bg-card p-4">
                  <p className="text-lg font-semibold text-foreground">
                    Score: {quizResult.score}% ({quizResult.correct || 0}/{quizResult.total})
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{quizResult.recommendation}</p>
                </div>

                {quizResult.weak_topics.length > 0 && (
                  <div className="rounded-md border border-border p-4">
                    <p className="text-sm font-semibold text-foreground mb-2">Needs improvement</p>
                    <ul className="space-y-1">
                      {quizResult.weak_topics.map((topic) => (
                        <li key={topic} className="text-sm text-muted-foreground">• {topic}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {!quizResult.passed && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuizAnswers({});
                        setQuizResult(null);
                      }}
                    >
                      Retry Quiz
                    </Button>
                  )}
                  {quizResult.passed && nextLesson && (
                    <Button
                      onClick={() => {
                        setQuizOpen(false);
                        setQueryId(nextLesson.lessonKey);
                        setQueryTopic(nextLesson.lessonTitle);
                      }}
                    >
                      Go to Next Lesson
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setQuizOpen(false)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
