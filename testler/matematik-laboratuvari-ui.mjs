import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const labDef = async (conceptId) => (await import(pathToFileURL(join(import.meta.dirname, '../frontend/src/learn/lab/konular', `${conceptId}.js`)).href)).default;

// Ortak sahte API / Chrome kurulumu: konu-ogrenme-ui.mjs --laboratuvar <konu>. Tek–çift pilotu (custom hedef) eski
// akışıyla; diğer hedefler lab tanımındaki örnek durum, yanlış/doğru gerekçe ve aktarım cevaplarıyla sürülür.
export async function runLaboratory({ browser, mobile, out, eventCount, conceptId = 'temel-kavramlar' }) {
  const lab = await labDef(conceptId);
  const steps = [];
  try {
    if (lab.goals.some((g) => g.custom === 'parity')) await runParity({ browser, mobile, out, steps });
    for (const goal of lab.goals.filter((g) => !g.custom)) await runGoal({ browser, mobile, out, conceptId, goal, steps });
    assert.equal(eventCount(), 0, 'laboratuvar öğrenci ilerlemesi veya ustalık olayı yazmamalı');
    await browser.goto(`/konuyu-ogrenelim/laboratuvar/${conceptId}`);
    await browser.wait('document.querySelector(".tl-goals")');
    assert.equal(await browser.evalJs('document.querySelectorAll(".tl-goals button")[0].textContent.includes("✓")'), false, 'yenileyince deney durumu sıfırlanır');
    return { mobile, conceptId, steps, errors: [...browser.errors], failedRequests: browser.failedRequests.filter((f) => !f.url?.includes('favicon')) };
  } catch (error) {
    await browser.screenshot(join(out, `${mobile ? 'mobil' : 'masaustu'}-laboratuvar-${conceptId}-hata.png`));
    return { mobile, conceptId, steps, failure: error.message, errors: [...browser.errors], failedRequests: [...browser.failedRequests] };
  } finally { browser.close(); }
}

async function runGoal({ browser, mobile, out, conceptId, goal, steps }) {
  const { evalJs, goto, wait, screenshot } = browser;
  const prefix = `${mobile ? 'mobil' : 'masaustu'}-laboratuvar-${conceptId}-${goal.id}`;
  const textClick = async (text) => assert.ok(await evalJs(`(() => { const e = [...document.querySelectorAll('.pl-page button')].find(e => !e.disabled && e.textContent.includes(${JSON.stringify(text)}) && e.getClientRects().length); if (!e) return false; e.click(); return true; })()`), `${goal.id}: ${text}`);
  const pick = async (label, i) => assert.ok(await evalJs(`(() => { const e = document.querySelectorAll('[aria-label=${JSON.stringify(label)}] button')[${i}]; if (!e || e.disabled) return false; e.click(); return true; })()`), `${goal.id}: ${label} ${i}`);
  const check = async (step) => steps.push({ step: `${goal.id}:${step}`, overflow: await evalJs('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2') });
  const control = (k) => `document.querySelectorAll('.tl-controls .tl-control')[${k}]`;
  const ex = goal.experiment;
  await goto(`/konuyu-ogrenelim/laboratuvar/${conceptId}?hedef=${goal.id}`);
  await wait('document.querySelector(".tl-predict")');
  assert.ok((await evalJs('document.querySelector(".tl-goals [aria-pressed=true]").textContent')).includes(goal.label), 'adres hedefi seçmeli');
  assert.equal(await evalJs('document.querySelector(".tl-visual") !== null'), false, 'tahmin öncesi model gösterilmemeli');
  assert.ok(await evalJs('document.querySelector(".pl-predict .btn").disabled'));
  assert.ok(await evalJs('document.querySelectorAll(".pl-stages button")[3].disabled'));
  await check('tahmin');
  await pick('Tahminin', 0);
  await textClick('Tahminimi sına');
  await wait('document.querySelector(".tl-controls")');
  assert.ok(await evalJs('[...document.querySelectorAll("button")].find(e => e.textContent.includes("Peki neden?")).disabled'), 'hedef bulunmadan gerekçeye geçilmez');
  await textClick('Bu durumu kaydet');
  await wait('document.querySelector(".tl-log li")');
  assert.ok(await evalJs('document.querySelector(".tl-log li").textContent.includes("Hedef değil")'), 'başlangıç durumu hedef sayılmamalı');
  const values = { ...ex.initial, ...ex.target.example };
  let keyboard = false;
  for (const [k, c] of ex.controls.entries()) {
    if (c.options) {
      const idx = c.options.findIndex(([v]) => v === values[c.key]);
      assert.ok(await evalJs(`(() => { const b = ${control(k)}.querySelectorAll('button')[${idx}]; if (!b) return false; b.click(); return true; })()`), `${c.key} seçeneği`);
      continue;
    }
    if (!keyboard) { // gerçek klavye etkileşimi: bir adım sağa
      keyboard = true;
      await new Promise((r) => setTimeout(r, 200)); // aşama değişiminde başlığa giden odak tamamlansın
      await evalJs(`${control(k)}.querySelector('input').focus()`);
      await browser.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
      await browser.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
      const want = Math.min(c.max, ex.initial[c.key] + (c.step ?? 1));
      await new Promise((r) => setTimeout(r, 150));
      const got = await evalJs(`${control(k)}.querySelector('input').value + '|' + (document.activeElement?.tagName ?? '')`);
      assert.ok(Math.abs(Number(got.split('|')[0]) - want) < 1e-9, `klavye: ${c.key} ${got}, beklenen ${want}`);
    }
    await evalJs(`(() => { const i = ${control(k)}.querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, '${values[c.key]}'); i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  }
  await textClick('Bu durumu kaydet');
  await wait('document.querySelector(".tl-log li.tl-hit") && document.querySelector(".pl-success")');
  await evalJs('document.querySelector(".tl-workbench").scrollIntoView({block:"start"})');
  await screenshot(join(out, `${prefix}-deney.png`));
  await check('deney');
  await textClick('Peki neden?');
  await wait('document.querySelector(".pl-reason")');
  const wrong = (r) => (r.answer + 1) % r.options.length;
  for (const [i, r] of goal.reasons.entries()) await pick(i ? `Gerekçe ${i + 1}` : 'Gerekçen', i === 0 ? wrong(r) : r.answer);
  await textClick('Gerekçemi kontrol et');
  await wait('document.querySelector(".pl-reason .pl-retry")');
  const expected = goal.reasons[0].feedback[wrong(goal.reasons[0])].replace(/\$[^$]*\$/g, ' ').split(/[\s,.;:()“”'’]+/).filter((w) => w.length >= 2).sort((a, b) => b.length - a.length)[0] ?? '';
  const shown = await evalJs('document.querySelector(".pl-reason .pl-retry").textContent');
  assert.ok(shown.replace(/\s+/g, ' ').includes(expected), `${goal.id}: yanlış gerekçeye özel geri bildirim (${expected} / ${shown.slice(0, 120)})`);
  assert.ok(await evalJs('document.querySelectorAll(".pl-stages button")[3].disabled'));
  await pick('Gerekçen', goal.reasons[0].answer);
  await textClick('Gerekçemi kontrol et');
  await wait('document.querySelector(".pl-reason .pl-success")');
  assert.ok(await evalJs('document.querySelector(".tl-rule").textContent.includes("Ne zaman geçerli")'));
  await check('gerekçe');
  await textClick('Yeni soruda kullan');
  for (const [q, t] of goal.transfer.entries()) {
    await wait(`document.querySelector(".tl-transfer .pl-eyebrow")?.textContent.includes("${q + 1} / ${goal.transfer.length}")`);
    if (q === 0) {
      await pick('Aktarım cevabı', wrong(t));
      await textClick('Cevabımı kontrol et');
      await wait('document.querySelector(".tl-transfer .pl-retry")');
      for (const h of ['Küçük bir ipucu', 'Biraz daha yardım', 'Çözüm adımını göster']) await textClick(h);
      assert.equal(await evalJs('document.querySelectorAll(".tl-hints li").length'), 3, 'ipucu basamakları sırayla açılır');
    }
    await pick('Aktarım cevabı', t.answer);
    await textClick('Cevabımı kontrol et');
    await wait('document.querySelector(".tl-transfer .pl-success")');
    await check(`aktarım-${q + 1}`);
    await textClick(q < goal.transfer.length - 1 ? 'Sonraki soru' : 'Hedefi tamamla');
  }
  await wait('document.querySelector(".tl-complete")');
  const n = goal.transfer.length;
  assert.ok(await evalJs(`document.querySelector(".tl-complete").textContent.includes("ipucusuz ${n - 1}/${n}")`), 'ipucu kullanılan soru ilk deneme sayılmaz');
  assert.ok(await evalJs('document.querySelector(".tl-complete").textContent.includes("1 soruda ipucu")'));
  if (goal.real?.length) {
    const link = await evalJs('(() => { const a = document.querySelector(".tl-complete a"); return a && { href: a.href, target: a.target }; })()');
    assert.ok(link?.href.includes('tur=lab') && link.href.includes(`tip=lab-${goal.id}`), 'gerçek soru seti bağlantısı');
    assert.ok(decodeURIComponent(link.href).includes(`kod=${goal.real.map((r) => r.code).join(',')}`));
    assert.equal(link.target, '_blank');
  } else assert.equal(await evalJs('document.querySelector(".tl-complete a")'), null, 'gerçek soru yoksa bağlantı uydurulmaz');
  assert.ok(await evalJs('document.querySelector(".tl-goals [aria-pressed=true]").textContent.includes("✓")'), 'hedef sekmesi tamamlandı işareti');
  await evalJs('document.querySelector(".tl-workbench").scrollIntoView({block:"start"})');
  await screenshot(join(out, `${prefix}-tamam.png`));
  await check('tamam');
}

async function runParity({ browser, mobile, out, steps }) {
  const { evalJs, goto, wait, screenshot } = browser;
  const prefix = mobile ? 'mobil' : 'masaustu';
  const click = async (selector, index = 0) => {
    assert.ok(await evalJs(`(() => { const e = document.querySelectorAll(${JSON.stringify(selector)})[${index}]; if (!e || e.disabled) return false; e.click(); return true; })()`), selector);
  };
  const textClick = async (text) => {
    assert.ok(await evalJs(`(() => { const e = [...document.querySelectorAll('.pl-page button')].find(e => !e.disabled && e.textContent.includes(${JSON.stringify(text)}) && e.getClientRects().length); if (!e) return false; e.click(); return true; })()`), text);
  };
  const check = async (step) => steps.push({ step, overflow: await evalJs('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2') });
  const shot = async (name) => screenshot(join(out, `${prefix}-laboratuvar-${name}.png`));
  {
    await goto('/konuyu-ogrenelim/konu/temel-kavramlar');
    await wait('document.querySelector(".pl-entry a")');
    await click('.pl-entry a');
    await wait('document.querySelector(".pl-predict")');
    await shot('baslangic');
    await check('başlangıç');
    assert.equal(await evalJs('document.querySelector(".pl-visual") !== null'), false, 'tahmin öncesi sonuç gösterilmemeli');
    assert.ok(await evalJs('document.querySelector(".pl-predict .btn").disabled'));
    assert.ok(await evalJs('document.querySelectorAll(".pl-stages button")[3].disabled'));
    for (let s = 0; s < 4; s++) {
      if (s) await click('.pl-scenarios button', s);
      await wait('document.querySelector(".pl-predict")');
      await click('[aria-label="Tahminin"] button', 0);
      await textClick('Tahminimi sına');
      await wait('document.querySelector(".pl-controls")');
      assert.ok(await evalJs('[...document.querySelectorAll("button")].find(e => e.textContent.includes("Peki neden?")).disabled'));
      await click('.pl-presets button', s === 3 ? 1 : 0);
      await textClick('Bu örneği kaydet');
      await wait('document.querySelector(".pl-experiment-log li")');
      if (s === 3) {
        assert.ok(await evalJs('document.querySelector(".pl-parity").textContent.includes("16")'));
        assert.ok(await evalJs('document.querySelector(".pl-experiment-log").textContent.includes("Karşı örnek")'));
      }
      if (s === 0) {
        // Sliderın gerçek klavye etkileşimi: End, b=12 ve a=-7.
        await new Promise((r) => setTimeout(r, 200)); // aşama değişiminde başlığa giden odak tamamlansın
        await evalJs('document.querySelector(".pl-controls input").focus()');
        await browser.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'End', code: 'End', windowsVirtualKeyCode: 35 });
        await browser.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'End', code: 'End', windowsVirtualKeyCode: 35 });
        await wait('document.querySelector(".pl-controls input").value === "12"');
        assert.ok(await evalJs('document.querySelector(".pl-picture-caption").textContent.includes("eksi")'));
        await textClick('Bu örneği kaydet');
      }
      await evalJs('document.querySelector(".pl-workbench").scrollIntoView({block:"start"})');
      await shot(`deney-${s + 1}`);
      await check(`deney-${s + 1}`);
      await textClick('Peki neden?');
      await wait('document.querySelector(".pl-reason")');
      await click('[aria-label="Son kararın"] button', [0, 2, 1, 1][s]);
      if (s === 0) {
        await click('[aria-label="Gerekçen"] button', 0);
        await textClick('Kararımı ve gerekçemi');
        await wait('document.querySelector(".pl-retry")');
        assert.ok(await evalJs('document.querySelector(".pl-retry").textContent.includes("negatif")'));
        assert.ok(await evalJs('document.querySelectorAll(".pl-stages button")[3].disabled'));
      }
      await click('[aria-label="Gerekçen"] button', [1, 0, 2, 2][s]);
      await textClick('Kararımı ve gerekçemi');
      await wait('document.querySelector(".pl-success")');
      await check(`gerekçe-${s + 1}`);
      await textClick('Yeni soruda kullan');
      await wait('document.querySelector(".pl-transfer")?.getClientRects().length');
    }
    // Sekme değiştirince diğer deneyin örnekleri ve aşaması korunmalı.
    await click('.pl-scenarios button', 0);
    await click('.pl-stages button', 1);
    await wait('document.querySelector(".pl-experiment-log li")');
    assert.equal(await evalJs('document.querySelectorAll(".pl-experiment-log li").length'), 2);
    await click('.pl-stages button', 3);
    for (let q = 0; q < 3; q++) {
      if (q === 0) {
        await click('[aria-label="Aktarım cevabı"] button', 0);
        await textClick('Cevabımı kontrol');
        await wait('document.querySelector(".pl-transfer .pl-retry")');
        await textClick('Küçük bir ipucu');
      }
      await click('[aria-label="Aktarım cevabı"] button', [1, 0, 2][q]);
      await textClick('Cevabımı kontrol');
      await wait('document.querySelector(".pl-transfer .pl-success")');
      await check(`aktarım-${q + 1}`);
      await textClick(q < 2 ? 'Sonraki soru' : 'Çalışmamı tamamla');
    }
    await wait('document.querySelector(".pl-complete")');
    assert.ok(await evalJs('document.querySelector(".pl-complete").textContent.includes("2/3")'));
    assert.ok(await evalJs('document.querySelector(".pl-complete").textContent.includes("1 soruda")'));
    const links = await evalJs('[...document.querySelectorAll(".pl-complete a")].map(a=>({href:a.href,target:a.target}))');
    assert.ok(links[0].href.includes('tur=lab') && decodeURIComponent(links[0].href).includes('kod=TYT-0545,TYT-0565,TYT-0576,TYT-0572'));
    assert.ok(links[1].href.includes('tip=tek-cift'));
    assert.ok(links.every((a) => a.target === '_blank'));
    await evalJs('document.querySelector(".pl-workbench").scrollIntoView({block:"start"})');
    await shot('tamamlandi');
    await check('tamamlandı');
    await goto('/konuyu-ogrenelim/laboratuvar/temel-kavramlar');
    await wait('document.querySelector(".pl-predict")');
    assert.equal(await evalJs('document.querySelectorAll(".pl-predict [aria-pressed=true]").length'), 0);
  }
}
