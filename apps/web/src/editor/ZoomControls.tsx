import { fitToPlan, resetZoom, useViewport, zoomBy } from './viewport.ts'

/** Zoom widget in the canvas corner: −, current zoom (click: back to 100%), +, Fit. */
export function ZoomControls() {
  const scale = useViewport((s) => s.scale)
  const button = 'px-2 py-1 text-sm hover:bg-gray-100'
  return (
    <div
      role="group"
      aria-label="Zoom"
      className="absolute right-3 bottom-3 flex items-center divide-x divide-gray-200 rounded border border-gray-300 bg-white shadow-sm"
    >
      <button
        type="button"
        className={button}
        title="Zoom out (Ctrl+−)"
        onClick={() => zoomBy(1 / 1.25)}
      >
        −
      </button>
      <button
        type="button"
        data-zoom
        className={`${button} w-16 tabular-nums`}
        title="Reset to 100% (Ctrl+0)"
        onClick={resetZoom}
      >
        {Math.round(scale * 100)}%
      </button>
      <button
        type="button"
        className={button}
        title="Zoom in (Ctrl+=)"
        onClick={() => zoomBy(1.25)}
      >
        +
      </button>
      <button
        type="button"
        className={button}
        title="Fit plan to view (Shift+1)"
        onClick={fitToPlan}
      >
        Fit
      </button>
    </div>
  )
}
