import type Konva from 'konva'

export function setStageCursor(e: Konva.KonvaEventObject<unknown>, cursor: string) {
  const container = e.target.getStage()?.container()
  if (container) container.style.cursor = cursor
}
