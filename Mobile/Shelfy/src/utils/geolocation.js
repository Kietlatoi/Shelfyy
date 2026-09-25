import * as Location from 'expo-location';

const DEFAULT_LOCATION = { lat: 10.7769, lon: 106.7009, isFallback: true };

export async function getCurrentLocation() {
  try {
    if (!(await Location.hasServicesEnabledAsync())) {
      return { ...DEFAULT_LOCATION };
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { ...DEFAULT_LOCATION };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      lat: location.coords.latitude,
      lon: location.coords.longitude,
      isFallback: false,
    };
  } catch {
    // GPS can be unavailable on emulators or indoors. The weather card
    // explains the fallback without raising a development LogBox warning.
    return { ...DEFAULT_LOCATION };
  }
}
