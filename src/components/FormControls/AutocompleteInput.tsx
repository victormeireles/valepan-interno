'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  strict?: boolean;
}

export default function AutocompleteInput({
  value,
  onChange,
  onSelect,
  options,
  placeholder = 'Digite para buscar...',
  required = false,
  disabled = false,
  label,
  strict = false,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  // Estados locais para controlar o input visual independentemente do valor real (ID)
  const [inputValue, setInputValue] = useState(value);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sincronizar input visual quando value externo muda
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Validação strict ao fechar ou sair
  const validateStrict = useCallback((currentValue: string) => {
    if (!strict || !currentValue) return;
    
    const match = options.find(opt => opt.toLowerCase() === currentValue.toLowerCase());
    if (match) {
      if (match !== currentValue) {
        onChange(match);
        setInputValue(match);
      }
    } else {
      onChange('');
      setInputValue('');
    }
  }, [strict, options, onChange]);

  useEffect(() => {
    // Filtrar baseado no que está sendo digitado visualmente
    if (inputValue) {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
    setHighlightedIndex(-1);
  }, [inputValue, options]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue); // Propaga a mudança para cima também
    setIsOpen(true);
  };

  const handleOptionSelect = (option: string) => {
    setInputValue(option);
    onChange(option);
    onSelect?.(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
    // Manter foco ou blur dependendo da UX desejada, aqui optamos por fechar
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
        } else if (filteredOptions.length > 0) {
           // Se der enter sem destacar nenhum, seleciona o primeiro se houver texto
           handleOptionSelect(filteredOptions[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
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

  // Click Outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
        if (strict && inputRef.current) {
          validateStrict(inputRef.current.value);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [strict, options, validateStrict]); 

  return (
    <div ref={containerRef} className="relative w-full group">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
          <span className={`material-icons text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animation-fade-in-down">
          <ul
            ref={listRef}
            className="max-h-60 overflow-auto py-1"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <li
                  key={`${option}-${index}`}
                  className={`cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors ${
                    index === highlightedIndex
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onMouseDown={(e) => e.preventDefault()} // Previne blur ao clicar
                  onClick={() => handleOptionSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {option}
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-gray-400 text-center italic">
                Nenhum resultado encontrado
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
