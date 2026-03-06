import { EventSubscription, NativeEventEmitter } from "react-native";
import { AcquisitionManager } from "./core/acquisition-sdk";
import type {
  DownloadProgressCallback,
  INativeCodePush,
  LocalPackage,
  RemotePackage,
} from "./index";

const packageMixins = (NativeCodePush: INativeCodePush) => {
  const remote = (
    reportStatusDownload: AcquisitionManager["reportStatusDownload"],
  ) => {
    return {
      async download(
        this: RemotePackage,
        downloadProgressCallback?: DownloadProgressCallback,
      ): Promise<LocalPackage> {
        if (!this.downloadUrl) {
          throw new Error("Cannot download an update without a download url");
        }

        let downloadProgressSubscription: EventSubscription | null = null;
        if (downloadProgressCallback) {
          const codePushEventEmitter = new NativeEventEmitter(
            NativeCodePush
          );
          // Use event subscription to obtain download progress.
          downloadProgressSubscription = codePushEventEmitter.addListener(
            "CodePushDownloadProgress",
            downloadProgressCallback,
          );
        }
        try {
            const updatePackageCopy = Object.assign({}, this);
            Object.keys(updatePackageCopy).forEach((key) => (typeof updatePackageCopy[key] === 'function') && delete updatePackageCopy[key]);

            const downloadedPackage = await NativeCodePush.downloadUpdate(updatePackageCopy, !!downloadProgressCallback);
            if (reportStatusDownload) {
                reportStatusDownload(this)
                .catch((err) => {
                  console.log(`Report download status failed: ${err}`);
                });
              }
    
              return { ...downloadedPackage, ...local };
        } finally {
            downloadProgressSubscription && downloadProgressSubscription.remove();
        }
      },
      isPending: false // A remote package could never be in a pending state
    };
  };
  const local = {
    async install(installMode = NativeCodePush.codePushInstallModeOnNextRestart, minimumBackgroundDuration = 0, updateInstalledCallback) {
      const localPackage = this;
      const localPackageCopy = Object.assign({}, localPackage); // In dev mode, React Native deep freezes any object queued over the bridge
      await NativeCodePush.installUpdate(localPackageCopy, installMode, minimumBackgroundDuration);
      updateInstalledCallback && updateInstalledCallback();
      if (installMode == NativeCodePush.codePushInstallModeImmediate) {
        NativeCodePush.restartApp(false);
      } else {
        NativeCodePush.clearPendingRestart();
        localPackage.isPending = true; // Mark the package as pending since it hasn't been applied yet
      }
    },

    isPending: false // A local package wouldn't be pending until it was installed
  }
  return {
    remote,
    local,
  };
};

export default packageMixins;