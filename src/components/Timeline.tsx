import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useSettings } from '@/context/SettingsContext';
import { formatTime, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TimelineProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
}

const Timeline: React.FC<TimelineProps> = ({
  currentDate,
  onDateChange,
  isPlaying,
  onPlayToggle
}) => {
  const { state } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Create a range of dates for the last 5 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 5);

  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentDay = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Clamp currentDay to valid range
  const clampedDay = Math.max(0, Math.min(totalDays, currentDay));

  const handleSliderChange = (values: number[]) => {
    const dayOffset = values[0];
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + dayOffset);
    onDateChange(newDate);
  };

  const handleReset = () => {
    onDateChange(new Date());
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timelineRef.current && !timelineRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const formattedDateStr = formatDate(currentDate, state.time.timezone);
  const formattedTimeStr = formatTime(currentDate, state.time.format, state.time.timezone);

  // Check if viewing current day
  const isToday = currentDate.toDateString() === new Date().toDateString();

  return (
    <div
      ref={timelineRef}
      className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40"
    >
      {/* Main Pill Container */}
      <div
        className={cn(
          "relative overflow-hidden transition-all duration-300 ease-out",
          "bg-black/70 backdrop-blur-xl border border-white/10",
          "shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)_inset]",
          isExpanded
            ? "rounded-2xl w-[380px]"
            : "rounded-full w-auto cursor-pointer hover:bg-black/80 hover:border-white/20"
        )}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        {/* Collapsed State */}
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 transition-all duration-300",
            isExpanded ? "opacity-0 h-0 py-0" : "opacity-100"
          )}
        >
          {/* Play/Pause Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPlayToggle();
            }}
            className={cn(
              "h-7 w-7 p-0 rounded-full",
              "bg-primary/20 hover:bg-primary/30 text-primary",
              isPlaying && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 ml-0.5" />
            )}
          </Button>

          {/* Date & Time Display */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-white">
              {formattedDateStr}
            </span>
            <span className="text-white/50">•</span>
            <span className="text-white/70 font-mono text-xs">
              {formattedTimeStr}
            </span>
            {isToday && (
              <span className="text-[10px] text-primary font-medium uppercase tracking-wider">
                NOW
              </span>
            )}
          </div>

          {/* Expand Indicator */}
          <ChevronUp className="h-4 w-4 text-white/40" />
        </div>

        {/* Expanded State */}
        <div
          className={cn(
            "transition-all duration-300 overflow-hidden",
            isExpanded ? "opacity-100 max-h-[200px]" : "opacity-0 max-h-0"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-3">
              {/* Play/Pause Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onPlayToggle}
                className={cn(
                  "h-8 w-8 p-0 rounded-full",
                  "bg-primary/20 hover:bg-primary/30 text-primary",
                  isPlaying && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </Button>

              {/* Reset Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 w-8 p-0 rounded-full bg-white/5 hover:bg-white/10 text-white/70"
                title="Reset to now"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Current Date/Time */}
            <div className="text-right">
              <div className="text-sm font-medium text-white">
                {formattedDateStr}
              </div>
              <div className="text-xs text-white/60 font-mono">
                {formattedTimeStr}
                {state.time.timezone === 'utc' && ' UTC'}
              </div>
            </div>

            {/* Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-7 w-7 p-0 rounded-full bg-white/5 hover:bg-white/10 text-white/50"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Slider Section */}
          <div className="px-4 pb-2">
            <Slider
              value={[clampedDay]}
              onValueChange={handleSliderChange}
              max={totalDays}
              min={0}
              step={1}
              className="w-full [&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_[role=slider]]:shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            />
          </div>

          {/* Date Range Labels */}
          <div className="flex justify-between px-4 pb-3 text-[10px] text-white/40">
            <span>{formatDate(startDate, state.time.timezone)}</span>
            <span className="text-white/60 uppercase tracking-wider text-[9px]">Historical Data</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Proforce Branding - Below the pill */}
      <div className="mt-2 text-center">
        <div className="inline-block bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 border border-white/5">
          <p className="text-[9px] text-white/40">
            CAELUS by <span className="text-primary/80 font-medium">Proforce Galaxies</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Timeline;