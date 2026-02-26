import React from "react";
import { AppState } from "react-native";
import { hoistStatics } from "hoist-non-react-statics";
import CodePush, { CodePushOptions } from "..";

export const codepushify = (options: CodePushOptions) => (RootComponent: React.ComponentType<any>) => {
    class CodePushComponent extends React.Component<any, any> {
    private rootComponentRef: React.RefObject<any>;
      constructor(props: any) {
        super(props);
        this.rootComponentRef = React.createRef();
      }

      componentDidMount() {
        if (options.checkFrequency === CodePush.CheckFrequency.MANUAL) {
          CodePush.notifyAppReady();
        } else {
          const rootComponentInstance = this.rootComponentRef.current;

          let syncStatusCallback;
          if (rootComponentInstance && rootComponentInstance.codePushStatusDidChange) {
            syncStatusCallback = rootComponentInstance.codePushStatusDidChange.bind(rootComponentInstance);
          }

          let downloadProgressCallback;
          if (rootComponentInstance && rootComponentInstance.codePushDownloadDidProgress) {
            downloadProgressCallback = rootComponentInstance.codePushDownloadDidProgress.bind(rootComponentInstance);
          }

          let handleBinaryVersionMismatchCallback;
          if (rootComponentInstance && rootComponentInstance.codePushOnBinaryVersionMismatch) {
            handleBinaryVersionMismatchCallback = rootComponentInstance.codePushOnBinaryVersionMismatch.bind(rootComponentInstance);
          }

          CodePush.sync(options, syncStatusCallback, downloadProgressCallback, handleBinaryVersionMismatchCallback);

          if (options.checkFrequency === CodePush.CheckFrequency.ON_APP_RESUME) {
            AppState.addEventListener("change", (newState) => {
              if (newState === "active") {
                CodePush.sync(options, syncStatusCallback, downloadProgressCallback);
              }
            });
          }
        }
      }

      render() {
        const props = {...this.props};

        // We can set ref property on class components only (not stateless)
        // Check it by render method
        if (RootComponent.prototype && RootComponent.prototype.render) {
          props.ref = this.rootComponentRef;
        }

        return <RootComponent {...props} />
      }
    }

    return hoistStatics(CodePushComponent, RootComponent);
  }