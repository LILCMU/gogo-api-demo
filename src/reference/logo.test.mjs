import { test } from 'node:test'
import assert from 'node:assert/strict'
import doc from './logo.js'

//? the section ids GuideLink deep-links depend on — renaming or reordering
//? one silently breaks a "to=/reference/logo#..." link elsewhere in the app
const EXPECTED_SECTION_IDS = [
  'shape', 'ports', 'control', 'values', 'output-cmds',
  'sensing', 'display-sound', 'data', 'network', 'peripherals',
]

//? the block types Reference.vue's v-else-if chain actually renders; a block
//? of any other type would silently render nothing
const RENDERED_BLOCK_TYPES = ['prose', 'note', 'table', 'frame', 'bytemap', 'steps', 'codeblock']

//? commands the 7.x VM does not implement (module header explains why they
//? are excluded). Kept here as a literal array so this list is the
//? regression guard, not a cross-reference to prose.
const EXCLUDED_WORDS = [
  'startultrasonic', 'getultrasonic', 'usecamera', 'closecamera', 'startfindface',
  'stopfindface', 'facefound?', 'takesnapshot', 'cameraison', 'isfindingface',
  'usesms', 'sendsms', 'sendmail', 'playsound', 'stopsound', 'screentapped?',
  'newrecordfile', 'showlogplot', 'userfid', 'closerfid', 'rfidbeep', 'readrfid',
  'writerfid', 'rfidtagfound?', 'rfidreaderfound?', 'say', 'key', 'intkey',
  'clearkeys', 'turnsteppingmotor', 'vernier_slot', 'vernier_slot_unit',
  'broadcastvalue', 'broadcastwithvalue', 'for', 'foreach', 'repcount',
  '_if', '_then', '_else',
]

//? every {code: '...'} run (prose/note) and every mono-flagged table cell —
//? the module's own markers for "this text is a literal command/token", as
//? opposed to a Notes/Meaning cell or plain prose sentence. Scanning only
//? these keeps the exclusion check from tripping on ordinary English: "for",
//? "say" and "key" are common words, but none of them show up in this file
//? outside a larger word (forever, onfor, sendkey, keyboard, ...) — and even
//? if a future edit added English prose using one of them as a normal word,
//? plain prose text is never in this pool, only declared code/signature text is.
function collectCodeStrings (module) {
  const strings = []
  module.sections.forEach((section) => {
    section.blocks.forEach((block) => {
      if (block.type === 'prose' || block.type === 'note') {
        block.runs.forEach((run) => {
          if (run && typeof run === 'object' && typeof run.code === 'string') {
            strings.push(run.code)
          }
        })
      } else if (block.type === 'table') {
        const monoCols = block.mono || []
        block.rows.forEach((row) => {
          monoCols.forEach((c) => {
            if (typeof row[c] === 'string') strings.push(row[c])
          })
        })
      }
    })
  })
  return strings
}

function escapeRegExp (s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test('section ids are unique and match the Task 1 order exactly', () => {
  const ids = doc.sections.map((s) => s.id)
  assert.deepEqual(ids, EXPECTED_SECTION_IDS)
  assert.equal(new Set(ids).size, ids.length)
})

test('every block has a type Reference.vue renders', () => {
  doc.sections.forEach((section) => {
    section.blocks.forEach((block) => {
      assert.ok(
        RENDERED_BLOCK_TYPES.includes(block.type),
        `section "${section.id}" has an unrendered block type "${block.type}"`
      )
    })
  })
})

test('every table row has the same length as its head', () => {
  doc.sections.forEach((section) => {
    section.blocks
      .filter((block) => block.type === 'table')
      .forEach((block) => {
        block.rows.forEach((row, i) => {
          assert.equal(
            row.length, block.head.length,
            `section "${section.id}" table row ${i} has ${row.length} cells, head has ${block.head.length}`
          )
        })
      })
  })
})

test('no excluded (unimplemented) word appears as a documented command or token', () => {
  const haystack = collectCodeStrings(doc).join(' ')
  EXCLUDED_WORDS.forEach((word) => {
    const pattern = new RegExp(`(?<!\\w)${escapeRegExp(word)}(?!\\w)`)
    assert.equal(pattern.test(haystack), false, `excluded word "${word}" found in a code/signature string`)
  })
})
