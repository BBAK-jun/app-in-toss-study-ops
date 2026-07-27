import { deleteOldLogs } from './lib/retention';
import { LOG_EVENTS } from '@studyops/shared';
import type { AppEnv } from './env';
import type { RetentionResult } from './lib/retention';

export async function runRetentionJob(env: AppEnv['Bindings']): Promise<void> {
  const startedAt = Date.now();
  const results: RetentionResult[] = await deleteOldLogs(env.DB);
  const totalDeleted = results.reduce(
    (sum: number, r: RetentionResult) => sum + r.deletedCount,
    0,
  );
  const finishedAt = Date.now();

  const levelBreakdown = results
    .map((r: RetentionResult) => `${r.level}=${r.deletedCount}`)
    .join(' ');

  console.log(
    JSON.stringify({
      level: 'info',
      event: LOG_EVENTS.INFRA_LOG_RETENTION_RUN,
      message: `Retention job done. Deleted ${totalDeleted} rows in ${finishedAt - startedAt}ms.`,
      deleted: totalDeleted,
      startedAt,
      finishedAt,
      details: { breakdown: levelBreakdown, results },
      cronTrigger: 'scheduled',
    }),
  );
}
