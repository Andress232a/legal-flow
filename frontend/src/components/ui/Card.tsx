import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export default function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={clsx('rounded-xl border border-surface-200 bg-white shadow-sm', padding && 'p-6', className)}>
      {children}
    </div>
  );
}
