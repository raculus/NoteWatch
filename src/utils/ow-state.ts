export function getApiState(game_id: number=10844): Promise<Number | null> {
    return fetch("https://game-events-status.overwolf.com/gamestatus_prod.json")
    .then(response => response.json())
    .then(data => {
        const game = data.find(item => item.game_id === game_id);
        if (game) {
            console.log(`State for game_id ${game_id}:`, game.state);
            return game.state;
        } else {
            console.log(`game_id ${game_id} not found`);
            return null;
        }
    })
    .catch(error => {
        console.error("Error fetching data:", error);
        return null;
    });
}