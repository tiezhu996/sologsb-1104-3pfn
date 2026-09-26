import { useState, type DragEvent } from 'react'
import type { DisassemblyStep } from '../../types/step'

interface StepRailProps {
  steps: DisassemblyStep[]
  currentIndex: number
  onSelect: (index: number) => void
  onMove: (from: number, to: number) => void
  onEdit?: (stepId: string) => void
  onRemove?: (stepId: string) => void
}

export function StepRail({ steps, currentIndex, onSelect, onMove, onEdit, onRemove }: StepRailProps) {
  const [confirmingStepId, setConfirmingStepId] = useState<string | null>(null)

  const handleDrop = (event: DragEvent<HTMLElement>, to: number) => {
    event.preventDefault()
    const from = Number(event.dataTransfer.getData('text/plain'))
    if (Number.isInteger(from)) onMove(from, to)
  }

  const handleRemove = (stepId: string) => {
    onRemove?.(stepId)
    setConfirmingStepId(null)
  }

  return (
    <div className="space-y-3" aria-label="拆装步骤轨道">
      {steps.map((step, index) => (
        <article
          key={step.id}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', String(index))
          }}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
          }}
          onDrop={(event) => handleDrop(event, index)}
          className={`group rounded-xl border p-3 transition ${
            currentIndex === index
              ? 'border-wood-500 bg-wood-50 shadow-sm'
              : 'border-stone-200 bg-white hover:border-wood-100'
          }`}
          data-testid="step-row"
        >
          <button
            type="button"
            onClick={() => onSelect(index)}
            className="flex w-full items-start gap-3 text-left"
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
              currentIndex === index ? 'bg-wood-700 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {step.seq}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <strong className="text-sm text-stone-900">{step.action}</strong>
                <span className="text-xs text-stone-500">{step.direction} · {step.tool}</span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-stone-500">{step.riskNote}</span>
              <span className="mt-1 block text-[11px] text-wood-700">停留 {step.holdSec} 秒</span>
            </span>
          </button>
          {onEdit || onRemove ? (
            <div className="mt-2 flex items-center justify-end gap-2">
              {onEdit ? (
                <button
                  type="button"
                  className="rounded px-2 py-1 text-[11px] text-wood-700 hover:bg-wood-50"
                  onClick={() => onEdit(step.id)}
                  data-testid="edit-step"
                >
                  改一步
                </button>
              ) : null}
              {onRemove ? (
                confirmingStepId === step.id ? (
                  <span className="flex items-center gap-1">
                    <span className="text-[11px] text-stone-500">连同该步示意图一起去掉？</span>
                    <button
                      type="button"
                      className="rounded bg-rose-600 px-2 py-1 text-[11px] text-white hover:bg-rose-700"
                      onClick={() => handleRemove(step.id)}
                      data-testid="confirm-remove-step"
                    >
                      确认去掉
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-[11px] text-stone-500 hover:bg-stone-100"
                      onClick={() => setConfirmingStepId(null)}
                    >
                      先留着
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50"
                    onClick={() => setConfirmingStepId(step.id)}
                    data-testid="remove-step"
                  >
                    去掉这一步
                  </button>
                )
              ) : null}
              <span className="cursor-grab select-none rounded px-2 py-1 text-[11px] text-stone-400 group-active:cursor-grabbing">
                拖动调序
              </span>
            </div>
          ) : (
            <div className="mt-2 flex justify-end">
              <span className="cursor-grab select-none rounded px-2 py-1 text-[11px] text-stone-400 group-active:cursor-grabbing">
                拖动调序
              </span>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
