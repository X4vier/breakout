import { GameStore } from './GameStore'

// A single shared game instance. Components import this directly — there's no
// need for React context since there is exactly one game.
export const game = new GameStore()
