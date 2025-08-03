import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native';


export default function Session() {
    const mapRegion = {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
        },
        text: {
            color: 'red',
            position: 'absolute',
            top: 50,
            left: 20,
            zIndex: 1,
        },
        map: {
            width: '100%',
            height: '100%',
        },
    });

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Session</Text>
            
        </View>
    );
}