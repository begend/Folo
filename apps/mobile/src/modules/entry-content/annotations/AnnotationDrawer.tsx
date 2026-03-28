import { cn } from "@follow/utils/utils"
import { Pressable, Text, View } from "react-native"

export interface AnnotationData {
  id: string
  type: string
  text?: string | null
  note?: string | null
  createdAt: Date
  positionData: any
}

interface AnnotationDrawerProps {
  annotations: AnnotationData[]
  visible: boolean
  onClose: () => void
  onDeleteAnnotation?: (id: string) => void
}

export function AnnotationDrawer({
  annotations,
  visible,
  onClose,
  onDeleteAnnotation,
}: AnnotationDrawerProps) {
  if (!visible) return null

  return (
    <View
      className={cn(
        "absolute bottom-0 left-0 right-0 h-[60%] bg-white dark:bg-gray-800",
        "rounded-t-3xl border-t border-gray-200 dark:border-gray-700",
        "shadow-2xl",
      )}
    >
      {/* Handle bar */}
      <Pressable onPress={onClose} className="items-center py-3">
        <View className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
      </Pressable>

      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-200 px-4 pb-3 dark:border-gray-700">
        <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          标注 ({annotations.length})
        </Text>
        <Pressable onPress={onClose}>
          <Text className="text-gray-400 dark:text-gray-500">✕</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View className="flex-1 p-4">
        {annotations.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-center text-sm text-gray-500 dark:text-gray-400">还没有标注</Text>
            <Text className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
              选择文本创建高亮或笔记
            </Text>
          </View>
        ) : (
          annotations.map((annotation) => (
            <View key={annotation.id} className="dark:bg-gray-750 mb-4 rounded-lg bg-gray-50 p-3">
              {annotation.text && (
                <Text className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                  "{annotation.text}"
                </Text>
              )}
              {annotation.note && (
                <Text className="text-sm text-gray-600 dark:text-gray-400">{annotation.note}</Text>
              )}
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-xs text-gray-400">
                  {new Date(annotation.createdAt).toLocaleString()}
                </Text>
                {onDeleteAnnotation && (
                  <Pressable
                    onPress={() => onDeleteAnnotation(annotation.id)}
                    className="text-xs text-red-500"
                  >
                    <Text>删除</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  )
}
