import {
  AcquisitionManager,
  NativeUpdateNotification,
} from "./core/acquisition-sdk";
import { codepushify } from "./hoc/codepushify";

import { NativeModules, AppState, Platform, NativeModule } from "react-native";
import { Alert } from "./AlertAdapter"
import requestFetchAdapter from "./requestFetchAdapter";
import packageMixins from "./package-mixins";

/**
 * Indicates the current status of a sync operation.
 */
enum SyncStatus {
  /**
   * The app is up-to-date with the CodePush server.
   */
  UP_TO_DATE=0,

  /**
   * An available update has been installed and will be run either immediately after the
   * syncStatusChangedCallback function returns or the next time the app resumes/restarts,
   * depending on the InstallMode specified in SyncOptions
   */
  UPDATE_INSTALLED=1,

  /**
   * The app had an optional update which the end user chose to ignore.
   * (This is only applicable when the updateDialog is used)
   */
  UPDATE_IGNORED=2,

  /**
   * The sync operation encountered an unknown error.
   */
  UNKNOWN_ERROR=3,

  /**
   * There is an ongoing sync operation running which prevents the current call from being executed.
   */
  SYNC_IN_PROGRESS=4,

  /**
   * The CodePush server is being queried for an update.
   */
  CHECKING_FOR_UPDATE=5,

  /**
   * An update is available, and a confirmation dialog was shown
   * to the end user. (This is only applicable when the updateDialog is used)
   */
  AWAITING_USER_ACTION=6,

  /**
   * An available update is being downloaded from the CodePush server.
   */
  DOWNLOADING_PACKAGE=7,

  /**
   * An available update was downloaded and is about to be installed.
   */
  INSTALLING_UPDATE=8,
}

/**
 * Indicates the status of a deployment (after installing and restarting).
 */
enum DeploymentStatus {
  /**
   * The deployment failed (and was rolled back).
   */
  FAILED="DeploymentFailed",

  /**
   * The deployment succeeded.
   */
  SUCCEEDED="DeploymentSucceeded",
}

/**
 * Indicates when you would like to check for (and install) updates from the CodePush server.
 */
enum CheckFrequency {
  /**
   * When the app is fully initialized (or more specifically, when the root component is mounted).
   */
  ON_APP_START=0,

  /**
   * When the app re-enters the foreground.
   */
  ON_APP_RESUME=1,

  /**
   * Don't automatically check for updates, but only do it when sync() is manully called inside app code.
   */
  MANUAL=2,
}

export type DownloadProgressCallback = (progress: DownloadProgress) => void;
export type SyncStatusChangedCallback = (status: SyncStatus) => void;
export type HandleBinaryVersionMismatchCallback = (update: RemotePackage) => void;

export interface CodePushOptions extends SyncOptions {
    /**
     * Specifies when you would like to synchronize updates with the CodePush server.
     * Defaults to CheckFrequency.ON_APP_START.
     */
    checkFrequency: CheckFrequency;
}

export interface DownloadProgress {
    /**
     * The total number of bytes expected to be received for this update.
     */
    totalBytes: number;

    /**
     * The number of bytes downloaded thus far.
     */
    receivedBytes: number;
}

export interface LocalPackage extends Package {
    _isDebugOnly: boolean;
    /**
     * Installs the update by saving it to the location on disk where the runtime expects to find the latest version of the app.
     *
     * @param installMode Indicates when you would like the update changes to take affect for the end-user.
     * @param minimumBackgroundDuration For resume-based installs, this specifies the number of seconds the app needs to be in the background before forcing a restart. Defaults to 0 if unspecified.
     */
    install(installMode: InstallMode, minimumBackgroundDuration?: number, callback?: () => void): Promise<void>;
}

export interface Package {
    /**
     * The app binary version that this update is dependent on. This is the value that was
     * specified via the appStoreVersion parameter when calling the CLI's release command.
     */
    appVersion: string;

    /**
     * The deployment key that was used to originally download this update.
     */
    deploymentKey: string;

    /**
     * The description of the update. This is the same value that you specified in the CLI when you released the update.
     */
    description: string;

    /**
     * Indicates whether this update has been previously installed but was rolled back.
     */
    failedInstall: boolean;

    /**
     * Indicates whether this is the first time the update has been run after being installed.
     */
    isFirstRun: boolean;

    /**
     * Indicates whether the update is considered mandatory. This is the value that was specified in the CLI when the update was released.
     */
    isMandatory: boolean;

    /**
     * Indicates whether this update is in a "pending" state. When true, that means the update has been downloaded and installed, but the app restart
     * needed to apply it hasn't occurred yet, and therefore, its changes aren't currently visible to the end-user.
     */
    isPending: boolean;

    /**
     * The internal label automatically given to the update by the CodePush server. This value uniquely identifies the update within its deployment.
     */
    label: string;

    /**
     * The SHA hash value of the update.
     */
    packageHash: string;

    /**
     * The size of the code contained within the update, in bytes.
     */
    packageSize: number;

    /**
     * Indicates whether the update should be applied as a patch.
     */
    applyPatch: boolean;
}

export interface RemotePackage extends Package {
    /**
     * Downloads the available update from the CodePush service.
     *
     * @param downloadProgressCallback An optional callback that allows tracking the progress of the update while it is being downloaded.
     */
    download(downloadProgressCallback?: DownloadProgressCallback): Promise<LocalPackage>;

    /**
     * The URL at which the package is available for download.
     */
    downloadUrl: string;

    /**
     * The URL at which the patch is available for download.
     */
    patchDownloadUrl: string;
}

export interface SyncOptions {
    /**
     * ignore failed updates
     */
    ignoreFailedUpdates?: boolean;

    /**
     * Specifies the deployment key you want to query for an update against. By default, this value is derived from the Info.plist
     * file (iOS) and MainActivity.java file (Android), but this option allows you to override it from the script-side if you need to
     * dynamically use a different deployment for a specific call to sync.
     */
    deploymentKey?: string | null;

    /**
     * Specifies when you would like to install optional updates (i.e. those that aren't marked as mandatory).
     * Defaults to codePush.InstallMode.ON_NEXT_RESTART.
     */
    installMode?: InstallMode;

    /**
     * Specifies when you would like to install updates which are marked as mandatory.
     * Defaults to InstallMode.IMMEDIATE.
     */
    mandatoryInstallMode?: InstallMode;

    /**
     * Specifies the minimum number of seconds that the app needs to have been in the background before restarting the app. This property
     * only applies to updates which are installed using `InstallMode.ON_NEXT_RESUME` or `InstallMode.ON_NEXT_SUSPEND`, and can be useful 
     * for getting your update in front of end users sooner, without being too obtrusive. Defaults to `0`, which has the effect of applying 
     * the update immediately after a resume or unless the app suspension is long enough to not matter, regardless how long it was in the background.
     */
    minimumBackgroundDuration?: number;

    /**
     * An "options" object used to determine whether a confirmation dialog should be displayed to the end user when an update is available,
     * and if so, what strings to use. Defaults to null, which has the effect of disabling the dialog completely. Setting this to any truthy
     * value will enable the dialog with the default strings, and passing an object to this parameter allows enabling the dialog as well as
     * overriding one or more of the default strings.
     */
    updateDialog?: UpdateDialog | true | null;

    /**
     * The rollback retry mechanism allows the application to attempt to reinstall an update that was previously rolled back (with the restrictions
     * specified in the options). It is an "options" object used to determine whether a rollback retry should occur, and if so, what settings to use
     * for the rollback retry. This defaults to null, which has the effect of disabling the retry mechanism. Setting this to any truthy value will enable
     * the retry mechanism with the default settings, and passing an object to this parameter allows enabling the rollback retry as well as overriding
     * one or more of the default values.
     */
    rollbackRetryOptions?: RollbackRetryOptions | null;
}

export interface UpdateDialog {
    /**
     * Indicates whether you would like to append the description of an available release to the
     * notification message which is displayed to the end user. Defaults to false.
     */
    appendReleaseDescription?: boolean;

    /**
     * Indicates the string you would like to prefix the release description with, if any, when
     * displaying the update notification to the end user. Defaults to " Description: "
     */
    descriptionPrefix?: string;

    /**
     * The text to use for the button the end user must press in order to install a mandatory update. Defaults to "Continue".
     */
    mandatoryContinueButtonLabel?: string;

    /**
     * The text used as the body of an update notification, when the update is specified as mandatory.
     * Defaults to "An update is available that must be installed.".
     */
    mandatoryUpdateMessage?: string;

    /**
     * The text to use for the button the end user can press in order to ignore an optional update that is available. Defaults to "Ignore".
     */
    optionalIgnoreButtonLabel?: string;

    /**
     * The text to use for the button the end user can press in order to install an optional update. Defaults to "Install".
     */
    optionalInstallButtonLabel?: string;

    /**
     * The text used as the body of an update notification, when the update is optional. Defaults to "An update is available. Would you like to install it?".
     */
    optionalUpdateMessage?: string;

    /**
     * The text used as the header of an update notification that is displayed to the end user. Defaults to "Update available".
     */
    title?: string;
}

export interface RollbackRetryOptions {
    /**
     * Specifies the minimum time in hours that the app will wait after the latest rollback
     * before attempting to reinstall same rolled-back package. Defaults to `24`.
     */
    delayInHours?: number;

    /**
     * Specifies the maximum number of retry attempts that the app can make before it stops trying.
     * Cannot be less than `1`. Defaults to `1`.
     */
    maxRetryAttempts?: number;
}

export interface StatusReport {
    /**
     * Whether the deployment succeeded or failed.
     */
    status: DeploymentStatus;

    /**
     * The version of the app that was deployed (for a native app upgrade).
     */
    appVersion?: string;

    /**
     * Details of the package that was deployed (or attempted to).
     */
    package?: Package;

    /**
     * Deployment key used when deploying the previous package.
     */
    previousDeploymentKey?: string;

    /**
     * The label (v#) of the package that was upgraded from.
     */
    previousLabelOrAppVersion?: string;
}

export interface LatestRollbackInfo {
  time: number;
  count: number;
  packageHash: string;
}

export interface CodePushOptions {
  deploymentKey: string;
  serverUrl: string;
  publicKey: string;
  checkFrequency: CheckFrequency;
  installMode: InstallMode;
}

export interface CodePushConfiguration extends CodePushOptions {
  packageHash: string;
  appVersion: string;
  clientUniqueId: string;
}

export interface INativeCodePush extends NativeModule {
  getNewStatusReport: () => Promise<StatusReport | void>;
  recordStatusReported: (statusReport: StatusReport) => void;
  saveStatusReportForRetry: (statusReport: StatusReport) => void;
  getLatestRollbackInfo: () => Promise<LatestRollbackInfo | null>;
  setLatestRollbackInfo: (packageHash: string) => Promise<void>;
  isFirstRun: (packageHash: string) => Promise<boolean>;
  notifyApplicationReady: () => Promise<void>;
  getConfiguration: () => Promise<CodePushConfiguration>;
  getUpdateMetadata: (updateState: UpdateState) => Promise<LocalPackage | null>;
  downloadUpdate: (updatePackage: RemotePackage, notifyProgress: boolean) => Promise<LocalPackage>;
  installUpdate: (updatePackage: LocalPackage, installMode: InstallMode, minimumBackgroundDuration: number) => Promise<void>;
  restartApp: (onlyIfUpdateIsPending?: boolean) => void;
  clearPendingRestart: () => void;
  isFailedUpdate: (packageHash: string) => Promise<boolean>;

  codePushInstallModeOnNextRestart: InstallMode;
  codePushInstallModeImmediate: InstallMode;
  codePushInstallModeOnNextResume: InstallMode;
  codePushInstallModeOnNextSuspend: InstallMode;

  codePushUpdateStateRunning: UpdateState;
  codePushUpdateStatePending: UpdateState;
  codePushUpdateStateLatest: UpdateState;
};

const NativeCodePush: INativeCodePush = NativeModules.CodePush;

const DEFAULT_ROLLBACK_RETRY_OPTIONS = {
  delayInHours: 24,
  maxRetryAttempts: 1,
} as const;

/**
 * Indicates when you would like an installed update to actually be applied.
 */
enum InstallMode {
    /**
   * Indicates that you want to install the update and restart the app immediately.
   */
  IMMEDIATE = NativeCodePush.codePushInstallModeImmediate, // Restart the app immediately
    /**
   * Indicates that you want to install the update, but not forcibly restart the app.
   */
  ON_NEXT_RESTART =  NativeCodePush.codePushInstallModeOnNextRestart, // Don't artificially restart the app. Allow the update to be "picked up" on the next app restart
  /**
   * Indicates that you want to install the update, but don't want to restart the app until the next time
   * the end user resumes it from the background. This way, you don't disrupt their current session,
   * but you can get the update in front of them sooner then having to wait for the next natural restart.
   * This value is appropriate for silent installs that can be applied on resume in a non-invasive way.
   */
  ON_NEXT_RESUME = NativeCodePush.codePushInstallModeOnNextResume, // Restart the app the next time it is resumed from the background
  /**
   * Indicates that you want to install the update when the app is in the background,
   * but only after it has been in the background for "minimumBackgroundDuration" seconds (0 by default),
   * so that user context isn't lost unless the app suspension is long enough to not matter.
   */
  ON_NEXT_SUSPEND = NativeCodePush.codePushInstallModeOnNextSuspend, // Restart the app _while_ it is in the background,
  // but only after it has been in the background for "minimumBackgroundDuration" seconds (0 by default),
  // so that user context isn't lost unless the app suspension is long enough to not matter
}


const DEFAULT_UPDATE_DIALOG =  {
  appendReleaseDescription: false,
  descriptionPrefix: " Description: ",
  mandatoryContinueButtonLabel: "Continue",
  mandatoryUpdateMessage: "An update is available that must be installed.",
  optionalIgnoreButtonLabel: "Ignore",
  optionalInstallButtonLabel: "Install",
  optionalUpdateMessage: "An update is available. Would you like to install it?",
  title: "Update available"
} as const;

/**
 * Indicates the state that an update is currently in.
 */
enum UpdateState {
  /**
   * Indicates that an update represents the
   * version of the app that is currently running.
   */
  RUNNING = NativeCodePush.codePushUpdateStateRunning,

  /**
   * Indicates than an update has been installed, but the
   * app hasn't been restarted yet in order to apply it.
   */
  PENDING = NativeCodePush.codePushUpdateStatePending,

  /**
   * Indicates than an update represents the latest available
   * release, and can be either currently running or pending.
   */
  LATEST = NativeCodePush.codePushUpdateStateLatest,
}

const PackageMixins = packageMixins(NativeCodePush);

async function checkForUpdate(
  deploymentKey: string | null = null,
  handleBinaryVersionMismatchCallback: HandleBinaryVersionMismatchCallback | null = null,
): Promise<RemotePackage | null> {
  /*
   * Before we ask the server if an update exists, we
   * need to retrieve three pieces of information from the
   * native side: deployment key, app version (e.g. 1.0.1)
   * and the hash of the currently running update (if there is one).
   * This allows the client to only receive updates which are targetted
   * for their specific deployment and version and which are actually
   * different from the CodePush update they have already installed.
   */
  const nativeConfig = await getConfiguration();
  /*
   * If a deployment key was explicitly provided,
   * then let's override the one we retrieved
   * from the native-side of the app. This allows
   * dynamically "redirecting" end-users at different
   * deployments (e.g. an early access deployment for insiders).
   */
  const config = deploymentKey
    ? { ...nativeConfig, ...{ deploymentKey } }
    : nativeConfig;
  const sdk = new AcquisitionManager(requestFetchAdapter, config);

  // Use dynamically overridden getCurrentPackage() during tests.
  const localPackage = await getCurrentPackage();

  /*
   * If the app has a previously installed update, and that update
   * was targetted at the same app version that is currently running,
   * then we want to use its package hash to determine whether a new
   * release has been made on the server. Otherwise, we only need
   * to send the app version to the server, since we are interested
   * in any updates for current binary version, regardless of hash.
   */
  let queryPackage: Partial<Package> = {};
  if (localPackage) {
    queryPackage = localPackage;
  } else {
      queryPackage = { appVersion: config.appVersion };
      if (Platform.OS === "ios" && config.packageHash) {
        queryPackage.packageHash = config.packageHash;
      }
  }

  const update = await sdk.queryUpdateWithCurrentPackage(queryPackage);

  /*
   * There are four cases where checkForUpdate will resolve to null:
   * ----------------------------------------------------------------
   * 1) The server said there isn't an update. This is the most common case.
   * 2) The server said there is an update but it requires a newer binary version.
   *    This would occur when end-users are running an older binary version than
   *    is available, and CodePush is making sure they don't get an update that
   *    potentially wouldn't be compatible with what they are running.
   * 3) The server said there is an update, but the update's hash is the same as
   *    the currently running update. This should _never_ happen, unless there is a
   *    bug in the server, but we're adding this check just to double-check that the
   *    client app is resilient to a potential issue with the update check.
   * 4) The server said there is an update, but the update's hash is the same as that
   *    of the binary's currently running version. This should only happen in Android -
   *    unlike iOS, we don't attach the binary's hash to the updateCheck request
   *    because we want to avoid having to install diff updates against the binary's
   *    version, which we can't do yet on Android.
   */
  if (!update || (update as NativeUpdateNotification).updateAppVersion ||
      localPackage && ((update as RemotePackage).packageHash === localPackage.packageHash) ||
      (!localPackage || (localPackage)._isDebugOnly) && config.packageHash === (update as RemotePackage).packageHash) {
    if (update && (update as NativeUpdateNotification).updateAppVersion) {
      console.log("An update is available but it is not targeting the binary version of your app.");
      if (handleBinaryVersionMismatchCallback && typeof handleBinaryVersionMismatchCallback === "function") {
        handleBinaryVersionMismatchCallback(update as RemotePackage)
      }
    }

    return null;
  } else {
    const remotePackage = { ...update, ...PackageMixins.remote(sdk.reportStatusDownload) } as RemotePackage;
    remotePackage.failedInstall = await NativeCodePush.isFailedUpdate(remotePackage.packageHash);
    remotePackage.deploymentKey = deploymentKey || nativeConfig.deploymentKey;
    return remotePackage;
  }
}

/**
 * Allows checking for an update, downloading it and installing it, all with a single call.
 *
 * @param options Options used to configure the end-user update experience (e.g. show an prompt?, install the update immediately?).
 * @param syncStatusChangedCallback An optional callback that allows tracking the status of the sync operation, as opposed to simply checking the resolved state via the returned Promise.
 * @param downloadProgressCallback An optional callback that allows tracking the progress of an update while it is being downloaded.
 * @param handleBinaryVersionMismatchCallback An optional callback for handling target binary version mismatch
 */

const getConfiguration = (() => {
  let config: CodePushConfiguration;
  return async function getConfiguration() {
    if (config) {
      return config;
    } else {
      config = await NativeCodePush.getConfiguration();
      return config;
    }
  };
})();

const CodePush = (options: CodePushOptions) => {
  if (typeof options === "function") {
    // Infer that the root component was directly passed to us.
    return codepushify(options);
  } else {
    return codepushify;
  }
};

// This ensures that notifyApplicationReadyInternal is only called once
// in the lifetime of this module instance.
const notifyApplicationReady = (() => {
  let notifyApplicationReadyPromise: Promise<StatusReport | void>;
  return () => {
    if (!notifyApplicationReadyPromise) {
      notifyApplicationReadyPromise = notifyApplicationReadyInternal();
    }

    return notifyApplicationReadyPromise;
  };
})();

const notifyApplicationReadyInternal =
  async (): Promise<StatusReport | void> => {
    await NativeCodePush.notifyApplicationReady();
    const statusReport = await NativeCodePush.getNewStatusReport();
    statusReport && tryReportStatus(statusReport); // Don't wait for this to complete.

    return statusReport;
  };

async function tryReportStatus(
  statusReport: StatusReport,
  retryOnAppResume?: { remove: () => void },
) {
  const config = await getConfiguration();
  const previousLabelOrAppVersion = statusReport.previousLabelOrAppVersion;
  const previousDeploymentKey =
    statusReport.previousDeploymentKey || config.deploymentKey;
  try {
    if (statusReport.appVersion) {
      console.log(`Reporting binary update (${statusReport.appVersion})`);

      if (!config.deploymentKey) {
        throw new Error("Deployment key is missed");
      }

        const sdk = new AcquisitionManager(requestFetchAdapter, config);
        await sdk.reportStatusDeploy(
          /* deployedPackage */ null,
          /* status */ null,
          previousLabelOrAppVersion,
          previousDeploymentKey,
        );
    } else {
      const label = statusReport.package?.label;
      if (statusReport.status === DeploymentStatus.SUCCEEDED) {
        console.log(`Reporting CodePush update success (${label})`);
      } else {
        console.log(`Reporting CodePush update rollback (${label})`);
        await NativeCodePush.setLatestRollbackInfo(
          statusReport.package?.packageHash || "",
        );
      }

      config.deploymentKey = statusReport.package?.deploymentKey || "";
        const sdk = new AcquisitionManager(requestFetchAdapter, config);
        await sdk.reportStatusDeploy(
          statusReport.package,
          statusReport.status,
          previousLabelOrAppVersion,
          previousDeploymentKey,
        );
    }

    NativeCodePush.recordStatusReported(statusReport);
    retryOnAppResume && retryOnAppResume.remove();
  } catch (e) {
    console.log(`Report status failed: ${JSON.stringify(statusReport)}`);
    NativeCodePush.saveStatusReportForRetry(statusReport);
    // Try again when the app resumes
    if (!retryOnAppResume) {
      const resumeListener = AppState.addEventListener(
        "change",
        async (newState) => {
          if (newState !== "active") return;
          const refreshedStatusReport =
            await NativeCodePush.getNewStatusReport();
          if (refreshedStatusReport) {
            tryReportStatus(refreshedStatusReport, resumeListener);
          } else {
            resumeListener && resumeListener.remove();
          }
        },
      );
    }
  }
}

const sync = (() => {
  // closures
  let syncInProgress = false;
  const setSyncCompleted = () => {
    syncInProgress = false;
  };
  /**
   * Allows checking for an update, downloading it and installing it, all with a single call.
   *
   * @param options Options used to configure the end-user update experience (e.g. show an prompt?, install the update immediately?).
   * @param syncStatusChangedCallback An optional callback that allows tracking the status of the sync operation, as opposed to simply checking the resolved state via the returned Promise.
   * @param downloadProgressCallback An optional callback that allows tracking the progress of an update while it is being downloaded.
   * @param handleBinaryVersionMismatchCallback An optional callback for handling target binary version mismatch
   */
  function _sync(
    options?: SyncOptions,
    syncStatusChangedCallback?: SyncStatusChangedCallback,
    downloadProgressCallback?: DownloadProgressCallback,
    handleBinaryVersionMismatchCallback?: HandleBinaryVersionMismatchCallback,
  ): Promise<SyncStatus> {
    let syncStatusCallbackWithTryCatch, downloadProgressCallbackWithTryCatch;
    if (typeof syncStatusChangedCallback === "function") {
      syncStatusCallbackWithTryCatch = (args: SyncStatus) => {
        try {
          syncStatusChangedCallback?.(args);
        } catch (error) {
          console.log(`An error has occurred : ${error.stack}`);
        }
      };
    }

    if (typeof downloadProgressCallback === "function") {
      downloadProgressCallbackWithTryCatch = (args: DownloadProgress) => {
        try {
          downloadProgressCallback?.(args);
        } catch (error) {
          console.log(`An error has occurred: ${error.stack}`);
        }
      };
    }

    if (syncInProgress) {
      typeof syncStatusCallbackWithTryCatch === "function"
        ? syncStatusCallbackWithTryCatch(SyncStatus.SYNC_IN_PROGRESS)
        : console.log("Sync already in progress.");
      return Promise.resolve(SyncStatus.SYNC_IN_PROGRESS);
    }

    syncInProgress = true;
    const syncPromise = syncInternal(
      options,
      syncStatusCallbackWithTryCatch,
      downloadProgressCallbackWithTryCatch,
      handleBinaryVersionMismatchCallback,
    );
    syncPromise.then(setSyncCompleted).catch(setSyncCompleted);

    return syncPromise;
  }
  return _sync;
})();

async function syncInternal(
  options?: SyncOptions,
  syncStatusChangeCallback?: SyncStatusChangedCallback,
  downloadProgressCallback?: DownloadProgressCallback,
  handleBinaryVersionMismatchCallback?: HandleBinaryVersionMismatchCallback,
): Promise<SyncStatus> {
  let resolvedInstallMode: InstallMode = InstallMode.ON_NEXT_RESTART;
  const syncOptions: SyncOptions = {
    deploymentKey: null,
    ignoreFailedUpdates: true,
    rollbackRetryOptions: null,
    installMode: InstallMode.ON_NEXT_RESTART,
    mandatoryInstallMode: InstallMode.IMMEDIATE,
    minimumBackgroundDuration: 0,
    updateDialog: null,
    ...options,
  };

  syncStatusChangeCallback =
    typeof syncStatusChangeCallback === "function"
      ? syncStatusChangeCallback
      : (syncStatus) => {
          switch (syncStatus) {
            case SyncStatus.CHECKING_FOR_UPDATE:
              console.log("Checking for update.");
              break;
            case SyncStatus.AWAITING_USER_ACTION:
              console.log("Awaiting user action.");
              break;
            case SyncStatus.DOWNLOADING_PACKAGE:
              console.log("Downloading package.");
              break;
            case SyncStatus.INSTALLING_UPDATE:
              console.log("Installing update.");
              break;
            case SyncStatus.UP_TO_DATE:
              console.log("App is up to date.");
              break;
            case SyncStatus.UPDATE_IGNORED:
              console.log("User cancelled the update.");
              break;
            case SyncStatus.UPDATE_INSTALLED:
              if (resolvedInstallMode == InstallMode.ON_NEXT_RESTART) {
                console.log(
                  "Update is installed and will be run on the next app restart.",
                );
              } else if (resolvedInstallMode == InstallMode.ON_NEXT_RESUME) {
                if (
                  syncOptions.minimumBackgroundDuration &&
                  syncOptions.minimumBackgroundDuration > 0
                ) {
                  console.log(
                    `Update is installed and will be run after the app has been in the background for at least ${syncOptions.minimumBackgroundDuration} seconds.`,
                  );
                } else {
                  console.log(
                    "Update is installed and will be run when the app next resumes.",
                  );
                }
              }
              break;
            case SyncStatus.UNKNOWN_ERROR:
              console.log("An unknown error occurred.");
              break;
          }
        };

  try {
    await notifyApplicationReady();

    syncStatusChangeCallback(SyncStatus.CHECKING_FOR_UPDATE);
    const remotePackage = await checkForUpdate(
      syncOptions.deploymentKey,
      handleBinaryVersionMismatchCallback,
    );

    const doDownloadAndInstall = async () => {
      syncStatusChangeCallback(SyncStatus.DOWNLOADING_PACKAGE);
      const localPackage = await remotePackage?.download(
        downloadProgressCallback,
      );

      // Determine the correct install mode based on whether the update is mandatory or not.
      resolvedInstallMode = localPackage?.isMandatory
        ? syncOptions.mandatoryInstallMode || InstallMode.IMMEDIATE
        : syncOptions.installMode || InstallMode.ON_NEXT_RESTART;

      syncStatusChangeCallback(SyncStatus.INSTALLING_UPDATE);
      await localPackage?.install(
        resolvedInstallMode,
        syncOptions.minimumBackgroundDuration,
        () => {
          syncStatusChangeCallback(SyncStatus.UPDATE_INSTALLED);
        },
      );

      return SyncStatus.UPDATE_INSTALLED;
    };

    const updateShouldBeIgnored = await shouldUpdateBeIgnored(
      remotePackage,
      syncOptions,
    );

    if (!remotePackage || updateShouldBeIgnored) {
      if (updateShouldBeIgnored) {
        console.log(
          "An update is available, but it is being ignored due to having been previously rolled back.",
        );
      }

      const currentPackage = await getCurrentPackage();
      if (currentPackage && currentPackage.isPending) {
        syncStatusChangeCallback(SyncStatus.UPDATE_INSTALLED);
        return SyncStatus.UPDATE_INSTALLED;
      } else {
        syncStatusChangeCallback(SyncStatus.UP_TO_DATE);
        return SyncStatus.UP_TO_DATE;
      }
    } else if (syncOptions.updateDialog) {
      // updateDialog supports any truthy value (e.g. true, "goo", 12),
      // but we should treat a non-object value as just the default dialog
      if (typeof syncOptions.updateDialog !== "object") {
        syncOptions.updateDialog = DEFAULT_UPDATE_DIALOG;
      } else {
        syncOptions.updateDialog = {
          ...DEFAULT_UPDATE_DIALOG,
          ...syncOptions.updateDialog,
        };
      }

      return await new Promise((resolve, reject) => {
        let message = "";
        let installButtonText: string | null = null;

        const dialogButtons: { text: string; onPress: () => void }[] = [];

        const updateDialog = typeof syncOptions.updateDialog !== "object" ? DEFAULT_UPDATE_DIALOG : syncOptions.updateDialog;

        if (remotePackage.isMandatory) {
          message = updateDialog?.mandatoryUpdateMessage || "";
          installButtonText = updateDialog?.mandatoryContinueButtonLabel || "";
        } else {
          message = updateDialog?.optionalUpdateMessage || "";
          installButtonText = updateDialog?.optionalInstallButtonLabel || "";
          // Since this is an optional update, add a button
          // to allow the end-user to ignore it
          dialogButtons.push({
            text: updateDialog?.optionalIgnoreButtonLabel || "",
            onPress: () => {
              syncStatusChangeCallback(SyncStatus.UPDATE_IGNORED);
              resolve(SyncStatus.UPDATE_IGNORED);
            }
          });
        }

        // Since the install button should be placed to the
        // right of any other button, add it last
        dialogButtons.push({
          text: installButtonText,
          onPress: () => {
            doDownloadAndInstall().then(resolve, reject);
          },
        });

        // If the update has a description, and the developer
        // explicitly chose to display it, then set that as the message
        if (
          updateDialog?.appendReleaseDescription &&
          remotePackage.description
        ) {
          message += `${updateDialog.descriptionPrefix} ${remotePackage.description}`;
        }

        syncStatusChangeCallback(SyncStatus.AWAITING_USER_ACTION);
        Alert.alert(updateDialog?.title || "", message, dialogButtons);
      });
    } else {
      return await doDownloadAndInstall();
    }
  } catch (error) {
    syncStatusChangeCallback(SyncStatus.UNKNOWN_ERROR);
    console.log(error.message);
    throw error;
  }
}

const latestRollbackInfoIsNotNull = (latestRollbackInfo: LatestRollbackInfo | null): latestRollbackInfo is LatestRollbackInfo => {
  return latestRollbackInfo !== null;
}


async function shouldUpdateBeIgnored(
  remotePackage: RemotePackage | null,
  syncOptions: SyncOptions,
): Promise<boolean> {
  let { rollbackRetryOptions } = syncOptions;

  const isFailedPackage = remotePackage && remotePackage.failedInstall;
  if (!isFailedPackage || !syncOptions.ignoreFailedUpdates) {
    return false;
  }

  if (!rollbackRetryOptions) {
    return true;
  }

  if (typeof rollbackRetryOptions !== "object") {
    rollbackRetryOptions = DEFAULT_ROLLBACK_RETRY_OPTIONS;
  } else {
    rollbackRetryOptions = {
      ...DEFAULT_ROLLBACK_RETRY_OPTIONS,
      ...rollbackRetryOptions,
    };
  }

  if (!validateRollbackRetryOptions(rollbackRetryOptions)) {
    return true;
  }

  const latestRollbackInfo = await NativeCodePush.getLatestRollbackInfo();
  const latestRollbackInfoIsNonNull = latestRollbackInfoIsNotNull(latestRollbackInfo);
  if (!latestRollbackInfoIsNonNull || !validateLatestRollbackInfo(latestRollbackInfo, remotePackage.packageHash)) {
    console.log("The latest rollback info is not valid.");
    return true;
  }

  const { delayInHours, maxRetryAttempts } = rollbackRetryOptions;
  const hoursSinceLatestRollback = (Date.now() - latestRollbackInfo.time) / (1000 * 60 * 60);
  if (!delayInHours || !maxRetryAttempts) {
    console.log("Previous rollback should be ignored due to rollback retry options.");
    return false;
  }
  if (delayInHours && maxRetryAttempts && hoursSinceLatestRollback >= delayInHours && maxRetryAttempts >= latestRollbackInfo.count) {
    console.log("Previous rollback should be ignored due to rollback retry options.");
    return false;
  }

  return true;
}

function validateLatestRollbackInfo(latestRollbackInfo: LatestRollbackInfo, packageHash: string): boolean {
  return !!(latestRollbackInfo &&
    latestRollbackInfo.time &&
    latestRollbackInfo.count &&
    latestRollbackInfo.packageHash &&
    latestRollbackInfo.packageHash === packageHash);
}

function validateRollbackRetryOptions(rollbackRetryOptions) {
  if (typeof rollbackRetryOptions.delayInHours !== "number") {
    console.log("The 'delayInHours' rollback retry parameter must be a number.");
    return false;
  }

  if (typeof rollbackRetryOptions.maxRetryAttempts !== "number") {
    console.log("The 'maxRetryAttempts' rollback retry parameter must be a number.");
    return false;
  }

  if (rollbackRetryOptions.maxRetryAttempts < 1) {
    console.log("The 'maxRetryAttempts' rollback retry parameter cannot be less then 1.");
    return false;
  }

  return true;
}

async function getCurrentPackage(): Promise<LocalPackage | null> {
  return await getUpdateMetadata(UpdateState.LATEST);;
}

async function getUpdateMetadata(updateState: UpdateState): Promise<LocalPackage | null> {
  let updateMetadata = await NativeCodePush.getUpdateMetadata(updateState || UpdateState.RUNNING);
  if (updateMetadata) {
    updateMetadata = {...PackageMixins.local, ...updateMetadata};
    updateMetadata.failedInstall = await NativeCodePush.isFailedUpdate(updateMetadata.packageHash);
    updateMetadata.isFirstRun = await NativeCodePush.isFirstRun(updateMetadata.packageHash);
  }
  return updateMetadata;
}

const codePush = Object.assign(CodePush, {
  CheckFrequency,
  SyncStatus,
  InstallMode,
  DeploymentStatus,
  DEFAULT_UPDATE_DIALOG,
  UpdateState,
  sync,
  notifyAppReady: notifyApplicationReady,
  notifyApplicationReady,
  DEFAULT_ROLLBACK_RETRY_OPTIONS,
});

export default codePush;
