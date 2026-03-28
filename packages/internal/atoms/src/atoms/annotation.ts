import { createAtomHooks } from "@follow/utils/jotai"
import { atom } from "jotai"

// Type definitions
export type AnnotationColor = "yellow" | "green" | "blue" | "pink" | "orange"
export type AnnotationType = "highlight" | "note" | "mixed"

// UI state atoms for annotation feature

// Sidebar visibility
export const [
  ,
  ,
  useAnnotationSidebarVisible,
  useSetAnnotationSidebarVisible,
  getAnnotationSidebarVisible,
  setAnnotationSidebarVisible,
] = createAtomHooks(atom<boolean>(false))

// Active annotation id
export const [
  ,
  ,
  useActiveAnnotationId,
  useSetActiveAnnotationId,
  getActiveAnnotationId,
  setActiveAnnotationId,
] = createAtomHooks(atom<string | null>(null))

// Selected highlight color
export const [
  ,
  ,
  useSelectedAnnotationColor,
  useSetSelectedAnnotationColor,
  getSelectedAnnotationColor,
  setSelectedAnnotationColor,
] = createAtomHooks(atom<AnnotationColor>("yellow"))

// Annotation mode (highlight vs note)
export const [, , useAnnotationMode, useSetAnnotationMode, getAnnotationMode, setAnnotationMode] =
  createAtomHooks(atom<AnnotationType>("highlight"))

// Active annotation object (derived from active id)
// This will be populated by the store when needed
