
'use client';

import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaleCountdownProps {
  saleEndDate: Date | string;
  className?: string;
}

type TimeLeft = {
    [key: string]: number;
};

export function SaleCountdown({ saleEndDate, className }: SaleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({});

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(saleEndDate) - +new Date();
      let newTimeLeft: TimeLeft = {};

      if (difference > 0) {
        newTimeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return newTimeLeft;
    };

    // Set initial time on mount
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [saleEndDate]);

  const timerComponents: JSX.Element[] = [];
  const entries = Object.entries(timeLeft);

  for (const [interval, value] of entries) {
    if (value > 0 || (interval === 'seconds' && entries.length === 1)) {
       timerComponents.push(
        <span key={interval} className="tabular-nums">
          {String(value).padStart(2, '0')}
          <span className="text-xs">{interval[0]}</span>
        </span>
      );
    }
  }

  if (!timerComponents.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1.5 text-xs font-semibold text-destructive-foreground shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <Timer className="h-4 w-4" />
      <span>Kết thúc sau:</span>
      <div className="flex items-baseline gap-1">
        {timerComponents.map((component, index) => (
            <React.Fragment key={index}>
                {component}
                {index < timerComponents.length - 1 && <span>:</span>}
            </React.Fragment>
        ))}
      </div>
    </div>
  );
}
