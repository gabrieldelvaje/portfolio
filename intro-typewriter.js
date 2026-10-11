(() => {
  const greeting = document.querySelector('.portrait-copy');
  if (!greeting || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Run once per document load; section navigation never replays the greeting.
  const lines = Array.from(greeting.children);
  const texts = lines.map(line => line.textContent);
  const outputs = lines.map((line, index) => {
    const reserve = document.createElement('span');
    reserve.className = 'typewriter-reserve';
    reserve.textContent = texts[index];
    const output = document.createElement('span');
    output.className = 'typewriter-output';
    output.setAttribute('aria-hidden', 'true');
    line.replaceChildren(reserve, output);
    return output;
  });
  greeting.classList.add('is-typing');
  let lineIndex = 0;
  let character = 0;
  outputs[0].classList.add('is-current');
  function typeNext() {
    const letters = Array.from(texts[lineIndex]);
    character += 1;
    outputs[lineIndex].textContent = letters.slice(0, character).join('');
    if (character < letters.length) {
      setTimeout(typeNext, 50);
    } else if (lineIndex < outputs.length - 1) {
      setTimeout(() => {
        outputs[lineIndex].classList.remove('is-current');
        lineIndex += 1;
        character = 0;
        outputs[lineIndex].classList.add('is-current');
        typeNext();
      }, 50);
    } else {
      setTimeout(() => {
        lines.forEach((line, index) => { line.textContent = texts[index]; });
        greeting.classList.remove('is-typing');
      }, 1800);
    }
  }
  setTimeout(typeNext, 150);
})();
