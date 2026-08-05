"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

interface LocationSuggestion extends LocationCoordinates {
  label: string;
}

interface Props {
  id?: string;
  value: string;
  coordinates: LocationCoordinates | null;
  onChange: (value: string, coordinates: LocationCoordinates | null) => void;
  placeholder?: string;
  className?: string;
}

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;

export default function LocationAutocomplete({
  id,
  value,
  coordinates,
  onChange,
  placeholder,
  className,
}: Props) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fecha o dropdown ao clicar fora do campo/lista
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const fetchSuggestions = (query: string) => {
    abortRef.current?.abort();

    if (query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&addressdetails=0&limit=5`;

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: any[]) => {
        const results: LocationSuggestion[] = data.map((item) => ({
          label: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setHighlightedIndex(-1);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Erro ao procurar localização:", err);
        }
      })
      .finally(() => setIsLoading(false));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    // Qualquer edição manual invalida as coordenadas anteriores,
    // até haver uma nova seleção da lista.
    onChange(next, null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(next), DEBOUNCE_MS);
  };

  const handleSelect = (suggestion: LocationSuggestion) => {
    onChange(suggestion.label, { lat: suggestion.lat, lng: suggestion.lng });
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto border border-gray-200 bg-white shadow-lg">
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.lat}-${suggestion.lng}-${index}`}>
              <button
                type="button"
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full flex items-start gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  highlightedIndex === index ? "bg-gray-100" : "bg-white"
                }`}
              >
                <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                <span className="text-gray-700">{suggestion.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-1 text-[10px] text-gray-400">
        Dados de localização © colaboradores do OpenStreetMap
        {coordinates && " · localização confirmada"}
      </p>
    </div>
  );
}