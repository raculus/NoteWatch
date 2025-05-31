import { OWGames, OWGamesEvents, OWHotkeys } from "@overwolf/overwolf-api-ts";

import { AppWindow } from "../AppWindow";
import { kHotkeys, kWindowNames, kGamesFeatures } from "../consts";

import { readJSON, writeJSON } from "../utils/file";
import i18n from "../utils/locale";
import Tablesort from "tablesort";

import WindowState = overwolf.windows.WindowStateEx;

// The window displayed in-game while a game is running.
// It listens to all info events and to the game events listed in the consts.ts file
// and writes them to the relevant log using <pre> tags.
// The window also sets up Ctrl+F as the minimize/restore hotkey.
// Like the background window, it also implements the Singleton design pattern.
class Second extends AppWindow {
  private static _instance: Second;
  private _gameEventsListener: OWGamesEvents;

  private _teamList: HTMLElement;
  private _enemyList: HTMLElement;

  private loadedJSON: { [key: string]: string } = {}; // 메모 데이터를 저장할 객체

  private constructor() {
    super(kWindowNames.second);

    this._teamList = document.getElementById("teamTable");
    this._enemyList = document.getElementById("enemyTable");

    this.loadJSON();
    this.setToggleHotkeyBehavior();
    this.setToggleHotkeyText();

    // Function to update all elements with translation
    const updateUILanguage = () => {
      const elements = document.querySelectorAll("[data-i18n]");
      elements.forEach((element) => {
        const key = element.getAttribute("data-i18n");
        element.textContent = i18n.get(key);
      });

      // Also update any dynamic content that might need translation
      // this._updateDynamicTranslations();
    };

    // Initialize language on page load
    document.addEventListener("DOMContentLoaded", () => {
      updateUILanguage();
    });

    // Listen for language changes from the Overwolf API
    window.addEventListener("languageChanged", () => {
      console.log(`Language changed to: ${i18n.getCurrentLanguage()}`);
      updateUILanguage();
    });
  }

  public static instance() {
    if (!this._instance) {
      this._instance = new Second();
    }

    return this._instance;
  }

  private async loadJSON() {
    // 기존 파일 읽기
    let content = await readJSON();
    // 기존 내용이 있으면 파싱
    if (content && content.trim() !== "") {
      try {
        this.loadedJSON = JSON.parse(content);
      } catch (err) {
        console.error("JSON 파싱 에러:", err);
        this.loadedJSON = {}; // 파싱 실패 시 빈 객체 사용
      }
    }
  }

  private onInfoUpdates(info) {
    const roster = info.roster;
    // 모든 플레이어 정보 추출
    let players = Object.keys(roster)
      .map((key) => {
        try {
          const parsed = JSON.parse(roster[key]);
          return {
            roster_id: parseInt(key.replace(/\D/g, "")),
            ...parsed,
          };
        } catch (e) {
          console.error("Failed to parse roster entry:", key, roster[key]);
          return null;
        }
      })
      .filter((player) => player !== null && !player.is_local);

    const rolePriority: { [key: string]: number } = {
      TANK: 0,
      DAMAGE: 1,
      SUPPORT: 2,
      UNKNOWN: 3,
    };
    players.sort((a, b) => {
      const roleA = rolePriority[a.hero_role] ?? rolePriority.UNKNOWN;
      const roleB = rolePriority[b.hero_role] ?? rolePriority.UNKNOWN;
      if (roleA !== roleB) {
        return roleA - roleB;
      }
      return a.roster_id - b.roster_id;
    });
    this.addRoster(players);
  }

  public async run() {
    const gameClassId = await this.getCurrentGameClassId();

    const gameFeatures = kGamesFeatures.get(gameClassId);

    if (gameFeatures && gameFeatures.length) {
      this._gameEventsListener = new OWGamesEvents(
        {
          onInfoUpdates: this.onInfoUpdates.bind(this),
          onNewEvents: this.onNewEvents.bind(this),
        },
        gameFeatures
      );

      this._gameEventsListener.start();
    }
  }

  // Displays the toggle minimize/restore hotkey in the window header
  private async setToggleHotkeyText() {
    const gameClassId = await this.getCurrentGameClassId();
    const hotkeyText = await OWHotkeys.getHotkeyText(kHotkeys.custom, gameClassId);
    const hotkeyElem = document.getElementById("hotkey");
    hotkeyElem.textContent = hotkeyText;
  }

  // Sets toggleInGameWindow as the behavior for the Ctrl+F hotkey
  private async setToggleHotkeyBehavior() {
    const toggleWindow = async (hotkeyResult: overwolf.settings.hotkeys.OnPressedEvent): Promise<void> => {
      console.log(`pressed hotkey for ${hotkeyResult.name}`);
      const windowState = await this.getWindowState();

      if (windowState.window_state === WindowState.NORMAL || windowState.window_state === WindowState.MAXIMIZED) {
        this.currWindow.minimize();
      } else if (windowState.window_state === WindowState.MINIMIZED || windowState.window_state === WindowState.CLOSED) {
        this.currWindow.restore();
      }
    };

    OWHotkeys.onHotkeyDown(kHotkeys.custom, toggleWindow);
  }

  private onNewEvents(e) {
    e.events.some((event) => {
      // console.log("Received event:", event);
      switch (event.name) {
        case "matchStart":
        case "match_start":
          break;
        default:
          // console.warn("Unknown event received:", event);
          return;
      }
      console.log("Received match start event, clearing roster tables");
      // 테이블 초기화
      this._teamList.innerHTML = "";
      this._enemyList.innerHTML = "";

      for (let i = 0; i < 12; i++) {
        const row = document.createElement("tr");
        row.classList.add(`roster-${i}`);
        this._teamList.appendChild(row);
        this._enemyList.appendChild(row.cloneNode(true));
      }
    });
  }

  // Appends a new line to the specified log
  private async addRoster(players) {
    players.forEach((player) => {
      if (!player || !player.battlenet_tag) {
        return;
      }

      const tbody = player.is_teammate ? this._teamList : this._enemyList;
      // roster_id에 맞는 tr을 찾음
      const tr = tbody.querySelector(`tr.roster-${player.roster_id}`) as HTMLTableRowElement;
      if (!tr) return;
      // 기존 td 모두 제거 (중복 방지)
      tr.innerHTML = "";

      // 영웅 이미지 td
      const hero_name_td = document.createElement("td");
      const heroImage = document.createElement("img");
      heroImage.src = `../../img/heros/${player.hero_name}.png`;
      heroImage.onerror = () => {
        heroImage.src = "../../img/heros/unknown.png";
        heroImage.alt = "Unknown Hero";
      };
      heroImage.alt = player.hero_name;
      hero_name_td.appendChild(heroImage);
      hero_name_td.className = "hero-image";
      tr.appendChild(hero_name_td);

      // 배틀태그 td
      const btag_td = document.createElement("td");
      const btag_span = document.createElement("span");
      btag_span.textContent = player.battlenet_tag;
      btag_td.appendChild(btag_span);
      tr.appendChild(btag_td);

      // 메모 td
      const note = this.loadedJSON[player.battlenet_tag] || ""; // 메모 데이터 추가

      const note_td = document.createElement("td");
      note_td.classList.add("note-cell");
      const note_span = document.createElement("span");
      note_span.textContent = note;
      note_td.appendChild(note_span);
      if (note_span.textContent.length > 0) {
        tr.classList.add("has-note");
      }
      tr.appendChild(note_td);

      // 행 클릭 이벤트 추가
      tr.addEventListener("click", (e) => {
        this._showInputDialog(player.battlenet_tag, note_td);
      });
    });
  }
  // 입력 다이얼로그 표시
  _showInputDialog(battlenet_tag, noteCell) {
    document.body.classList.add("dialog-open");

    // 기존 입력창이 있다면 삭제
    const existingDialog = document.getElementById("dialog-background");
    if (existingDialog) {
      existingDialog.remove();
    }

    const dialogBackground = document.createElement("div");
    dialogBackground.classList.add("dialog-background");

    const dialogExpand = document.createElement("div");
    dialogExpand.classList.add("dialog-expand");

    // 입력 다이얼로그 생성
    const dialog = document.createElement("div");
    dialog.id = "note-dialog";
    dialog.classList.add("note-dialog");

    // 다이얼로그 제목
    const title = document.createElement("h3");
    title.textContent = i18n.get("player_memo", { battletag: battlenet_tag });

    // 텍스트 입력창
    const input = document.createElement("textarea");
    input.value = noteCell.textContent;
    input.placeholder = i18n.get("enter_memo_placeholder");

    // 저장 함수 정의
    const saveNote = async () => {
      try {
        // 배틀넷 태그를 키로 사용하여 데이터 병합
        if (input.value.trim().length > 0) {
          this.loadedJSON[battlenet_tag] = input.value;
          noteCell.parentElement.classList.add("has-note");
        } else {
          delete this.loadedJSON[battlenet_tag]; // 공백이면 해당 항목 삭제
          noteCell.parentElement.classList.remove("has-note");
        }

        // 병합된 데이터를 JSON 형태로 저장
        const mergedJson = JSON.stringify(this.loadedJSON, null, 2); // 들여쓰기 포함

        // 파일에 저장
        await writeJSON(mergedJson);
        console.log("저장 완료:", battlenet_tag);

        const span = document.createElement("span");
        span.textContent = input.value;
        noteCell.innerHTML = ""; // 기존 내용 제거
        noteCell.appendChild(span); // 메모 셀에 추가

        // 메모 데이터 저장 후 다이얼로그 닫기
        dialogBackground.remove();
      } catch (error) {
        console.error("메모 저장 중 오류 발생:", error);
        alert("메모 저장 중 오류가 발생했습니다.");
      }
    };

    // 취소 함수 정의
    const cancelDialog = () => {
      dialogBackground.remove();
    };

    // 키보드 이벤트 추가 (Enter: 저장, Esc: 취소)
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // 기본 동작 방지 (줄바꿈 방지)
        await saveNote();
      } else if (e.key === "Escape") {
        cancelDialog();
      }
    });

    // 버튼 컨테이너
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("button-container");

    // 취소 버튼
    const cancelButton = document.createElement("button");
    cancelButton.textContent = i18n.get("cancel");
    cancelButton.addEventListener("click", cancelDialog);

    // 저장 버튼
    const saveButton = document.createElement("button");
    saveButton.textContent = i18n.get("save");
    saveButton.addEventListener("click", saveNote);

    // 버튼 추가
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(saveButton);

    // 다이얼로그에 요소 추가
    dialog.appendChild(title);
    dialog.appendChild(input);
    dialog.appendChild(buttonContainer);

    dialogBackground.appendChild(dialogExpand);
    dialogBackground.appendChild(dialog);

    // 다이얼로그를 body에 추가
    document.body.appendChild(dialogBackground);

    // 입력창에 포커스
    input.focus();
  }

  private async getCurrentGameClassId(): Promise<number | null> {
    const info = await OWGames.getRunningGameInfo();

    return info && info.isRunning && info.classId ? info.classId : null;
  }
}

Second.instance().run();
