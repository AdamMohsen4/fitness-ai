import { Platform, StyleSheet, Text, View } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

import MapView from 'react-native-maps';
import { useEffect, useState } from 'react';
import { getCurrentPositionAsync, requestForegroundPermissionsAsync } from 'expo-location';

export default function TabTwoScreen() {
  const [location, setLocation] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      // Request location permission first
      const { status } = await requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
        const location = await getCurrentPositionAsync({});
        setLocation(location);
      } else {
        console.log('Location permission denied');
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Default coordinates (San Francisco) if location is not available
  const defaultRegion = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // Use location if available, otherwise use default
  const mapRegion = location ? {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : defaultRegion;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Session</Text>
      <MapView
        style={{ width: '100%', height: '100%' }}
        initialRegion={mapRegion}
        region={mapRegion}
        showsUserLocation={hasPermission}
        showsMyLocationButton={hasPermission}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
