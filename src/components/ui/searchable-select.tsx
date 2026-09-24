'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione…',
  searchPlaceholder = 'Buscar…',
  emptyLabel = 'Nenhum resultado',
  disabled,
  className,
  style,
  title
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      setHighlight(0);
      const raf = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [open]);

  function select(v: string) {
    onChange(v);
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) select(opt.value);
    }
  }

  return (
    <div className="searchable-select" style={style} ref={rootRef} title={title}>
      <button
        type="button"
        className={'searchable-select-trigger' + (className ? ' ' + className : '')}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={'searchable-select-value' + (selected ? '' : ' muted')}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="searchable-select-caret">▾</span>
      </button>
      {open && (
        <div className="searchable-select-panel">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            className="searchable-select-search"
          />
          <div className="searchable-select-options">
            {filtered.length === 0 && <div className="searchable-select-empty">{emptyLabel}</div>}
            {filtered.map((o, i) => (
              <div
                key={o.value}
                className={
                  'searchable-select-option' +
                  (o.value === value ? ' selected' : '') +
                  (i === highlight ? ' highlighted' : '')
                }
                onMouseEnter={() => setHighlight(i)}
                onClick={() => select(o.value)}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
