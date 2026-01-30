/**
 * Webcam Service
 * Integrates with Windy Webcams API (formerly Webcams.travel)
 */

export interface Webcam {
    webcamId: number;
    status: "active" | "inactive";
    title: string;
    viewCount: number;
    lastUpdatedOn: string;
    categories: Array<{ id: string; name: string }>;
    images: {
        current: {
            icon: string;
            thumbnail: string;
            preview: string;
            toenail: string;
        };
        sizes: {
            icon: { width: number; height: number };
            thumbnail: { width: number; height: number };
            preview: { width: number; height: number };
        };
        daylight?: {
            icon: string;
            thumbnail: string;
            preview: string;
        };
    };
    location: {
        city: string;
        region: string;
        region_code: string;
        country: string;
        country_code: string;
        continent: string;
        continent_code: string;
        latitude: number;
        longitude: number;
    };
    player: {
        live?: string;
        day?: string;
        month?: string;
        year?: string;
        lifetime?: string;
    };
    urls: {
        detail: string;
        edit: string;
    };
}

const WINDY_KEY = import.meta.env.VITE_WINDY_KEY;
const V3_ENDPOINT = "https://api.windy.com/webcams/api/v3/webcams";

export const webcamService = {
    /**
     * Fetch webcams within a specific bounding box
     * NOTE: V3 bbox order is North, East, South, West
     */
    async getWebcamsInBounds(
        south: number,
        west: number,
        north: number,
        east: number,
        limit: number = 50
    ): Promise<Webcam[]> {
        if (!WINDY_KEY) {
            console.warn("Windy API key missing. Returning fallback webcams.");
            return this.getFallbackWebcams() as any;
        }

        try {
            // V3: ?bbox={north},{east},{south},{west}
            const url = `${V3_ENDPOINT}?bbox=${north},${east},${south},${west}&limit=${limit}&include=categories,images,location,player,urls`;

            const response = await fetch(url, {
                headers: {
                    "X-WINDY-API-KEY": WINDY_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`Windy API error: ${response.status}`);
            }

            const data = await response.json();
            // Refined V3 response: { total: number, webcams: Webcam[] }
            if (data && Array.isArray(data.webcams)) {
                return data.webcams;
            }
            return [];
        } catch (error) {
            console.error("Error fetching webcams:", error);
            return [];
        }
    },

    /**
     * Fetch webcams nearby a specific point
     */
    async getNearbyWebcams(lat: number, lon: number, radius: number = 50): Promise<Webcam[]> {
        if (!WINDY_KEY) return this.getFallbackWebcams() as any;

        try {
            const url = `${V3_ENDPOINT}?nearby=${lat},${lon},${radius}&include=categories,images,location,player,urls`;

            const response = await fetch(url, {
                headers: {
                    "X-WINDY-API-KEY": WINDY_KEY
                }
            });

            if (!response.ok) throw new Error(`Windy API error: ${response.status}`);

            const data = await response.json();
            if (data && Array.isArray(data.webcams)) {
                return data.webcams;
            }
            return [];
        } catch (error) {
            console.error("Error fetching webcams:", error);
            return [];
        }
    },

    /**
     * Fallback data for testing/demo
     */
    getFallbackWebcams() {
        return [
            {
                webcamId: 1,
                status: "active",
                title: "New York Times Square",
                images: {
                    current: {
                        icon: "https://images-webcams.windy.com/11/1449000111/current/icon/1449000111.jpg",
                        thumbnail: "https://images-webcams.windy.com/11/1449000111/current/thumbnail/1449000111.jpg",
                        preview: "https://images-webcams.windy.com/11/1449000111/current/preview/1449000111.jpg"
                    },
                    sizes: {
                        icon: { width: 48, height: 48 },
                        thumbnail: { width: 100, height: 100 },
                        preview: { width: 640, height: 480 }
                    }
                },
                location: {
                    city: "New York",
                    region: "New York",
                    country: "United States",
                    latitude: 40.7580,
                    longitude: -73.9855
                },
                player: {
                    live: "https://www.youtube.com/embed/1-iS7LArMPA"
                }
            },
            {
                webcamId: 2,
                status: "active",
                title: "London - Tower Bridge",
                images: {
                    current: {
                        icon: "https://images-webcams.windy.com/12/1171800112/current/icon/1171800112.jpg",
                        thumbnail: "https://images-webcams.windy.com/12/1171800112/current/thumbnail/1171800112.jpg",
                        preview: "https://images-webcams.windy.com/12/1171800112/current/preview/1171800112.jpg"
                    },
                    sizes: {
                        icon: { width: 48, height: 48 },
                        thumbnail: { width: 100, height: 100 },
                        preview: { width: 640, height: 480 }
                    }
                },
                location: {
                    city: "London",
                    region: "England",
                    country: "United Kingdom",
                    latitude: 51.5055,
                    longitude: -0.0754
                },
                player: {
                    live: "https://www.youtube.com/embed/n3pA_nSrk3E"
                }
            }
        ];
    }
};
