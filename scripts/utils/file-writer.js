const PATH = overwolf.io.paths.localAppData + "\\ow2_players_memo.json";

function writeJSON(content) {
  return new Promise((resolve, reject) => {
      overwolf.io.writeFileContents(
          PATH,
          content,
          overwolf.io.enums.eEncoding.UTF8,
          true,
          (result) => {
              if (result.success) {
                  console.log("파일 생성/덮어쓰기 성공:", PATH);
                  resolve(true);
              } else {
                  console.error("파일 쓰기 실패:", result.error);
                  reject(result.error);
              }
          }
      );
  });
}

// Add initialization function to be called explicitly
async function initializeFileIfNeeded() {
    if (!(await jsonExists(PATH))) {
        console.log("Initializing JSON file at:", PATH);
        await writeJSON("{}");
    }
}

async function readJSON() {
    // if (!(await jsonExists(PATH))) {
    //     console.warn("파일이 존재하지 않습니다:", PATH);
    //     // await writeJSON("{}"); 
    //     return "{}";
    // }

    return new Promise((resolve, reject) => {
        overwolf.io.readFileContents(
            PATH,
            overwolf.io.enums.eEncoding.UTF8,
            (result) => {
                if (result.success) {
                    resolve(result.content || "{}");
                } else {
                    console.error("파일 읽기 실패:", result.error);
                    if (result.error === "File doesn't exist") {
                        resolve("{}");
                    } else {
                        reject(result.error);
                    }
                }
            }
        );
    });
}

function jsonExists(filePath) {
    return new Promise((resolve) => {
        overwolf.io.fileExists(filePath, (result) => {
            console.log("File exists check result:", result);
            if (result.success) {
                // Use result.found instead of result.exists
                resolve(result.found);
            } else {
                console.error("Error checking if file exists:", result.error);
                resolve(false);
            }
        });
    });
}

export { PATH, writeJSON, readJSON, jsonExists, initializeFileIfNeeded};