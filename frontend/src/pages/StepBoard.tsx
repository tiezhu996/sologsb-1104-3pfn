import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BlankPanel } from '../components/common/BlankPanel'
import { StepRail } from '../components/common/StepRail'
import { SvgCanvas } from '../components/common/SvgCanvas'
import { useStepOrder } from '../hooks/useStepOrder'
import { useDiagramStore } from '../stores/diagramStore'
import { useJointStore } from '../stores/jointStore'
import type { StepDraft } from '../stores/stepStore'
import type { DisassemblyStep, StepAction, StepDirection, StepTool } from '../types/step'

const ACTION_OPTIONS: StepAction[] = ['拆卸', '装配']
const DIRECTION_OPTIONS: StepDirection[] = ['轴向', '侧向', '斜向']
const TOOL_OPTIONS: StepTool[] = ['木槌', '鱼线', '撬板']

const EMPTY_DRAFT: StepDraft = {
  action: '拆卸',
  direction: '轴向',
  tool: '木槌',
  riskNote: '',
  holdSec: 6,
}

type StepEditorState = { mode: 'add' } | { mode: 'edit'; step: DisassemblyStep } | null

export default function StepBoard() {
  const { id: idParam } = useParams()
  const id = idParam ?? ''
  const joints = useJointStore((state) => state.joints)
  const loadAll = useJointStore((state) => state.loadAll)
  const diagrams = useDiagramStore((state) => state.diagrams)
  const selectedMemberId = useDiagramStore((state) => state.selectedMemberId)
  const loadDiagrams = useDiagramStore((state) => state.loadDiagrams)
  const setSelectedMember = useDiagramStore((state) => state.setSelectedMember)
  const {
    steps,
    totalDurationSec,
    currentStepIndex,
    move,
    addStep,
    updateStep,
    removeStep,
    setCurrentStep,
  } = useStepOrder(id)
  const [editor, setEditor] = useState<StepEditorState>(null)
  const [draft, setDraft] = useState<StepDraft>(EMPTY_DRAFT)
  const [removeTarget, setRemoveTarget] = useState<DisassemblyStep | null>(null)

  useEffect(() => {
    void loadAll()
    if (id) void loadDiagrams(id)
  }, [id, loadAll, loadDiagrams])

  const joint = joints.find((item) => item.id === id)
  const currentStep = steps[currentStepIndex]
  const currentDiagram = diagrams.find((diagram) => diagram.stepId === currentStep?.id)
  const draftReady = draft.riskNote.trim().length > 0 && Number.isFinite(draft.holdSec) && draft.holdSec >= 1

  const openAddEditor = () => {
    setDraft(EMPTY_DRAFT)
    setEditor({ mode: 'add' })
    setRemoveTarget(null)
  }

  const openEditEditor = (step: DisassemblyStep) => {
    setDraft({
      action: step.action,
      direction: step.direction,
      tool: step.tool,
      riskNote: step.riskNote,
      holdSec: step.holdSec,
    })
    setEditor({ mode: 'edit', step })
    setRemoveTarget(null)
  }

  const saveEditor = async () => {
    if (!editor || !draftReady) return
    const normalized: StepDraft = {
      ...draft,
      riskNote: draft.riskNote.trim(),
      holdSec: Math.round(draft.holdSec),
    }
    if (editor.mode === 'add') await addStep(normalized)
    else await updateStep({ ...editor.step, ...normalized })
    setEditor(null)
  }

  const confirmRemove = async () => {
    if (!removeTarget) return
    if (editor?.mode === 'edit' && editor.step.id === removeTarget.id) setEditor(null)
    await removeStep(removeTarget.id)
    setRemoveTarget(null)
  }

  return (
    <div className="space-y-7">
      <div>
        <Link to={`/joints/${id}`} className="inline-flex items-center gap-1.5 text-sm text-wood-700 hover:underline">
          <span aria-hidden="true">←</span> 返回类型详情
        </Link>
      </div>

      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.24em] text-wood-500">STEP SEQUENCE</p>
          <h1 className="text-3xl font-bold tracking-tight text-wood-900 sm:text-4xl">{joint?.name ?? '榫卯'} · 拆装步序编排</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
            拖动左侧步骤调整真实顺序，也可以补一步、改一步或去掉多余的步骤，右侧同步查看每一步的示意图和风险提醒。
          </p>
        </div>
        <div className="rounded-xl border border-wood-100 bg-white px-5 py-3 text-sm text-stone-600 shadow-sm">
          {steps.length} 步 · 总停留 <strong className="text-wood-700">{totalDurationSec}</strong> 秒
        </div>
      </section>

      {editor ? (
        <section className="panel space-y-5 p-5" data-testid="step-editor">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-wood-900">
                {editor.mode === 'add' ? `补一步（将成为第 ${steps.length + 1} 步）` : `修改第 ${editor.step.seq} 步`}
              </h2>
              <p className="mt-1 text-xs text-stone-500">填清动作、方向、工具、停留秒数和提醒，保存后写入本地数据库。</p>
            </div>
            <button type="button" className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100" onClick={() => setEditor(null)}>收起</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-stone-700">动作</span>
              <select
                className="input-field"
                data-testid="field-action"
                value={draft.action}
                onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value as StepAction }))}
              >
                {ACTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-stone-700">方向</span>
              <select
                className="input-field"
                data-testid="field-direction"
                value={draft.direction}
                onChange={(event) => setDraft((current) => ({ ...current, direction: event.target.value as StepDirection }))}
              >
                {DIRECTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-stone-700">工具</span>
              <select
                className="input-field"
                data-testid="field-tool"
                value={draft.tool}
                onChange={(event) => setDraft((current) => ({ ...current, tool: event.target.value as StepTool }))}
              >
                {TOOL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-stone-700">停留秒数</span>
              <input
                type="number"
                min={1}
                step={1}
                className="input-field"
                data-testid="field-holdSec"
                value={draft.holdSec}
                onChange={(event) => setDraft((current) => ({ ...current, holdSec: Number(event.target.value) }))}
              />
            </label>
          </div>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-stone-700">易损部位提醒</span>
            <textarea
              rows={3}
              className="input-field resize-y"
              data-testid="field-riskNote"
              placeholder="写下这一步容易伤到的部位和手法要点"
              value={draft.riskNote}
              onChange={(event) => setDraft((current) => ({ ...current, riskNote: event.target.value }))}
            />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" className="secondary-button" onClick={() => setEditor(null)}>取消</button>
            <button
              type="button"
              className="primary-button"
              data-testid="submit-step"
              disabled={!draftReady}
              onClick={() => void saveEditor()}
            >
              {editor.mode === 'add' ? '保存新步骤' : '保存修改'}
            </button>
          </div>
        </section>
      ) : null}

      {removeTarget ? (
        <section className="panel flex flex-col gap-4 border-rose-200 p-5 sm:flex-row sm:items-center sm:justify-between" data-testid="step-remove-confirm">
          <p className="text-sm leading-6 text-stone-700">
            确认去掉第 <strong className="text-rose-700">{removeTarget.seq}</strong> 步「{removeTarget.action} · {removeTarget.direction}」？
            挂在这一步的示意图会一并收走，剩余步骤将从 1 重新连排，总时长同步重算。
          </p>
          <div className="flex shrink-0 justify-end gap-3">
            <button type="button" className="secondary-button" onClick={() => setRemoveTarget(null)}>取消</button>
            <button
              type="button"
              className="primary-button bg-rose-700 hover:bg-rose-800 focus:ring-rose-500"
              data-testid="confirm-remove-step"
              onClick={() => void confirmRemove()}
            >
              确认去掉
            </button>
          </div>
        </section>
      ) : null}

      {steps.length === 0 ? (
        <BlankPanel
          title="当前类型尚无步骤"
          description="没有可编排的拆装动作，请先补一步。"
          action={(
            <button type="button" className="primary-button" data-testid="add-step-empty" onClick={openAddEditor}>
              <span className="text-lg leading-none">＋</span>
              补一步
            </button>
          )}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="panel max-h-[720px] overflow-y-auto p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-wood-900">步骤轨道</h2>
                <p className="mt-1 text-xs text-stone-500">拖动调序，也可补、改、去掉步骤</p>
              </div>
              <span className="rounded-full bg-wood-50 px-3 py-1 text-xs text-wood-700">自动保存</span>
            </div>
            <button
              type="button"
              className="secondary-button mb-4 w-full"
              data-testid="add-step"
              onClick={openAddEditor}
            >
              <span className="text-base leading-none">＋</span>
              补一步
            </button>
            <StepRail
              steps={steps}
              currentIndex={currentStepIndex}
              onSelect={setCurrentStep}
              onMove={(from, to) => void move(from, to)}
              onEdit={(index) => openEditEditor(steps[index])}
              onRemove={(index) => {
                setEditor(null)
                setRemoveTarget(steps[index])
              }}
            />
          </section>

          <section className="space-y-5">
            <div className="panel p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-wood-700 text-lg font-bold text-white">
                  {currentStep?.seq ?? 0}
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-wood-900">{currentStep?.action ?? '步骤'} · {currentStep?.direction ?? '方向'}</h2>
                  <p className="mt-1 text-xs text-stone-500">使用工具：{currentStep?.tool ?? '待补充'} · 停留 {currentStep?.holdSec ?? 0} 秒</p>
                </div>
                {currentStep ? (
                  <button
                    type="button"
                    className="secondary-button ml-auto px-3 py-1.5 text-xs"
                    onClick={() => openEditEditor(currentStep)}
                  >
                    编辑当前步骤
                  </button>
                ) : null}
              </div>
              <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                <p className="text-xs font-semibold text-amber-900">易损部位提醒</p>
                <p className="mt-1 text-sm leading-6 text-amber-900/80">{currentStep?.riskNote ?? '暂无提醒'}</p>
              </div>
            </div>

            <SvgCanvas
              svgMarkup={currentDiagram?.svgMarkup ?? ''}
              title={currentDiagram?.title ?? '步骤预览'}
              hitAreas={currentDiagram?.hitAreas ?? []}
              selectedMemberId={selectedMemberId}
              onSelectMember={setSelectedMember}
              emptyMessage="该步骤暂未绑定示意图"
            />
          </section>
        </div>
      )}
    </div>
  )
}
