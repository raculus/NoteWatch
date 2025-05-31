import { SecondView } from './second-view.js';
import { HotkeysService } from '../../scripts/services/hotkeys-service.js';
import { RunningGameService } from '../../scripts/services/running-game-service.js';
import { WindowsService } from '../../scripts/services/windows-service.js';
import { kHotkeyToggle, kHotkeySecondScreen } from '../../scripts/constants/hotkeys-ids.js';
import { kWindowNames } from '../../scripts/constants/window-names.js';

import { initializeFileIfNeeded} from '../../scripts/utils/file-writer.js';

export class SecondController {
  constructor() {
    this.secondView = new SecondView();
    this.hotkeysService = new HotkeysService();
    this.runningGameService = new RunningGameService();

    this._eventListenerBound = this._eventListener.bind(this);

    this.owEventBus = null;
  }

  async run() {
    await initializeFileIfNeeded();
    // Get the event bus instance from the background window
    const { owEventBus } = overwolf.windows.getMainWindow();

    this.owEventBus = owEventBus;

    this._readStoredData();

    // This callback will run in the context of the current window
    this.owEventBus.addListener(this._eventListenerBound);

    // Update hotkey view and listen to changes:
    this._updateHotkeys();
    this.hotkeysService.addHotkeyChangeListener(() => this._updateHotkeys());

    this._addBeforeCloseListener();

    this._positionWindow();
  }

  /**
   * This removes second window's listener from the event bus when the window
   * closes
   */
  _addBeforeCloseListener() {
    window.addEventListener('beforeunload', e => {
      delete e.returnValue;

      this.owEventBus.removeListener(this._eventListenerBound);
    });
  }

  /**
   * Read & render events and info updates that happened before this was opened
   */
  _readStoredData() {
    const {
      owEventsStore,
      owInfoUpdatesStore
    } = overwolf.windows.getMainWindow();

    owEventsStore.forEach(v => this._gameEventHandler(v));
    owInfoUpdatesStore.forEach(v => this._infoUpdateHandler(v));
  }

  async _updateHotkeys() {
    const gameInfo = await this.runningGameService.getRunningGameInfo();

    const [
      hotkeyToggle,
      hotkeySecondScreen
    ] = await Promise.all([
      this.hotkeysService.getHotkey(
        kHotkeyToggle,
        gameInfo.classId
      ),
      this.hotkeysService.getHotkey(
        kHotkeySecondScreen,
        gameInfo.classId
      )
    ]);

    this.secondView.updateToggleHotkey(hotkeyToggle);
    this.secondView.updateSecondHotkey(hotkeySecondScreen);
  }

  /**
   * Position & center this window on a secondary monitor
   */
  async _positionWindow() {
    const [
      { window },
      monitors
    ] = await Promise.all([
      WindowsService.obtainWindow(kWindowNames.SECOND),
      WindowsService.getMonitorsList()
    ]);

    let
      monitor = monitors[0], // A fallback monitor
      monitorSize = 0; // Area of secondary monitor

    // Find the largest non-primary monitor by area
    for (const v of monitors) {
      if (
        !v.is_primary &&
        ((v.width * v.height) > monitorSize)
      ) {
        monitor = v;
        monitorSize = v.width * v.height;
      }
    }

    // Only adjust position if the window is not already
    // on the secondary monitor
    if (window.monitorId !== monitor.id) {
      const
        scale = monitor.dpiX / 96, // Scaling factor of secondary monitor
        monitorLogicalWidth = monitor.width / scale,
        monitorLogicalHeight = monitor.height / scale

      let
        left = monitor.x + (monitorLogicalWidth / 2) - (window.width / 2),
        top = monitor.y + (monitorLogicalHeight / 2) - (window.height / 2);

      left = Math.floor(Math.max(left, monitor.x));
      top = Math.floor(Math.max(top, monitor.y));

      // Position the window in the center of the secondary monitor
      const changePositionResult = await WindowsService.changePosition(
        kWindowNames.SECOND,
        left,
        top
      );

      console.log('positionWindow(): position adjusted:', {
        changePositionResult,
        monitor
      });
    }

    await WindowsService.bringToFront(kWindowNames.SECOND);
  }

  _eventListener(eventName, eventValue) {
    switch (eventName) {
      case 'event': {
        this._gameEventHandler(eventValue);
        break;
      }
      case 'info': {
        // console.log(eventValue);
        this._infoUpdateHandler(eventValue);
        break;
      }
    }
  }

  // Logs events
  _gameEventHandler(event) {
    if(event.name === "match_start"){
      this.secondView.logEvent(JSON.stringify(event));
    }
  }

  // Logs info updates
  async _infoUpdateHandler(infoUpdate) {
    const roster = infoUpdate.info.roster;

    const extractedPlayers = Object.keys(roster)
    .map(key => {
        const parsed = JSON.parse(roster[key]);
        return {
            roster_id: parseInt(key.replace(/\D/g, '')),
            hero_name: parsed.hero_name,
            battlenet_tag: parsed.battlenet_tag,
            is_local: parsed.is_local,
            hero_role: parsed.hero_role,
            is_teammate: parsed.is_teammate
        };
    })
    .filter(player => !player.is_local)[0];
    
    if (!extractedPlayers) {
      return;
    }
    else if (extractedPlayers.length === 0) {
      return;
    }
    // console.log(extractedPlayers);
    this.secondView.logInfoUpdate(extractedPlayers);
  }
}
