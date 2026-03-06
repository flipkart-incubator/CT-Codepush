//  replace react-native-code-push with @cleartrip/react-native-code-push in root settings.gradle
const fs = require('fs');
const path = require('path');
const settingsGradlePath = path.join(__dirname, 'android', 'settings.gradle');
const settingsGradleContent = fs.readFileSync(settingsGradlePath, 'utf8');
const newSettingsGradleContent = settingsGradleContent.replace('react-native-code-push', '@cleartrip/react-native-code-push');
fs.writeFileSync(settingsGradlePath, newSettingsGradleContent);

//  replace react-native-code-push with @cleartrip/react-native-code-push in app build.gradle
const appBuildGradlePath = path.join(__dirname, 'android', 'app', 'build.gradle');
const appBuildGradleContent = fs.readFileSync(appBuildGradlePath, 'utf8');
const newAppBuildGradleContent = appBuildGradleContent.replace('react-native-code-push', '@cleartrip/react-native-code-push');
fs.writeFileSync(appBuildGradlePath, newAppBuildGradleContent);
// podfile should be updated to use @cleartrip/react-native-code-push
const podfilePath = path.join(__dirname, 'ios', 'Podfile');
const podfileContent = fs.readFileSync(podfilePath, 'utf8');
const newPodfileContent = podfileContent.replace('react-native-code-push', '@cleartrip/react-native-code-push');
fs.writeFileSync(podfilePath, newPodfileContent);