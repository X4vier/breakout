import { action, computed, makeObservable, observable } from 'mobx'
import {
  BALL_R,
  BALL_SPEED,
  BOARD_H,
  BOARD_W,
  BRICK_COLS,
  BRICK_GAP,
  BRICK_H,
  BRICK_ROWS,
  BRICK_SIDE_PAD,
  BRICK_TOP,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  ROW_COLORS,
  ROW_POINTS,
  START_LIVES,
} from './constants'

export type GameStatus = 'ready' | 'running' | 'paused' | 'won' | 'lost'

export interface Brick {
  id: number
  x: number
  y: number
  w: number
  h: number
  row: number
  color: string
  points: number
  alive: boolean
}

const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v

function buildBricks(): Brick[] {
  const fieldW = BOARD_W - BRICK_SIDE_PAD * 2
  const brickW = (fieldW - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS
  const bricks: Brick[] = []
  let id = 0
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        id: id++,
        x: BRICK_SIDE_PAD + col * (brickW + BRICK_GAP),
        y: BRICK_TOP + row * (BRICK_H + BRICK_GAP),
        w: brickW,
        h: BRICK_H,
        row,
        color: ROW_COLORS[row],
        points: ROW_POINTS[row],
        alive: true,
      })
    }
  }
  return bricks
}

/**
 * The single source of truth for the game. Everything the UI renders — paddle,
 * ball, bricks, score, status — lives here as observables, and every mutation
 * goes through an `@action`. The React layer is a pure projection of this state.
 */
export class GameStore {
  @observable status: GameStatus = 'ready'
  @observable score = 0
  @observable lives = START_LIVES

  // Paddle: only its horizontal centre moves; everything else is fixed.
  @observable paddleX = (BOARD_W - PADDLE_W) / 2

  @observable ball = { x: BOARD_W / 2, y: PADDLE_Y - BALL_R, vx: 0, vy: 0 }

  @observable bricks: Brick[] = buildBricks()

  // Geometry constants the view needs, exposed so components never import the
  // raw module-level numbers.
  readonly boardW = BOARD_W
  readonly boardH = BOARD_H
  readonly paddleW = PADDLE_W
  readonly paddleH = PADDLE_H
  readonly paddleY = PADDLE_Y
  readonly ballR = BALL_R

  private rafId = 0
  private lastT = 0
  private readonly heldKeys = new Set<string>()

  constructor() {
    makeObservable(this)
  }

  @computed get bricksRemaining(): number {
    return this.bricks.reduce((n, b) => n + (b.alive ? 1 : 0), 0)
  }

  // --- lifecycle: called once by the view to wire up the loop + input ---

  start() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    this.rafId = requestAnimationFrame(this.frame)
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    cancelAnimationFrame(this.rafId)
  }

  // --- commands the UI / input dispatch ---

  @action newGame() {
    this.score = 0
    this.lives = START_LIVES
    this.bricks = buildBricks()
    this.resetBall()
    this.status = 'ready'
  }

  @action launch() {
    if (this.status !== 'ready') return
    // Fire upward at a slight, randomised angle so each serve differs.
    const angle = (Math.random() * 0.5 - 0.25) * Math.PI // ±45° from vertical
    this.ball.vx = Math.sin(angle) * BALL_SPEED
    this.ball.vy = -Math.abs(Math.cos(angle) * BALL_SPEED)
    this.status = 'running'
  }

  @action togglePause() {
    if (this.status === 'running') this.status = 'paused'
    else if (this.status === 'paused') this.status = 'running'
  }

  /** Centre the paddle on an x within the board (used by pointer control). */
  @action movePaddleTo(centerX: number) {
    this.paddleX = clamp(centerX - PADDLE_W / 2, 0, BOARD_W - PADDLE_W)
    if (this.status === 'ready') this.ball.x = this.paddleX + PADDLE_W / 2
  }

  // --- internals ---

  @action private resetBall() {
    this.paddleX = (BOARD_W - PADDLE_W) / 2
    this.ball = { x: BOARD_W / 2, y: PADDLE_Y - BALL_R, vx: 0, vy: 0 }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (this.status === 'ready') this.launch()
      else if (this.status === 'won' || this.status === 'lost') this.newGame()
      else this.togglePause()
      return
    }
    this.heldKeys.add(e.key)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.key)
  }

  // The rAF callback. Kept thin: it computes dt, applies keyboard paddle
  // movement, then steps the physics inside a single action.
  private frame = (t: number) => {
    if (this.lastT === 0) this.lastT = t
    // Normalise to 60fps units and clamp to avoid tunnelling after a stall.
    const dt = Math.min((t - this.lastT) / 16.667, 2)
    this.lastT = t
    this.step(dt)
    this.rafId = requestAnimationFrame(this.frame)
  }

  @action private step(dt: number) {
    this.applyPaddleKeys(dt)
    if (this.status !== 'running') return

    const ball = this.ball
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt

    this.bounceWalls(ball)
    this.bouncePaddle(ball)
    this.bounceBricks(ball)

    // Fell past the bottom edge → lose a life.
    if (ball.y - BALL_R > BOARD_H) {
      this.lives -= 1
      if (this.lives <= 0) {
        this.status = 'lost'
      } else {
        this.resetBall()
        this.status = 'ready'
      }
    }
  }

  private applyPaddleKeys(dt: number) {
    let dir = 0
    if (this.heldKeys.has('ArrowLeft') || this.heldKeys.has('a')) dir -= 1
    if (this.heldKeys.has('ArrowRight') || this.heldKeys.has('d')) dir += 1
    if (dir !== 0) {
      this.paddleX = clamp(
        this.paddleX + dir * PADDLE_SPEED * dt,
        0,
        BOARD_W - PADDLE_W,
      )
      if (this.status === 'ready') this.ball.x = this.paddleX + PADDLE_W / 2
    }
  }

  private bounceWalls(ball: GameStore['ball']) {
    if (ball.x - BALL_R < 0) {
      ball.x = BALL_R
      ball.vx = Math.abs(ball.vx)
    } else if (ball.x + BALL_R > BOARD_W) {
      ball.x = BOARD_W - BALL_R
      ball.vx = -Math.abs(ball.vx)
    }
    if (ball.y - BALL_R < 0) {
      ball.y = BALL_R
      ball.vy = Math.abs(ball.vy)
    }
  }

  private bouncePaddle(ball: GameStore['ball']) {
    if (ball.vy <= 0) return
    const withinX = ball.x >= this.paddleX && ball.x <= this.paddleX + PADDLE_W
    const atY = ball.y + BALL_R >= PADDLE_Y && ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 12
    if (!withinX || !atY) return

    // Reflect, and steer based on where the ball struck the paddle so the
    // player can aim: centre → straight up, edges → sharp angle.
    const hit = (ball.x - (this.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2) // -1..1
    const angle = hit * (Math.PI / 3) // up to ±60°
    ball.vx = Math.sin(angle) * BALL_SPEED
    ball.vy = -Math.abs(Math.cos(angle) * BALL_SPEED)
    ball.y = PADDLE_Y - BALL_R
  }

  private bounceBricks(ball: GameStore['ball']) {
    for (const brick of this.bricks) {
      if (!brick.alive) continue
      const nx = clamp(ball.x, brick.x, brick.x + brick.w)
      const ny = clamp(ball.y, brick.y, brick.y + brick.h)
      const dx = ball.x - nx
      const dy = ball.y - ny
      if (dx * dx + dy * dy > BALL_R * BALL_R) continue

      // Hit: kill the brick, score it, and reflect off the shallower axis.
      brick.alive = false
      this.score += brick.points

      const overlapX = BALL_R - Math.abs(dx)
      const overlapY = BALL_R - Math.abs(dy)
      if (dx === 0 && dy === 0) {
        ball.vy = -ball.vy
      } else if (overlapX < overlapY) {
        ball.vx = dx < 0 ? -Math.abs(ball.vx) : Math.abs(ball.vx)
      } else {
        ball.vy = dy < 0 ? -Math.abs(ball.vy) : Math.abs(ball.vy)
      }

      if (this.bricksRemaining === 0) this.status = 'won'
      return // one brick per frame keeps the bounce stable
    }
  }
}
