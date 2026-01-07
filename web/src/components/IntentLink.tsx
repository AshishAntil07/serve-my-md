import { Link } from '@tanstack/react-router';

export interface IntentLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

export default function IntentLink({ to, children, ...props }: IntentLinkProps) {
  return (
    <Link
      to={to}
      preload={'intent'}
      preloadDelay={400}
      {...props}
    >
      {children}
    </Link>
  );
}
