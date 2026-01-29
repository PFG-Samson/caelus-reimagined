import OpenAI from 'openai';

export interface WeatherSummaryInput {
  current: {
    temp: number;
    conditions: string;
    windSpeed: number;
    humidity: number;
    pressure: number;
    location: string;
  };
  forecast?: Array<{
    date: string;
    temp: number;
    conditions: string;
  }>;
  airQuality?: {
    aqi: number;
    pm25: number;
    pm10: number;
  };
}

export interface AIProvider {
  generateSummary(weatherData: WeatherSummaryInput): Promise<string>;
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI | null = null;

  constructor() {
    const apiKey = import.meta.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
    }
  }

  async generateSummary(weatherData: WeatherSummaryInput): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured');
    }

    const forecastText = weatherData.forecast
      ? `Next few periods: ${weatherData.forecast.map(f => `${f.conditions} ${f.temp}°C`).join(', ')}`
      : '';

    const airQualityText = weatherData.airQuality
      ? `Air Quality: AQI ${weatherData.airQuality.aqi}, PM2.5: ${weatherData.airQuality.pm25} μg/m³`
      : '';

    try {
      const completion = await this.client.chat.completions.create({
        model: import.meta.env.VITE_OPENAI_MODEL || "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: "You are a professional weather analyst providing detailed explanations of weather conditions. Write exactly 3-4 sentences that explain the current weather situation, what users should expect, and practical implications. Be informative yet accessible, focusing on helping users understand the weather data they're seeing in the panel."
        }, {
          role: "user",
          content: `Analyze and explain the weather conditions for ${weatherData.current.location}:

Current Conditions:
- Temperature: ${weatherData.current.temp}°C
- Weather: ${weatherData.current.conditions}
- Wind: ${weatherData.current.windSpeed} m/s
- Humidity: ${weatherData.current.humidity}%
- Pressure: ${weatherData.current.pressure} hPa

${forecastText}
${airQualityText}

Provide a comprehensive explanation that helps users understand what these conditions mean and what to expect.`
        }],
        temperature: 0.6,
        max_tokens: 180
      });

      return completion.choices[0]?.message?.content || "Weather summary unavailable.";
    } catch (error) {
      console.error("OpenAI error:", error);
      throw error;
    }
  }
}

class HuggingFaceProvider implements AIProvider {
  private apiKey: string | null = null;
  private endpoint: string;

  constructor() {
    this.apiKey = import.meta.env.HF_TOKEN;
    // Using a capable model for text generation
    this.endpoint = import.meta.env.VITE_HUGGINGFACE_MODEL || "facebook/blenderbot-400M-distill";
  }

  async generateSummary(weatherData: WeatherSummaryInput): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const forecastText = weatherData.forecast
      ? `Forecast: ${weatherData.forecast.map(f => `${f.conditions} ${f.temp}°C`).join(', ')}`
      : '';

    const prompt = `Weather Analysis for ${weatherData.current.location}:

Current conditions show ${weatherData.current.temp}°C with ${weatherData.current.conditions}. Wind is ${weatherData.current.windSpeed} m/s, humidity at ${weatherData.current.humidity}%, and pressure is ${weatherData.current.pressure} hPa. ${forecastText}

Detailed weather explanation (3-4 sentences):`;

    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${this.endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: 220,
            temperature: 0.6,
            do_sample: true,
            return_full_text: false,
            repetition_penalty: 1.1
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const result = await response.json();

      if (Array.isArray(result) && result[0]?.generated_text) {
        return result[0].generated_text.trim();
      } else if (result.generated_text) {
        return result.generated_text.trim();
      }

      throw new Error('Unexpected response format from Hugging Face');
    } catch (error) {
      console.error("Hugging Face error:", error);
      throw error;
    }
  }
}

class FallbackProvider implements AIProvider {
  async generateSummary(weatherData: WeatherSummaryInput): Promise<string> {
    const { current, forecast, airQuality } = weatherData;

    // Start with current conditions explanation
    let summary = `The current weather in ${current.location} shows ${current.temp}°C with ${current.conditions}. `;

    // Explain temperature feel
    if (current.temp > 25) {
      summary += "This warm temperature ";
    } else if (current.temp < 10) {
      summary += "These cool conditions ";
    } else {
      summary += "This moderate temperature ";
    }

    // Add humidity context for comfort
    if (current.humidity > 70) {
      summary += `combined with high humidity (${current.humidity}%) will make it feel quite muggy and potentially uncomfortable. `;
    } else if (current.humidity < 40) {
      summary += `with low humidity (${current.humidity}%) creates dry, crisp conditions that may feel more comfortable than the actual temperature suggests. `;
    } else {
      summary += `with moderate humidity (${current.humidity}%) should feel relatively comfortable. `;
    }

    // Explain wind conditions and their impact
    if (current.windSpeed > 8) {
      summary += `Strong winds at ${current.windSpeed} m/s will create breezy conditions that help with cooling but may affect outdoor activities. `;
    } else if (current.windSpeed > 3) {
      summary += `Light winds of ${current.windSpeed} m/s provide a gentle breeze that enhances comfort. `;
    } else {
      summary += "Calm wind conditions with minimal air movement may make temperatures feel more intense. ";
    }

    // Add pressure context if significant
    if (current.pressure > 1020) {
      summary += "High atmospheric pressure suggests stable, clear weather conditions.";
    } else if (current.pressure < 1000) {
      summary += "Low pressure indicates potential for changing weather patterns or storms.";
    } else {
      // Add forecast context instead
      if (forecast && forecast.length > 0) {
        const nextConditions = forecast[0].conditions;
        summary += `Looking ahead, expect ${nextConditions} in the coming hours.`;
      }
    }

    return summary;
  }
}

export class WeatherAIService {
  private providers: AIProvider[] = [];
  private cache = new Map<string, { summary: string; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor() {
    // Add providers in order of preference
    this.providers.push(new OpenAIProvider());
    this.providers.push(new HuggingFaceProvider());
    this.providers.push(new FallbackProvider());

    // Clean cache every 15 minutes
    setInterval(() => this.cleanCache(), 15 * 60 * 1000);
  }

  async generateWeatherSummary(weatherData: WeatherSummaryInput): Promise<string> {
    // Create cache key from location and basic weather data
    const cacheKey = `${weatherData.current.location}-${weatherData.current.temp}-${weatherData.current.conditions}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.summary;
    }

    // Try providers in order until one succeeds
    for (const provider of this.providers) {
      try {
        const summary = await provider.generateSummary(weatherData);

        // Cache the result
        this.cache.set(cacheKey, {
          summary,
          timestamp: Date.now()
        });

        return summary;
      } catch (error) {
        console.warn(`Provider failed, trying next:`, error);
        continue;
      }
    }

    // This shouldn't happen since FallbackProvider never throws
    return "Weather summary currently unavailable.";
  }

  // Clear old cache entries
  private cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

}

// Export singleton instance
export const weatherAI = new WeatherAIService();