// apps/client/src/query/logQueries.ts
//
// Log 도메인 — useInfiniteQuery 로 커서 기반 페이지네이션 지원.

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { LogQuery } from '@studyops/shared';

import { fetchLogs } from '../api/logs';
import { logKeys } from './queryKeys';

export function useLogsInfiniteQuery(params: Omit<LogQuery, 'cursor'>) {
  return useInfiniteQuery({
    queryKey: logKeys.list(params),
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      fetchLogs({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useInvalidateLogs() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: logKeys.all });
}
