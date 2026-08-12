'use client';

import { Check, Circle } from 'lucide-react';

import { describeCondition, type ConditionClause, type LessonDefinition } from '@/application/lessons';
import { useT, type MessageKey, type Translate } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { formatUsd } from '@/lib/format';

interface StarRequirementsProps {
  lesson: LessonDefinition;
  /** Which tiers held at the moment of victory. */
  tiers: { two: boolean; three: boolean };
}

/**
 * Why the run scored what it scored.
 *
 * The tiers are already written as conditions, so this renders those same
 * conditions in words — a learner who got two stars can see exactly what the
 * third one wanted, instead of guessing.
 */
export function StarRequirements({ lesson, tiers }: StarRequirementsProps) {
  const t = useT();
  const labelOf = useNodeLabelLookup();
  if (!lesson.stars?.two && !lesson.stars?.three) return null;

  const rows = [
    { stars: 2, met: tiers.two, clauses: describeCondition(lesson.stars?.two, labelOf) },
    { stars: 3, met: tiers.three, clauses: describeCondition(lesson.stars?.three, labelOf) },
  ].filter((row) => row.clauses.length > 0);

  if (rows.length === 0) return null;

  return (
    <section className="border-t border-line/70 px-4 py-3">
      <h3 className="pb-1.5 text-[10px] font-semibold tracking-wider text-faint uppercase">
        {t('lesson.complete.tiers')}
      </h3>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li key={row.stars} className="flex items-start gap-2 text-[11px] leading-snug">
            <span
              className={`mt-px grid size-4 shrink-0 place-items-center rounded-full ${
                row.met ? 'bg-emerald-500/20 text-emerald-300' : 'bg-raised text-faint'
              }`}
              aria-hidden
            >
              {row.met ? <Check className="size-2.5" /> : <Circle className="size-2" />}
            </span>
            <span className={row.met ? 'text-muted' : 'text-ink'}>
              <span className="text-amber-300">{'★'.repeat(row.stars)}</span>{' '}
              <span className="sr-only">
                {t(row.met ? 'lesson.complete.tierMet' : 'lesson.complete.tierMissed', {
                  count: row.stars,
                })}
              </span>
              {row.clauses.map((clause) => phrase(clause, t)).join(' · ')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Star tiers name node ids; the learner knows those nodes by their label — and
 * by the label as it is *now*, since they may have renamed it.
 */
function useNodeLabelLookup(): (nodeId: string) => string {
  const nodes = useSimulatorStore((state) => state.nodes);
  return (nodeId) => nodes.find((node) => node.id === nodeId)?.data.config.label ?? nodeId;
}

function phrase(clause: ConditionClause, t: Translate): string {
  switch (clause.kind) {
    case 'failure-ratio':
      return t('clause.failureRatio', { value: percent(clause.value) });
    case 'completion-ratio':
      return t('clause.completionRatio', { value: percent(clause.value) });
    case 'monthly-cost':
      return t('clause.monthlyCost', { value: formatUsd(clause.value) });
    case 'node-utilization':
      return t('clause.nodeUtilization', {
        node: clause.nodeLabel,
        value: percent(clause.value),
      });
    case 'node-status':
      return t('clause.nodeStatus', {
        node: clause.nodeLabel,
        status: t(`status.${clause.status}` as MessageKey),
      });
    case 'no-status':
      return t('clause.noStatus', { status: t(`status.${clause.status}` as MessageKey) });
    case 'has-kind':
      return t('clause.hasKind', { kind: t(`kind.${clause.nodeKind}` as MessageKey) });
    case 'latency':
      return t('clause.latency', { value: Math.round(clause.value) });
    case 'sustained':
      return t('clause.sustained', {
        seconds: clause.seconds,
        of: clause.of.map((inner) => phrase(inner, t)).join(' · '),
      });
    case 'opaque':
      return t('clause.opaque');
  }
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
