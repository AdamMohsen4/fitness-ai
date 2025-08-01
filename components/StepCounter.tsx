import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Pedometer } from 'expo-sensors';
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

const DAILY_GOAL = 6000;
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
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#backgroundGradient)"
          strokeWidth="12"
          fill="transparent"
        />
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
    { day: 'Fri', date: '20', completed: true },
    { day: 'Sat', date: '21', completed: true },
    { day: 'Today', date: '22', completed: true },
  ];

  return (
    <View style={styles.weeklyProgressContainer}>
      <View style={styles.weeklyHeader}>
        <Text style={styles.weeklyTitle}>Your Progress</Text>
        <TouchableOpacity style={styles.weekSelector}>
          <Text style={styles.weekSelectorText}>This Week</Text>
          <Ionicons name="chevron-down" size={16} color="#6366f1" />
        </TouchableOpacity>
      </View>
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
  const [currentStepCount, setCurrentStepCount] = useState<number>(4805);
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

  useEffect(() => {
    Pedometer.isAvailableAsync().then(
      (result: boolean) => setIsPedometerAvailable(result ? 'yes' : 'no'),
      () => setIsPedometerAvailable('no')
    );
  }, []);

  // Request location permissions and get user location
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        console.log('Requesting location permission...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('Location permission status:', status);
        
        if (status === 'granted') {
          setLocationPermission(true);
          console.log('Getting current position...');
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          console.log('Location obtained:', location.coords);
          setUserLocation(location);
        } else {
          console.log('Location permission denied');
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

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startY = translateY.value;
    },
    onActive: (event, context: any) => {
      const newTranslateY = context.startY + event.translationY;
      translateY.value = Math.max(0, Math.min(newTranslateY, height * 0.4));
      
      // Update map position
      const mapProgress = interpolate(
        translateY.value,
        [0, height * 0.4],
        [-height * 0.4, 0],
        Extrapolate.CLAMP
      );
      mapTranslateY.value = mapProgress;
    },
    onEnd: () => {
      if (translateY.value > height * 0.2) {
        translateY.value = withSpring(height * 0.4, { damping: 20, stiffness: 100 });
        mapTranslateY.value = withSpring(0, { damping: 20, stiffness: 100 });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 100 });
        mapTranslateY.value = withSpring(-height * 0.4, { damping: 20, stiffness: 100 });
      }
    },
  });

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
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.mainContent, animatedMainStyle]}>
          <View style={styles.pullIndicator}>
            <View style={styles.pullBar} />
            <Text style={styles.pullText}>Pull down to see map</Text>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Step Counter Card */}
            <Animated.View style={[styles.stepCard, animatedContainerStyle]}>
              <View style={styles.progressContainer}>
                <CircularProgress progress={progress} size={220} />
                <View style={styles.centerContent}>
                  <Text style={styles.stepsLabel}>Steps</Text>
                  <Text style={styles.steps}>{currentStepCount.toLocaleString()}</Text>
                  <Text style={styles.goal}>/{DAILY_GOAL.toLocaleString()}</Text>
                  <TouchableOpacity style={styles.playButton}>
                    <Ionicons name="pause" size={16} color="white" />
                  </TouchableOpacity>
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
      </PanGestureHandler>
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
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#f1f5f9',
    zIndex: 3,
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  menuButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height,
    zIndex: 1,
  },
  map: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
    zIndex: 2,
  },
  pullIndicator: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  pullBar: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    marginBottom: 8,
  },
  pullText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  steps: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  goal: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 16,
  },
  playButton: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  weeklyProgressContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weeklyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 4,
  },
  navTextActive: {
    color: '#6366f1',
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

