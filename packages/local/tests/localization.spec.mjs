import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

test('locale dictionaries follow the DSH language, preserve substitutions and unknown details, and dispose independently', async () => {
  const source = await readFile(new URL('../src/client/15-locale.part.js', import.meta.url), 'utf8')
  const dictionaries = new Map()
  const effects = []
  let active = 'zh'
  let revision = 0
  let subscribed = false
  const locale = {
    register(namespace, dictionary) {
      assert.ok(!dictionaries.has(namespace))
      dictionaries.set(namespace, dictionary)
      return () => dictionaries.delete(namespace)
    },
    bind(namespace) {
      return (key, args) => (dictionaries.get(namespace)?.[active]?.[key] ?? dictionaries.get(namespace)?.en?.[key] ?? key)
        .replace(/\{(\w+)\}/g, (match, name) => args && name in args ? String(args[name]) : match)
    },
    subscribe() { assert.equal(this, locale) },
    getSnapshot() { assert.equal(this, locale); return revision },
  }
  const api = vm.runInNewContext(source + '\n({ installRemoteLocale, remoteT, useRemoteLocale, workspaceT: (key, args) => workspaceTranslate(key, args) })', {
    OfficialWorkspace: { zh: { 'time.minutes': '{n}分钟' }, en: { 'time.minutes': '{n}min', fallback: 'English fallback' } },
    useSyncExternalStore(subscribe, getSnapshot) {
      subscribe(() => {})
      subscribed = true
      return getSnapshot()
    },
  })
  api.installRemoteLocale({ locale, effect(callback) { effects.push(callback()) } })
  assert.equal(dictionaries.size, 2)
  const remote = dictionaries.get('dsh-ssh-workspace')
  assert.deepEqual(Object.keys(remote.zh).sort(), Object.keys(remote.en).sort())
  for (const key of Object.keys(remote.en)) {
    assert.deepEqual([...remote.zh[key].matchAll(/\{\w+\}/g)].map(x => x[0]).sort(), [...key.matchAll(/\{\w+\}/g)].map(x => x[0]).sort(), key)
  }
  assert.equal(api.useRemoteLocale()('Remote Desktop'), '远端桌面')
  assert.ok(subscribed)
  assert.equal(api.remoteT('Open {name}', { name: 'Production {server} 中文' }), '打开 Production {server} 中文')
  assert.equal(api.remoteT('{n} Hosts', { n: 3 }), '3 台主机')
  assert.equal(api.workspaceT('time.minutes', { n: 5 }), '5分钟')
  assert.equal(api.remoteT('SSH EACCES /home/原样'), 'SSH EACCES /home/原样')
  assert.equal(api.workspaceT('fallback'), 'English fallback')
  active = 'en'
  revision++
  assert.equal(api.useRemoteLocale()('Remote Desktop'), 'Remote Desktop')
  assert.equal(api.workspaceT('time.minutes', { n: 5 }), '5min')
  assert.equal(api.remoteT('Open {name}', { name: 'server' }), 'Open server')
  for (const dispose of effects.reverse()) dispose()
  assert.equal(dictionaries.size, 0)
})
