import { SampleAppView } from '../sample-app-view.js'
import { writeJSON, readJSON } from '../../scripts/utils/file-writer.js';
import i18n from '../../locale/index.js';
import { sortTable } from '../../scripts/utils/table-sort.js';
import { getGameState } from '../../scripts/utils/ow-state.js';

export class SecondView extends SampleAppView {
  constructor() {
    super();

    this._teamList = document.getElementById('teamTable');
    this._enemyList = document.getElementById('enemyTable');
    this._copyEventsButton = document.getElementById('copyEvents');
    this._copyInfoButton = document.getElementById('copyInfo');
    this._hotkeyToggle = document.getElementById('hotkey-toggle');
    this._hotkeySecondScreen = document.getElementById('hotkey-second-screen');
    this._owState = document.getElementById('ow-state');
    this.loadedJSON = {};

    // Function to update all elements with translation
    const updateUILanguage = () => {
      const elements = document.querySelectorAll('[data-i18n]');
      elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = i18n.get(key);
      });
      
      // Also update any dynamic content that might need translation
      // this._updateDynamicTranslations();
    };

    // Initialize language on page load
    document.addEventListener('DOMContentLoaded', () => {
      updateUILanguage();
      this.updateOWState();
    });

    // Listen for language changes from the Overwolf API
    window.addEventListener('languageChanged', () => {
      console.log(`Language changed to: ${i18n.getCurrentLanguage()}`);
      updateUILanguage();
    });
  }

  // -- Public --

  // Add a line to the events log
  logEvent() {
    console.log('match_end: roster clear');
    this._teamList.innerHTML = '';
    this._enemyList.innerHTML = '';

    for (let i = 0; i < 12; i++) {
      const row = document.createElement('tr');
      row.classList.add(`roster-${i}`);
      this._teamList.appendChild(row);
      this._enemyList.appendChild(row.cloneNode(true));
    }
  }

  // Add a line to the info updates log
  logInfoUpdate(parsed) {
    // const undefinedElem = document.getElementById("undefined");
    // undefinedElem.forEach(element => {
    //   element.id = '';
    //   element.innerHTML = '';
    // });

    if (parsed.is_teammate) {
      this._addRoster(this._teamList, parsed);
    }
    else{
      this._addRoster(this._enemyList, parsed);
    }
  }

  updateOWState() {    
    getGameState().then(state => {
      if (state) {
        function createCustomTooltip(content) {
          const tooltip = document.createElement('div');
          tooltip.classList.add('custom-tooltip');
          tooltip.textContent = content;
          document.body.appendChild(tooltip);
          return tooltip;
        }
        
        const stateIndicator = document.createElement('span');
        stateIndicator.classList.add('state-indicator');
        
        let tooltipContent = '';
        switch (state) {
          case 1:
            stateIndicator.style.backgroundColor = 'green';
            tooltipContent = i18n.get('state_green');
            break;
          case 2:
            stateIndicator.style.backgroundColor = 'yellow';
            tooltipContent = i18n.get('state_yellow');
            break;
          case 3:
            stateIndicator.style.backgroundColor = 'red';
            tooltipContent = i18n.get('state_red');
            break;
          default:
            stateIndicator.style.backgroundColor = 'gray';
            tooltipContent = i18n.get('state_unknown');
            break;
        }
        
        stateIndicator.style.cssText += `
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-left: 10px;
        `;
        
        let tooltip;
        this._owState.parentElement.addEventListener('mouseenter', (e) => {
          tooltip = createCustomTooltip(tooltipContent);
          tooltip.style.left = `${e.pageX + 10}px`;
          tooltip.style.top = `${e.pageY + 10}px`;
        });
        this._owState.parentElement.addEventListener('mousemove', (e) => {
          tooltip.style.left = `${e.pageX + 10}px`;
          tooltip.style.top = `${e.pageY + 10}px`;
        });
        this._owState.parentElement.addEventListener('mouseleave', () => {
          if (tooltip) tooltip.remove();
        });
        
        this._owState.appendChild(stateIndicator);
      } else {
        this._owState.textContent = "Not available";
      }
    }).catch(error => {
      console.error("Error getting game state:", error);
      this._owState.textContent = "Error";
    });
  }

  // Update toggle hotkey header
  updateToggleHotkey(hotkey) {
    this._hotkeyToggle.textContent = hotkey;
  }

  // Update second screen hotkey header
  updateSecondHotkey(hotkey) {
    this._hotkeySecondScreen.textContent = hotkey;
  }

  // -- Private --

  async _addRoster(tbody, parsed) {
    const roster_id = parsed.roster_id;
    const hero_role = parsed.hero_role;
    const hero_name = parsed.hero_name;
    const battlenet_tag = parsed.battlenet_tag;
    if (!battlenet_tag) {
      // console.error('Battlenet tag is missing');
      return;
    }
    // 기존 파일 읽기
    let content = await readJSON();
    
    // 기존 내용이 있으면 파싱
    if (content && content.trim() !== '') {
      try {
        this.loadedJSON = JSON.parse(content);
      } catch (err) {
        console.error('JSON 파싱 에러:', err);
        this.loadedJSON = {};  // 파싱 실패 시 빈 객체 사용
      }
    }
    const note = this.loadedJSON[battlenet_tag] || ''; // 메모 데이터 추가
    // console.log(`Adding ${player_name} (${battlenet_tag}) to ${roster_id} roster`);
  
    // 이미 존재하는 행(row) 찾기
    const rowId = `tr.roster-${roster_id}`;
    const existingRow = tbody.querySelector(rowId);
  
    // 새 행(row) 생성
    const row = document.createElement('tr');
    row.id = battlenet_tag;
    row.classList.add(`roster-${roster_id}`);
    const heroNameCell = document.createElement('td');
    heroNameCell.classList.add('hero-image');
    const tagCell = document.createElement('td');
    const noteCell = document.createElement('td');
  
    const heroImage = document.createElement('img');
    heroImage.src = `../../img/heros/${hero_name}.png`;
    heroImage.onerror = () => {
      heroImage.src = '../../img/heros/unknown.png';
      heroImage.alt = 'Unknown Hero';
    }
    heroImage.alt = hero_name;
    heroNameCell.appendChild(heroImage);
    const btag = document.createElement('span');
    btag.textContent = battlenet_tag;
    tagCell.appendChild(btag);
    const noteSpan = document.createElement('span');
    noteSpan.textContent = note;
    noteCell.appendChild(noteSpan);
    if (note.length > 0) {
      row.classList.add('has-note');
    }
  
    row.appendChild(heroNameCell);
    row.appendChild(tagCell);
    row.appendChild(noteCell);
    row.classList.add(hero_role);
    
    // 행 클릭 이벤트 추가
    row.addEventListener('click', (e) => {
      // document.body.classList.add('dialog-open');
      
      this._showInputDialog(parsed.battlenet_tag, noteCell);
    });

    row.addEventListener('remove', (e) => {
      // document.body.classList.remove('dialog-open');
    });
    
    // 이미 존재하는 행이 있으면 대체하고, 없으면 새로 추가
    if (existingRow) {
      // 기존 행을 새 행으로 대체
      tbody.replaceChild(row, existingRow);
      console.log(`Updated ${battlenet_tag} (${roster_id})`);
    }
    sortTable(tbody, row, hero_role, roster_id);
  }
  
  // 입력 다이얼로그 표시
  _showInputDialog(battlenet_tag, noteCell) {
    document.body.classList.add('dialog-open');

    // 기존 입력창이 있다면 삭제
    const existingDialog = document.getElementById('dialog-background');
    if (existingDialog) {
      existingDialog.remove();
    }
    
    const dialogBackground = document.createElement('div');
    dialogBackground.classList.add('dialog-background');

    const dialogExpand = document.createElement('div');
    dialogExpand.classList.add('dialog-expand');

    // 입력 다이얼로그 생성
    const dialog = document.createElement('div');
    dialog.id = 'note-dialog';
    dialog.classList.add('note-dialog');
    
    // 다이얼로그 제목
    const title = document.createElement('h3');
    title.textContent = i18n.get('player_memo', { battletag: battlenet_tag });
  
    // 텍스트 입력창
    const input = document.createElement('textarea');
    input.value = noteCell.textContent;
    input.placeholder = i18n.get('enter_memo_placeholder');
  
    // 저장 함수 정의
    const saveNote = async () => {
      try {
        // 배틀넷 태그를 키로 사용하여 데이터 병합
        this.loadedJSON[battlenet_tag] = input.value;
        
        // 병합된 데이터를 JSON 형태로 저장
        const mergedJson = JSON.stringify(this.loadedJSON, null, 2);  // 들여쓰기 포함
        
        // 파일에 저장
        await writeJSON(mergedJson);
        console.log('저장 완료:', battlenet_tag);
        const span = document.createElement('span');
        span.textContent = input.value;
        noteCell.innerHTML = '';  // 기존 내용 제거
        noteCell.appendChild(span);  // 메모 셀에 추가
        if (input.value.length > 0) {
          noteCell.parentElement.classList.add('has-note');
        } else {
          noteCell.parentElement.classList.remove('has-note');
        }
        
        // 메모 데이터 저장 후 다이얼로그 닫기
        dialogBackground.remove();
      } catch (error) {
        console.error('메모 저장 중 오류 발생:', error);
        alert('메모 저장 중 오류가 발생했습니다.');
      }
    };
    
    // 취소 함수 정의
    const cancelDialog = () => {
      dialogBackground.remove();
    };
    
    // 키보드 이벤트 추가 (Enter: 저장, Esc: 취소)
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // 기본 동작 방지 (줄바꿈 방지)
        await saveNote();
      } else if (e.key === 'Escape') {
        cancelDialog();
      }
    });
    
    // 버튼 컨테이너
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('button-container');
    
    // 취소 버튼
    const cancelButton = document.createElement('button');
    cancelButton.textContent = i18n.get('cancel');
    cancelButton.addEventListener('click', cancelDialog);

    // 저장 버튼
    const saveButton = document.createElement('button');
    saveButton.textContent = i18n.get('save');
    saveButton.addEventListener('click', saveNote);
    
    
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
}