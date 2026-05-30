// Fixed coordinate space the physics runs in. The board is rendered at this
// pixel size and scaled with CSS to fit the viewport, so gameplay is identical
// on every screen.
export const BOARD_W = 720
export const BOARD_H = 560

export const PADDLE_W = 110
export const PADDLE_H = 14
export const PADDLE_Y = BOARD_H - 36 // top edge of the paddle
export const PADDLE_SPEED = 9 // px per frame for keyboard control

export const BALL_R = 8
export const BALL_SPEED = 6 // px per frame, the ball's speed at score 0
export const BALL_SPEED_MAX = 11 // px per frame, the speed cap
export const BALL_SPEED_PER_POINT = 0.0025 // extra px/frame gained per point scored

export const BRICK_ROWS = 6
export const BRICK_COLS = 11
export const BRICK_TOP = 60 // gap above the first row
export const BRICK_H = 22
export const BRICK_GAP = 6
export const BRICK_SIDE_PAD = 16 // gap between the brick field and the walls

export const START_LIVES = 3

// Points awarded per row, top rows (index 0) are worth the most.
export const ROW_POINTS = [70, 60, 50, 40, 30, 20]

// One arcade-ish colour per row.
export const ROW_COLORS = [
  '#ff4d6d',
  '#ff9e44',
  '#ffe14d',
  '#5ce86b',
  '#4dd2ff',
  '#9b8cff',
]
