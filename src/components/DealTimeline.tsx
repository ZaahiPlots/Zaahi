import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DealTimelineProps {
  currentStep: number;
}

const DealTimeline: React.FC<DealTimelineProps> = ({ currentStep }) => {
  const steps = [
    { label: 'Initiated', completed: currentStep >= 1 },
    { label: 'Deposit', completed: currentStep >= 2 },
    { label: 'Agreement', completed: currentStep >= 3 },
    { label: 'Documents DLD Completed', completed: currentStep >= 4 }
  ];

  return (
    <View style={styles.container}>
      {steps.map((step, index) => (
        <View key={index} style={[styles.stepContainer, step.completed && styles.completed]}>
          <Text style={[styles.stepLabel, step.completed && styles.active]}>{step.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center'
  },
  stepLabel: {
    fontSize: 14,
    color: '#69707d'
  },
  completed: {
    borderBottomColor: '#ff9f1c',
    borderBottomWidth: 2
  },
  active: {
    color: '#ff9f1c'
  }
});

export default DealTimeline;