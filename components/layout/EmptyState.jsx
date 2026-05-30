'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  buttonText,
  onButtonClick,
  className
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-full px-8', className)}>
      {Icon && (
        <div className="mb-6">
          <Icon className="h-16 w-16 text-muted-foreground/50" />
        </div>
      )}
      <h2 className="text-2xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground text-center mb-8 max-w-md">{subtitle}</p>
      {buttonText && onButtonClick && (
        <Button onClick={onButtonClick} size="lg">
          {buttonText}
        </Button>
      )}
    </div>
  );
}
