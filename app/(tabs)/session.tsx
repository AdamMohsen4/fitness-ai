import { Platform, StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome6 } from '@expo/vector-icons';
import { PanGestureHandler, PanGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, useAnimatedGestureHandler, useAnimatedStyle, withSpring, withTiming, interpolate, Extrapolate } from 'react-native-reanimated';

import MapView from 'react-native-maps';
import { useEffect, useState } from 'react';
import { getCurrentPositionAsync, requestForegroundPermissionsAsync } from 'expo-location';


export default function TabTwoScreen() {
  const [location, setLocation] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [sessionData, setSessionData] = useState({
    steps: 0,
    time: '0h 0m',
    calories: 0,
    distance: 0.0
  });
  
  const screenHeight = Dimensions.get('window').height;
  const cardHeight = 280;
  const translateY = useSharedValue(0);
  const context = useSharedValue(0);

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (!isSessionActive) {
      translateY.value = 0;
    }
  }, [isSessionActive]);

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

  const startSession = () => {
    setIsSessionActive(true);
    // Initialize session data with mock values (in real app, these would be tracked)
    setSessionData({
      steps: 4805,
      time: '1h 14m',
      calories: 360,
      distance: 5.46
    });
  };

  const stopSession = () => {
    // Reset the animation value before changing state
    translateY.value = 0;
    setIsSessionActive(false);
    setSessionData({
      steps: 0,
      time: '0h 0m',
      calories: 0,
      distance: 0.0
    });
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

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx: any) => {
      try {
        const newTranslateY = ctx.startY + event.translationY;
        translateY.value = Math.max(0, newTranslateY);
      } catch (error) {
        // Reset to safe state if error occurs
        translateY.value = 0;
      }
    },
    onEnd: (event) => {
      try {
        const shouldDismiss = event.translationY > 100 || (event.translationY > 50 && event.velocityY > 800);
        
        if (shouldDismiss) {
          translateY.value = withTiming(cardHeight, {
            duration: 300,
          }, (finished) => {
            if (finished) {
              runOnJS(setIsSessionActive)(false);
            }
          });
        } else {
          translateY.value = withSpring(0, {
            damping: 20,
            stiffness: 200,
          });
        }
      } catch (error) {
        // Reset to safe state if error occurs
        translateY.value = 0;
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, cardHeight / 2],
      [1, 0.8],
      Extrapolate.CLAMP
    );

    const scale = interpolate(
      translateY.value,
      [0, cardHeight / 2],
      [1, 0.95],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale }
      ],
      opacity: opacity,
    };
  });


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="footsteps" size={24} color="#6366f1" />
        </View>
        <Text style={styles.headerTitle}>Session</Text>
        <TouchableOpacity style={styles.menuButton} >
          <Ionicons name="ellipsis-vertical" size={24} color="#1f2937" />
        
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.mapView}
          initialRegion={mapRegion}
          region={mapRegion}
          showsUserLocation={hasPermission}
          showsMyLocationButton={hasPermission}
        />
        
        {!isSessionActive ? (
          <TouchableOpacity style={styles.startButton} onPress={startSession}>
            <Text style={styles.startButtonText}>Start Session</Text>
          </TouchableOpacity>
                ) : (
          <Animated.View 
            style={[
              styles.fitnessCard,
              animatedStyle
            ]}
          >
            {/* Pull handle */}
            <PanGestureHandler 
              onGestureEvent={gestureHandler}
              activeOffsetY={[-10, 10]}
              failOffsetX={[-50, 50]}
            >
              <Animated.View style={styles.pullHandle}>
                <View style={{ width: 30, height: 4, backgroundColor: '#d1d5db', borderRadius: 2 }} />
              </Animated.View>
            </PanGestureHandler>
            
            {/* Metrics Section */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricColumn}>
                <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
                  <FontAwesome6 name="person-running" size={20} color="#1d4ed8" />
                </View>
                <Text style={styles.metricValue}>{sessionData.steps.toLocaleString()}</Text>
                <Text style={styles.metricLabel}>steps</Text>
              </View>
              
              <View style={styles.metricColumn}>
                <View style={[styles.iconContainer, { backgroundColor: '#fed7aa' }]}>
                  <FontAwesome6 name="clock" size={20} color="#ea580c" />
                </View>
                <Text style={styles.metricValue}>{sessionData.time}</Text>
                <Text style={styles.metricLabel}>time</Text>
              </View>
              
              <View style={styles.metricColumn}>
                <View style={[styles.iconContainer, { backgroundColor: '#fecaca' }]}>
                  <FontAwesome6 name="fire" size={20} color="#dc2626" />
                </View>
                <Text style={styles.metricValue}>{sessionData.calories}</Text>
                <Text style={styles.metricLabel}>kcal</Text>
              </View>
              
              <View style={styles.metricColumn}>
                <View style={[styles.iconContainer, { backgroundColor: '#bbf7d0' }]}>
                  <FontAwesome6 name="location-dot" size={20} color="#16a34a" />
                </View>
                <Text style={styles.metricValue}>{sessionData.distance}</Text>
                <Text style={styles.metricLabel}>km</Text>
              </View>
            </View>
            
            {/* Stop Button */}
            <TouchableOpacity style={styles.stopButton} onPress={stopSession}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
 
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    alignSelf: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
  
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapView: {
    flex: 1,
  },
  startButton: {
    position: 'absolute',
    width: '70%',
    bottom: 30,
    alignSelf: 'center',
    zIndex: 1000,
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  fitnessCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  pullHandle: {
    width: 60,
    height: 30,
    backgroundColor: '#f3f4f6',
    borderRadius: 15,
    alignSelf: 'center',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 15,
    color: 'black',
    textTransform: 'lowercase',
  },
  stopButton: {
    backgroundColor: '#e9d5fe',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'center',
  },
  stopButtonText: {
    color: '#7c3aed',
    fontWeight: 'bold',
    fontSize: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
});
