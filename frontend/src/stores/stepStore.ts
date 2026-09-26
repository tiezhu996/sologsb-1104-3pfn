import { create } from 'zustand'
import type { DisassemblyStep } from '../types/step'
import { db } from '../utils/db'
import { useDiagramStore } from './diagramStore'

export type StepDraft = Pick<DisassemblyStep, 'action' | 'direction' | 'tool' | 'riskNote' | 'holdSec'>

interface StepState {
  steps: DisassemblyStep[]
  currentStepIndex: number
  loading: boolean
  loadSteps: (jointTypeId: string) => Promise<void>
  addStep: (jointTypeId: string, draft: StepDraft) => Promise<DisassemblyStep>
  updateStep: (step: DisassemblyStep) => Promise<void>
  removeStep: (stepId: string) => Promise<void>
  moveStep: (from: number, to: number) => Promise<void>
  setCurrentStep: (index: number) => void
}

function createStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
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

  addStep: async (jointTypeId, draft) => {
    const siblingCount = get().steps.filter((step) => step.jointTypeId === jointTypeId).length
    const step: DisassemblyStep = {
      ...draft,
      id: createStepId(),
      jointTypeId,
      seq: siblingCount + 1,
      schemaRev: 2,
    }
    await db.steps.add(step)
    set((state) => ({
      steps: [...state.steps, step],
      currentStepIndex: siblingCount,
    }))
    return step
  },

  updateStep: async (step) => {
    await db.steps.put(step)
    set((state) => ({
      steps: state.steps.map((item) => (item.id === step.id ? step : item)),
    }))
  },

  removeStep: async (stepId) => {
    const target = get().steps.find((step) => step.id === stepId)
    if (!target) return
    const remaining = get().steps
      .filter((step) => step.jointTypeId === target.jointTypeId && step.id !== stepId)
      .sort((a, b) => a.seq - b.seq)
      .map((step, index) => ({ ...step, seq: index + 1 }))
    await db.transaction('rw', db.steps, async () => {
      await db.steps.delete(stepId)
      await db.steps.bulkPut(remaining)
    })
    await useDiagramStore.getState().removeDiagramsForStep(stepId)
    set((state) => ({
      steps: [
        ...state.steps.filter((step) => step.jointTypeId !== target.jointTypeId),
        ...remaining,
      ],
      currentStepIndex: Math.min(state.currentStepIndex, Math.max(0, remaining.length - 1)),
    }))
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

  setCurrentStep: (index) => set({
    currentStepIndex: Math.max(0, index),
  }),
}))
