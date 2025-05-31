// TypeScript - FastAPI notepad 서버와 연동용 API 함수

const API_URL = "http://notewatch.jaehy.uk";

// 노트 타입
export type NoteDict = { [key: string]: string };

interface MigrationResponse {
  message: string;
  notes_migrated?: number;
  notes_count?: number;
  username: string;
}

// 노트 추가(등록/수정)
export async function addNote(username: string, btag: string, memo: string) {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(username)}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: btag, value: memo }),
  });
  if (!res.ok) throw new Error("Note 등록 실패");
  return await res.json();
}

// 모든 노트 가져오기 (딕셔너리)
export async function getNotes(username: string): Promise<NoteDict> {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(username)}/notes`);
  if (!res.ok) throw new Error("노트 조회 실패");
  return await res.json(); // { "key1": "value1", ... }
}

// 노트 삭제
export async function deleteNote(username: string, btag: string) {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(username)}/notes/${encodeURIComponent(btag)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("노트 삭제 실패");
  return await res.json();
}

export async function migrateNotes(username: string, notes: { [key: string]: string }): Promise<MigrationResponse> {
  try {
    const response = await fetch(`${API_URL}/users/${encodeURIComponent(username)}/migrate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notes }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error migrating notes:", error);
    throw error;
  }
}
interface NotesCountResponse {
  count: number;
  username: string;
}
export async function getNotesCount(username: string): Promise<NotesCountResponse> {
  try {
    const response = await fetch(`${API_URL}/users/${encodeURIComponent(username)}/notes/count`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting notes count:", error);
    throw error;
  }
}

// 모든 노트 교체
export async function replaceAllNotes(username: string, notes: { [key: string]: string }): Promise<MigrationResponse> {
  try {
    const response = await fetch(`${API_URL}/users/${encodeURIComponent(username)}/migrate/replace`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notes }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error replacing notes:", error);
    throw error;
  }
}
