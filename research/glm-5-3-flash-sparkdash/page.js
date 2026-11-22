(() => {
  const video = document.getElementById('brand-film');
  const toggle = document.getElementById('motion');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const playIcon = toggle.querySelector('.play');
  const pauseIcon = toggle.querySelector('.pause');

  function update() {
    const label = video.paused ? 'Play logo animation' : 'Pause logo animation';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    playIcon.hidden = !video.paused;
    pauseIcon.hidden = video.paused;
  }

  function play() {
    video.play().catch(update);
  }

  toggle.addEventListener('click', () => video.paused ? play() : video.pause());
  video.addEventListener('playing', update);
  video.addEventListener('pause', update);
  video.addEventListener('error', () => { toggle.hidden = true; });
  reduce.addEventListener('change', () => { if (reduce.matches) video.pause(); });
  if (!reduce.matches) play();
})();
