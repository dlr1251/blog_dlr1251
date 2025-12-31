'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PublishOptionsProps {
  published: boolean;
  scheduledPublishAt: string;
  onPublishedChange: (published: boolean) => void;
  onScheduledChange: (date: string) => void;
}

export function PublishOptions({
  published,
  scheduledPublishAt,
  onPublishedChange,
  onScheduledChange,
}: PublishOptionsProps) {
  const [publishMode, setPublishMode] = useState<'draft' | 'publish' | 'schedule'>(
    published ? (scheduledPublishAt ? 'schedule' : 'publish') : 'draft'
  );
  const [scheduleType, setScheduleType] = useState<'relative' | 'exact'>('relative');
  const [relativeOption, setRelativeOption] = useState<string>('');

  const handleModeChange = (mode: 'draft' | 'publish' | 'schedule') => {
    setPublishMode(mode);
    if (mode === 'publish') {
      onPublishedChange(true);
      onScheduledChange('');
    } else if (mode === 'draft') {
      onPublishedChange(false);
      onScheduledChange('');
    } else {
      onPublishedChange(false);
    }
  };

  const handleRelativeOption = (option: string) => {
    setRelativeOption(option);
    const now = new Date();
    let scheduledDate = new Date();

    switch (option) {
      case '1h':
        scheduledDate = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case '6h':
        scheduledDate = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        break;
      case '1d':
        scheduledDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case '3d':
        scheduledDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        break;
      case '1w':
        scheduledDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        return;
    }

    onScheduledChange(scheduledDate.toISOString().slice(0, 16));
  };

  const handleExactDateChange = (value: string) => {
    onScheduledChange(value);
  };

  const relativeOptions = [
    { value: '1h', label: 'En 1 hora' },
    { value: '6h', label: 'En 6 horas' },
    { value: '1d', label: 'En 1 día' },
    { value: '3d', label: 'En 3 días' },
    { value: '1w', label: 'En 1 semana' },
  ];

  return (
    <div className="space-y-3">
      {/* Mode Selection */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={publishMode === 'draft' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleModeChange('draft')}
          className="text-xs sm:text-sm px-3 py-1.5 h-auto"
        >
          Guardar borrador
        </Button>
        <Button
          type="button"
          variant={publishMode === 'publish' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleModeChange('publish')}
          className="text-xs sm:text-sm px-3 py-1.5 h-auto"
        >
          Publicar ahora
        </Button>
        <Button
          type="button"
          variant={publishMode === 'schedule' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleModeChange('schedule')}
          className="text-xs sm:text-sm px-3 py-1.5 h-auto"
        >
          Programar
        </Button>
      </div>

      {/* Schedule Options */}
      {publishMode === 'schedule' && (
        <div className="space-y-3 pt-2 border-t border-gray-200">
          {/* Schedule Type Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScheduleType('relative')}
              className={`flex-1 px-3 py-1.5 text-xs sm:text-sm rounded-lg border transition-all ${
                scheduleType === 'relative'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Relativa
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('exact')}
              className={`flex-1 px-3 py-1.5 text-xs sm:text-sm rounded-lg border transition-all ${
                scheduleType === 'exact'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Exacta
            </button>
          </div>

          {/* Relative Options */}
          {scheduleType === 'relative' && (
            <div className="flex flex-wrap gap-2">
              {relativeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleRelativeOption(option.value)}
                  className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg border transition-all ${
                    relativeOption === option.value
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {/* Exact Date/Time */}
          {scheduleType === 'exact' && (
            <div>
              <input
                type="datetime-local"
                value={scheduledPublishAt}
                onChange={(e) => handleExactDateChange(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          )}

          {/* Preview */}
          {scheduledPublishAt && (
            <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
              Se publicará el {new Date(scheduledPublishAt).toLocaleString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

