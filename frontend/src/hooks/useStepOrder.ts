import { useCallback, useEffect, useMemo } from 'react'
import { useStepStore, type StepDraft } from '../stores/stepStore'
import type { DisassemblyStep } from '../types/step'

interface StepOrderResult {
  steps: DisassemblyStep[]
  totalDurationSec: number
  currentStepIndex: number
  move: (from: number, to: number) => Promise<void>
  addStep: (draft: StepDraft) => Promise<void>
  updateStep: (step: DisassemblyStep) => Promise<void>
  removeStep: (stepId: string) => Promise<void>
  setCurrentStep: (index: number) => void
}

export function useStepOrder(jointTypeId: string): StepOrderResult {
  const allSteps = useStepStore((state) => state.steps)
  const currentStepIndex = useStepStore((state) => state.currentStepIndex)
  const loadSteps = useStepStore((state) => state.loadSteps)
  const setCurrentStep = useStepStore((state) => state.setCurrentStep)

  useEffect(() => {
    if (!jointTypeId) return
    void loadSteps(jointTypeId)
  }, [jointTypeId, loadSteps])

  const steps = useMemo(
    () => allSteps
      .filter((step) => step.jointTypeId === jointTypeId)
      .sort((a, b) => a.seq - b.seq),
    [allSteps, jointTypeId],
  )

  const totalDurationSec = useMemo(
    () => steps.reduce((total, step) => total + step.holdSec, 0),
    [steps],
  )

  const move = useCallback(async (from: number, to: number) => {
    await useStepStore.getState().moveStep(from, to)
  }, [])

  const addStep = useCallback(async (draft: StepDraft) => {
    await useStepStore.getState().addStep(jointTypeId, draft)
  }, [jointTypeId])

  const updateStep = useCallback(async (step: DisassemblyStep) => {
    await useStepStore.getState().updateStep(step)
  }, [])

  const removeStep = useCallback(async (stepId: string) => {
    await useStepStore.getState().removeStep(stepId)
  }, [])

  return {
    steps,
    totalDurationSec,
    currentStepIndex: Math.min(currentStepIndex, Math.max(0, steps.length - 1)),
    move,
    addStep,
    updateStep,
    removeStep,
    setCurrentStep,
  }
}
