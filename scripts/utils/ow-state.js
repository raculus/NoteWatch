function getGameState() {
    return fetch("https://game-events-status.overwolf.com/gamestatus_prod.json")
    .then(response => response.json())
    .then(data => {
        const game = data.find(item => item.game_id === 10844);
        if (game) {
            console.log("State for game_id 10844:", game.state);
            return game.state;
        } else {
            console.log("game_id 10844 not found");
            return null;
        }
    })
    .catch(error => {
        console.error("Error fetching data:", error);
        return null;
    });
}

export { getGameState };