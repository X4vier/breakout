import { useEffect, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { game } from './store'
import type { GameStore } from './GameStore'
import './breakout.css'

/** A single brick. Re-renders only when its own `alive` flag flips. */
const BrickView = observer(function BrickView({
  brick,
}: {
  brick: GameStore['bricks'][number]
}) {
  if (!brick.alive) return null
  return (
    <div
      className="brick"
      style={{
        left: brick.x,
        top: brick.y,
        width: brick.w,
        height: brick.h,
        background: brick.color,
      }}
    />
  )
})

const Bricks = observer(function Bricks() {
  return (
    <>
      {game.bricks.map((b) => (
        <BrickView key={b.id} brick={b} />
      ))}
    </>
  )
})

const Paddle = observer(function Paddle() {
  return (
    <div
      className="paddle"
      style={{
        left: game.paddleX,
        top: game.paddleY,
        width: game.paddleW,
        height: game.paddleH,
      }}
    />
  )
})

const Ball = observer(function Ball() {
  const r = game.ballR
  return (
    <div
      className="ball"
      style={{
        left: game.ball.x - r,
        top: game.ball.y - r,
        width: r * 2,
        height: r * 2,
      }}
    />
  )
})

const Hud = observer(function Hud() {
  return (
    <div className="hud">
      <span>Score {game.score}</span>
      <span>Lives {'●'.repeat(game.lives) || '—'}</span>
      <span>Bricks {game.bricksRemaining}</span>
    </div>
  )
})

const Overlay = observer(function Overlay() {
  const { status } = game
  if (status === 'running') return null

  const content = {
    ready: { title: 'Breakout', cta: 'Click or press Space to launch' },
    paused: { title: 'Paused', cta: 'Press Space to resume' },
    won: { title: 'You cleared the board! 🎉', cta: 'Click or press Space to play again' },
    lost: { title: 'Game Over', cta: 'Click or press Space to try again' },
  }[status]

  return (
    <div className="overlay">
      <h1>{content.title}</h1>
      {(status === 'won' || status === 'lost') && (
        <p className="final">Final score: {game.score}</p>
      )}
      <p className="cta">{content.cta}</p>
    </div>
  )
})

export const Breakout = observer(function Breakout() {
  // Lifecycle wiring only: start the loop + input on mount, tear down on
  // unmount. All game state lives in the store, not in React.
  useEffect(() => {
    game.start()
    return () => game.dispose()
  }, [])

  const boardRef = useRef<HTMLDivElement>(null)

  // Map a pointer position to a board-space x and hand it to the store. The
  // board renders at a CSS-scaled size, so we rescale by the rendered width.
  const handlePointer = (clientX: number) => {
    const el = boardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const scale = game.boardW / rect.width
    game.movePaddleTo((clientX - rect.left) * scale)
  }

  const handleClick = () => {
    if (game.status === 'ready') game.launch()
    else if (game.status === 'won' || game.status === 'lost') game.newGame()
    else if (game.status === 'paused') game.togglePause()
  }

  return (
    <div className="breakout">
      <Hud />
      <div
        ref={boardRef}
        className="board"
        style={{
          width: game.boardW,
          height: game.boardH,
          aspectRatio: `${game.boardW} / ${game.boardH}`,
        }}
        onPointerMove={(e) => handlePointer(e.clientX)}
        onClick={handleClick}
      >
        <Bricks />
        <Paddle />
        <Ball />
        <Overlay />
      </div>
      <p className="help">
        Move: mouse or ← → / A D &nbsp;·&nbsp; Launch &amp; pause: Space
      </p>
    </div>
  )
})
