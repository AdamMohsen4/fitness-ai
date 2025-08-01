import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface OnboardingQuestion {
    id: string;
    question: string;
    options: string[];
    type: 'single' | 'multiple' | 'text';
}

interface OnboardingProps {
    onComplete: (answers: Record<string, any>) => void;
}

const onboardingQuestions: OnboardingQuestion[] = [
    {
        id: 'name',
        question: 'What\'s your name?',
        options: [],
        type: 'text'
    },
    {
        id: 'fitness_goal',
        question: 'What\'s your primary fitness goal?',
        options: ['Lose weight', 'Build muscle', 'Improve endurance', 'Stay healthy', 'Other'],
        type: 'single'
    },
    {
        id: 'experience_level',
        question: 'What\'s your fitness experience level?',
        options: ['Beginner', 'Intermediate', 'Advanced'],
        type: 'single'
    },
    {
        id: 'workout_frequency',
        question: 'How often do you want to work out?',
        options: ['1-2 times per week', '3-4 times per week', '5-6 times per week', 'Every day'],
        type: 'single'
    },
    {
        id: 'preferred_activities',
        question: 'What activities do you enjoy? (Select all that apply)',
        options: ['Running', 'Weight training', 'Yoga', 'Swimming', 'Cycling', 'Dancing', 'Team sports'],
        type: 'multiple'
    }
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [textInput, setTextInput] = useState('');

    const currentQuestion = onboardingQuestions[currentPage];
    const progress = (currentPage + 1) / onboardingQuestions.length;

    const handleAnswer = (answer: any) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: answer
        }));
    };

    const handleNext = () => {
        if (currentPage < onboardingQuestions.length - 1) {
            setCurrentPage(currentPage + 1);
            setTextInput('');
        } else {
            onComplete(answers);
        }
    };

    const handleBack = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
            setTextInput('');
        }
    };

    const canProceed = () => {
        const currentAnswer = answers[currentQuestion.id];
        if (currentQuestion.type === 'text') {
            return textInput.trim().length > 0;
        }
        return currentAnswer !== undefined && currentAnswer !== null;
    };

    const renderQuestion = () => {
        switch (currentQuestion.type) {
            case 'text':
                return (
                    <View style={styles.textInputContainer}>
                        <Text style={styles.questionText}>{currentQuestion.question}</Text>
                        <View style={styles.textInputWrapper}>
                            <TextInput
                                style={styles.textInput}
                                value={textInput}
                                onChangeText={setTextInput}
                                placeholder="Enter your answer..."
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>
                );
            case 'single':
                return (
                    <View style={styles.optionsContainer}>
                        <Text style={styles.questionText}>{currentQuestion.question}</Text>
                        {currentQuestion.options.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.optionButton,
                                    answers[currentQuestion.id] === option && styles.selectedOption
                                ]}
                                onPress={() => handleAnswer(option)}
                            >
                                <Text style={[
                                    styles.optionText,
                                    answers[currentQuestion.id] === option && styles.selectedOptionText
                                ]}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case 'multiple':
                const selectedOptions = answers[currentQuestion.id] || [];
                return (
                    <View style={styles.optionsContainer}>
                        <Text style={styles.questionText}>{currentQuestion.question}</Text>
                        {currentQuestion.options.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.optionButton,
                                    selectedOptions.includes(option) && styles.selectedOption
                                ]}
                                onPress={() => {
                                    const newSelection = selectedOptions.includes(option)
                                        ? selectedOptions.filter((item: string) => item !== option)
                                        : [...selectedOptions, option];
                                    handleAnswer(newSelection);
                                }}
                            >
                                <Text style={[
                                    styles.optionText,
                                    selectedOptions.includes(option) && styles.selectedOptionText
                                ]}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>
                    {currentPage + 1} of {onboardingQuestions.length}
                </Text>
            </View>

            {/* Question Content */}
            <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {renderQuestion()}
            </ScrollView>

            {/* Navigation Buttons */}
            <View style={styles.navigationContainer}>
                {currentPage > 0 && (
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                )}
                
                <TouchableOpacity
                    style={[styles.nextButton, !canProceed() && styles.disabledButton]}
                    onPress={handleNext}
                    disabled={!canProceed()}
                >
                    <LinearGradient
                        colors={canProceed() ? ['#667eea', '#764ba2'] : ['#ccc', '#ccc']}
                        style={styles.gradientButton}
                    >
                        <Text style={styles.nextButtonText}>
                            {currentPage === onboardingQuestions.length - 1 ? 'Complete' : 'Next'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    progressContainer: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    progressBar: {
        height: 6,
        backgroundColor: '#e9ecef',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#667eea',
        borderRadius: 3,
    },
    progressText: {
        textAlign: 'center',
        marginTop: 10,
        fontSize: 14,
        color: '#6c757d',
        fontWeight: '500',
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    questionText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#212529',
        marginBottom: 30,
        textAlign: 'center',
        lineHeight: 32,
    },
    textInputContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    textInputWrapper: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e9ecef',
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginTop: 20,
    },
    textInput: {
        fontSize: 18,
        color: '#212529',
        textAlign: 'center',
    },
    optionsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    optionButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#e9ecef',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    selectedOption: {
        borderColor: '#667eea',
        backgroundColor: '#f8f9ff',
    },
    optionText: {
        fontSize: 16,
        color: '#495057',
        textAlign: 'center',
        fontWeight: '500',
    },
    selectedOptionText: {
        color: '#667eea',
        fontWeight: '600',
    },
    navigationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    backButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#6c757d',
    },
    backButtonText: {
        fontSize: 16,
        color: '#6c757d',
        fontWeight: '500',
    },
    nextButton: {
        flex: 1,
        marginLeft: 12,
        borderRadius: 12,
        overflow: 'hidden',
    },
    gradientButton: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.6,
    },
    nextButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
});