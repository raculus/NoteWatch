async function downloadImageNative(url: string, role: string, hero: string): Promise<void> {
    const fileName = `${role}_${hero}.png`;
    // 백슬래시(\\) 대신 슬래시(/)를 사용하는 것이 경로 오류 방지에 더 효과적입니다.
    const localPath = `${overwolf.io.paths.localAppData}/NoteWatch/images/${fileName}`;

    return new Promise(async (resolve) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const blob = await response.blob();
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = reader.result as string;
                
                // writeFileContents의 결과를 반드시 콜백 내부에서 resolve 해야함
                overwolf.io.writeFileContents(
                    localPath,
                    base64Data,
                    overwolf.io.enums.eEncoding.UTF8,
                    false,
                    (result) => {
                        if (result.success) {
                            console.log(`[저장성공] ${fileName}`);
                        } else {
                            console.error(`[저장실패] ${fileName}: ${result.error}`);
                        }
                        resolve(); // 쓰기 시도가 끝나야만 resolve
                    }
                );
            };
            reader.onerror = () => {
                console.error("FileReader 에러");
                resolve();
            };
            reader.readAsDataURL(blob);
        } catch (e) {
            console.error(`다운로드 실패 (${hero}):`, e);
            resolve();
        }
    });
}
async function syncAllHeroImages() {
  const jsonData = await loadLocalCache();
  if (!jsonData) return;

  console.log("Simple-IO 기반 이미지 동기화 시작...");
  for (const role in jsonData) {
    for (const hero in jsonData[role]) {
      await downloadImageNative(jsonData[role][hero], role, hero);
    }
  }
  console.log("모든 이미지가 정상적으로(바이너리) 저장되었습니다.");
}
export {syncAllHeroImages};



const IMG_API_URL: string = "https://nw-img.jaehy.uk";
const LOCAL_STORAGE_PATH: string = `${overwolf.io.paths.localAppData}/NoteWatch/heroes_cache.json`;

let cachedData: any = null;


/**
 * 서버에서 JSON을 받아 로컬 파일로 저장합니다.
 */
async function syncHeroData(): Promise<void> {
    try {
        const response = await fetch(IMG_API_URL);
        if (!response.ok) throw new Error("네트워크 응답 에러");
        
        const data = await response.json();
        cachedData = data;

        // 오버울프 로컬 폴더에 파일 저장
        overwolf.io.writeFileContents(
            LOCAL_STORAGE_PATH,
            JSON.stringify(data),
            overwolf.io.enums.eEncoding.UTF8,
            false,
            (res) => {
                if (res.success) console.log("로컬 캐시 저장 완료");
            }
        );
    } catch (error) {
        console.error("데이터 동기화 실패:", error);
    }
}

/**
 * 로컬 파일에서 데이터를 로드합니다.
 */
async function loadLocalCache(): Promise<any> {
    return new Promise((resolve) => {
        overwolf.io.readFileContents(
            LOCAL_STORAGE_PATH,
            overwolf.io.enums.eEncoding.UTF8,
            (res) => {
                if (res.success && res.content) {
                    cachedData = JSON.parse(res.content);
                    resolve(cachedData);
                } else {
                    resolve(null);
                }
            }
        );
    });
}

async function getHeroIcon(role: string, hero: string): Promise<string> {
    const fileName = `${role}_${hero}.png`;
    const localPath = `${overwolf.io.paths.localAppData}/NoteWatch/images/${fileName}`;
    console.log(`이미지 로드 시작`)

    return new Promise((resolve) => {
        overwolf.io.readFileContents(localPath, overwolf.io.enums.eEncoding.UTF8, (res) => {
            if (res.success && res.content) {
                // 저장된 Base64 문자열을 그대로 반환 (img src에 바로 대입 가능)
                console.log(`${fileName} 로드 완료`)
                resolve(res.content);
            } else {
                // 파일이 없거나 에러 시 기본 이미지 반환
                console.error(`${fileName} 로드 실패`)
                resolve("../../img/heros/unknown.png");
            }
        });
    });
}

export { getHeroIcon, syncHeroData };