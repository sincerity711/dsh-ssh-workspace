import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

test('workspace UI reuses native navigation and mirrors directory flows with scoped cleanup', async () => {
  const source = await readFile(new URL('../src/client/50-apply.part.js', import.meta.url), 'utf8')
  const nativeNames = ['conversation.hero.workspace.directoryFlow', 'sidebar.workspaces.directoryFlow']
  const localNames = ['dsh-ssh-workspace.hero.directoryFlow', 'dsh-ssh-workspace.sidebar.directoryFlow']
  const declarations = new Set(['conversation.hero.workspace', 'sidebar.workspaces', 'shell.overlay', 'settings.section', ...nativeNames])
  const entries = new Map()
  const listeners = new Map()
  const pending = []
  const effects = []
  const registrations = []
  const nativeFlow = { component() {}, inject: () => ({ pick: 'native' }) }
  for (const name of nativeNames) entries.set(name, [nativeFlow])
  const slots = {
    entries: name => entries.get(name) ?? [],
    subscribe(name, listener) {
      const set = listeners.get(name) ?? new Set()
      listeners.set(name, set)
      set.add(listener)
      return () => set.delete(listener)
    },
    inject(name, callback) {
      if (declarations.has(name)) callback()
      else pending.push({ name, callback })
    },
    register(options, component) {
      assert.ok(declarations.has(options.name))
      for (const name of Object.keys(options.children ?? {})) {
        assert.ok(!declarations.has(name), `duplicate declaration: ${name}`)
        declarations.add(name)
      }
      const entry = { ...options, component }
      entries.set(options.name, [entry])
      registrations.push(entry)
      for (const request of pending.splice(0)) {
        if (declarations.has(request.name)) request.callback()
        else pending.push(request)
      }
      return () => { if (entries.get(options.name)?.[0] === entry) entries.delete(options.name) }
    },
    provideRoot() { assert.fail('native workspace root must retain ownership') },
  }
  const navigation = { openSession() {} }
  const ctx = {
    slots,
    get: name => ({ uiWorkspace: navigation, sessions: {}, workspaces: { list: {} } })[name],
    effect(callback) { const dispose = callback(); effects.push(dispose); return dispose },
    remote: {},
    on() { return () => {} },
  }
  const exports = {}
  vm.runInNewContext(source.slice(0, source.indexOf('    const styles =')), {
    exports, window: {}, store: { getSnapshot() {}, subscribe() {}, listSources() {}, getActive() {} },
    remoteBridges: new Map(), closeRemoteBridge() {}, isRemoteDesktopIframe: () => false,
    OfficialWorkspace: { createWorkspaceViewStore: () => ({ create: () => ({ actions: {} }) }), UiWorkspaceService() { assert.fail('native service must not be replaced') } },
    WorkspaceAddSplitter() {}, OfficialWorkspaceForkBrowser() {}, RemoteOverlay() {}, SettingsSection() {},
  })
  exports.apply(ctx)
  for (const name of localNames) {
    assert.equal(entries.get(name)?.[0].component, nativeFlow.component)
    assert.equal(entries.get(name)?.[0].inject, nativeFlow.inject)
  }
  assert.ok(registrations.find(entry => entry.name === 'sidebar.workspaces' && entry.priority < 0))
  const replacement = { component() {}, inject: () => ({ pick: 'replacement' }) }
  entries.set(nativeNames[0], [replacement])
  for (const listener of listeners.get(nativeNames[0])) listener()
  assert.equal(entries.get(localNames[0])[0].component, replacement.component)
  for (const dispose of effects.reverse()) dispose?.()
  for (const name of localNames) assert.equal(entries.has(name), false)
  for (const name of nativeNames) assert.equal(listeners.get(name).size, 0)
})
