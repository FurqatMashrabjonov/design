import type { Migration } from '../migrate'

export default {
  name: '0021_add_llm_call_model',
  up: (db) => {
    // LLM-05. `model`: which model answered, so a call is priced by its own row in PRICES once there
    // is more than one. `cache_write_tokens`: Claude bills a cache write above the input rate.
    // `action_id`: the one guarded request (a plan, a screen, an edit) the call was part of — what a
    // credit is charged for and what its real cost is summed by.
    for (const sql of [
      "ALTER TABLE llm_calls ADD COLUMN model TEXT NOT NULL DEFAULT ''",
      'ALTER TABLE llm_calls ADD COLUMN cache_write_tokens INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE llm_calls ADD COLUMN action_id TEXT',
    ]) {
      try {
        db.exec(sql)
      } catch {}
    }
    db.exec('CREATE INDEX IF NOT EXISTS llm_calls_action ON llm_calls (action_id)')
    // Every call logged so far was deepseek-flash or the local CLI.
    db.exec("UPDATE llm_calls SET model = CASE provider WHEN 'deepseek' THEN 'deepseek-flash' ELSE provider END WHERE model = ''")
  },
} satisfies Migration
