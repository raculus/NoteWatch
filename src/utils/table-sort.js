function sortTable(tbody, row, hero_role, roster_id) {
    const rolePriority = {
      TANK: 0,
      DAMAGE: 1,
      SUPPORT: 2,
      UNKNOWN: 3
    };
  
    // 역할 정보와 roster_id를 row에 속성으로 저장 (비교를 위해 필요)
    row.setAttribute('data-role', hero_role);
    row.setAttribute('data-roster-id', roster_id);
  
    // 현재 tbody에 있는 행들 가져오기
    const allRows = Array.from(tbody.querySelectorAll('tr'));
  
    // 삽입 위치 찾기 - 먼저 역할로 비교하고, 같은 역할이면 roster_id로 비교
    const insertIndex = allRows.findIndex(r => {
      const rHeroRole = r.getAttribute('data-role') || 'UNKNOWN';
      
      // 역할 우선순위가 다르면 역할로 비교
      if (rolePriority[hero_role] !== rolePriority[rHeroRole]) {
        return rolePriority[hero_role] < rolePriority[rHeroRole];
      }
      
      // 역할이 같으면 roster_id로 비교 (작은 숫자가 먼저)
      const rRosterId = parseInt(r.getAttribute('data-roster-id') || '999', 10);
      return roster_id < rRosterId;
    });
  
    if (insertIndex === -1) {
      tbody.appendChild(row); // 끝에 삽입
    } else {
      tbody.insertBefore(row, allRows[insertIndex]); // 중간에 삽입
    }
  }
  
export { sortTable };