import { useQuery } from '@tanstack/react-query';
import { InsightsResponse, ZoneData } from '@/types/intelligence';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchInsights(lat: number, lon: number): Promise<InsightsResponse> {
  const response = await fetch(`${API_BASE}/api/insights?lat=${lat}&lon=${lon}`);
  if (!response.ok) {
    throw new Error('Failed to fetch intelligence data');
  }
  return response.json();
}

export function useIntelligence(lat: number | null, lon: number | null) {
  return useQuery({
    queryKey: ['insights', lat, lon],
    queryFn: () => fetchInsights(lat!, lon!),
    enabled: lat !== null && lon !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

async function fetchZones(): Promise<ZoneData[]> {
  const response = await fetch(`${API_BASE}/api/zones`);
  if (!response.ok) {
    throw new Error('Failed to fetch zones');
  }
  return response.json();
}

export function useZones() {
  return useQuery({
    queryKey: ['zones'],
    queryFn: fetchZones,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

