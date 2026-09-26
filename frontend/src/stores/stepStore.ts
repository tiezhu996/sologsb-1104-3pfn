import { create } from 'zustand'
import type { DisassemblyStep } from '../types/step'
import { db } from '../utils/db'

export type StepDraft = Omit<DisassemblyStep, 'id' | 'jointTypeId' | 'seq' | 'schemaRev'>

function createId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

interface StepState {
  steps: DisassemblyStep[]
  currentStepIndex: number
  loading: boolean
  loadSteps: (jointTypeId: string) => Promise<void>
  moveStep: (from: number, to: number) => Promise<void>
  addStep: (jointTypeId: string, draft: StepDraft) => Promise<DisassemblyStep>
  updateStep: (stepId: string, patch: Partial<StepDraft>) => Promise<void>
  removeStep: (stepId: string) => Promise<void>
  setCurrentStep: (index: number) => void
}

export const useStepStore = create<StepState>((set, get) => ({
  steps: [],
  currentStepIndex: 0,
  loading: false,

  loadSteps: async (jointTypeId) => {
    set({ loading: true })
    try {
      const steps = await db.steps.where('jointTypeId').equals(jointTypeId).sortBy('seq')
      set((state) => ({
        steps,
        currentStepIndex: Math.min(state.currentStepIndex, Math.max(0, steps.length - 1)),
      }))
    } finally {
      set({ loading: false })
    }
  },

  moveStep: async (from, to) => {
    const ordered = [...get().steps].sort((a, b) => a.seq - b.seq)
    if (from < 0 || to < 0 || from >= ordered.length || to >= ordered.length || from === to) return
    const [moved] = ordered.splice(from, 1)
    if (!moved) return
    ordered.splice(to, 0, moved)
    const resequenced = ordered.map((step, index) => ({ ...step, seq: index + 1 }))
    set({ steps: resequenced, currentStepIndex: to })
    await db.steps.bulkPut(resequenced)
  },

  addStep: async (jointTypeId, draft) => {
    const seq = get().steps.length + 1
    const step: DisassemblyStep = { ...draft, id: createId(), jointTypeId, seq, schemaRev: 2 }
    await db.steps.add(step)
    set((state) => ({
      steps: [...state.steps, step].sort((a, b) => a.seq - b.seq),
      currentStepIndex: seq - 1,
    }))
    return step
  },

  updateStep: async (stepId, patch) => {
    const existing = get().steps.find((step) => step.id === stepId)
    if (!existing) return
    const updated: DisassemblyStep = { ...existing, ...patch }
    await db.steps.put(updated)
    set((state) => ({
      steps: state.steps.map((step) => (step.id === stepId ? updated : step)),
    }))
  },

  removeStep: async (stepId) => {
    const removedIndex = get().steps.findIndex((step) => step.id === stepId)
    if (removedIndex < 0) return
    const remaining = get().steps
      .filter((step) => step.id !== stepId)
      .sort((a, b) => a.seq - b.seq)
      .map((step, index) => ({ ...step, seq: index + 1 }))
    await db.transaction('rw', [db.steps], async () => {
      await db.steps.delete(stepId)
      await db.steps.bulkPut(remaining)
    })
    set((state) => ({
      steps: remaining,
      currentStepIndex: Math.min(state.currentStepIndex, Math.max(0, remaining.length - 1)),
    }))
  },

  setCurrentStep: (index) => set({
    currentStepIndex: Math.max(0, index),
  }),
}))
