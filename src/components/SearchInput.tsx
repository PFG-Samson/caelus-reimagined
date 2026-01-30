import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
    onResultSelect: (lat: number, lon: number) => void;
    className?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ onResultSelect, className }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = async (val: string) => {
        setQuery(val);
        if (val.length < 3) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5`
            );
            const data = await response.json();
            setResults(data);
            setShowResults(true);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={containerRef} className={cn("relative w-64 md:w-80", className)}>
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 group-focus-within:text-white transition-colors" />
                <Input
                    type="text"
                    placeholder="Search location..."
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => query.length >= 3 && setShowResults(true)}
                    className="pl-9 bg-black/40 backdrop-blur-md border-2 border-white/30 text-white placeholder:text-white/40 focus:border-white/60 focus:bg-black/60 transition-all rounded-full h-10 shadow-lg"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-white/50" />
                )}
            </div>

            {showResults && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <ul className="py-2">
                        {results.map((result, idx) => (
                            <li
                                key={idx}
                                className="px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors text-sm text-white/90"
                                onClick={() => {
                                    onResultSelect(parseFloat(result.lat), parseFloat(result.lon));
                                    setQuery(result.display_name);
                                    setShowResults(false);
                                }}
                            >
                                <div className="font-medium truncate">{result.display_name.split(',')[0]}</div>
                                <div className="text-xs text-white/40 truncate">{result.display_name.split(',').slice(1).join(',').trim()}</div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchInput;
