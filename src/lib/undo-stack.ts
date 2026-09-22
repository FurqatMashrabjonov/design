// Cmd+Z / Shift+Cmd+Z on the canvas. Everything the user does leaves a step that knows how to take
// itself back and how to do it again. Undoing moves the step to the redo side; a new step clears
// that side, as in every editor. The steps call the server, so what they undo is what was saved.

export type Step = { undo: () => Promise<unknown>; redo: () => Promise<unknown> }

export class UndoStack {
  past: Step[] = []
  future: Step[] = []

  record(step: Step) {
    this.past.push(step)
    this.future = []
  }

  /** Resolves false when there was nothing to undo. A step that fails is dropped, and the error is the caller's. */
  async undo(): Promise<boolean> {
    const step = this.past.pop()
    if (!step) return false
    await step.undo()
    this.future.push(step)
    return true
  }

  async redo(): Promise<boolean> {
    const step = this.future.pop()
    if (!step) return false
    await step.redo()
    this.past.push(step)
    return true
  }
}

/**
 * A change the conversation recorded (an edit, an added screen, a theme change). Reverting its
 * message undoes it and writes a revert message; reverting that message is the redo. So undo and
 * redo are the same move on whichever message is the latest in the chain.
 */
export function messageStep(revert: (messageId: string) => Promise<string>, messageId: string): Step {
  let latest = messageId
  const flip = async () => {
    latest = await revert(latest)
  }
  return { undo: flip, redo: flip }
}

/** Two server calls that are each other's inverse (delete/restore, move there/move back). */
export const pairStep = (undo: () => Promise<unknown>, redo: () => Promise<unknown>): Step => ({ undo, redo })
