interface AnnotationToolbarProps {
  position: { x: number; y: number }
  onHighlight: (color: string) => void
  onNote: () => void
  onClose: () => void
  selectedColor?: string
}

const COLORS = [
  { value: "yellow", label: "黄色", class: "bg-yellow-300" },
  { value: "green", label: "绿色", class: "bg-green-300" },
  { value: "blue", label: "蓝色", class: "bg-blue-300" },
  { value: "pink", label: "粉色", class: "bg-pink-300" },
  { value: "orange", label: "橙色", class: "bg-orange-300" },
] as const

export function AnnotationToolbar({
  position,
  onHighlight,
  onNote,
  onClose,
  selectedColor = "yellow",
}: AnnotationToolbarProps) {
  const handleColorClick = (color: string) => {
    onHighlight(color)
    onClose()
  }

  const handleNoteClick = () => {
    onNote()
    onClose()
  }

  return (
    <div
      className="fixed z-50 flex items-center gap-1 rounded-lg bg-white p-2 shadow-lg dark:bg-gray-800"
      style={{
        left: position.x,
        top: position.y + 24,
        transform: "translateX(-50%)",
      }}
    >
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2 dark:border-gray-700">
        {COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            className={`h-6 w-6 rounded ${color.class} ${selectedColor === color.value ? "ring-2 ring-blue-500" : ""} transition-transform hover:scale-110`}
            onClick={() => handleColorClick(color.value)}
            title={color.label}
          />
        ))}
      </div>

      <button
        type="button"
        className="rounded px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        onClick={handleNoteClick}
      >
        笔记
      </button>

      <button
        type="button"
        className="px-2 py-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  )
}
