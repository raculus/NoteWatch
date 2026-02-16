import { OWGames, OWGamesEvents, OWHotkeys } from "@overwolf/overwolf-api-ts";

import { AppWindow } from "../AppWindow";
import { kHotkeys, kWindowNames, kGamesFeatures } from "../consts";

import MemoManager from "../utils/memo";
import i18n from "../utils/locale";
import { getHeroIcon } from "../utils/img";

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

  async loadJSON() {
    await MemoManager.loadJSON();
  }

  public static instance() {
    if (!this._instance) {
      this._instance = new Second();
    }

    return this._instance;
  }

  private onInfoUpdates(info) {
    if (!info || !info.roster) {
      return;
    }
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
          console.warn("Unknown event received:", event);
          return;
      }
      console.log("Received match start event, clearing roster tables");
      // 테이블 초기화
      // FIXME: roster이벤트가 발생하고 테이블 초기화가 발생

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

  private async addRoster(players) {
      console.log("Adding roster:", players);
      players.forEach((player) => {
        if (!player || !player.battlenet_tag) {
          return;
        }

        const tbody = player.is_teammate ? this._teamList : this._enemyList;
        // roster_id에 맞는 tr을 찾음
        const tr = tbody.querySelector(`tr.roster-${player.roster_id}`) as HTMLTableRowElement;
        if (!tr) return;

        // -----------------------------------------------------
        // ⭐ 이미지 중복 요청 방지 로직 추가 시작 ⭐
        // -----------------------------------------------------
        const currentHeroName = tr.getAttribute("data-hero-name");
        const newHeroName = player.hero_name;

        // 1. 기존 영웅 이름과 새로 들어온 영웅 이름이 같으면 이미지 업데이트 생략
        if (currentHeroName === newHeroName) {
          // 배틀태그와 메모 셀에 대한 업데이트 로직은 계속 진행해야 합니다.
        } else {
          // 2. 영웅 이름이 다르거나 처음 설정하는 경우에만 이미지 요청 및 셀 초기화
          
          // 기존 td 모두 제거 (중복 방지)
          tr.innerHTML = "";
          
          // 영웅 이미지 td
          const hero_name_td = document.createElement("td");
          const heroImage = document.createElement("img");
          
          // API 요청 및 이미지 업데이트
          getHeroIcon(player.hero_role, newHeroName).then(url => {
            heroImage.src = url;
          }).catch(() => {
            heroImage.src = "../../img/heros/unknown.png";
            heroImage.alt = "Unknown Hero";
          });
          
          heroImage.alt = newHeroName;
          hero_name_td.appendChild(heroImage);
          hero_name_td.className = "hero-image";
          tr.appendChild(hero_name_td);
          
          // tr 요소에 현재 영웅 이름을 저장하여 다음 업데이트 시 비교
          tr.setAttribute("data-hero-name", newHeroName);
        }
        // -----------------------------------------------------
        // ⭐ 이미지 중복 요청 방지 로직 추가 종료 ⭐
        // -----------------------------------------------------

        // ⭐ 중요: 영웅 이름이 변경되지 않았을 때도 나머지 셀 (배틀태그, 메모)은 처리해야 합니다.
        // 따라서 tr.innerHTML = ""; 을 if/else 블록 내부로 옮기고,
        // 아래 코드에서는 영웅 이미지 td가 이미 tr에 추가되어 있음을 가정하고 진행해야 합니다.

        // 이미지가 변경되지 않았다면, tr의 첫 번째 자식 (hero_name_td)는 이미 존재합니다.
        // 이미지가 변경되었다면, 위 블록에서 tr.innerHTML=""로 초기화 후 새로 hero_name_td가 추가되었습니다.

        // 기존 셀들을 찾거나 새로 만듭니다. (재사용을 위해 querySelector 사용)

        let btag_td = tr.querySelector(".btag-cell") as HTMLTableCellElement;
        let note_td = tr.querySelector(".note-cell") as HTMLTableCellElement;

        // 셀이 없으면 (초기 로딩 또는 영웅 변경으로 tr.innerHTML가 초기화된 경우) 새로 생성하여 추가
        if (!btag_td) {
            btag_td = document.createElement("td");
            btag_td.classList.add("btag-cell");
            tr.appendChild(btag_td);
        }
        if (!note_td) {
            note_td = document.createElement("td");
            note_td.classList.add("note-cell");
            tr.appendChild(note_td);
        }

        // 배틀태그 td 업데이트
        const btag_span = btag_td.querySelector("span") || document.createElement("span");
        btag_span.textContent = player.battlenet_tag;
        if (!btag_td.contains(btag_span)) btag_td.appendChild(btag_span);


        // 메모 td 업데이트
        const note = MemoManager.getMemos()[player.battlenet_tag] || ""; // 메모 데이터 추가
        const note_span = note_td.querySelector("span") || document.createElement("span");
        note_span.textContent = note;
        if (!note_td.contains(note_span)) note_td.appendChild(note_span);

        if (note_span.textContent.length > 0) {
          tr.classList.add("has-note");
        } else {
          tr.classList.remove("has-note");
        }
        
        // 행 클릭 이벤트 추가 (이 로직은 변경 없음)
        if (!tr.hasAttribute("has-player")) {
          tr.addEventListener("click", (e) => {
            this._showInputDialog(player.battlenet_tag, note_td);
          });
          tr.setAttribute("has-player", "true");
        }
      });
  }
  // 입력 다이얼로그 표시
  _showInputDialog(battlenet_tag, note_td) {
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
    overwolf.utils.placeOnClipboard(battlenet_tag);

    // 텍스트 입력창
    const input = document.createElement("textarea");
    input.value = note_td.textContent;
    input.placeholder = i18n.get("enter_memo_placeholder");

    // 저장 함수 정의
    const saveNote = async () => {
      try {
        // 배틀넷 태그를 키로 사용하여 데이터 병합
        if (input.value.trim().length > 0) {
        MemoManager.getMemos()[battlenet_tag] = input.value;
        MemoManager.saveMemo(battlenet_tag, input.value);
          if (note_td.parentElement) {
            note_td.parentElement.classList.add("has-note");
          }
        } else {
          MemoManager.deleteMemo(battlenet_tag);
          if (note_td.parentElement) {
            note_td.parentElement.classList.remove("has-note");
          }
        }
        const span = document.createElement("span");
        span.textContent = input.value;
        note_td.innerHTML = ""; // 기존 내용 제거
        note_td.appendChild(span); // 메모 셀에 추가

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
