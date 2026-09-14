/* ============================================================
   quiz.js — pre-test / post-test engine

   Markup expected in a chapter page:

   <section class="quiz quiz--pre" id="pretest" data-quiz="pre" data-pass="0.6">
     <script type="application/json" class="quiz-data">
       { "questions": [
           { "q":  { "th": "…", "en": "…" },
             "choices": [ {"th":"…","en":"…"}, … ],
             "answer": 2,
             "why": { "th": "…", "en": "…" } }
       ] }
     </script>
   </section>

   Both tests reveal the full solution with reasoning as soon as they are
   submitted; only the closing message differs (pre-test points the student
   into the chapter, post-test reports pass/fail against data-pass).
   ============================================================ */
(function () {
  'use strict';

  var store = (window.RE && window.RE.store) || {
    get: function (k, f) { try { var v = localStorage.getItem(k); return v === null ? f : v; } catch (e) { return f; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    json: function (k, f) { var r = this.get(k, null); if (!r) return f; try { return JSON.parse(r); } catch (e) { return f; } }
  };

  var THAI_KEYS = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];
  var EN_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* bilingual fragment: pass {th, en} — CSS shows the active one */
  function bi(obj, tag) {
    tag = tag || 'span';
    if (obj == null) return '';
    if (typeof obj === 'string') return esc(obj);
    return '<' + tag + ' class="th" lang="th">' + esc(obj.th) + '</' + tag + '>' +
           '<' + tag + ' class="en" lang="en">' + esc(obj.en) + '</' + tag + '>';
  }

  var TEXT = {
    preTitle:  { th: 'แบบทดสอบก่อนเรียน', en: 'Pre-test' },
    postTitle: { th: 'แบบทดสอบหลังเรียน', en: 'Post-test' },
    preSub: {
      th: 'ทำก่อนอ่านเนื้อหา เพื่อวัดความรู้เดิมของตนเอง — ส่งคำตอบแล้วจะเห็นเฉลยพร้อมคำอธิบายทันที',
      en: 'Take this before reading the chapter to gauge your prior knowledge. Answers and explanations appear as soon as you submit.'
    },
    postSub: {
      th: 'ทำหลังอ่านเนื้อหาจบ — ระบบจะเฉลยพร้อมคำอธิบายทุกข้อ',
      en: 'Take this after finishing the chapter. Every question is explained after you submit.'
    },
    check:   { th: 'ตรวจคำตอบและดูเฉลย', en: 'Submit and see answers' },
    retry:   { th: 'ทำใหม่', en: 'Try again' },
    answered: { th: 'ตอบแล้ว', en: 'Answered' },
    incomplete: { th: 'กรุณาตอบให้ครบทุกข้อก่อนตรวจคำตอบ', en: 'Please answer every question before submitting.' },
    score:   { th: 'คะแนน', en: 'Score' },
    correct: { th: 'ถูกต้อง', en: 'Correct' },
    wrong:   { th: 'ยังไม่ถูก', en: 'Not quite' },
    prePass: {
      th: 'พื้นฐานดีมาก — อ่านเฉลยแต่ละข้อด้านล่าง แล้วอ่านเนื้อหาเพื่อเติมรายละเอียดก่อนทำแบบทดสอบหลังเรียน',
      en: 'Strong starting point. Read the explanation under each question, then work through the chapter before the post-test.'
    },
    preFail: {
      th: 'ไม่เป็นไร นี่คือแบบทดสอบก่อนเรียน — อ่านเฉลยและคำอธิบายของแต่ละข้อด้านล่าง จะช่วยให้รู้ว่าต้องโฟกัสหัวข้อใดเป็นพิเศษ',
      en: 'That is fine — this is a pre-test. Read the explanation under each question; it tells you which sections to focus on.'
    },
    postPass: {
      th: 'ผ่านเกณฑ์ พร้อมไปบทต่อไปได้',
      en: 'You passed. Move on to the next chapter.'
    },
    postFail: {
      th: 'ยังไม่ผ่านเกณฑ์ — ทบทวนหัวข้อของข้อที่ตอบผิด แล้วลองทำใหม่อีกครั้ง',
      en: 'Below the pass mark — review the topics you missed and try again.'
    }
  };

  function parseData(root) {
    var tag = root.querySelector('script.quiz-data');
    if (!tag) return null;
    try { return JSON.parse(tag.textContent); }
    catch (e) {
      console.error('[quiz] invalid JSON in', root.id || root, e);
      return null;
    }
  }

  function build(root) {
    var data = parseData(root);
    if (!data || !Array.isArray(data.questions) || !data.questions.length) return;

    var kind = root.dataset.quiz === 'post' ? 'post' : 'pre';
    var chapter = document.body.dataset.chapter || 'x';
    var pass = parseFloat(root.dataset.pass || '0.6');
    var qs = data.questions;
    var name = 'q_' + chapter + '_' + kind + '_';

    root.classList.add(kind === 'post' ? 'quiz--post' : 'quiz--pre');

    /* ----- head ----- */
    var head = document.createElement('div');
    head.className = 'quiz__head';
    head.innerHTML =
      '<span class="quiz__badge">' + (kind === 'post' ? 'Post-test' : 'Pre-test') + '</span>' +
      '<span class="quiz__title">' + bi(data.title || (kind === 'post' ? TEXT.postTitle : TEXT.preTitle)) + '</span>' +
      '<span class="quiz__sub">' + bi(data.sub || (kind === 'post' ? TEXT.postSub : TEXT.preSub)) + '</span>';

    /* ----- body ----- */
    var body = document.createElement('div');
    body.className = 'quiz__body';
    body.innerHTML = qs.map(function (q, i) {
      var choices = q.choices.map(function (c, j) {
        return '<li><label class="choice">' +
          '<input type="radio" name="' + name + i + '" value="' + j + '">' +
          '<span class="choice__key">' +
            '<span class="th" lang="th">' + (THAI_KEYS[j] || j + 1) + '.</span>' +
            '<span class="en" lang="en">' + (EN_KEYS[j] || j + 1) + '.</span>' +
          '</span>' +
          '<span class="choice__text">' + bi(c) + '</span>' +
          '</label></li>';
      }).join('');
      return '<div class="q" data-i="' + i + '">' +
        '<div class="q__text"><span class="q-num">' + (i + 1) + '.</span><span>' + bi(q.q) + '</span></div>' +
        '<ul class="q__choices">' + choices + '</ul>' +
        '<div class="q__feedback" hidden></div>' +
        '</div>';
    }).join('');

    /* ----- actions ----- */
    var actions = document.createElement('div');
    actions.className = 'quiz__actions';
    actions.innerHTML =
      '<button type="button" class="btn" data-act="check">' + bi(TEXT.check) + '</button>' +
      '<button type="button" class="btn btn--ghost" data-act="retry" hidden>' + bi(TEXT.retry) + '</button>' +
      '<span class="quiz__score" data-score>' + bi(TEXT.answered) + ' <span class="val">0</span>/' + qs.length + '</span>';

    var result = document.createElement('div');
    result.className = 'quiz__result';
    result.hidden = true;

    root.append(head, body, actions, result);

    /* ----- state & helpers ----- */
    var scoreEl = actions.querySelector('[data-score]');
    var btnCheck = actions.querySelector('[data-act="check"]');
    var btnRetry = actions.querySelector('[data-act="retry"]');

    function answers() {
      return qs.map(function (_, i) {
        var picked = root.querySelector('input[name="' + name + i + '"]:checked');
        return picked ? parseInt(picked.value, 10) : null;
      });
    }

    function updateCount() {
      if (root.classList.contains('is-graded')) return;
      var n = answers().filter(function (a) { return a !== null; }).length;
      scoreEl.innerHTML = bi(TEXT.answered) + ' <span class="val">' + n + '</span>/' + qs.length;
    }

    body.addEventListener('change', updateCount);

    function reveal(picks) {
      qs.forEach(function (q, i) {
        var qEl = body.querySelector('.q[data-i="' + i + '"]');
        var labels = qEl.querySelectorAll('.choice');
        labels.forEach(function (lab, j) {
          if (j === q.answer) lab.classList.add('is-correct');
          else if (picks && picks[i] === j) lab.classList.add('is-wrong');
        });
        var ok = picks && picks[i] === q.answer;
        var fb = qEl.querySelector('.q__feedback');
        fb.innerHTML =
          '<div class="q__verdict ' + (ok ? 'ok' : 'no') + '">' + bi(ok ? TEXT.correct : TEXT.wrong) + '</div>' +
          (q.why ? '<div>' + bi(q.why) + '</div>' : '');
        fb.hidden = false;
        // feedback is built after page load, so it needs typesetting of its own
        if (window.RE && window.RE.renderMath) window.RE.renderMath(fb);
      });
    }

    function save(score) {
      var all = store.json('re.progress', {});
      var rec = all[chapter] || {};
      rec[kind] = { score: score, total: qs.length, at: new Date().toISOString() };
      all[chapter] = rec;
      store.set('re.progress', JSON.stringify(all));
      if (window.RE) window.RE.progress = all;
    }

    function grade() {
      var picks = answers();
      if (picks.some(function (a) { return a === null; })) {
        result.hidden = false;
        result.innerHTML = '<strong class="warn-text">' + bi(TEXT.incomplete) + '</strong>';
        picks.forEach(function (a, i) {
          var qEl = body.querySelector('.q[data-i="' + i + '"]');
          qEl.style.outline = a === null ? '2px solid var(--amber)' : '';
          qEl.style.outlineOffset = a === null ? '6px' : '';
        });
        return;
      }
      qs.forEach(function (_, i) {
        body.querySelector('.q[data-i="' + i + '"]').style.outline = '';
      });

      var score = picks.reduce(function (acc, a, i) { return acc + (a === qs[i].answer ? 1 : 0); }, 0);
      var pct = score / qs.length;
      var passed = pct >= pass;

      root.classList.add('is-graded');
      body.querySelectorAll('input').forEach(function (inp) { inp.disabled = true; });

      scoreEl.innerHTML = bi(TEXT.score) + ' <span class="val ' + (passed ? 'pass' : 'fail') + '">' +
        score + '</span>/' + qs.length + ' (' + Math.round(pct * 100) + '%)';

      var msg;
      if (kind === 'post') msg = passed ? TEXT.postPass : TEXT.postFail;
      else msg = passed ? TEXT.prePass : TEXT.preFail;

      result.hidden = false;
      result.innerHTML = '<p>' + bi(msg) + '</p>';

      reveal(picks);

      btnCheck.hidden = true;
      btnRetry.hidden = false;
      save(score);
    }

    function reset() {
      root.classList.remove('is-graded');
      body.querySelectorAll('input').forEach(function (inp) { inp.disabled = false; inp.checked = false; });
      body.querySelectorAll('.choice').forEach(function (c) { c.classList.remove('is-correct', 'is-wrong'); });
      body.querySelectorAll('.q__feedback').forEach(function (f) { f.hidden = true; f.innerHTML = ''; });
      body.querySelectorAll('.q').forEach(function (q) { q.style.outline = ''; });
      result.hidden = true; result.innerHTML = '';
      btnCheck.hidden = false;
      btnRetry.hidden = true;
      updateCount();
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    btnCheck.addEventListener('click', grade);
    btnRetry.addEventListener('click', reset);
    updateCount();
  }

  document.querySelectorAll('.quiz[data-quiz]').forEach(build);
})();
