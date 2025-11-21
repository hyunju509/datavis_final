// script.js — global interactions for the site
// This file intentionally keeps logic small & defensive so it runs
// even if certain elements are not present on the page yet.

(function(){
  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init(){
    setupTimelineReveal();
    setupYearSliderSync();
    setupStepHoverSync();
  }

  // ---- 1) Timeline reveal on scroll (Montreal Protocol timeline) ----
  function setupTimelineReveal(){
    const items = document.querySelectorAll('.timeline-item');
    if (!items.length || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          // Uncomment if you want one-time reveal
          // io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    items.forEach(el=>io.observe(el));
  }

  // ---- 2) Year slider ↔ label sync (Ozone Time Map) ----
  function setupYearSliderSync(){
    const slider = document.getElementById('yearSlider');
    const label  = document.getElementById('yearLabel');
    if(!slider || !label) return;

    // Initialize
    label.textContent = slider.value;

    slider.addEventListener('input', ()=>{
      label.textContent = slider.value;
      // If you later bind data layers by year, trigger a custom event here
      const ev = new CustomEvent('year:change', { detail: { year: +slider.value }});
      window.dispatchEvent(ev);
    });
  }

  // ---- 3) Step hover/enter → sync slider (scrollytelling cues) ----
  function setupStepHoverSync(){
    const steps = document.querySelectorAll('#ozone-map-section .step');
    const slider = document.getElementById('yearSlider');
    const label  = document.getElementById('yearLabel');
    if(!steps.length || !slider || !label) return;

    steps.forEach(step => {
      // Hover or focus
      step.addEventListener('mouseenter', ()=> sync(step));
      step.addEventListener('focus', ()=> sync(step));
      // Click/tap also supported
      step.addEventListener('click', ()=> sync(step));
    });

    function sync(step){
      const y = step.getAttribute('data-year');
      if(!y) return;
      slider.value = y;
      label.textContent = y;
      const ev = new CustomEvent('year:change', { detail: { year: +y }});
      window.dispatchEvent(ev);
    }
  }
})();