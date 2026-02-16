import { OWGames, OWGameListener, OWWindow } from "@overwolf/overwolf-api-ts";

import { kWindowNames, kGameClassIds } from "../consts";

import RunningGameInfo = overwolf.games.RunningGameInfo;
import AppLaunchTriggeredEvent = overwolf.extensions.AppLaunchTriggeredEvent;
import { getApiState } from "../utils/ow-state";

import { syncHeroData, syncAllHeroImages } from "../utils/img";

// The background controller holds all of the app's background logic - hence its name. it has
// many possible use cases, for example sharing data between windows, or, in our case,
// managing which window is currently presented to the user. To that end, it holds a dictionary
// of the windows available in the app.
// Our background controller implements the Singleton design pattern, since only one
// instance of it should exist.
class BackgroundController {
  private static _instance: BackgroundController;
  private _windows: Record<string, OWWindow> = {};
  private _gameListener: OWGameListener;

  private constructor() {
    syncHeroData();
    syncAllHeroImages();
    // Populating the background controller's window dictionary
    this._windows[kWindowNames.desktop] = new OWWindow(kWindowNames.desktop);
    this._windows[kWindowNames.inGame] = new OWWindow(kWindowNames.inGame);
    this._windows[kWindowNames.second] = new OWWindow(kWindowNames.second);

    // When a a supported game game is started or is ended, toggle the app's windows
    this._gameListener = new OWGameListener({
      onGameStarted: this.toggleWindows.bind(this),
      onGameEnded: this.toggleWindows.bind(this),
    });

    overwolf.extensions.onAppLaunchTriggered.addListener((e) => this.onAppLaunchTriggered(e));
  }

  // Implementing the Singleton design pattern
  public static instance(): BackgroundController {
    if (!BackgroundController._instance) {
      BackgroundController._instance = new BackgroundController();
    }

    return BackgroundController._instance;
  }

  // When running the app, start listening to games' status and decide which window should
  // be launched first, based on whether a supported game is currently running
  public async run() {
    this._gameListener.start();

    const isSupportedGameRun = await this.isSupportedGameRunning(); 
    if (isSupportedGameRun){
      const info = await OWGames.getRunningGameInfo();
      const infoId = Number(info.id.toString().slice(0, -1));
      if (infoId){
        getApiState(infoId).then((state) => {
          let currWindowName = kWindowNames.desktop;
          console.log("Current game state:", state);
          if (state === 1) {
            currWindowName = kWindowNames.second;
            this._windows[currWindowName].restore();
          }
          else{
            currWindowName = kWindowNames.desktop;
            this._windows[currWindowName].restore();
          }
        });
      }
    }
    else{
      // If no supported game is running, launch the desktop window
      this._windows[kWindowNames.desktop].restore();
    }
  }

  private async onAppLaunchTriggered(e: AppLaunchTriggeredEvent) {
    console.log("onAppLaunchTriggered():", e);
    alert(e);

    if (!e || e.origin.includes("gamelaunchevent")) {
      return;
    }

    if (await this.isSupportedGameRunning()) {
      if (await getApiState() === 1){
        this._windows[kWindowNames.desktop].close();
        // this._windows[kWindowNames.inGame].restore();
        this._windows[kWindowNames.second].restore();
      }
      else{
        this._windows[kWindowNames.desktop].restore();
        this._windows[kWindowNames.inGame].close();
        this._windows[kWindowNames.second].close();
      }
    } else {
      // this._windows[kWindowNames.desktop].restore();
      this._windows[kWindowNames.inGame].close();
      this._windows[kWindowNames.second].close();
    }
  }
  private toggleWindows(info: RunningGameInfo) {
    if (!info || !this.isSupportedGame(info)) {
      return;
    }

    if (info.isRunning) {
      this._windows[kWindowNames.desktop].close();
      // this._windows[kWindowNames.inGame].restore();
      this._windows[kWindowNames.second].restore();
    } else {
      this._windows[kWindowNames.desktop].restore();
      this._windows[kWindowNames.inGame].close();
      this._windows[kWindowNames.second].close();
    }
  }

  private async isSupportedGameRunning(): Promise<boolean> {
    const info = await OWGames.getRunningGameInfo();

    return info && info.isRunning && this.isSupportedGame(info);
  }

  // Identify whether the RunningGameInfo object we have references a supported game
  private isSupportedGame(info: RunningGameInfo) {
    return kGameClassIds.includes(info.classId);
  }
}

BackgroundController.instance().run();
