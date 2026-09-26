import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BlankPanel } from '../components/common/BlankPanel'
import { StepRail } from '../components/common/StepRail'
import { SvgCanvas } from '../components/common/SvgCanvas'
import { useStepOrder } from '../hooks/useStepOrder'
import { useDiagramStore } from '../stores/diagramStore'
import { useJointStore } from '../stores/jointStore'
import type { StepAction, StepDirection, StepTool } from '../types/step'

interface StepFormState {
  action: StepAction
  direction: StepDirection
  tool: StepTool
  holdSec: string
  riskNote: string
}

const emptyForm: StepFormState = {
  action: '拆卸',
  direction: '轴向',
  tool: '木槌',
  holdSec: '5',
  riskNote: '',
}

const actions: StepAction[] = ['拆卸', '装配']
const directions: StepDirection[] = ['轴向', '侧向', '斜向']
const tools: StepTool[] = ['木槌', '鱼线', '撬板']

type FormMode = 'closed' | 'add' | 'edit'

export default function StepBoard() {
  const { id: idParam } = useParams()
  const id = idParam ?? ''
  const joints = useJointStore((state) => state.joints)
  const loadAll = useJointStore((state) => state.loadAll)
  const diagrams = useDiagramStore((state) => state.diagrams)
  const selectedMemberId = useDiagramStore((state) => state.selectedMemberId)
  const loadDiagrams = useDiagramStore((state) => state.loadDiagrams)
  const setSelectedMember = useDiagramStore((state) => state.setSelectedMember)
  const removeDiagramsForStep = useDiagramStore((state) => state.removeDiagramsForStep)
  const { steps, totalDurationSec, currentStepIndex, move, add, update, remove, setCurrentStep } = useStepOrder(id)
  const [formMode, setFormMode] = useState<FormMode>('closed')
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [form, setForm] = useState<StepFormState>(emptyForm)

  useEffect(() => {
    void loadAll()
    if (id) void loadDiagrams(id)
  }, [id, loadAll, loadDiagrams])

  const joint = joints.find((item) => item.id === id)
  const currentStep = steps[currentStepIndex]
  const currentDiagram = diagrams.find((diagram) => diagram.stepId === currentStep?.id)

  const openAddForm = () => {
    setEditingStepId(null)
    setForm(emptyForm)
    setFormMode('add')
  }

  const openEditForm = (stepId: string) => {
    const step = steps.find((item) => item.id === stepId)
    if (!step) return
    setEditingStepId(stepId)
    setForm({
      action: step.action,
      direction: step.direction,
      tool: step.tool,
      holdSec: String(step.holdSec),
      riskNote: step.riskNote,
    })
    setFormMode('edit')
  }

  const closeForm = () => {
    setFormMode('closed')
    setEditingStepId(null)
    setForm(emptyForm)
  }

  const submitStep = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const holdSec = Math.max(0, Math.round(Number(form.holdSec) || 0))
    const riskNote = form.riskNote.trim()
    if (!riskNote) return
    const draft = {
      action: form.action,
      direction: form.direction,
      tool: form.tool,
      holdSec,
      riskNote,
    }
    if (formMode === 'edit' && editingStepId) {
      await update(editingStepId, draft)
    } else {
      await add(draft)
    }
    closeForm()
  }

  const handleRemoveStep = async (stepId: string) => {
    await Promise.all([
      remove(stepId),
      removeDiagramsForStep(stepId),
    ])
    if (editingStepId === stepId) closeForm()
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
            拖动左侧步骤调整真实顺序，也可以补一步、改一步或去掉多余的步骤；右侧同步查看当前步骤自己的示意图和风险提醒。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-wood-100 bg-white px-5 py-3 text-sm text-stone-600 shadow-sm">
            {steps.length} 步 · 总停留 <strong className="text-wood-700">{totalDurationSec}</strong> 秒
          </div>
          <button type="button" className="primary-button" onClick={openAddForm} data-testid="new-step">
            <span className="text-lg leading-none">＋</span>
            补一步
          </button>
        </div>
      </section>

      {formMode !== 'closed' ? (
        <form className="panel grid gap-5 p-5 sm:p-6" data-testid="form-step" onSubmit={(event) => void submitStep(event)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-wood-900">
                {formMode === 'edit' ? `修改第 ${steps.find((item) => item.id === editingStepId)?.seq ?? ''} 步` : '补一步新步骤'}
              </h2>
              <p className="mt-1 text-xs text-stone-500">填清动作、方向、工具、停留秒数和易损部位提醒，保存后写入本地数据库。</p>
            </div>
            <button type="button" className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100" onClick={closeForm}>收起</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-stone-700">动作</span>
              <select
                required
                className="input-field"
                data-testid="field-step-action"
                value={form.action}
                onChange={(event) => setForm((current) => ({ ...current, action: event.target.value as StepAction }))}
              >
                {actions.map((action) => <option key={action} value={action}>{action}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-stone-700">方向</span>
              <select
                required
                className="input-field"
                data-testid="field-step-direction"
                value={form.direction}
                onChange={(event) => setForm((current) => ({ ...current, direction: event.target.value as StepDirection }))}
              >
                {directions.map((direction) => <option key={direction} value={direction}>{direction}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-stone-700">工具</span>
              <select
                required
                className="input-field"
                data-testid="field-step-tool"
                value={form.tool}
                onChange={(event) => setForm((current) => ({ ...current, tool: event.target.value as StepTool }))}
              >
                {tools.map((tool) => <option key={tool} value={tool}>{tool}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-stone-700">停留秒数</span>
              <input
                required
                type="number"
                min={0}
                max={600}
                className="input-field"
                data-testid="field-step-holdSec"
                value={form.holdSec}
                onChange={(event) => setForm((current) => ({ ...current, holdSec: event.target.value }))}
              />
            </label>
            <label className="space-y-1.5 text-sm md:col-span-2 lg:col-span-4">
              <span className="font-medium text-stone-700">易损部位提醒</span>
              <textarea
                required
                rows={2}
                className="input-field resize-y"
                data-testid="field-step-riskNote"
                value={form.riskNote}
                onChange={(event) => setForm((current) => ({ ...current, riskNote: event.target.value }))}
                placeholder="例如：先垫软木再轻敲榫肩，避免压伤外露木纹。"
              />
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="secondary-button" onClick={closeForm}>取消</button>
            <button type="submit" className="primary-button" data-testid="submit-step">
              {formMode === 'edit' ? '保存修改' : '保存步骤'}
            </button>
          </div>
        </form>
      ) : null}

      {steps.length === 0 ? (
        <BlankPanel
          title="当前类型尚无步骤"
          description="还没有可编排的拆装动作，先补一步，把动作、方向、工具与停留秒数填清楚。"
          action={(
            <button type="button" className="primary-button" onClick={openAddForm}>
              <span className="text-lg leading-none">＋</span>
              补一步
            </button>
          )}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="panel max-h-[720px] overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-wood-900">步骤轨道</h2>
                <p className="mt-1 text-xs text-stone-500">拖动调序，或直接改、去掉某一步</p>
              </div>
              <span className="rounded-full bg-wood-50 px-3 py-1 text-xs text-wood-700">自动保存</span>
            </div>
            <StepRail
              steps={steps}
              currentIndex={currentStepIndex}
              onSelect={setCurrentStep}
              onMove={(from, to) => void move(from, to)}
              onEdit={openEditForm}
              onRemove={(stepId) => void handleRemoveStep(stepId)}
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
              </div>
              <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                <p className="text-xs font-semibold text-amber-900">易损部位提醒</p>
                <p className="mt-1 text-sm leading-6 text-amber-900/80">{currentStep?.riskNote || '暂无提醒'}</p>
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
