'use client';
import { DayOfWeekName, ScheduleFrequencyType, ScheduleInput } from '@/types/api';
import { SearchableSelect } from '@/components/ui/searchable-select';

const frequencyOptions: { value: ScheduleFrequencyType; label: string }[] = [
  { value: 'Daily', label: 'Diária' },
  { value: 'Weekly', label: 'Semanal' },
  { value: 'Monthly', label: 'Mensal' }
];

const weekDayOptions: { value: DayOfWeekName; label: string }[] = [
  { value: 'Monday', label: 'Segunda' },
  { value: 'Tuesday', label: 'Terça' },
  { value: 'Wednesday', label: 'Quarta' },
  { value: 'Thursday', label: 'Quinta' },
  { value: 'Friday', label: 'Sexta' },
  { value: 'Saturday', label: 'Sábado' },
  { value: 'Sunday', label: 'Domingo' }
];

export function emptySchedule(executionOrder: number): ScheduleInput {
  return { frequencyType: 'Daily', intervalValue: 1, weekDay: null, dayOfMonth: null, timeOfDay: '08:00', executionOrder };
}

export function ScheduleEditor({
  schedules,
  onChange,
  addLabel = '+ Adicionar horário'
}: {
  schedules: ScheduleInput[];
  onChange: (schedules: ScheduleInput[]) => void;
  addLabel?: string;
}) {
  function updateAt(index: number, patch: Partial<ScheduleInput>) {
    onChange(schedules.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function add() {
    onChange([...schedules, emptySchedule(schedules.length)]);
  }

  function remove(index: number) {
    onChange(schedules.filter((_, i) => i !== index).map((s, i) => ({ ...s, executionOrder: i })));
  }

  return (
    <div>
      {schedules.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchableSelect
            value={s.frequencyType}
            onChange={(v) => updateAt(i, { frequencyType: v as ScheduleFrequencyType, weekDay: null, dayOfMonth: null })}
            options={frequencyOptions}
          />

          <span className="muted" style={{ fontSize: 12 }}>
            a cada
          </span>
          <input
            type="number"
            min={1}
            style={{ width: 60 }}
            value={s.intervalValue}
            onChange={(e) => updateAt(i, { intervalValue: Number(e.target.value) })}
          />

          {s.frequencyType === 'Weekly' && (
            <SearchableSelect
              value={s.weekDay ?? ''}
              onChange={(v) => updateAt(i, { weekDay: v as DayOfWeekName })}
              placeholder="Dia da semana"
              options={weekDayOptions}
            />
          )}

          {s.frequencyType === 'Monthly' && (
            <input
              type="number"
              min={1}
              max={31}
              placeholder="Dia do mês"
              style={{ width: 100 }}
              value={s.dayOfMonth ?? ''}
              onChange={(e) => updateAt(i, { dayOfMonth: Number(e.target.value) })}
            />
          )}

          <input type="time" value={s.timeOfDay} onChange={(e) => updateAt(i, { timeOfDay: e.target.value })} />

          <button type="button" className="btn btn-secondary btn-sm" onClick={() => remove(i)}>
            Remover
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={add}>
        {addLabel}
      </button>
    </div>
  );
}
