import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startLearnMock } from './lib/learn-mock.mjs';
import { CHECKS, TRANSFER } from '../frontend/src/learn/physics/questions.js';
const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'veri/ui-denetim/fizik-pilot'); mkdirSync(out, { recursive: true });
const live = process.argv.includes('--live');
const mock = live ? null : await startLearnMock(root);
const { tarayiciAc, pause } = await import('./lib/tarayici.mjs');
const report = [];
try {
  for (const mobile of [false, true]) {
    const b = await tarayiciAc({ mobile });
    const { evalJs, goto, wait, screenshot } = b;
    try {
      if (live) {
        await b.login('student');
        assert.equal(await evalJs("(async()=> (await fetch('/api/auth/me')).status)()"), 200);
        b.failedRequests.length = 0; // Expected pre-login auth probes only.
      }
      await goto('/konuyu-ogrenelim/harita?ders=fizik');
      await wait("document.querySelector('a[href=\"/konuyu-ogrenelim/fizik/hareket-kuvvet\"]')");
      await evalJs("document.querySelector('a[href=\"/konuyu-ogrenelim/fizik/hareket-kuvvet\"]').click()");
      await wait("document.querySelector('.ph-experiment')");
      assert.equal(await evalJs("document.querySelectorAll('.ph-path nav button').length"), 8);
      if (live) {
        await goto('/konuyu-ogrenelim/fizik/hareket-kuvvet?bolum=grafik&duzey=connection');
        await wait("document.querySelectorAll('.ph-studio .ml-graphs svg').length===2");
        await evalJs("document.querySelector('.ph-sources details summary').click()");
        await wait("document.querySelector('.ph-sources figure > img')?.naturalWidth>0");
        assert.equal(await evalJs('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2'), false);
        assert.deepEqual(b.errors, []);
        assert.deepEqual(b.failedRequests.filter(r => !r.url.endsWith('/favicon.ico')), []);
        await screenshot(join(out, mobile ? 'canli-mobil-grafik.png' : 'canli-masaustu-grafik.png'));
        report.push({ mobile, live, readOnly: true, sections: 8, graphs: 2, sourceImage: true, passed: true });
        continue;
      }
      await screenshot(join(out, mobile ? 'mobil-giris.png' : 'masaustu-giris.png'));
      for (const [id, check] of Object.entries(CHECKS)) {
        await goto('/konuyu-ogrenelim/fizik/hareket-kuvvet?bolum=' + id);
        await wait(`document.querySelector('.ph-path [aria-current]')?.textContent.startsWith(${JSON.stringify(String(Object.keys(CHECKS).indexOf(id) + 1))})`);
        await evalJs(`document.querySelectorAll('.ph-check .ph-choices button')[${(check.correct + 1) % check.options.length}].click()`);
        await wait("document.querySelector('.ph-retry')");
        await evalJs(`document.querySelectorAll('.ph-check .ph-choices button')[${check.correct}].click()`);
        await wait("document.querySelector('.ph-correct')");
        for (let i = 0; i < 3; i++) {
          await evalJs(`document.querySelectorAll('.ph-levels button')[${i}].click()`);
          await wait(`document.querySelectorAll('.ph-levels button')[${i}].getAttribute('aria-pressed')==='true'`);
          assert.ok(await evalJs("document.querySelector('.ph-explain').textContent.length > 150"));
        }
        {
          await evalJs("document.querySelector('.ph-studio .ml-play').click()");
          await pause(250);
          assert.ok(await evalJs("Number(document.querySelector('.ph-studio input[aria-label=Zaman]').value)>0"));
          await evalJs("document.querySelector('.ph-studio button[aria-label=\"Başa dön\"]').click()");
          assert.equal(await evalJs("Number(document.querySelector('.ph-studio input[aria-label=Zaman]').value)"), 0);
        }
        const seekEnd = "(()=>{const el=document.querySelector('.ph-studio input[aria-label=Zaman]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,el.max);el.dispatchEvent(new Event('input',{bubbles:true}));})()";
        await evalJs(seekEnd);
        // Exercise an actual React range control through its native value setter.
        const before = await evalJs("document.querySelector('.ml-readouts').textContent");
        await evalJs("(()=>{const el=document.querySelector('.ph-controls input[type=range]');if(!el)return;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,el.max);el.dispatchEvent(new Event('input',{bubbles:true}));})()");
        await evalJs(seekEnd);
        if (id !== 'referans') assert.notEqual(await evalJs("document.querySelector('.ml-readouts').textContent"), before);
        assert.equal(await evalJs("document.querySelectorAll('.ml-graph').length"), ['referans','yol','hiz','grafik'].includes(id) ? 2 : 3);
        await evalJs("document.querySelector('.ml-layers input').click()");
        await evalJs("document.querySelector('.ml-layers input').click()");
        if (['grafik','ivme'].includes(id)) {
          await evalJs("document.querySelector('.ph-edit-toggle').click()");
          await wait("document.querySelector('.ml-node[role=slider]')");
          assert.equal(await evalJs("document.querySelectorAll('.ph-presets button[aria-pressed=true]').length"), 0);
          const value = await evalJs("Number(document.querySelector('.ml-node[role=slider]').getAttribute('aria-valuenow'))");
          await evalJs("document.querySelector('.ml-node[role=slider]').focus()");
          await b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
          await b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
          await wait(`Number(document.querySelector('.ml-node[role=slider]').getAttribute('aria-valuenow'))!==${value}`);
          assert.equal(await evalJs("document.querySelectorAll('.ph-controls input[type=range]').length"), 0, 'canonical parameters must not show stale values while editing');
          await evalJs("document.querySelector('.ph-edit-toggle').click()");
          await wait("!document.querySelector('.ml-node[role=slider]')");
        }
        if (id === 'surtunme') {
          await evalJs("[...document.querySelectorAll('.ph-presets button')].find(b=>b.textContent==='Kayarken ipi bırak').click()");
          await evalJs(seekEnd);
          assert.ok(await evalJs("document.querySelector('.ph-force-panel').textContent.includes('Durdu · statik denge')"));
          await evalJs("[...document.querySelectorAll('.ph-presets button')].find(b=>b.textContent==='Eşikte').click()");
          await evalJs(seekEnd);
          assert.ok(await evalJs("document.querySelector('.ph-force-panel').textContent.includes('Statik · kutu duruyor')"));
          await evalJs("[...document.querySelectorAll('.ph-presets button')].find(b=>b.textContent==='Kayma başlıyor').click()");
          await evalJs(seekEnd);
          assert.ok(await evalJs("document.querySelector('.ph-force-panel').textContent.includes('Kinetik · kutu kayıyor')"));
        }
        if (id === 'etki-tepki') {
          await evalJs("document.querySelectorAll('.ph-milestones button')[0].click()");
          assert.ok(await evalJs("document.querySelector('.ph-force-panel').textContent.includes('İtme sürüyor')"));
          await evalJs("document.querySelectorAll('.ph-milestones button')[1].click()");
          assert.ok(await evalJs("document.querySelector('.ph-force-panel').textContent.includes('Temas bitti')"));
          assert.equal(await evalJs("document.querySelectorAll('[data-object=skater]').length"), 2);
        }
        assert.deepEqual(await evalJs("[...document.querySelectorAll('.ml-stage svg text')].filter(el=>{const b=el.getBoundingClientRect(),v=el.ownerSVGElement.getBoundingClientRect();return b.left<v.left-2||b.right>v.right+2}).map(el=>el.textContent)"), [], id + ': scene labels must remain inside view');
        await evalJs("document.querySelector('.ph-sources details summary').click()");
        await wait("document.querySelector('.ph-sources figure > img')?.complete && document.querySelector('.ph-sources figure > img')?.naturalWidth>0");
        await evalJs("document.querySelector('.ph-sources .lm-zoom-button').click()");
        await wait("document.querySelector('dialog[open]')");
        await b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await wait("!document.querySelector('dialog[open]')");
        assert.equal(await evalJs('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2'), false, id + ': page overflow');
        assert.equal(await evalJs("document.querySelectorAll('.katex-error').length"), 0, id + ': formula parsing');
        if (['grafik', 'surtunme'].includes(id)) {
          await evalJs(seekEnd);
          await evalJs("document.querySelector('.ph-studio .ml').scrollIntoView({block:'start'})");
          await screenshot(join(out, `${mobile ? 'mobil' : 'masaustu'}-${id}.png`));
        }
      }
      await evalJs("document.querySelector('.ph-path > button').click()");
      await wait("document.querySelectorAll('.ph-check').length===6");
      for (let i = 0; i < TRANSFER.length; i++) await evalJs(`document.querySelectorAll('.ph-check')[${i}].querySelectorAll('.ph-choices button')[${TRANSFER[i].correct}].click()`);
      assert.equal(await evalJs("document.querySelectorAll('.ph-correct').length"), 6);
      assert.deepEqual(b.errors, []); assert.deepEqual(b.failedRequests, []);
      report.push({ mobile, sections: 8, levels: 24, sourceDialogs: 8, transfer: 6, passed: true });
    } finally { await b.close(); }
  }
  if (mock) assert.deepEqual(mock.writes, [], 'Pilot does not generate or overwrite learner mastery events');
  writeFileSync(join(out, live ? 'canli-rapor.json' : 'rapor.json'), JSON.stringify({ runs: report, studentWrites: mock?.writes ?? 'read-only page verification' }, null, 2));
  console.log(JSON.stringify(report));
} finally { await mock?.close(); }
