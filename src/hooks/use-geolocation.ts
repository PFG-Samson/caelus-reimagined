// src/hooks/use-geolocation.ts
import { useState, useEffect, useRef, useCallback } from "react";

export interface GeolocationState {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    loading: boolean;
    error: string | null;
    permissionDenied: boolean;
    supported: boolean;
}

const initialState: GeolocationState = {
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: true,
    error: null,
    permissionDenied: false,
    supported: true,
};

/**
 * Hook that continuously tracks user's GPS location using watchPosition.
 * Starts tracking on mount, updates when position changes, cleans up on unmount.
 */
export function useGeolocation() {
    const [state, setState] = useState<GeolocationState>(initialState);
    const watchIdRef = useRef<number | null>(null);

    useEffect(() => {
        // Check if geolocation is supported
        if (!navigator.geolocation) {
            setState((prev) => ({
                ...prev,
                supported: false,
                loading: false,
                error: "Geolocation is not supported by your browser",
            }));
            return;
        }

        // Success callback - called whenever position updates
        const onSuccess = (position: GeolocationPosition) => {
            setState({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                loading: false,
                error: null,
                permissionDenied: false,
                supported: true,
            });
        };

        // Error callback
        const onError = (error: GeolocationPositionError) => {
            let errorMessage = "Unable to retrieve location";
            let permissionDenied = false;

            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = "Location permission denied";
                    permissionDenied = true;
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = "Location information unavailable";
                    break;
                case error.TIMEOUT:
                    errorMessage = "Location request timed out";
                    break;
            }

            setState((prev) => ({
                ...prev,
                loading: false,
                error: errorMessage,
                permissionDenied,
            }));
        };

        // Options for watchPosition
        const options: PositionOptions = {
            enableHighAccuracy: true,
            maximumAge: 10000, // Cache position for 10 seconds
            timeout: 30000, // 30 second timeout for each update
        };

        // Start watching position - this requests permission on first call
        watchIdRef.current = navigator.geolocation.watchPosition(
            onSuccess,
            onError,
            options
        );

        // Cleanup: stop watching when component unmounts
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, []);

    // Helper to check if we have a valid location
    const hasLocation = state.latitude !== null && state.longitude !== null;

    // Method to get current location coordinates
    const getCoordinates = useCallback(() => {
        if (hasLocation) {
            return { lat: state.latitude!, lng: state.longitude! };
        }
        return null;
    }, [hasLocation, state.latitude, state.longitude]);

    return {
        ...state,
        hasLocation,
        getCoordinates,
    };
}
