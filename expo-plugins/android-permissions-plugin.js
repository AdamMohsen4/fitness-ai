// expo-plugins/android-permissions-plugin.js
const { withAndroidManifest } = require('@expo/config-plugins');

const withCustomAndroidPermissions = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Ensure permissions array exists
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }
    
    // Add ACTIVITY_RECOGNITION permission with proper Android API level targeting
    const activityRecognitionPermission = {
      $: {
        'android:name': 'android.permission.ACTIVITY_RECOGNITION'
      }
    };
    
    // Add the permission if it doesn't exist
    const existingPermission = androidManifest.manifest['uses-permission'].find(
      (permission) => permission.$['android:name'] === 'android.permission.ACTIVITY_RECOGNITION'
    );
    
    if (!existingPermission) {
      androidManifest.manifest['uses-permission'].push(activityRecognitionPermission);
    }
    
    // Also add the Google Play Services permission for Samsung devices
    const googleActivityPermission = {
      $: {
        'android:name': 'com.google.android.gms.permission.ACTIVITY_RECOGNITION'
      }
    };
    
    const existingGooglePermission = androidManifest.manifest['uses-permission'].find(
      (permission) => permission.$['android:name'] === 'com.google.android.gms.permission.ACTIVITY_RECOGNITION'
    );
    
    if (!existingGooglePermission) {
      androidManifest.manifest['uses-permission'].push(googleActivityPermission);
    }
    
    // Force the targetSdkVersion to be compatible with activity recognition
    if (androidManifest.manifest['uses-sdk']) {
      androidManifest.manifest['uses-sdk'][0].$['android:targetSdkVersion'] = '33';
    }
    
    console.log('Custom Android permissions plugin applied');
    return config;
  });
};

module.exports = withCustomAndroidPermissions;