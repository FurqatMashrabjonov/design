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

  // Steps run one after another: two quick ⌘Z presses used to run both steps at once, and whichever save
  // landed last won — the other step was lost (seen with two theme changes).
  private queue: Promise<unknown> = Promise.resolve()
  private run(fn: () => Promise<boolean>): Promise<boolean> {
    const next = this.queue.then(fn, fn)
    this.queue = next.catch(() => {})
    return next
  }

  /** Resolves false when there was nothing to undo. A step that fails is dropped, and the error is the caller's. */
  undo(): Promise<boolean> {
    return this.run(async () => {
      const step = this.past.pop()
      if (!step) return false
      await step.undo()
      this.future.push(step)
      return true
    })
  }

  redo(): Promise<boolean> {
    return this.run(async () => {
      const step = this.future.pop()
      if (!step) return false
      await step.redo()
      this.past.push(step)
      return true
    })
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
