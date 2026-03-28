import { cn } from "@follow/utils/utils"
import { Pressable, Text } from "react-native"

interface AnnotationFabButtonProps {
  onPress: () => void
}

export function AnnotationFabButton({ onPress }: AnnotationFabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "absolute bottom-6 right-6 h-14 w-14",
        "items-center justify-center rounded-full bg-blue-600",
        "shadow-lg",
      )}
    >
      <Text className="text-2xl text-white">+</Text>
    </Pressable>
  )
}
