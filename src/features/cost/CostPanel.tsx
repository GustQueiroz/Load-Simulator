'use client';

import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

import { estimateMonthlyCost } from '@/application/cost/cost-engine';
import { costProfileOf } from '@/application/cost/profiles';
import { CLOUD_PROVIDERS, type CloudProvider } from '@/application/cost/types';
import { toSimulationNodes } from '@/domain/diagram/diagram';
import { useActiveBudget } from '@/features/lessons/lesson-session-store';
import { useT } from '@/i18n/I18nProvider';
import { kindKey } from '@/i18n/keys';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { cn } from '@/lib/cn';
import { formatCompact, formatUsd } from '@/lib/format';

export function CostPanel() {
  const t = useT();
  const nodes = useSimulatorStore((state) => state.nodes);
  const nodeMetrics = useSimulatorStore((state) => state.nodeMetrics);
  const completedRps = useSimulatorStore((state) => state.system.completedRps);
  const cloud = useSimulatorStore((state) => state.cloud);
  const setCloud = useSimulatorStore((state) => state.setCloud);
  const budget = useActiveBudget();
  const [open, setOpen] = useState(true);

  const profile = costProfileOf(cloud);
  const estimate = useMemo(
    () =>
      estimateMonthlyCost(toSimulationNodes(nodes), nodeMetrics, profile, {
        egressRps: completedRps,
      }),
    [nodes, nodeMetrics, profile, completedRps],
  );

  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <select
          aria-label={t('cost.cloud')}
          value={cloud}
          onChange={(event) => setCloud(event.target.value as CloudProvider)}
          className="h-7 rounded-md border border-line bg-raised px-1.5 text-[11px] text-ink focus-visible:border-sky-400 focus-visible:outline-none"
        >
          {CLOUD_PROVIDERS.map((provider) => (
            <option key={provider} value={provider}>
              {costProfileOf(provider).label}
            </option>
          ))}
        </select>

        <h2 className="flex-1 text-xs font-semibold text-ink">{t('cost.title')}</h2>

        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? t('cost.collapse') : t('cost.expand')}
          onClick={() => setOpen((value) => !value)}
          className="text-faint transition-colors hover:text-ink"
        >
          <ChevronDown className={cn('size-4 transition-transform', !open && '-rotate-90')} />
        </button>
      </div>

      {open ? (
        <div className="border-t border-line/70 px-3 py-2.5">
          {estimate.lines.length === 0 ? (
            <p className="text-[11px] text-faint">{t('cost.empty')}</p>
          ) : (
            <dl className="space-y-1.5">
              {estimate.lines.map((line) => {
                const label = line.key === 'traffic' ? t('cost.traffic') : t(kindKey(line.key));
                const detail =
                  line.key === 'traffic'
                    ? t('cost.trafficDetail', {
                        gb: formatCompact(line.egressGb ?? 0),
                        kb: line.avgResponseKb ?? 0,
                      })
                    : line.serviceName;

                return (
                  <div key={line.key} className="flex items-baseline justify-between gap-2">
                    <dt className="min-w-0 truncate text-[11px] text-muted" title={detail}>
                      {label}
                      {detail ? <span className="ml-1 text-faint">· {detail}</span> : null}
                    </dt>
                    <dd className="shrink-0 font-mono text-[11px] text-ink tabular-nums">
                      {formatUsd(line.monthlyUsd)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}

          <div className="mt-2.5 flex items-baseline justify-between border-t border-line/70 pt-2.5">
            <span className="text-xs font-semibold text-ink">{t('cost.total')}</span>
            <span className="font-mono text-sm font-semibold text-sky-300 tabular-nums">
              {formatUsd(estimate.totalMonthlyUsd)}
              <span className="ml-1 text-[10px] font-normal text-faint">{t('cost.perMonth')}</span>
            </span>
          </div>

          {budget === undefined ? null : (
            <BudgetRow spent={estimate.infrastructureMonthlyUsd} budget={budget} />
          )}

          <p className="mt-2 text-[10px] leading-snug text-faint">{t('cost.disclaimer')}</p>
        </div>
      ) : null}
    </section>
  );
}

/**
 * What the mission actually grades.
 *
 * The total above includes egress, and a mission locks its traffic sources —
 * so the bill the learner can move is the components alone. Showing the total
 * and the budget side by side without this row asks them to reconcile two
 * numbers that were never comparable.
 */
function BudgetRow({ spent, budget }: { spent: number; budget: number }) {
  const t = useT();
  const within = spent <= budget;

  return (
    <div className="mt-2 rounded-lg border border-line/70 bg-raised/60 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium text-muted">{t('cost.budgetLabel')}</span>
        <span
          className={cn(
            'shrink-0 font-mono text-[11px] font-semibold whitespace-nowrap tabular-nums',
            within ? 'text-emerald-300' : 'text-rose-300',
          )}
        >
          {formatUsd(spent)}
          <span className="text-faint"> / {formatUsd(budget)}</span>
        </span>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-faint">{t('cost.budgetHint')}</p>
    </div>
  );
}
