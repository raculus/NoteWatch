import { addNote, getNotes, deleteNote, migrateNotes, getNotesCount } from "../utils/db";
import { readJSON, writeJSON } from "../utils/file";

class MemoManager {
  private static loadedJSON: any = {};
  private static username: string | null = null;
  private static isLogin: boolean = false;
  private static initialized: boolean = false;

  constructor() {
    MemoManager.init();
  }

  static async init() {
    if (this.initialized) return;

    try {
      const result = await new Promise<overwolf.profile.GetCurrentUserResult>((resolve) => {
        overwolf.profile.getCurrentUser(resolve);
      });
      if (result && result.success) {
        this.username = result.username;
        this.isLogin = true;
      }
    } catch (err) {
      console.error("Failed to get current user:", err);
    }

    this.initialized = true;
  }

  private static async loadFromLocal() {
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

  private static async loadFromDB(username: string) {
    let content = await getNotes(username);
    try {
      this.loadedJSON = content;
      console.log("loadFromDB 완료:", this.loadedJSON);
    } catch (err) {
      console.error("메모 데이터 로딩 에러:", err);
      this.loadedJSON = {}; // 실패 시 빈 객체 사용
    }
  }

  static async loadJSON() {
    await this.init(); // 초기화 확인

    if (this.isLogin) {
      // DB 노트 없으면
      if ((await this.getNotesCount()) < 1) {
        console.warn("No notes found in the database, loading from local file");
        await this.loadFromLocal();
        if (Object.keys(this.loadedJSON).length === 0) {
          console.warn("No notes found in local file, starting migration");
          return;
        }
        await migrateNotes(this.username, this.loadedJSON);
      }
      // DB 노트 있으면
      else {
        console.log("Loading notes from database");
        await this.loadFromDB(this.username);
      }
    } else {
      console.log("Loading notes from local file");
      await this.loadFromLocal();
    }
  }

  // 노트 개수 조회
  public static async getNotesCount(): Promise<number> {
    try {
      const result = await getNotesCount(this.username);
      console.log(`User ${this.username} has ${result.count} notes`);
      return result.count;
    } catch (error) {
      console.error("Failed to get notes count:", error);
      throw error;
    }
  }

  private static async saveMemoFromDB(key: string, value: string) {
    await addNote(this.username, key, value);
  }

  private static async saveMemoFromLocal(battlenet_tag: string, value: string) {
    try {
      // 배틀넷 태그를 키로 사용하여 데이터 병합
      this.loadedJSON[battlenet_tag] = value;

      // 병합된 데이터를 JSON 형태로 저장
      const mergedJson = JSON.stringify(this.loadedJSON, null, 2); // 들여쓰기 포함

      // 파일에 저장
      await writeJSON(mergedJson);
      console.log("저장 완료:", battlenet_tag);
    } catch (error) {
      console.error("메모 저장 중 오류 발생:", error);
      alert("메모 저장 중 오류가 발생했습니다.");
    }
  }

  // 메모 저장
  static async saveMemo(key: string, value: string) {
    await this.init(); // 초기화 확인

    if (value.trim().length < 1) {
      await this.deleteMemo(key);
      return;
    } else if (this.isLogin) {
      await this.saveMemoFromDB(key, value);
    } else {
      await this.saveMemoFromLocal(key, value);
    }
  }

  static async deleteMemo(key: string) {
    await this.init(); // 초기화 확인

    if (this.isLogin) {
      await deleteNote(this.username, key);
    } else {
      // 로컬 파일에서 삭제
      delete this.loadedJSON[key];
      const updatedJson = JSON.stringify(this.loadedJSON, null, 2);
      await writeJSON(updatedJson);
    }
    console.log("메모 삭제 완료:", key);
  }

  // JSON 데이터 마이그레이션
  static async migrateFromJson(jsonData: { [key: string]: string }): Promise<void> {
    try {
      const result = await migrateNotes(this.username, jsonData);
      console.log(`Migration completed: ${result.notes_migrated} notes migrated`);
    } catch (error) {
      console.error("Failed to migrate notes:", error);
      throw error;
    }
  }
  static getMemos() {
    return this.loadedJSON;
  }

  static getUsername() {
    return this.username;
  }

  static isUserLoggedIn() {
    return this.isLogin;
  }
}

export default MemoManager;
