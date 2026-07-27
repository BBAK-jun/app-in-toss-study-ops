import { Button } from '@toss/tds-mobile';

import { usePageLayoutContext } from './PageLayoutContext';

interface RefreshButtonProps {
  refreshKey?: 'studies' | 'rounds';
}

export function RefreshButton(_props: RefreshButtonProps = {}) {
  const { override } = usePageLayoutContext();
  return (
    <Button variant="weak" size="small" onClick={override.onRefresh} disabled={!override.onRefresh}>
      새로고침
    </Button>
  );
}
