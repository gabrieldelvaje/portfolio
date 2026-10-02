/* Match the other Work cards: start the sequence directly on pointer entry. */
(() => {
  const card = document.getElementById('card-agua-piracicaba');
  if (!card) return;
  const page = card.querySelector('.wp-page');
  const firstTab = card.querySelector('.wp-nav__1');
  const secondTab = card.querySelector('.wp-nav__2');
  let animations = [];

  function reset() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }

  function play(event) {
    if (event.pointerType === 'touch' || animations.length) return;
    const blue = getComputedStyle(firstTab).backgroundColor;
    const neutral = getComputedStyle(secondTab).backgroundColor;
    const timing = { duration: 3200, iterations: 1, easing: 'linear' };
    const ease = 'cubic-bezier(.65, 0, .35, 1)';
    animations = [
      page.animate([
        { transform: 'translateY(0)', offset: 0, easing: ease },
        { transform: 'translateY(-50%)', offset: .35 },
        { transform: 'translateY(-50%)', offset: .65, easing: ease },
        { transform: 'translateY(0)', offset: 1 }
      ], timing),
      firstTab.animate([
        { backgroundColor: blue, offset: 0 },
        { backgroundColor: neutral, offset: .35 },
        { backgroundColor: neutral, offset: .65 },
        { backgroundColor: blue, offset: 1 }
      ], timing),
      secondTab.animate([
        { backgroundColor: neutral, offset: 0 },
        { backgroundColor: blue, offset: .35 },
        { backgroundColor: blue, offset: .65 },
        { backgroundColor: neutral, offset: 1 }
      ], timing)
    ];
    animations[0].addEventListener('finish', reset, { once: true });
  }

  card.addEventListener('pointerenter', play);
  card.addEventListener('pointerleave', reset);
})();
