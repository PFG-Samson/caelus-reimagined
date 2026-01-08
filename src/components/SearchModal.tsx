import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onResultSelect: (lat: number, lon: number) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ open, onClose, onResultSelect }) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Nominatim search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white/60 backdrop-blur-lg border border-white/20 shadow-x1">
        <DialogHeader>
          <DialogTitle>Search Location</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Enter a place name or address"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>

        {results.length > 0 && (
          <ul className="max-h-48 overflow-y-auto">
            {results.map((place, idx) => (
              <li
                key={idx}
                className="cursor-pointer p-2 hover:bg-muted rounded"
                onClick={() => {
                  onResultSelect(parseFloat(place.lat), parseFloat(place.lon));
                  onClose();
                }}
              >
                {place.display_name}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SearchModal;
