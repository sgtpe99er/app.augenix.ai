import * as React from 'react';
import { cn } from '@/utils/cn';

interface SparkleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function SparkleButton({ className, children, ...props }: SparkleButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md font-alt font-medium transition-all duration-200',
        'bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500 text-white',
        'h-10 px-4',
        'hover:font-bold',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
