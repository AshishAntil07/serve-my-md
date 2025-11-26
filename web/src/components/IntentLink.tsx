import { Link } from '@tanstack/react-router';

export default function IntentLink({
  to,
  children,
  ...props
}: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      preload={'intent'}
      preloadDelay={200}
      preloadIntentProximity={200}
      {...props}
    >
      {children}
    </Link>
  );
}
