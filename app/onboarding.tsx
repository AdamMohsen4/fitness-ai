import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Onboarding } from '../components/Onboarding';

export default function OnboardingScreen() {
    const [showOnboarding, setShowOnboarding] = useState(true);

    const handleOnboardingComplete = (answers: Record<string, any>) => {
        Alert.alert(
            'Onboarding Complete!',
            `Thank you for completing the onboarding!\n\nYour answers:\n${JSON.stringify(answers, null, 2)}`,
            [
                {
                    text: 'OK',
                    onPress: () => setShowOnboarding(false)
                }
            ]
        );
    };

    if (showOnboarding) {
        return <Onboarding onComplete={handleOnboardingComplete} />;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome!</Text>
            <Text style={styles.subtitle}>You've completed the onboarding process.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#212529',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
        lineHeight: 24,
    },
}); 