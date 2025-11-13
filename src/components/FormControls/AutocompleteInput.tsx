'use client';

import { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
}

export default function AutocompleteInput({
  value,
  onChange,
  onSelect,
  options,
  placeholder = 'Digite para buscar...',
  required = false,
  disabled = false,
  label = 'Cliente',
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
    setHighlightedIndex(-1);
    if (document.activeElement === inputRef.current) {
      setIsOpen(true);
    }
  }, [value, options]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
  };

  const handleOptionSelect = (option: string) => {
    onChange(option);
    onSelect?.(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  // Scroll para o item destacado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [highlightedIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="mb-2 block text-sm font-semibold text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-800 bg-gray-900/60 px-4 py-3 text-sm text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-800 bg-gray-900 shadow-xl"
        >
          {filteredOptions.map((option, index) => (
            <li
              key={option}
              className={`cursor-pointer px-4 py-2 text-sm ${
                index === highlightedIndex
                  ? 'bg-blue-600/20 text-blue-200'
                  : 'text-gray-200 hover:bg-gray-800'
              }`}
              onClick={() => handleOptionSelect(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}

      {isOpen && filteredOptions.length === 0 && value && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-800 bg-gray-900 shadow-xl">
          <div className="px-4 py-3 text-sm text-gray-400">
            Nenhum resultado encontrado
          </div>
        </div>
      )}
    </div>
  );
}
