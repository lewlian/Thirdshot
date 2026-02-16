"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "Asia/Singapore";

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
}

export function CountdownTimer({
  targetDate,
  onComplete,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Get current time in Singapore timezone
      const nowSGT = toZonedTime(new Date(), TIMEZONE);
      const targetSGT = toZonedTime(targetDate, TIMEZONE);

      const diff = targetSGT.getTime() - nowSGT.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (onComplete) {
          onComplete();
        }
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);

      setTimeLeft({
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 py-6 sm:py-8">
      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="text-center min-w-[2.5rem] sm:min-w-[3rem]">
          <div className="text-xl sm:text-2xl font-bold">{timeLeft.days}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">
            {timeLeft.days === 1 ? "day" : "days"}
          </div>
        </div>
        <span className="text-lg sm:text-xl font-bold text-muted-foreground">:</span>
        <div className="text-center min-w-[2.5rem] sm:min-w-[3rem]">
          <div className="text-xl sm:text-2xl font-bold">
            {timeLeft.hours.toString().padStart(2, "0")}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">hrs</div>
        </div>
        <span className="text-lg sm:text-xl font-bold text-muted-foreground">:</span>
        <div className="text-center min-w-[2.5rem] sm:min-w-[3rem]">
          <div className="text-xl sm:text-2xl font-bold">
            {timeLeft.minutes.toString().padStart(2, "0")}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">min</div>
        </div>
        <span className="text-lg sm:text-xl font-bold text-muted-foreground">:</span>
        <div className="text-center min-w-[2.5rem] sm:min-w-[3rem]">
          <div className="text-xl sm:text-2xl font-bold">
            {timeLeft.seconds.toString().padStart(2, "0")}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">sec</div>
        </div>
      </div>
    </div>
  );
}
