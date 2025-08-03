import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Alert, ScrollView, Linking } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Pedometer, DeviceMotion } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  Easing,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import MapView, { Marker } from 'react-native-maps';
import { Subscription } from 'expo-sensors/build/Pedometer';

const DAILY_GOAL = 10000;
const { width, height } = Dimensions.get('window');

function getProgress(steps: number) {
  return Math.min(steps / DAILY_GOAL, 1);
}

// Modern Circular Progress Component
function CircularProgress({ progress, size = 200 }: { progress: number; size?: number }) {
  const animatedProgress = useSharedValue(0);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 2000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
  }, [progress]);

  return (
    // Progress Circle
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#6366f1" />
            <Stop offset="50%" stopColor="#8b5cf6" />
            <Stop offset="100%" stopColor="#ec4899" />
          </SvgGradient>
          <SvgGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="rgba(99, 102, 241, 0.1)" />
            <Stop offset="100%" stopColor="rgba(139, 92, 246, 0.05)" />
          </SvgGradient>
        </Defs>
        {/* Background Circle */}
       
        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (progress * circumference)}
          fill="transparent"
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
}

// Weekly Progress Component
function WeeklyProgress() {
  const days = [
    { day: 'Mon', date: '16', completed: true },
    { day: 'Tue', date: '17', completed: true },
    { day: 'Wed', date: '18', completed: false },
    { day: 'Thu', date: '19', completed: true },
    { day: 'Fri', date: '20', completed: false },
    { day: 'Sat', date: '21', completed: true },
    { day: 'Today', date: '22', completed: true },
  ];

  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.weeklyProgressContainer}>
      <TouchableOpacity style={styles.weekSelector} onPress={toggleExpanded}>
        <Text style={styles.weekSelectorText}>This Week</Text>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#6366f1" />
      </TouchableOpacity>
      
      <View style={styles.weeklyDays}>
        {days.map((item, index) => (
          <View key={index} style={styles.dayContainer}>
            <View style={[
              styles.dayCircle,
              item.completed ? styles.dayCircleCompleted : styles.dayCircleIncomplete
            ]}>
              <Text style={[
                styles.dayNumber,
                item.completed ? styles.dayNumberCompleted : styles.dayNumberIncomplete
              ]}>
                {item.date}
              </Text>
            </View>
            <Text style={styles.dayLabel}>{item.day}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function StepCounter() {
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<string>('checking');
  const [currentStepCount, setCurrentStepCount] = useState<number>(0);
  const [todayStepCount, setTodayStepCount] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  
  const progress = getProgress(currentStepCount);
  
  const scaleValue = useSharedValue(0);
  const opacityValue = useSharedValue(0);
  const pulseValue = useSharedValue(1);
  const translateY = useSharedValue(0);
  const mapTranslateY = useSharedValue(-height * 0.4);

  useEffect(() => {
    scaleValue.value = withSpring(1, { damping: 15, stiffness: 150 });
    opacityValue.value = withTiming(1, { duration: 800 });
    
    // Add pulsing animation for the icon
    const pulseAnimation = () => {
      pulseValue.value = withTiming(1.05, { duration: 1500 }, () => {
        pulseValue.value = withTiming(1, { duration: 1500 }, pulseAnimation);
      });
    };
    pulseAnimation();
  }, []);

  // Enhanced pedometer initialization
  useEffect(() => {
    console.log('=== INITIALIZING PEDOMETER ===');
    
    const initializePedometer = async () => {
      try {
        // Check if pedometer is available
        const available = await Pedometer.isAvailableAsync();
        console.log('Pedometer available:', available);
        
        if (!available) {
          console.log('Pedometer not available on this device');
          setIsPedometerAvailable('no');
          return;
        }

        // Multiple permission request attempts for Samsung devices
        console.log('Requesting pedometer permissions (attempt 1)...');
        let { status } = await Pedometer.requestPermissionsAsync();
        console.log('Pedometer permission status (attempt 1):', status);
        
        // If first attempt fails, try again after a delay
        // if (status !== 'granted') {
        //   console.log('First attempt failed, trying again...');
        //   await new Promise(resolve => setTimeout(resolve, 1000));
        //   const result = await Pedometer.requestPermissionsAsync();
        //   status = result.status;
        //   console.log('Pedometer permission status (attempt 2):', status);
        // }
        
        // if (status !== 'granted') {
        //   console.log('Pedometer permission denied after multiple attempts');
        //   setIsPedometerAvailable('no');
        //   Alert.alert(
        //     'Fysisk aktivitet behörighet krävs',
        //     'För att räkna steg behöver appen tillgång till "Fysisk aktivitet".\n\n1. Gå till Inställningar > Integritet > Behörighetshanterare > Fysisk aktivitet\n2. Hitta din app i listan och aktivera den\n3. Om appen inte syns, starta om appen och försök igen',
        //     [
        //       { text: 'Avbryt', style: 'cancel' },
        //       { 
        //         text: 'Öppna inställningar', 
        //         onPress: () => {
        //           Linking.openSettings().catch(() => {
        //             console.log('Could not open settings');
        //           });
        //         }
        //       },
        //       {
        //         text: 'Försök igen',
        //         onPress: () => {
        //           // Restart the initialization process
        //           setIsPedometerAvailable('checking');
        //           setTimeout(() => {
        //             initializePedometer();
        //           }, 500);
        //         }
        //       }
        //     ]
        //   );
        //   return;
        // }

        console.log('Pedometer permissions granted, initializing...');
        setIsPedometerAvailable('yes');
        
        // Get today's steps from start of day
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        
        try {
          const pastStepCountResult = await Pedometer.getStepCountAsync(start, end);
          console.log('Past step count:', pastStepCountResult.steps);
          setTodayStepCount(pastStepCountResult.steps);
          setCurrentStepCount(pastStepCountResult.steps);
        } catch (pastStepsError) {
          console.log('Could not get past steps:', pastStepsError);
          // Start from 0 if we can't get past steps
          setTodayStepCount(0);
          setCurrentStepCount(0);
        }
        
      } catch (error) {
        console.error('Pedometer initialization error:', error);
        setIsPedometerAvailable('no');
      }
    };

    initializePedometer();
  }, []);

  // Pedometer step watching - only starts after permission is granted
  useEffect(() => {
    let subscription: Subscription | null = null;
  
    if (isPedometerAvailable === 'yes') {
      console.log('Starting step count watching...');
      
      try {
        subscription = Pedometer.watchStepCount(result => {
          console.log('Step count update:', result.steps);
          setCurrentStepCount(todayStepCount + result.steps);
        });
        
        console.log('Step counting active - start walking!');
      } catch (error) {
        console.error('Error starting step watching:', error);
      }
    }
  
    return () => {
      if (subscription) {
        console.log('Cleaning up pedometer subscription');
        subscription.remove();
      }
    };
  }, [isPedometerAvailable, todayStepCount]);

  // Request location permissions and get user location
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
          setLocationPermission(true);
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setUserLocation(location);
        } else {
          Alert.alert(
            'Location Permission Required',
            'This app needs location access to show your position on the map.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert(
          'Location Error',
          'Unable to get your location. Please check your location settings.',
          [{ text: 'OK' }]
        );
      }
    };

    requestLocationPermission();
  }, []);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    opacity: opacityValue.value,
  }));

  const animatedMainStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedMapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mapTranslateY.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  const progressPercentage = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="footsteps" size={24} color="#6366f1" />
        </View>
        <Text style={styles.headerTitle}>Home</Text>
     
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {/* Map Background */}
      <Animated.View style={[styles.mapContainer, animatedMapStyle]}>
        <MapView
          key={userLocation ? 'user-location' : 'default-location'}
          style={styles.map}
          initialRegion={{
            latitude: userLocation?.coords.latitude || 37.78825,
            longitude: userLocation?.coords.longitude || -122.4324,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          region={userLocation ? {
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          } : undefined}
          showsUserLocation={locationPermission}
          showsMyLocationButton={locationPermission}
        >
          
        </MapView>
        {!userLocation && (
          <View style={styles.locationLoading}>
            <Text style={styles.locationLoadingText}>Getting your location...</Text>
          </View>
        )}
      </Animated.View>

      {/* Main Content */}   
      <Animated.View style={[styles.mainContent, animatedMainStyle]}>
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
          {/* Step Counter Card */}
          <Animated.View style={[styles.stepCard, animatedContainerStyle]}>
            <View style={styles.progressContainer}>
              <CircularProgress progress={progress} size={220} />
              <View style={styles.centerContent}>
                <Text style={styles.stepsLabel}>Steps</Text>
                <Text style={styles.steps}>{currentStepCount.toLocaleString()}</Text>
                <Text style={styles.goal}>/{DAILY_GOAL.toLocaleString()}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Daily Statistics */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="time" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.statValue}>1h 14m</Text>
              <Text style={styles.statLabel}>time</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="flame" size={24} color="#ef4444" />
              </View>
              <Text style={styles.statValue}>360</Text>
              <Text style={styles.statLabel}>kcal</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="location" size={24} color="#10b981" />
              </View>
              <Text style={styles.statValue}>5.46</Text>
              <Text style={styles.statLabel}>km</Text>
            </View>
          </View>

          {/* Weekly Progress */}
          <WeeklyProgress />

        </ScrollView>
      </Animated.View>

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
    zIndex: 1000,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    zIndex: 1,
  },
  map: {
    flex: 1,
  },
  mainContent: {
    marginTop: 20,
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    zIndex: 2,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  stepCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 40,
    marginBottom: 32,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.08)',
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsLabel: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  steps: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1f2937',
    lineHeight: 52,
    letterSpacing: -1,
  },
  goal: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.06)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.12)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  weeklyProgressContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.06)',
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  weekSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginRight: 4,
  },
  weeklyDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayContainer: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dayCircleCompleted: {
    backgroundColor: '#6366f1',
  },
  dayCircleIncomplete: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayNumberCompleted: {
    color: 'white',
  },
  dayNumberIncomplete: {
    color: '#6366f1',
  },
  dayLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  locationLoading: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  locationLoadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});