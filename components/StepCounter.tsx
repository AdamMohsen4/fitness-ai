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
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
import MapView, { Marker } from 'react-native-maps';
import { Subscription } from 'expo-sensors/build/Pedometer';

const DAILY_GOAL = 10000;
const { width, height } = Dimensions.get('window');

function getProgress(steps: number) {
  return Math.min(steps / DAILY_GOAL, 1);
}

// Half-Moon Progress Component with Step Intervals
function HalfMoonProgress({ progress, size = 300 }: { progress: number; size?: number }) {
  const animatedProgress = useSharedValue(0);
  const radius = (size - 20) / 2;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Create half-moon path (semicircle)
  const startAngle = -180; // Start from top
  const endAngle = 0; // End at bottom
  const angleRange = endAngle - startAngle;
  
  // Calculate the progress angle
  const progressAngle = startAngle + (progress * angleRange);
  
  // Create the path for the half-moon
  const startX = centerX + radius * Math.cos(startAngle * Math.PI / 180);
  const startY = centerY + radius * Math.sin(startAngle * Math.PI / 180);
  const endX = centerX + radius * Math.cos(endAngle * Math.PI / 180);
  const endY = centerY + radius * Math.sin(endAngle * Math.PI / 180);
  const progressX = centerX + radius * Math.cos(progressAngle * Math.PI / 180);
  const progressY = centerY + radius * Math.sin(progressAngle * Math.PI / 180);
  
  // Create the path string for the background
  const backgroundPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;
  
  // Create the path string for the progress
  const progressPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${progressX} ${progressY}`;

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 2000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
  }, [progress]);

  // Generate step intervals (every 20%)
  const stepIntervals = [];
  for (let i = 0; i <= 5; i++) {
    const stepProgress = i * 0.2;
    const stepAngle = startAngle + (stepProgress * angleRange);
    const stepX = centerX + (radius - 8) * Math.cos(stepAngle * Math.PI / 180);
    const stepY = centerY + (radius - 8) * Math.sin(stepAngle * Math.PI / 180);
    stepIntervals.push({ x: stepX, y: stepY, progress: stepProgress });
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#a855f7" />
            <Stop offset="30%" stopColor="#8b5cf6" />
            <Stop offset="60%" stopColor="#6366f1" />
            <Stop offset="100%" stopColor="#3b82f6" />
          </SvgGradient>
          <SvgGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="rgba(168, 85, 247, 0.12)" />
            <Stop offset="50%" stopColor="rgba(139, 92, 246, 0.08)" />
            <Stop offset="100%" stopColor="rgba(99, 102, 241, 0.04)" />
          </SvgGradient>
          <SvgGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="rgba(168, 85, 247, 0.3)" />
            <Stop offset="100%" stopColor="rgba(99, 102, 241, 0.1)" />
          </SvgGradient>
        </Defs>
        
        {/* Glow Effect */}
        <Path
          d={backgroundPath}
          stroke="url(#glowGradient)"
          strokeWidth="20"
          fill="transparent"
          strokeLinecap="round"
          opacity={0.6}
        />
        
        {/* Background Half-Moon */}
        <Path
          d={backgroundPath}
          stroke="url(#backgroundGradient)"
          strokeWidth="16"
          fill="transparent"
          strokeLinecap="round"
        />
        
        {/* Progress Half-Moon */}
        <Path
          d={progressPath}
          stroke="url(#progressGradient)"
          strokeWidth="16"
          fill="transparent"
          strokeLinecap="round"
        />
        
        {/* Step Interval Markers */}
        {stepIntervals.map((step, index) => (
          <Circle
            key={index}
            cx={step.x}
            cy={step.y}
            r={8}
            fill={step.progress <= progress ? "#6366f1" : "#f3f4f6"}
            stroke={step.progress <= progress ? "#ffffff" : "#e5e7eb"}
            strokeWidth={3}
          />
        ))}
      </Svg>
    </View>
  );
}

// Enhanced Weekly Progress Component
function WeeklyProgress() {
  const days = [
    { day: 'Mon', date: '16', completed: true, steps: 8500, goal: 10000 },
    { day: 'Tue', date: '17', completed: true, steps: 10200, goal: 10000 },
    { day: 'Wed', date: '18', completed: false, steps: 6800, goal: 10000 },
    { day: 'Thu', date: '19', completed: true, steps: 9500, goal: 10000 },
    { day: 'Fri', date: '20', completed: false, steps: 7200, goal: 10000 },
    { day: 'Sat', date: '21', completed: true, steps: 11800, goal: 10000 },
    { day: 'Today', date: '22', completed: true, steps: 4805, goal: 10000 },
  ];

  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const completedDays = days.filter(day => day.completed).length;
  const totalSteps = days.reduce((sum, day) => sum + day.steps, 0);
  const averageSteps = Math.round(totalSteps / days.length);

  return (
    <View style={styles.weeklyProgressContainer}>
      <TouchableOpacity style={styles.weekSelector} onPress={toggleExpanded}>
        <View style={styles.weekSelectorContent}>
          <Text style={styles.weekSelectorText}>Weekly Overview</Text>
          <View style={styles.weekStats}>
            <Text style={styles.weekStatsText}>{completedDays}/7 days • {averageSteps.toLocaleString()} avg</Text>
          </View>
        </View>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#6366f1" />
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
              {item.completed && (
                <View style={styles.completionBadge}>
                  <Ionicons name="checkmark" size={8} color="white" />
                </View>
              )}
            </View>
            <Text style={styles.dayLabel}>{item.day}</Text>
            {isExpanded && (
              <View style={styles.dayDetails}>
                <Text style={styles.daySteps}>{item.steps.toLocaleString()}</Text>
                <View style={styles.dayProgressBar}>
                  <View style={[styles.dayProgressFill, { width: `${Math.min(100, (item.steps / item.goal) * 100)}%` }]} />
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// New Motivational Component
function MotivationalCard() {
  const [currentQuote, setCurrentQuote] = useState(0);
  
  const quotes = [
    {
      text: "Every step counts towards your goals",
      author: "Daily Motivation",
      icon: "trending-up"
    },
    {
      text: "You're closer than you think",
      author: "Keep Going",
      icon: "rocket"
    },
    {
      text: "Small progress is still progress",
      author: "Stay Strong",
      icon: "heart"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.motivationalCard}>
      <View style={styles.motivationalHeader}>
        <View style={styles.motivationalIcon}>
          <Ionicons name={quotes[currentQuote].icon as any} size={24} color="#6366f1" />
        </View>
        <View style={styles.motivationalContent}>
          <Text style={styles.motivationalText}>"{quotes[currentQuote].text}"</Text>
          <Text style={styles.motivationalAuthor}>— {quotes[currentQuote].author}</Text>
        </View>
      </View>
      <View style={styles.motivationalProgress}>
        <View style={styles.progressDots}>
          {quotes.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.progressDot, 
                index === currentQuote && styles.progressDotActive
              ]} 
            />
          ))}
        </View>
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
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.headerIcon, animatedIconStyle]}>
            <Ionicons name="footsteps" size={24} color="#6366f1" />
          </Animated.View>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Activity</Text>
          <Text style={styles.headerSubtitle}>Track your daily progress</Text>
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {/* Enhanced Map Background */}
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
        />
        {!userLocation && (
          <View style={styles.locationLoading}>
            <Ionicons name="location" size={20} color="white" />
            <Text style={styles.locationLoadingText}>Getting your location...</Text>
          </View>
        )}
      </Animated.View>

      {/* Enhanced Main Content */}   
      <Animated.View style={[styles.mainContent, animatedMainStyle]}>
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
          {/* Modern Step Counter Card */}
          <Animated.View style={[styles.stepCard, animatedContainerStyle]}>
            <View style={styles.progressContainer}>
              <HalfMoonProgress progress={progress} size={300} />
              <View style={styles.centerContent}>
                <Text style={styles.steps}>{currentStepCount.toLocaleString()}</Text>
                <Text style={styles.stepsLabel}>steps today</Text>
              </View>
            </View>
            
            <View style={styles.progressFooter}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
                <Text style={styles.progressLabel}>of daily goal</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
              </View>
            </View>
          </Animated.View>

          {/* Enhanced Daily Statistics */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Today's Activity</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="time" size={24} color="#f59e0b" />
                </View>
                <Text style={styles.statValue}>1h 14m</Text>
                <Text style={styles.statLabel}>Active Time</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="flame" size={24} color="#ef4444" />
                </View>
                <Text style={styles.statValue}>360</Text>
                <Text style={styles.statLabel}>Calories</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: '#d1fae5' }]}>
                  <Ionicons name="location" size={24} color="#10b981" />
                </View>
                <Text style={styles.statValue}>5.46</Text>
                <Text style={styles.statLabel}>Distance (km)</Text>
              </View>
            </View>
          </View>

          {/* New Motivational Component */}
          {/* <MotivationalCard /> */}

          {/* Enhanced Weekly Progress */}
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
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  menuButton: {
    padding: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#f8fafc',
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
    padding: 48,
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  progressBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  progressFooter: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginRight: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 3,
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
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: 12,
    textTransform: 'lowercase',
    letterSpacing: 0.5,
  },
  steps: {
    fontSize: 56,
    fontWeight: '900',
    color: '#1f2937',
    lineHeight: 60,
    letterSpacing: -1.5,
  },
  goal: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 12,
  },
  remainingContainer: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  remainingText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.06)',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
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
    borderColor: 'rgba(99, 102, 241, 0.08)',
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  weekSelectorContent: {
    flex: 1,
  },
  weekSelectorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  weekStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekStatsText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  weeklyDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  
  },
  dayCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayCircleCompleted: {
    backgroundColor: '#6366f1',
  },
  dayCircleIncomplete: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayNumberCompleted: {
    color: 'white',
  },
  dayNumberIncomplete: {
    color: '#6b7280',
  },
  dayLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  daySteps: {
    fontSize: 10,
    color: 'black',
    fontWeight: '500',

  },
  completionBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  dayDetails: {
    alignItems: 'center',
    marginTop: 4,
  },
  dayProgressBar: {
    width: 40,
    height: 3,
    backgroundColor: '#f3f4f6',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  dayProgressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  motivationalCard: {
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
    borderColor: 'rgba(99, 102, 241, 0.08)',
  },
  motivationalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  motivationalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  motivationalContent: {
    flex: 1,
  },
  motivationalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 22,
    marginBottom: 4,
  },
  motivationalAuthor: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  motivationalProgress: {
    alignItems: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  progressDotActive: {
    backgroundColor: '#6366f1',
  },
  locationLoading: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    flexDirection: 'row',
    gap: 8,
  },
  locationLoadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});