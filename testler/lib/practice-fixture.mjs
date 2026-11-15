// Tarayıcı practice çağrılarını taklit eder; gerçek deneme kaydı oluşturmaz.
export async function practiceFixture(b) {
  await b.cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const original = window.fetch.bind(window), states = {};
    window.__practiceEvents = [];
    window.fetch = async (input, init = {}) => {
      const path = new URL(typeof input === 'string' ? input : input.url, location.origin).pathname;
      if (!path.startsWith('/api/questions/') || !path.endsWith('/practice')) return original(input, init);
      const state = states[path] ||= { round: 1, attempts: [], canAnswer: true, canReveal: true, roundComplete: false, remainingAttempts: 2, correctAnswer: null };
      if (init.method === 'POST') {
        const event = JSON.parse(init.body); window.__practiceEvents.push(event.eventType);
        if (event.eventType === 'REVEAL' && window.__failReveal) {
          window.__failReveal = false;
          return new Response(JSON.stringify({message:'Geçici deneme hatası'}),{status:503,headers:{'Content-Type':'application/json'}});
        }
        state.attempts.push({eventType:event.eventType,selectedAnswer:event.answer,correct:event.answer === 'C'});
        if (event.eventType === 'REVEAL' || event.answer === 'C') Object.assign(state,{correctAnswer:'C',roundComplete:true,canReveal:false,canAnswer:false});
      }
      return new Response(JSON.stringify(state),{status:200,headers:{'Content-Type':'application/json'}});
    };
  })()` });
}
