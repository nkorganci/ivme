import assert from 'node:assert/strict';
import { join } from 'node:path';

// Ortak sahte API / Chrome kurulumu: konu-ogrenme-ui.mjs --laboratuvar temel-kavramlar
export async function runLaboratory({ browser, mobile, out, eventCount }) {
  const { evalJs, goto, wait, screenshot, errors, failedRequests } = browser;
  const steps = [];
  const prefix = mobile ? 'mobil' : 'masaustu';
  const click = async (selector, index = 0) => {
    assert.ok(await evalJs(`(() => { const e = document.querySelectorAll(${JSON.stringify(selector)})[${index}]; if (!e || e.disabled) return false; e.click(); return true; })()`), selector);
  };
  const textClick = async (text) => {
    assert.ok(await evalJs(`(() => { const e = [...document.querySelectorAll('.pl-page button')].find(e => !e.disabled && e.textContent.includes(${JSON.stringify(text)}) && e.getClientRects().length); if (!e) return false; e.click(); return true; })()`), text);
  };
  const check = async (step) => steps.push({ step, overflow: await evalJs('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2') });
  const shot = async (name) => screenshot(join(out, `${prefix}-laboratuvar-${name}.png`));
  try {
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
    assert.ok(links[0].href.includes('tip=tek-cift'));
    assert.ok(links[1].href.includes('tur=cikmis'));
    assert.ok(links.every((a) => a.target === '_blank'));
    assert.equal(eventCount(), 0, 'laboratuvar öğrenci ilerlemesi veya ustalık olayı yazmamalı');
    await evalJs('document.querySelector(".pl-workbench").scrollIntoView({block:"start"})');
    await shot('tamamlandi');
    await check('tamamlandı');
    await goto('/konuyu-ogrenelim/laboratuvar/temel-kavramlar');
    await wait('document.querySelector(".pl-predict")');
    assert.equal(await evalJs('document.querySelectorAll(".pl-predict [aria-pressed=true]").length'), 0);
    return { mobile, steps, errors: [...errors], failedRequests: failedRequests.filter((f) => !f.url?.includes('favicon')) };
  } catch (error) {
    await shot('hata');
    return { mobile, steps, failure: error.message, errors: [...errors], failedRequests: [...failedRequests] };
  } finally { browser.close(); }
}
