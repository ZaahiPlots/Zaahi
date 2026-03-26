import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { DealItem, StatusBadge } from '../components';

const deals = [
  { id: '1', title: '20% Off', description: 'On all electronics', status: 'active' },
  { id: '2', title: '$50 Cashback', description: 'Spend over $200', status: 'inactive' },
  { id: '3', title: 'Buy One Get One Free', description: 'Select items', status: 'active' }
];

const DealsPage = () => {
  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.dealItem}>
      <DealItem
        title={item.title}
        description={item.description}
        onPress={() => console.log('Deal pressed', item)}
      />
      <StatusBadge status={item.status} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deals</Text>
      <FlatList
        data={deals}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333',
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  list: {
    marginTop: 20
  },
  dealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15
  }
});

export default DealsPage;