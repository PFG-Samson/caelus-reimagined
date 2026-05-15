import { useQuery } from '@tanstack/react-query';
import { InsightsResponse } from '@/types/intelligence';

async function fetchInsights(lat: number, lon: number): Promise<InsightsResponse> {
  const response = await fetch(`/api/insights?lat=${lat}&lon=${lon}`);
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
