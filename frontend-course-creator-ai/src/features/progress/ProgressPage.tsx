import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { courseApi } from '@/shared/lib/api/endpoints';
import { useAppStore } from '@/shared/lib/store';
import { DashboardLayout } from '@/shared/components/DashboardLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { KpiCard } from '@/shared/components/KpiCard';
import { SkeletonCard } from '@/shared/components/SkeletonBlock';
import { ErrorState } from '@/shared/components/ErrorState';
import { EmptyState } from '@/shared/components/EmptyState';
import { Button } from '@/components/ui/button';
import { BookOpen, Target, Clock, BarChart3, TrendingUp, AlertTriangle, Lightbulb, RefreshCw, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { CoursePlan } from '@/shared/types';

export default function ProgressPage() {
  const navigate = useNavigate();
  const { userId, currentCoursePlan, planHistory, setCoursePlan } = useAppStore();
  const [showAllCourses, setShowAllCourses] = useState(false);

  const previousCourses = useMemo(() => {
    const byId = new Map<string, CoursePlan>();
    [...planHistory].reverse().forEach((plan) => {
      if (!byId.has(plan.course_plan_id)) {
        byId.set(plan.course_plan_id, plan);
      }
    });
    return Array.from(byId.values());
  }, [planHistory]);

  const visibleCourses = useMemo(
    () => (showAllCourses ? previousCourses : previousCourses.slice(0, 3)),
    [previousCourses, showAllCourses],
  );
  const remainingCoursesCount = Math.max(previousCourses.length - 3, 0);

  const cpId = currentCoursePlan?.course_plan_id || '';
  const uid = userId || '';
  const canLoad = Boolean(cpId && uid);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['progress', cpId, uid],
    queryFn: () => courseApi.getProgress(cpId, uid),
    enabled: canLoad,
    retry: 2,
  });

  useEffect(() => {
    if (canLoad) {
      refetch();
    }
  }, [canLoad, cpId, uid, refetch]);

  return (
    <DashboardLayout>
      <PageHeader title="Progress Dashboard" description="Track your learning progress and analytics." />

      {!canLoad && (
        <EmptyState
          title="No active learning context"
          description="Create and approve a course first. Progress will load automatically for your current account."
          action={<Link to="/create"><Button>Create Course</Button></Link>}
        />
      )}

      {canLoad && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracking</p>
              <p className="text-sm font-medium text-foreground">{currentCoursePlan?.title || 'Current Course Plan'}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {previousCourses.length > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Recent Courses</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {previousCourses.length} total
              </span>
            </div>
            {previousCourses.length > 3 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 px-2"
                onClick={() => setShowAllCourses((prev) => !prev)}
              >
                {showAllCourses ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    See more ({remainingCoursesCount})
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleCourses.map((plan) => (
              <div key={plan.course_plan_id} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium text-foreground line-clamp-2">{plan.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{plan.level} • {plan.preferred_duration}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCoursePlan(plan);
                      refetch();
                    }}
                  >
                    View Progress
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setCoursePlan(plan);
                      navigate('/lesson');
                    }}
                  >
                    Reopen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canLoad && isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      )}
      {canLoad && isError && <ErrorState message={(error as Error).message} onRetry={refetch} />}

      {canLoad && data && (
        <div className="space-y-8 animate-slide-up-fade">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Lessons Completed" value={`${data.lessons_completed}/${data.total_lessons}`} icon={<BookOpen className="h-5 w-5" />} />
            <KpiCard title="Avg Quiz Score" value={`${Math.round(data.average_quiz_score)}%`} icon={<Target className="h-5 w-5" />} />
            <KpiCard title="Attempts" value={data.attempts} icon={<TrendingUp className="h-5 w-5" />} />
            <KpiCard title="Time Spent" value={`${data.time_spent_minutes}m`} icon={<Clock className="h-5 w-5" />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Quiz trend */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Quiz Score Trend
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.quiz_scores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="lesson" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Weak topics */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Weak Topics
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.weak_topics} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="topic" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="score" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Recommendations
              </h3>
              <ul className="space-y-2">
                {data.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="text-primary font-bold">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
