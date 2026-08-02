import { deleteOldLogs } from './lib/retention';
import { LOG_EVENTS } from '@studyops/shared';
import type { AppEnv } from './env';

export async function runRetentionJob(env: AppEnv['Bindings']): Promise<void> {
  const startedAt = Date.now();
  const results = await deleteOldLogs(env.DB, env.LOG_ARCHIVE);
  const totalArchived = results.reduce((sum, r) => sum + r.archivedCount, 0);
  const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
  const finishedAt = Date.now();

  const levelBreakdown = results
    .map((r) => `${r.level}=${r.deletedCount}(arch=${r.archivedCount})`)
    .join(' ');

  const archiveErrors = results.filter((r) => r.archiveError);
  if (archiveErrors.length > 0) {
    console.log(
      JSON.stringify({
        level: 'warn',
        event: LOG_EVENTS.INFRA_LOG_ARCHIVE_RUN,
        message: `Archive completed with ${archiveErrors.length} level(s) having errors.`,
        archived: totalArchived,
        errors: archiveErrors.map((r) => ({ level: r.level, error: r.archiveError })),
        startedAt,
        finishedAt,
        cronTrigger: 'scheduled',
      }),
    );
  }

  console.log(
    JSON.stringify({
      level: 'info',
      event: LOG_EVENTS.INFRA_LOG_RETENTION_RUN,
      message: `Retention job done. Archived ${totalArchived}, deleted ${totalDeleted} rows in ${finishedAt - startedAt}ms.`,
      archived: totalArchived,
      deleted: totalDeleted,
      startedAt,
      finishedAt,
      details: { breakdown: levelBreakdown, results },
      cronTrigger: 'scheduled',
    }),
  );
}
