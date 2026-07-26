import { useOutlet } from 'react-router-dom';

export function FullscreenLayout() {
  const outlet = useOutlet();
  return <main style={{ flex: 1 }}>{outlet}</main>;
}
