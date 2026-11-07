import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

test('fork styles load alongside native workspace styles and deduplicate independently', async () => {
  const client = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  const sheets = ['Rows', 'WorkspacePicker', 'WorkspaceBrowser']
  const styles = new Map(sheets.map(name => [
    `@deepseek-ai/dsh-client-ui-workspace/${name}.module.css`, { native: true },
  ]))
  const nativeStyles = [...styles.values()]
  const document = {
    querySelector(selector) {
      const id = JSON.parse(selector.slice('style[data-plugin-css='.length, -1))
      return styles.get(id) ?? null
    },
    createElement: () => ({ dataset: {} }),
    head: { appendChild(tag) { styles.set(tag.dataset.pluginCss, tag) } },
  }
  const blocks = [...client.matchAll(/const tagId(?:\$[12])? = "[^"\n]+";[\s\S]*?document.head.appendChild\(tag\);\s*}/g)]
  assert.equal(blocks.length, sheets.length)
  for (let load = 0; load < 2; load++) {
    for (const [code] of blocks) vm.runInNewContext(code, { document, css: 'browser', css$1: 'picker', css$2: 'rows' })
    assert.equal(styles.size, 6)
    for (const name of sheets) {
      const style = styles.get(`dsh-ssh-workspace/${name}.module.css`)
      assert.equal(style.dataset.plugin, 'dsh-ssh-workspace')
      assert.ok(style.textContent)
    }
    assert.deepEqual([...styles.values()].slice(0, 3), nativeStyles)
  }
})
