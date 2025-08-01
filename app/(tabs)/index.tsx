import { StyleSheet } from 'react-native';
import { StepCounter } from '@/components/StepCounter';
import { useState } from 'react';
import { Onboarding } from '@/components/Onboarding';

export default function HomeScreen() {

  // const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);

  // if (!isOnboardingCompleted) {
  //   return <Onboarding onComplete={() => setIsOnboardingCompleted(true)} />;
  // }

  return <StepCounter />;
}
