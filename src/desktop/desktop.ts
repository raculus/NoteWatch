import { AppWindow } from "../AppWindow";
import { kWindowNames } from "../consts";

import { readJSON, writeJSON } from "../utils/file";
import i18n from "../utils/locale";
// import showInputDialog from "../utils/dialog";

class Desktop extends AppWindow {
  private static _instance: Desktop;

  private loadedJSON: { [key: string]: string } = {}; // 메모 데이터를 저장할 객체

  private memoList: HTMLElement;

  private constructor() {
    super(kWindowNames.desktop);

    this.memoList = document.getElementById("memo-list");
    this.loadJSON();

    // Function to update all elements with translation
    const updateUILanguage = () => {
      const elements = document.querySelectorAll("[data-i18n]");
      elements.forEach((element) => {
        const key = element.getAttribute("data-i18n");
        element.textContent = i18n.get(key);
      });

      const elementsPlaceholder = document.querySelectorAll("[data-i18n-placeholder]");
      elementsPlaceholder.forEach((element) => {
        const key = element.getAttribute("data-i18n-placeholder");
        if (key) {
          (element as HTMLInputElement).placeholder = i18n.get(key);
        }
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

  updateMemoList() {
    Object.entries(this.loadedJSON).forEach(([btag, memo]) => {
      const tr = document.createElement("tr");
      const btag_td = document.createElement("td");
      const btag_span = document.createElement("span");
      btag_span.textContent = btag;
      btag_td.appendChild(btag_span);
      tr.appendChild(btag_td);
      const memo_td = document.createElement("td");
      const memo_span = document.createElement("span");
      memo_span.textContent = memo;
      memo_td.appendChild(memo_span);
      tr.appendChild(memo_td);

      // add click event
      tr.addEventListener("click", () => {
        this._showInputDialog(btag, memo_td);
      });

      this.memoList.appendChild(tr);
    });
  }
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
        } else {
          delete this.loadedJSON[battlenet_tag]; // 공백이면 해당 항목 삭제
          noteCell.parentElement.remove();
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

  private async loadJSON() {
    // 기존 파일 읽기
    let content = await readJSON();
    // 기존 내용이 있으면 파싱
    if (content && content.trim() !== "") {
      try {
        this.loadedJSON = JSON.parse(content);
        this.updateMemoList();
      } catch (err) {
        console.error("JSON 파싱 에러:", err);
        this.loadedJSON = {}; // 파싱 실패 시 빈 객체 사용
      }
    }
  }

  public static instance() {
    if (!this._instance) {
      this._instance = new Desktop();
    }

    return this._instance;
  }
}

Desktop.instance();

// // The desktop window is the window displayed while game is not running.
// // In our case, our desktop window has no logic - it only displays static data.
// // Therefore, only the generic AppWindow class is called.
// new AppWindow(kWindowNames.desktop);
