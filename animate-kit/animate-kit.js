/**
 * AnimateKit - Micro Animation & Physics Primitives
 * Ported & Inspired by Animate-UI (https://animate-ui.com)
 * Standalone, zero-dependency, works with Vanilla JS, React, Vue, or any HTML project.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AnimateKit = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const AnimateKit = {};

  // =========================================================================
  // 1. GRAVITY STARS CANVAS BACKGROUND (Phỏng theo Animate-UI gravity-stars)
  // =========================================================================
  AnimateKit.gravityStars = function (target, config) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;

    let canvas;
    if (el.tagName.toLowerCase() === 'canvas') {
      canvas = el;
    } else {
      canvas = document.createElement('canvas');
      canvas.className = 'animateKit-canvas-bg';
      el.style.position = el.style.position || 'relative';
      el.prepend(canvas);
    }

    const ctx = canvas.getContext('2d');
    const opts = Object.assign(
      {
        starsCount: 80,
        starsSize: 2,
        starsColor: '#ffffff',
        accentColor: '#818cf8',
        mouseGravity: 'attract', // 'attract' | 'repel'
        mouseInfluence: 120,
        gravityStrength: 45,
        movementSpeed: 0.4,
        glowIntensity: 12,
      },
      config || {}
    );

    let width = (canvas.width = el.clientWidth || window.innerWidth);
    let height = (canvas.height = el.clientHeight || window.innerHeight);

    const particles = [];
    const mouse = { x: -9999, y: -9999, active: false };
    let animId = null;
    let isVisible = true;

    function resize() {
      width = canvas.width = el.clientWidth || window.innerWidth;
      height = canvas.height = el.clientHeight || window.innerHeight;
    }

    window.addEventListener('resize', resize);

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < opts.starsCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * opts.movementSpeed,
          vy: (Math.random() - 0.5) * opts.movementSpeed,
          size: Math.random() * opts.starsSize + 0.8,
          baseOpacity: Math.random() * 0.6 + 0.3,
          opacity: Math.random() * 0.6 + 0.3,
          mass: Math.random() * 1.5 + 0.5,
          color: Math.random() > 0.3 ? opts.starsColor : opts.accentColor,
        });
      }
    }

    const parentEl = el.tagName.toLowerCase() === 'canvas' ? canvas.parentElement || window : el;

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    }

    function onMouseLeave() {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    }

    parentEl.addEventListener('mousemove', onMouseMove);
    parentEl.addEventListener('mouseleave', onMouseLeave);

    function loop() {
      if (!isVisible) {
        animId = requestAnimationFrame(loop);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Apply mouse gravity
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < opts.mouseInfluence && dist > 1) {
            const force = (1 - dist / opts.mouseInfluence) * (opts.gravityStrength / 100) / p.mass;
            const factor = opts.mouseGravity === 'attract' ? 1 : -1;
            p.vx += (dx / dist) * force * factor;
            p.vy += (dy / dist) * force * factor;
            p.opacity = Math.min(1, p.baseOpacity + 0.4);
          } else {
            p.opacity = p.baseOpacity;
          }
        } else {
          p.opacity = p.baseOpacity;
        }

        // Apply velocity with damping
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Render particle
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = opts.glowIntensity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    }

    // Optimization: Pause when tab is hidden or element out of view
    document.addEventListener('visibilitychange', function () {
      isVisible = !document.hidden;
    });

    initParticles();
    animId = requestAnimationFrame(loop);

    return {
      destroy: function () {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', resize);
        parentEl.removeEventListener('mousemove', onMouseMove);
        parentEl.removeEventListener('mouseleave', onMouseLeave);
      },
      setGravity: function (type) {
        opts.mouseGravity = type;
      },
    };
  };

  // =========================================================================
  // 2. MAGNETIC BUTTON (Phỏng theo Animate-UI magnetic effect)
  // =========================================================================
  AnimateKit.magnetic = function (target, config) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;

    const opts = Object.assign(
      {
        strength: 0.35, // 0.1 to 1.0 (sức kéo theo chuột)
        range: 80,      // khoảng cách kích hoạt
      },
      config || {}
    );

    let rect = el.getBoundingClientRect();
    let currentX = 0, currentY = 0;
    let targetX = 0, targetY = 0;
    let rafId = null;

    function updateRect() {
      rect = el.getBoundingClientRect();
    }

    function onMouseMove(e) {
      updateRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);

      if (dist < opts.range + rect.width / 2) {
        targetX = (e.clientX - centerX) * opts.strength;
        targetY = (e.clientY - centerY) * opts.strength;
      } else {
        targetX = 0;
        targetY = 0;
      }
    }

    function onMouseLeave() {
      targetX = 0;
      targetY = 0;
    }

    function tick() {
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;

      el.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onMouseLeave);
    rafId = requestAnimationFrame(tick);

    return {
      destroy: function () {
        cancelAnimationFrame(rafId);
        window.removeEventListener('mousemove', onMouseMove);
        el.removeEventListener('mouseleave', onMouseLeave);
        el.style.transform = '';
      },
    };
  };

  // =========================================================================
  // 3. 3D TILT EFFECT (Phỏng theo Animate-UI tilt primitive)
  // =========================================================================
  AnimateKit.tilt = function (target, config) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;

    const opts = Object.assign(
      {
        maxTilt: 15,    // Góc nghiêng tối đa (độ)
        perspective: 1000,
        scale: 1.03,
        glare: true,
      },
      config || {}
    );

    el.style.perspective = `${opts.perspective}px`;

    let glareEl = null;
    if (opts.glare) {
      glareEl = document.createElement('div');
      glareEl.style.cssText =
        'position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18), transparent 70%);opacity:0;border-radius:inherit;transition:opacity 0.2s;';
      el.style.position = el.style.position || 'relative';
      el.appendChild(glareEl);
    }

    function onMouseMove(e) {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const tiltX = (y - 0.5) * -opts.maxTilt * 2;
      const tiltY = (x - 0.5) * opts.maxTilt * 2;

      el.style.transform = `perspective(${opts.perspective}px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale3d(${opts.scale}, ${opts.scale}, 1)`;

      if (glareEl) {
        glareEl.style.opacity = '1';
        glareEl.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.25), transparent 70%)`;
      }
    }

    function onMouseLeave() {
      el.style.transform = `perspective(${opts.perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      if (glareEl) {
        glareEl.style.opacity = '0';
      }
    }

    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onMouseLeave);

    return {
      destroy: function () {
        el.removeEventListener('mousemove', onMouseMove);
        el.removeEventListener('mouseleave', onMouseLeave);
        el.style.transform = '';
        if (glareEl) glareEl.remove();
      },
    };
  };

  // =========================================================================
  // 4. ROLLING / COUNTING NUMBER (Phỏng theo Animate-UI sliding-number)
  // =========================================================================
  AnimateKit.counter = function (target, targetNumber, config) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;

    const opts = Object.assign(
      {
        duration: 1200,
        startNumber: 0,
        formatter: (n) => n.toLocaleString(),
      },
      config || {}
    );

    const start = opts.startNumber;
    const end = targetNumber !== undefined ? targetNumber : parseFloat(el.textContent) || 0;
    const startTime = performance.now();

    function easeOutExpo(x) {
      return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    }

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / opts.duration, 1);
      const easedProgress = easeOutExpo(progress);

      const current = Math.floor(start + (end - start) * easedProgress);
      el.textContent = opts.formatter(current);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = opts.formatter(end);
      }
    }

    requestAnimationFrame(frame);
  };

  // =========================================================================
  // 5. TYPEWRITER EFFECT (Phỏng theo Animate-UI typing text)
  // =========================================================================
  AnimateKit.typewriter = function (target, words, config) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;

    const opts = Object.assign(
      {
        typeSpeed: 90,
        deleteSpeed: 45,
        delayBetween: 1600,
        loop: true,
      },
      config || {}
    );

    let wordIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let timeoutId = null;

    function type() {
      const currentWord = words[wordIdx % words.length];

      if (isDeleting) {
        el.textContent = currentWord.substring(0, charIdx - 1);
        charIdx--;
      } else {
        el.textContent = currentWord.substring(0, charIdx + 1);
        charIdx++;
      }

      let speed = isDeleting ? opts.deleteSpeed : opts.typeSpeed;

      if (!isDeleting && charIdx === currentWord.length) {
        speed = opts.delayBetween;
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        wordIdx++;
        speed = 400;
        if (!opts.loop && wordIdx >= words.length) return;
      }

      timeoutId = setTimeout(type, speed);
    }

    type();

    return {
      destroy: function () {
        clearTimeout(timeoutId);
      },
    };
  };

  // =========================================================================
  // 6. RIPPLE CLICK EFFECT
  // =========================================================================
  AnimateKit.ripple = function (target) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;

    el.style.position = el.style.position || 'relative';
    el.style.overflow = 'hidden';

    el.addEventListener('click', function (e) {
      const rect = el.getBoundingClientRect();
      const circle = document.createElement('span');
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.className = 'animateKit-ripple';

      const existing = el.querySelector('.animateKit-ripple');
      if (existing) existing.remove();

      el.appendChild(circle);
      circle.addEventListener('animationend', () => circle.remove());
    });
  };

  // =========================================================================
  // AUTO-INITIALIZE ALL [data-animate] IN DOCUMENT
  // =========================================================================
  AnimateKit.init = function (rootEl) {
    const context = rootEl || document;

    // Gravity Stars
    context.querySelectorAll('[data-animate="gravity-stars"]').forEach((node) => {
      const mode = node.getAttribute('data-gravity') || 'attract';
      const count = parseInt(node.getAttribute('data-stars-count')) || 80;
      AnimateKit.gravityStars(node, { mouseGravity: mode, starsCount: count });
    });

    // Magnetic
    context.querySelectorAll('[data-animate="magnetic"]').forEach((node) => {
      const strength = parseFloat(node.getAttribute('data-magnetic-strength')) || 0.35;
      AnimateKit.magnetic(node, { strength });
    });

    // Tilt
    context.querySelectorAll('[data-animate="tilt"]').forEach((node) => {
      const maxTilt = parseFloat(node.getAttribute('data-tilt-max')) || 14;
      AnimateKit.tilt(node, { maxTilt });
    });

    // Ripple
    context.querySelectorAll('[data-animate="ripple"]').forEach((node) => {
      AnimateKit.ripple(node);
    });

    // Counter
    context.querySelectorAll('[data-animate="counter"]').forEach((node) => {
      const targetVal = parseFloat(node.getAttribute('data-counter-target')) || parseFloat(node.textContent) || 0;
      AnimateKit.counter(node, targetVal);
    });

    // Typewriter
    context.querySelectorAll('[data-animate="typewriter"]').forEach((node) => {
      const rawWords = node.getAttribute('data-words');
      if (rawWords) {
        try {
          const list = JSON.parse(rawWords);
          AnimateKit.typewriter(node, list);
        } catch (e) {
          AnimateKit.typewriter(node, rawWords.split(','));
        }
      }
    });
  };

  // Auto-run when DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => AnimateKit.init());
    } else {
      AnimateKit.init();
    }
  }

  return AnimateKit;
});
