import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Alert, ScrollView } from 'react-native';
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
    { day: 'Fri', date: '20', completed: true },
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
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [useMotionFallback, setUseMotionFallback] = useState<boolean>(false);
  const [motionData, setMotionData] = useState<{
    acceleration: number;
    isDetecting: boolean;
  }>({
    acceleration: 0,
    isDetecting: false,
  });
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
    console.log('=== STARTING MOTION STEP COUNTING ===');
    
    // Enable motion detection immediately
    setUseMotionFallback(true);
    
    // Check pedometer availability for info only
    Pedometer.isAvailableAsync().then(available => {
      console.log('Pedometer available:', available);
      setIsPedometerAvailable(available ? 'yes' : 'no');
    }).catch(error => {
      console.log('Pedometer check failed:', error);
      setIsPedometerAvailable('no');
    });
  }, []);

  // Enhanced motion-based step counting
  useEffect(() => {
    if (useMotionFallback) {
      let motionSubscription: any = null;
      let stepCount = 0;
      let lastStepTime = 0;
      let lastAcceleration = 0;
      let stepThreshold = 1.2; // Even lower threshold for better sensitivity
      let consecutiveSteps = 0;

      const startMotionCounting = async () => {
        try {
          console.log('Starting motion step counting...');
          motionSubscription = DeviceMotion.addListener((motion) => {
            if (!motion.acceleration) {
              return;
            }
            
            const now = Date.now();
            const acceleration = Math.sqrt(
              motion.acceleration.x ** 2 + 
              motion.acceleration.y ** 2 + 
              motion.acceleration.z ** 2
            );
            
            // Update motion data for debugging
            setMotionData({
              acceleration,
              isDetecting: true,
            });
            
            // Step detection
            const timeSinceLastStep = now - lastStepTime;
            const accelerationChange = Math.abs(acceleration - lastAcceleration);
            
            // Detect step
            if (accelerationChange > stepThreshold && timeSinceLastStep > 300 && acceleration > 1.0) {
              stepCount++;
              lastStepTime = now;
              
              console.log('Step detected! Total:', stepCount, 'Acceleration:', acceleration.toFixed(2));
              setCurrentStepCount(stepCount);
            }
            
            lastAcceleration = acceleration;
          });
          
          console.log('Motion detection active - start walking!');
        } catch (error) {
          console.error('Error starting motion counting:', error);
        }
      };

      startMotionCounting();

      return () => {
        if (motionSubscription) { 
          console.log('Cleaning up motion subscription');
          motionSubscription.remove();
        }
      };
    }
    
  }, [useMotionFallback]);

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

  // const gestureHandler = useAnimatedGestureHandler({
  //   onStart: (_, context: any) => {
  //     context.startY = translateY.value;
  //   },
  //   onActive: (event, context: any) => {
  //     const newTranslateY = context.startY + event.translationY;
  //     translateY.value = Math.max(0, Math.min(newTranslateY, height * 0.4));
      
  //     // Update map position
  //     const mapProgress = interpolate(
  //       translateY.value,
  //       [0, height * 0.4],
  //       [-height * 0.4, 0],
  //       Extrapolate.CLAMP
  //     );
  //     mapTranslateY.value = mapProgress;
  //   },
  //   onEnd: () => {
  //     if (translateY.value > height * 0.2) {
  //       translateY.value = withSpring(height * 0.4, { damping: 20, stiffness: 100 });
  //       mapTranslateY.value = withSpring(0, { damping: 20, stiffness: 100 });
  //     } else {
  //       translateY.value = withSpring(0, { damping: 20, stiffness: 100 });
  //       mapTranslateY.value = withSpring(-height * 0.4, { damping: 10, stiffness: 100 });
  //     }
  //   },
  // });

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
          {/* <View style={styles.pullIndicator}> */}
            {/* <View style={styles.pullBar} />
            <Text style={styles.pullText}>Pull down to see map</Text> */}
          {/* </View> */}

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
            {/* Step Counter Card */}
            <Animated.View style={[styles.stepCard, animatedContainerStyle]}>
              <View style={styles.progressContainer}>
                <CircularProgress progress={progress} size={220} />
                <View style={styles.centerContent}>
                  <Text style={styles.stepsLabel}>Steps</Text>
                  <Text style={styles.steps}>{currentStepCount.toLocaleString()}</Text>
                  <Text style={styles.goal}>/{DAILY_GOAL.toLocaleString()}</Text>
                  {/* <TouchableOpacity style={styles.playButton}>
                    <Ionicons name="pause" size={16} color="white" />
                  </TouchableOpacity> */}
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
    backgroundColor: '#f8f9fa',
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
  debugCard: {
    marginTop: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  testButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  stepCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 36,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 40,
  },
  goal: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '500',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
