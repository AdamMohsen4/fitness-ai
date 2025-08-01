import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  Easing
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const DAILY_GOAL = 10000;
const { width } = Dimensions.get('window');

function getProgress(steps: number) {
  return Math.min(steps / DAILY_GOAL, 1);
}

// Custom Circular Progress Component
function CircularProgress({ progress, size = 200 }: { progress: number; size?: number }) {
  const animatedProgress = useSharedValue(0);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 1000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
  }, [progress]);

  const animatedProps = useAnimatedStyle(() => {
    const strokeDashoffset = circumference - (animatedProgress.value * circumference);
    return {
      transform: [{ rotate: '-90deg' }],
    };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <SvgGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#667eea" />
            <Stop offset="100%" stopColor="#764ba2" />
          </SvgGradient>
        </Defs>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0, 0, 0, 0.59)"
          strokeWidth="12"
          fill="transparent"
        />
        {/* Progress Circle
        <Animated.View style={animatedProps}>
          <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
            <Circle
              cx={size / 3}
              cy={size / 3}
              r={radius}
              stroke="url(#gradient)"
              strokeWidth="120"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progress * circumference)}
              fill="transparent"
              strokeLinecap="round"
            />
          </Svg> */}
        {/* </Animated.View> */}
      </Svg>
    </View>
  );
}

export function StepCounter() {
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<string>('checking');
  const [currentStepCount, setCurrentStepCount] = useState<number>(7842); // Demo value
  const progress = getProgress(currentStepCount);
  
  const scaleValue = useSharedValue(0);
  const opacityValue = useSharedValue(0);

  useEffect(() => {
    scaleValue.value = withSpring(1, { damping: 15, stiffness: 150 });
    opacityValue.value = withTiming(1, { duration: 800 });
  }, []);

  useEffect(() => {
    let subscription: Pedometer.Subscription | null = null;
    Pedometer.isAvailableAsync().then(
      (result: boolean) => setIsPedometerAvailable(result ? 'yes' : 'no'),
      () => setIsPedometerAvailable('no')
    );
    
    // Uncomment for real pedometer data:
    // subscription = Pedometer.watchStepCount((result: { steps: number }) => {
    //   setCurrentStepCount(result.steps);
    // });
    
    return () => {
    //   if (subscription) subscription.remove();
    };
  }, []);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    opacity: opacityValue.value,
  }));

  const progressPercentage = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, animatedContainerStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>Today's Steps</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          })}</Text>
        </View>

        <View style={styles.progressContainer}>
          <CircularProgress progress={progress} size={220} />
          <View style={styles.centerContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="walk" size={32} color="#667eea" />
            </View>
            <Text style={styles.steps}>{currentStepCount.toLocaleString()}</Text>
            <Text style={styles.goal}>of {DAILY_GOAL.toLocaleString()}</Text>
            <Text style={styles.percentage}>{progressPercentage}%</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={20} color="#ff6b6b" />
            <Text style={styles.statValue}>247</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="location" size={20} color="#4ecdc4" />
            <Text style={styles.statValue}>3.2</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={20} color="#45b7d1" />
            <Text style={styles.statValue}>42</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
        </View>

        {progress >= 1 && (
          <View style={styles.celebrationContainer}>
            <Text style={styles.celebration}>🎉 Goal Achieved! 🎉</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    padding: 12,
    marginBottom: 8,
  },
  steps: {
    fontSize: 36,
    fontWeight: '800',
    color: '#667eea',
    marginBottom: 4,
  },
  goal: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 8,
  },
  percentage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  celebrationContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    alignItems: 'center',
  },
  celebration: {
    fontSize: 18,
    fontWeight: '600',
    color: '#15803d',
  },
});

