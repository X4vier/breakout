/**
 * ============================================================================
 *  AI MODE — student exercise
 * ============================================================================
 *
 * The game can drive the paddle automatically by asking this module, once per
 * animation frame, "given the current state of the game, which way should the
 * paddle move?".
 *
 * Your job (should you take the exercise) is to implement {@link chooseMove}.
 * The starter version below just returns a random move, so the paddle wanders
 * aimlessly and almost always loses. Replace it with something that actually
 * tracks the ball and keeps it in play.
 *
 * Rules of the game for your AI:
 *   - You are given a *read-only snapshot* of the game state (see `AiGameState`).
 *     Do not try to mutate it; just read from it and return a decision.
 *   - You must return one of three moves: 'left', 'right', or 'none'.
 *   - `chooseMove` is called every frame, so keep it cheap and deterministic-ish
 *     (no slow loops, no allocating huge structures).
 *
 * Ideas, roughly easiest → hardest:
 *   1. Move the paddle so its centre chases `state.ball.x` (only react to where
 *      the ball is right now).
 *   2. Predict where the ball will cross the paddle's height using its velocity
 *      (`ball.vx` / `ball.vy`) and aim for *that* x instead.
 *   3. Account for wall bounces in your prediction so you're not fooled near the
 *      edges.
 *   4. Aim with intent — steer the ball toward the densest cluster of remaining
 *      bricks (`state.bricks`) by choosing *where* on the paddle to hit it.
 */

export type AiMove = 'left' | 'right' | 'none'

/** A read-only view of everything the AI is allowed to see. */
export interface AiGameState {
  readonly board: { readonly width: number; readonly height: number }
  readonly ball: {
    readonly x: number
    readonly y: number
    readonly vx: number
    readonly vy: number
    readonly radius: number
  }
  /** `x` is the paddle's left edge; `y` is its top edge. */
  readonly paddle: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly bricks: ReadonlyArray<{
    readonly x: number
    readonly y: number
    readonly w: number
    readonly h: number
    readonly alive: boolean
  }>
  readonly score: number
}

/**
 * Decide how the paddle should move this frame.
 *
 * STARTER IMPLEMENTATION: returns a uniformly random move. This is intentionally
 * bad — it's here so AI mode does *something* out of the box. Replace the body
 * with a real strategy (see the ideas at the top of this file).
 */
export function chooseMove(state: AiGameState): AiMove {
  const { board, ball, paddle } = state
  const paddleCenter = paddle.x + paddle.width / 2

  // Where do we want the paddle's centre to be this frame?
  let targetX: number

  if (ball.vy <= 0) {
    // Ball is heading up (or sitting still on the paddle before launch). We
    // can't be hit yet, so just hover under the ball and stay ready.
    targetX = ball.x
  } else {
    // Ball is descending — predict the x where it will reach the paddle's top
    // edge, reflecting off the side walls along the way. The ball's centre is
    // constrained to [radius, board.width - radius]; mirror the raw landing
    // position back into that range to simulate bounces.
    const distance = paddle.y - ball.y
    const frames = distance / ball.vy
    const rawX = ball.x + ball.vx * frames

    const min = ball.radius
    const max = board.width - ball.radius
    const span = max - min

    // Triangle-wave reflection into [min, max].
    let folded = (rawX - min) % (2 * span)
    if (folded < 0) folded += 2 * span
    if (folded > span) folded = 2 * span - folded
    targetX = min + folded
  }

  // Dead zone so the paddle doesn't jitter once it's basically lined up.
  const deadZone = Math.max(4, paddle.width * 0.05)
  if (targetX < paddleCenter - deadZone) return 'left'
  if (targetX > paddleCenter + deadZone) return 'right'
  return 'none'
}
