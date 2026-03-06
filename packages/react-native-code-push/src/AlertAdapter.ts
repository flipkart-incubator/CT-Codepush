// @ts-nocheck
import React, { Platform, NativeModules } from "react-native";

let { Alert } = React;

export interface ICodePushDialog {
    showDialog(title: string, message: string, button1Text: string, button2Text: string, successCallback: (buttonId: number) => void, errorCallback: (error: Error) => void): void;
}



if (Platform.OS === "android") {
    const CodePushDialog: ICodePushDialog = NativeModules.CodePushDialog;
    
  Alert = {
    alert(title, message, buttons) {
      if (buttons && buttons.length > 2) {
        throw "Can only show 2 buttons for Android dialog.";
      }
      
      const button1Text = buttons && buttons[0] ? buttons[0].text : null,
            button2Text = buttons && buttons[1] ? buttons[1].text : null;
      
      CodePushDialog.showDialog(
        title, message || '', button1Text || '', button2Text || '',
        (buttonId) => { buttons && buttons[buttonId] && buttons[buttonId].onPress && buttons[buttonId].onPress(); }, 
        (error) => { throw error; });
    },
    prompt: Alert.prompt,
  };
}

export { Alert };