(() => {
  'use strict';

  const figure = document.querySelector('.hero-visual');
  const video = document.querySelector('#hero-source');
  const poster = document.querySelector('.hero-fallback');
  const stage = document.querySelector('.hero-stage');
  const button = document.querySelector('.hero-motion');
  let canvas = document.querySelector('#hero-canvas');
  if (!figure || !video || !poster || !stage || !button || !canvas) return;
  const label = button.querySelector('.motion-label');
  const symbol = button.querySelector('.motion-symbol');
  if (!label || !symbol) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktopQuery = matchMedia('(min-width: 1180px)');
  const saveData = Boolean(navigator.connection?.saveData);
  const alphaFloor = .008;
  let wantsPlayback = !reducedMotion.matches && !saveData;
  let visible = !('IntersectionObserver' in window);
  let posterSettled = poster.complete;
  let started = false;
  let ended = false;
  let pending = false;
  let suspended = false;
  let rendererFailed = false;
  let mediaFailed = false;
  let desktopSource = false;
  let sourceChosen = false;
  let renderer = null;
  let needsPaint = true;
  let playAttempt = 0;
  let frameEpoch = 0;
  let frameCallback = null;
  let animationFrame = null;
  let resizeFrame = null;
  let lastTime = -1;

  // The poster already has real alpha. It is never keyed or painted into a canvas.
  function showPoster() {
    delete figure.dataset.ready;
    needsPaint = true;
  }

  function syncButton() {
    const playing = !video.paused && !ended;
    const action = playing || pending ? 'Pause' : ended ? 'Replay' : started ? 'Resume' : 'Play';
    label.textContent = action;
    symbol.textContent = action === 'Pause' ? 'Ⅱ' : action === 'Replay' ? '↻' : '▷';
    button.setAttribute('aria-label', `${action} hero animation`);
    button.hidden = rendererFailed || !posterSettled;
    figure.dataset.state = action.toLowerCase();
  }

  function stopFrames() {
    frameEpoch += 1;
    if (frameCallback !== null && typeof video.cancelVideoFrameCallback === 'function') {
      video.cancelVideoFrameCallback(frameCallback);
    }
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    frameCallback = animationFrame = null;
  }

  function pausePlayback() {
    playAttempt += 1;
    pending = false;
    video.pause();
    stopFrames();
  }

  function shouldPlay() {
    return !rendererFailed && !mediaFailed && posterSettled && visible && !document.hidden &&
      !suspended && wantsPlayback && !ended;
  }

  function chooseSource() {
    if (sourceChosen) return true;
    desktopSource = desktopQuery.matches && !saveData && Boolean(video.dataset.desktopSrc);
    const url = desktopSource ? video.dataset.desktopSrc : video.dataset.src;
    if (!url) return false;
    // Keep the chosen rendition during resizing, avoiding a seek or second download.
    sourceChosen = true;
    video.src = url;
    return true;
  }

  function createWebGLRenderer(target) {
    const attributes = {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      // Retain a paused/final frame without a continuous rendering loop.
      preserveDrawingBuffer: true,
      powerPreference: 'low-power'
    };
    const gl = target.getContext('webgl', attributes) || target.getContext('experimental-webgl', attributes);
    if (!gl) throw new Error('WebGL is unavailable');

    function compile(type, source) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Unable to allocate a shader');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        throw new Error('Unable to compile the hero shader');
      }
      return shader;
    }

    const vertex = compile(gl.VERTEX_SHADER, `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `);
    const fragment = compile(gl.FRAGMENT_SHADER, `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif
      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform vec2 uFrameTexel;
      uniform float uAlphaFloor;
      void main() {
        // FLIP_Y puts the source's top RGB half in the upper texture half.
        // Local pixel-center bounds prevent interpolation across the packing seam.
        vec2 uv = clamp(vUv, uFrameTexel * 0.5, vec2(1.0) - uFrameTexel * 0.5);
        vec3 rgb = texture2D(uTexture, vec2(uv.x, 0.5 + uv.y * 0.5)).rgb;
        vec3 mask = texture2D(uTexture, vec2(uv.x, uv.y * 0.5)).rgb;
        float rawAlpha = dot(mask, vec3(0.2126, 0.7152, 0.0722));
        float alpha = clamp((rawAlpha - uAlphaFloor) / (1.0 - uAlphaFloor), 0.0, 1.0);
        vec3 premultiplied = rgb * (alpha / max(rawAlpha, 0.0001));
        gl_FragColor = vec4(clamp(premultiplied, vec3(0.0), vec3(alpha)), alpha);
      }
    `);
    const program = gl.createProgram();
    if (!program) throw new Error('Unable to allocate the hero program');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Unable to link the hero program');

    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!buffer || !texture) throw new Error('Unable to allocate hero graphics');
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Both assets are non-power-of-two textures; no mipmaps are needed.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0);
    gl.uniform1f(gl.getUniformLocation(program, 'uAlphaFloor'), alphaFloor);
    const texel = gl.getUniformLocation(program, 'uFrameTexel');
    const maximumTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maximumViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    let textureWidth = 0;
    let textureHeight = 0;
    let validate = true;
    target.addEventListener('webglcontextlost', handleContextLoss);

    return {
      kind: 'webgl',
      maximumWidth: Math.min(maximumViewport[0], gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)),
      resize(width, height) {
        if (target.width !== width || target.height !== height) {
          target.width = width;
          target.height = height;
          validate = true;
        }
        gl.viewport(0, 0, width, height);
      },
      draw() {
        if (gl.isContextLost()) throw new Error('Hero graphics context was lost');
        if (video.videoWidth > maximumTexture || video.videoHeight > maximumTexture) {
          throw new Error('The packed video exceeds this GPU texture limit');
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        if (textureWidth !== video.videoWidth || textureHeight !== video.videoHeight) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
          textureWidth = video.videoWidth;
          textureHeight = video.videoHeight;
          validate = true;
        } else {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);
        }
        gl.useProgram(program);
        gl.uniform2f(texel, 1 / video.videoWidth, 2 / video.videoHeight);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        // Check allocation/upload errors on the first frame and after a resize.
        if (validate) {
          validate = false;
          if (gl.getError() !== gl.NO_ERROR) throw new Error('Unable to render the packed hero video');
        }
      },
      dispose() {
        target.removeEventListener('webglcontextlost', handleContextLoss);
        gl.deleteTexture(texture);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      }
    };
  }

  function createCanvasRenderer(target) {
    const output = target.getContext('2d', { alpha: true, colorSpace: 'srgb' });
    const frame = document.createElement('canvas');
    const context = frame.getContext('2d', { alpha: true, willReadFrequently: true, colorSpace: 'srgb' });
    if (!output || !context) throw new Error('Canvas rendering is unavailable');
    let result = null;

    return {
      kind: 'canvas2d',
      maximumWidth: desktopSource ? 960 : 720,
      resize(width, height) {
        if (!result || target.width !== width || target.height !== height) {
          target.width = frame.width = width;
          target.height = height;
          frame.height = height * 2;
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          result = output.createImageData(width, height);
        }
      },
      draw() {
        const width = target.width;
        const height = target.height;
        const sourceHeight = video.videoHeight / 2;
        // Draw each half separately to keep the packing seam out of the filter.
        context.drawImage(video, 0, 0, video.videoWidth, sourceHeight, 0, 0, width, height);
        context.drawImage(video, 0, sourceHeight, video.videoWidth, sourceHeight, 0, height, width, height);
        const packed = context.getImageData(0, 0, width, height * 2).data;
        const pixels = result.data;
        const offset = width * height * 4;
        for (let index = 0; index < offset; index += 4) {
          const mask = index + offset;
          const rawAlpha = (packed[mask] * .2126 + packed[mask + 1] * .7152 + packed[mask + 2] * .0722) / 255;
          const alpha = Math.max(0, Math.min(1, (rawAlpha - alphaFloor) / (1 - alphaFloor)));
          if (alpha === 0) {
            pixels[index] = pixels[index + 1] = pixels[index + 2] = pixels[index + 3] = 0;
          } else {
            // ImageData takes straight RGB. Divide by the original alpha, not
            // the adjusted alpha; the written alpha then applies the same ratio as GL.
            pixels[index] = packed[index] / rawAlpha;
            pixels[index + 1] = packed[index + 1] / rawAlpha;
            pixels[index + 2] = packed[index + 2] / rawAlpha;
            pixels[index + 3] = Math.round(alpha * 255);
          }
        }
        output.putImageData(result, 0, 0);
      },
      dispose() {}
    };
  }

  function useCanvasFallback() {
    showPoster();
    const previous = renderer;
    renderer = null;
    if (previous) previous.dispose();
    // A canvas cannot switch context types after getContext('webgl').
    const replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement);
    canvas = replacement;
    renderer = createCanvasRenderer(canvas);
    figure.dataset.renderer = renderer.kind;
  }

  function ensureRenderer() {
    if (renderer) return;
    try {
      renderer = createWebGLRenderer(canvas);
      figure.dataset.renderer = renderer.kind;
    } catch (_) {
      useCanvasFallback();
    }
  }

  function sizeRenderer() {
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight / 2;
    const cssWidth = stage.getBoundingClientRect().width || sourceWidth;
    const density = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.min(sourceWidth, renderer.maximumWidth, Math.round(cssWidth * density)));
    const height = Math.max(1, Math.round(width * sourceHeight / sourceWidth));
    renderer.resize(width, height);
  }

  function failRenderer() {
    rendererFailed = true;
    wantsPlayback = false;
    pausePlayback();
    showPoster();
    syncButton();
  }

  function paintVideo() {
    if (rendererFailed || mediaFailed || video.seeking || video.readyState < 2 ||
      !video.videoWidth || !video.videoHeight || document.hidden || suspended || !visible) return false;
    try {
      ensureRenderer();
      sizeRenderer();
      renderer.draw();
    } catch (_) {
      if (renderer?.kind !== 'webgl') {
        failRenderer();
        return false;
      }
      try {
        useCanvasFallback();
        sizeRenderer();
        renderer.draw();
      } catch (_) {
        failRenderer();
        return false;
      }
    }
    needsPaint = false;
    lastTime = video.currentTime;
    figure.dataset.ready = 'true';
    return true;
  }

  function handleContextLoss(event) {
    if (event.target !== canvas || renderer?.kind !== 'webgl') return;
    event.preventDefault();
    stopFrames();
    showPoster();
    try {
      useCanvasFallback();
      paintVideo();
      scheduleFrame();
    } catch (_) {
      failRenderer();
    }
  }

  function scheduleFrame() {
    if (!shouldPlay() || video.paused || video.ended || video.seeking) return;
    if (frameCallback !== null || animationFrame !== null) return;
    const epoch = frameEpoch;
    if (typeof video.requestVideoFrameCallback === 'function') {
      frameCallback = video.requestVideoFrameCallback(() => {
        if (epoch !== frameEpoch) return;
        frameCallback = null;
        if (!shouldPlay() || video.paused || video.ended || video.seeking) return;
        paintVideo();
        scheduleFrame();
      });
    } else {
      animationFrame = requestAnimationFrame(() => {
        if (epoch !== frameEpoch) return;
        animationFrame = null;
        if (!shouldPlay() || video.paused || video.ended || video.seeking) return;
        if (needsPaint || video.currentTime !== lastTime) paintVideo();
        scheduleFrame();
      });
    }
  }

  function reconcilePlayback() {
    if (needsPaint) paintVideo();
    if (!shouldPlay()) {
      pausePlayback();
      syncButton();
      return;
    }
    if (!video.paused || pending) {
      scheduleFrame();
      syncButton();
      return;
    }
    if (!chooseSource()) {
      wantsPlayback = false;
      syncButton();
      return;
    }
    const attempt = ++playAttempt;
    pending = true;
    syncButton();

    function rejected() {
      if (attempt !== playAttempt) return;
      pending = false;
      wantsPlayback = false;
      video.pause();
      stopFrames();
      syncButton();
    }

    try {
      Promise.resolve(video.play()).then(() => {
        if (attempt !== playAttempt) return;
        pending = false;
        if (!shouldPlay()) {
          pausePlayback();
        } else {
          started = true;
          paintVideo();
          scheduleFrame();
        }
        syncButton();
      }).catch(rejected);
    } catch (_) {
      rejected();
    }
  }

  function queueResize() {
    needsPaint = true;
    if (resizeFrame !== null) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      // Resizing also repaints a paused or completed frame, without restarting it.
      paintVideo();
    });
  }

  video.muted = video.defaultMuted = true;
  video.playsInline = true;
  video.loop = false;
  showPoster();

  button.addEventListener('click', () => {
    if (!video.paused || pending) {
      wantsPlayback = false;
      pausePlayback();
    } else {
      if (mediaFailed) {
        mediaFailed = false;
        started = false;
        ended = false;
        video.load();
      }
      if (ended || video.ended) {
        ended = false;
        lastTime = -1;
        showPoster();
        try { video.currentTime = 0; } catch (_) { video.load(); }
      }
      wantsPlayback = true;
      reconcilePlayback();
    }
    syncButton();
  });

  video.addEventListener('loadeddata', () => { paintVideo(); });
  video.addEventListener('playing', () => {
    if (!shouldPlay()) {
      pausePlayback();
    } else {
      started = true;
      stopFrames();
      paintVideo();
      scheduleFrame();
    }
    syncButton();
  });
  video.addEventListener('pause', () => {
    if (video.paused) {
      stopFrames();
      needsPaint = true;
      paintVideo();
    }
    syncButton();
  });
  video.addEventListener('seeking', stopFrames);
  video.addEventListener('seeked', () => {
    needsPaint = true;
    paintVideo();
    scheduleFrame();
  });
  video.addEventListener('ended', () => {
    ended = true;
    wantsPlayback = false;
    playAttempt += 1;
    pending = false;
    stopFrames();
    needsPaint = true;
    paintVideo();
    syncButton();
  });
  video.addEventListener('error', () => {
    // Ignore an old queued error if a user retry has already reset the media.
    if (!video.error) return;
    mediaFailed = true;
    wantsPlayback = false;
    started = false;
    ended = false;
    pausePlayback();
    showPoster();
    syncButton();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      reconcilePlayback();
    }, { threshold: .05 }).observe(figure);
  }
  if ('ResizeObserver' in window) new ResizeObserver(queueResize).observe(stage);
  window.addEventListener('resize', queueResize, { passive: true });
  document.addEventListener('visibilitychange', reconcilePlayback);
  window.addEventListener('pagehide', () => {
    suspended = true;
    pausePlayback();
  });
  window.addEventListener('pageshow', () => {
    suspended = false;
    needsPaint = true;
    reconcilePlayback();
  });

  function motionPreferenceChanged() {
    if (reducedMotion.matches) {
      wantsPlayback = false;
      reconcilePlayback();
    }
  }
  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', motionPreferenceChanged);
  } else {
    reducedMotion.addListener(motionPreferenceChanged);
  }

  function preparePoster() {
    posterSettled = true;
    syncButton();
    reconcilePlayback();
  }
  if (poster.complete) preparePoster();
  else {
    poster.addEventListener('load', preparePoster, { once: true });
    poster.addEventListener('error', preparePoster, { once: true });
  }
  syncButton();
})();
