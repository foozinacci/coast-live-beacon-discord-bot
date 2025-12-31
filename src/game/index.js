/**
 * BEACON GAME MODULE
 * 
 * Main export that ties together engine, commands, and state.
 * Use this from your Discord/Twitch handlers.
 */

const BeaconEngine = require('./engine');
const BeaconCommands = require('./commands');
const { CLASSES, CLASS_KEYS, CONSTANTS } = require('./state');

/**
 * Create a complete Beacon game instance
 * @param {function} onStateUpdate - Callback when state changes (for WebSocket broadcast)
 * @returns {object} - { engine, commands, getState }
 */
function createBeaconGame(onStateUpdate) {
    const engine = new BeaconEngine(onStateUpdate);
    const commands = new BeaconCommands(engine);

    return {
        engine,
        commands,

        // Convenience methods
        getState: () => engine.getState(),
        isLive: () => commands.isLive,

        // Process command from any source
        processCommand: (message, username, platform, isAdmin, channelId, metadata = {}) => {
            return commands.process(message, username, platform, isAdmin, channelId, metadata);
        }
    };
}

module.exports = {
    createBeaconGame,
    BeaconEngine,
    BeaconCommands,
    CLASSES,
    CLASS_KEYS,
    CONSTANTS
};
