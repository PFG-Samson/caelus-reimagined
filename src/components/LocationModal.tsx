// src/components/LocationModal.tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationFound: (coords: { lat: number; lng: number }) => void;
}

export default function LocationModal({ isOpen, onClose, onLocationFound }: LocationModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setStatus("loading");
      setError("");

      if (!navigator.geolocation) {
        setStatus("error");
        setError("Geolocation is not supported by this browser.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStatus("success");
          onLocationFound({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setTimeout(() => onClose(), 1200); // auto-close after showing success
        },
        (err) => {
          setStatus("error");
          setError(err.message);
        },
        { enableHighAccuracy: true }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl w-[300px] p-4 text-center text-white"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Locate Me</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          {status === "loading" && <p>📡 Locating you...</p>}
          {status === "success" && <p>✅ Location found!</p>}
          {status === "error" && (
            <p className="text-red-300">
              ❌ Failed to get location<br />{error}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
