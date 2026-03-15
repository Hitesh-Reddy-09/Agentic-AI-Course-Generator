import type { CoursePlan } from '@/shared/types';
import { BookOpen, Clock3, Layers3, Target } from 'lucide-react';

type PlanLesson = {
  title: string;
  topics: string[];
  resources: string[];
};

type PlanModule = {
  title: string;
  description: string;
  difficulty: string;
  lessons: PlanLesson[];
};

type ParsedPlan = {
  title: string;
  level: string;
  goal: string;
  duration: string;
  modules: PlanModule[];
};

function tryParseJson(raw: string): any | null {
  const clean = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  // LLM outputs may include pseudo-numeric identifiers like 1.1.1, which are invalid JSON numbers.
  const normalizeMalformedIds = (value: string): string =>
    value.replace(/:\s*([0-9]+(?:\.[0-9]+){2,})(\s*[,}\]])/g, ': "$1"$2');

  const parseWithHeuristics = (value: string): any | null => {
    try {
      return JSON.parse(value);
    } catch {
      const normalized = normalizeMalformedIds(value);
      try {
        return JSON.parse(normalized);
      } catch {
        return null;
      }
    }
  };

  const direct = parseWithHeuristics(clean);
  if (direct) return direct;

  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = clean.slice(firstBrace, lastBrace + 1);
    return parseWithHeuristics(candidate);
  }

  return null;
}

function normalizeTopic(topicItem: any): string {
  if (typeof topicItem === 'string') return topicItem;
  if (topicItem && typeof topicItem === 'object') {
    const title = topicItem.topic_title ?? topicItem.title ?? topicItem.name;
    const difficulty = topicItem.difficulty ? ` (${String(topicItem.difficulty)})` : '';
    if (title) return `${String(title)}${difficulty}`;
    return String(topicItem.topic_description ?? topicItem.description ?? 'Topic');
  }
  return String(topicItem);
}

function parsePlan(plan: CoursePlan): ParsedPlan {
  const source = plan.raw_plan;
  const parsed = typeof source === 'string' ? tryParseJson(source) : source;

  const courseMeta = parsed?.course ?? parsed ?? {};
  const modulesRaw = Array.isArray(parsed?.modules) ? parsed.modules : [];

  const modules: PlanModule[] = modulesRaw.map((moduleItem: any, mIndex: number) => {
    const lessonsRaw = Array.isArray(moduleItem?.lessons) ? moduleItem.lessons : [];
    const lessons: PlanLesson[] = lessonsRaw.map((lessonItem: any, lIndex: number) => {
      if (typeof lessonItem === 'string') {
        return {
          title: lessonItem,
          topics: [],
          resources: [],
        };
      }

      return {
        title: String(
          lessonItem?.lesson_name ??
          lessonItem?.lesson_title ??
          lessonItem?.title ??
          `Lesson ${lIndex + 1}`
        ),
        topics: Array.isArray(lessonItem?.topics) ? lessonItem.topics.map(normalizeTopic) : [],
        resources: Array.isArray(lessonItem?.resources) ? lessonItem.resources.map(String) : [],
      };
    });

    return {
      title: String(moduleItem?.module_name ?? moduleItem?.module_title ?? moduleItem?.title ?? `Module ${mIndex + 1}`),
      description: String(moduleItem?.description ?? moduleItem?.module_description ?? ''),
      difficulty: String(moduleItem?.difficulty ?? moduleItem?.module_difficulty ?? ''),
      lessons,
    };
  });

  return {
    title: String(courseMeta?.title ?? courseMeta?.course_title ?? plan.title ?? 'Generated Course Plan'),
    level: String(courseMeta?.level ?? plan.level ?? 'beginner'),
    goal: String(courseMeta?.goal ?? courseMeta?.course_goal ?? plan.goal ?? ''),
    duration: String(courseMeta?.duration ?? courseMeta?.course_duration ?? plan.preferred_duration ?? 'self-paced'),
    modules,
  };
}

function StatChip({ icon, label, value }: { icon: JSX.Element; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{value || '-'}</p>
    </div>
  );
}

export function CoursePlanPreview({ plan }: { plan: CoursePlan }) {
  const parsed = parsePlan(plan);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">{parsed.title}</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatChip icon={<Layers3 className="h-3.5 w-3.5" />} label="Level" value={parsed.level} />
          <StatChip icon={<Clock3 className="h-3.5 w-3.5" />} label="Duration" value={parsed.duration} />
          <StatChip icon={<Target className="h-3.5 w-3.5" />} label="Goal" value={parsed.goal} />
        </div>
      </div>

      {parsed.modules.length > 0 ? (
        <div className="space-y-3">
          {parsed.modules.map((moduleItem, moduleIndex) => (
            <div key={`${moduleItem.title}-${moduleIndex}`} className="rounded-lg border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Module {moduleIndex + 1}: {moduleItem.title}
                </p>
                {moduleItem.difficulty && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {moduleItem.difficulty}
                  </span>
                )}
              </div>

              {moduleItem.description && (
                <p className="mt-2 text-xs text-muted-foreground">{moduleItem.description}</p>
              )}

              <div className="mt-3 space-y-2">
                {moduleItem.lessons.map((lesson, lessonIndex) => (
                  <div key={`${lesson.title}-${lessonIndex}`} className="rounded-md border border-border p-3">
                    <p className="text-sm font-medium text-foreground">
                      Lesson {moduleIndex + 1}.{lessonIndex + 1}: {lesson.title}
                    </p>

                    {lesson.topics.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {lesson.topics.map((topic, topicIndex) => (
                          <li key={`${topic}-${topicIndex}`} className="text-xs text-muted-foreground">
                            - {topic}
                          </li>
                        ))}
                      </ul>
                    )}

                    {lesson.resources.length > 0 && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Resources: {lesson.resources.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Structured modules were not found, showing raw content below.</span>
          </div>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
            {typeof plan.raw_plan === 'string' ? plan.raw_plan : JSON.stringify(plan.raw_plan, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
