// src/services/airportService.ts

export interface Airport {
    name: string;
    type: 'large_airport' | 'medium_airport';
    lat: number;
    lon: number;
    elev: number;
    icao: string;
    iata: string;
}

class AirportService {
    private airports: Airport[] | null = null;
    private isLoading = false;

    async getAirports(): Promise<Airport[]> {
        if (this.airports) return this.airports;
        if (this.isLoading) {
            // Wait for existing load to finish
            return new Promise((resolve) => {
                const check = setInterval(() => {
                    if (this.airports) {
                        clearInterval(check);
                        resolve(this.airports);
                    }
                }, 100);
            });
        }

        this.isLoading = true;
        try {
            const response = await fetch('/data/airports.json');
            if (!response.ok) throw new Error('Failed to fetch airport data');
            this.airports = await response.json();
            return this.airports || [];
        } catch (error) {
            console.error('Error loading airports:', error);
            return [];
        } finally {
            this.isLoading = false;
        }
    }

    async getAirportByCode(code: string): Promise<Airport | undefined> {
        const airports = await this.getAirports();
        return airports.find(a => a.icao === code || a.iata === code);
    }
}

export const airportService = new AirportService();
