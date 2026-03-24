import { useState, useEffect, useRef, useMemo } from "react";

// ─── SVG 刷新图标 ────────────────────────────────────────────
const ResetIcon = () => (
  // 通过精确计算原路径边界，将 viewBox 调整为中心对齐，彻底消除错位和旋转抖动
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.1 1.75 40 40" width="65%" height="65%" style={{ display: "block" }}>
    <path fill="#7EDD10" d="M10.4,7.1c0,0,15.8-1.3,15.9,10.2H23l8.8,6.2l7.3-6.3l-2.9,0c0,0-1.4-8.3-9-11.7S13.3,5,10.4,7.1" />
    <path fill="#15B9F9" d="M29.3,33.5c0,0-15.8,1.3-15.9-10.2h3.4L8,17.1l-7.3,6.3l2.9,0c0,0,1.4,8.3,9,11.7C20.2,38.5,26.5,35.7,29.3,33.5" />
  </svg>
);

const LoadingDots = () => (
  <div style={S.loadingGif}>
    {[0, 0.13, 0.26, 0.39, 0.52].map((delay, i) => (
      <span key={i} style={{ ...S.loadingDot, animationDelay: `${delay}s` }} />
    ))}
  </div>
);

/**
 * SlideVerify — 拼图滑块验证码
 *
 * Props
 *   show          boolean    是否显示
 *   canvasWidth   number     主画布宽度，默认 310
 *   canvasHeight  number     主画布高度，默认 160
 *   puzzleScale   number     拼图块缩放 0.2~2，默认 1
 *   sliderSize    number     滑块大小，默认 50
 *   range         number     判定误差(px)，默认 10
 *   imgs          string[]   背景图数组，不传则随机生成
 *   successText   string
 *   failText      string
 *   sliderText    string
 *   onSuccess     (deviation: number) => void
 *   onFail        (deviation: number) => void
 *   onClose       () => void
 */
export const SlideVerify = ({
  show = false,
  canvasWidth = 310,
  canvasHeight = 160,
  puzzleScale = 1,
  sliderSize = 50,
  range = 10,
  imgs = null,
  successText = "验证通过！",
  failText = "验证失败，请重试",
  sliderText = "拖动滑块完成拼图",
  onSuccess,
  onFail,
  onClose,
}) => {
  const c1 = useRef(null);
  const c2 = useRef(null);
  const c3 = useRef(null);

  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [infoShow, setInfoShow] = useState(false);
  const [infoFail, setInfoFail] = useState(false);
  const [infoText, setInfoText] = useState("");
  const [mouseDown, setMouseDown] = useState(false);
  const [styleWidth, setStyleWidth] = useState(50);

  // 所有运行时状态和最新 props 都存在这一个 ref 里
  // 这样所有事件回调都能读到最新值，彻底消除 stale closure
  const R = useRef({});

  // 每次 render 同步最新 props 和派生尺寸进 R
  const sliderBaseSize = Math.max(Math.min(Math.round(sliderSize), Math.round(canvasWidth * 0.5)), 10);
  const puzzleBaseSize = Math.round(Math.max(Math.min(puzzleScale, 2), 0.2) * 52.5 + 6);

  R.current.canvasWidth = canvasWidth;
  R.current.canvasHeight = canvasHeight;
  R.current.puzzleScale = puzzleScale;
  R.current.sliderBaseSize = sliderBaseSize;
  R.current.puzzleBaseSize = puzzleBaseSize;
  R.current.range = range;
  R.current.imgs = imgs;
  R.current.successText = successText;
  R.current.failText = failText;
  R.current.onSuccess = onSuccess;
  R.current.onFail = onFail;
  R.current.onClose = onClose;

  // 初始化 R 中的运行时字段（只在第一次）
  if (R.current.initialized == null) {
    R.current.initialized = true;
    R.current.isCanSlide = false;
    R.current.isSubmiting = false;
    R.current.mouseDown = false;
    R.current.startWidth = sliderBaseSize;
    R.current.startX = 0;
    R.current.newX = 0;
    R.current.pinX = 0;
    R.current.pinY = 0;
    R.current.imgIndex = -1;
    R.current.timer = null;
    R.current._closeDown = false;
  }

  // puzzleOffset 用于渲染，需要跟随 styleWidth state
  const puzzleOffset = useMemo(() => {
    const sbs = sliderBaseSize;
    const pbs = puzzleBaseSize;
    const cw = canvasWidth;
    return styleWidth - sbs - (pbs - sbs) * ((styleWidth - sbs) / (cw - sbs));
  }, [styleWidth, sliderBaseSize, puzzleBaseSize, canvasWidth]);

  // ── 工具函数（直接读 R.current，无闭包问题）─────────────────────────────────
  const getRandom = (min, max) => Math.ceil(Math.random() * (max - min) + min);

  const paintBrick = (ctx, pX, pY) => {
    const m = Math.ceil(15 * R.current.puzzleScale);
    ctx.beginPath();
    ctx.moveTo(pX, pY);
    ctx.lineTo(pX + m, pY);
    ctx.arcTo(pX + m, pY - m / 2, pX + m + m / 2, pY - m / 2, m / 2);
    ctx.arcTo(pX + 2 * m, pY - m / 2, pX + 2 * m, pY, m / 2);
    ctx.lineTo(pX + 3 * m, pY);
    ctx.lineTo(pX + 3 * m, pY + m);
    ctx.arcTo(pX + 3 * m + m / 2, pY + m, pX + 3 * m + m / 2, pY + m + m / 2, m / 2);
    ctx.arcTo(pX + 3 * m + m / 2, pY + 2 * m, pX + 3 * m, pY + 2 * m, m / 2);
    ctx.lineTo(pX + 3 * m, pY + 3 * m);
    ctx.lineTo(pX, pY + 3 * m);
    ctx.lineTo(pX, pY + 2 * m);
    ctx.arcTo(pX + m / 2, pY + 2 * m, pX + m / 2, pY + m + m / 2, m / 2);
    ctx.arcTo(pX + m / 2, pY + m, pX, pY + m, m / 2);
    ctx.lineTo(pX, pY);
  };

  const makeImgWithCanvas = () => {
    const { canvasWidth: cw, canvasHeight: ch } = R.current;
    const cv = document.createElement("canvas");
    cv.width = cw; cv.height = ch;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = `rgb(${getRandom(100, 255)},${getRandom(100, 255)},${getRandom(100, 255)})`;
    ctx.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgb(${getRandom(100, 255)},${getRandom(100, 255)},${getRandom(100, 255)})`;
      ctx.strokeStyle = `rgb(${getRandom(100, 255)},${getRandom(100, 255)},${getRandom(100, 255)})`;
      if (getRandom(0, 2) > 1) {
        ctx.save();
        ctx.rotate((getRandom(-90, 90) * Math.PI) / 180);
        ctx.fillRect(getRandom(-20, cw - 20), getRandom(-20, ch - 20),
          getRandom(10, cw / 2 + 10), getRandom(10, ch / 2 + 10));
        ctx.restore();
      } else {
        ctx.beginPath();
        const ran = getRandom(-Math.PI, Math.PI);
        ctx.arc(getRandom(0, cw), getRandom(0, ch), getRandom(10, ch / 2 + 10), ran, ran + Math.PI * 1.5);
        ctx.closePath(); ctx.fill();
      }
    }
    return cv.toDataURL("image/png");
  };

  const makeImgSize = (img) => {
    const { canvasWidth: cw, canvasHeight: ch } = R.current;
    const imgScale = img.width / img.height;
    const canvasScale = cw / ch;
    let x = 0, y = 0, w = 0, h = 0;
    if (imgScale > canvasScale) {
      h = ch; w = imgScale * h; y = 0; x = (cw - w) / 2;
    } else {
      w = cw; h = w / imgScale; x = 0; y = (ch - h) / 2;
    }
    return [x, y, w, h];
  };

  // ── resetState ───────────────────────────────────────────────────────────────
  const resetState = () => {
    const sbs = R.current.sliderBaseSize;
    R.current.isCanSlide = false;
    R.current.mouseDown = false;
    R.current.startWidth = sbs;
    R.current.startX = 0;
    R.current.newX = 0;
    setMouseDown(false);
    setStyleWidth(sbs);
    setIsSuccess(false);
    setInfoShow(false);
    setInfoFail(false);
  };

  // ── init ─────────────────────────────────────────────────────────────────────
  const init = (withCanvas = false) => {
    const {
      canvasWidth: cw, canvasHeight: ch,
      puzzleBaseSize: pbs, imgs: imgList,
    } = R.current;

    setLoading(true);
    R.current.isCanSlide = false;

    const canvas1 = c1.current;
    const canvas2 = c2.current;
    const canvas3 = c3.current;
    if (!canvas1 || !canvas2 || !canvas3) { setLoading(false); return; }

    const ctx = canvas1.getContext("2d", { willReadFrequently: true });
    const ctx2 = canvas2.getContext("2d");
    const ctx3 = canvas3.getContext("2d");
    const isFirefox = navigator.userAgent.includes("Firefox") && navigator.userAgent.includes("Windows");

    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx3.fillStyle = "rgba(255,255,255,1)";
    ctx.clearRect(0, 0, cw, ch);
    ctx2.clearRect(0, 0, cw, ch);

    const pX = getRandom(pbs, cw - pbs - 20);
    const pY = getRandom(20, ch - pbs - 20);
    R.current.pinX = pX;
    R.current.pinY = pY;

    const img = document.createElement("img");
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const [x, y, w, h] = makeImgSize(img);

      // 生成带噪点和干扰线的离屏画布防 AI 识别
      const cvs = document.createElement("canvas");
      cvs.width = cw; cvs.height = ch;
      const tCtx = cvs.getContext("2d", { willReadFrequently: true });
      tCtx.drawImage(img, x, y, w, h);
      
      const imgDataObj = tCtx.getImageData(0, 0, cw, ch);
      const data = imgDataObj.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const noise = (Math.random() - 0.5) * 50; 
        data[i]     = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      tCtx.putImageData(imgDataObj, 0, 0);
      
      for (let i = 0; i < 6; i++) {
        tCtx.strokeStyle = `rgba(${getRandom(50,220)},${getRandom(50,220)},${getRandom(50,220)},0.6)`;
        tCtx.lineWidth = getRandom(1, 2);
        tCtx.beginPath();
        tCtx.moveTo(getRandom(0, cw), getRandom(0, ch));
        tCtx.bezierCurveTo(getRandom(0, cw), getRandom(0, ch), getRandom(0, cw), getRandom(0, ch), getRandom(0, cw), getRandom(0, ch));
        tCtx.stroke();
      }
      
      for (let i = 0; i < 20; i++) {
        tCtx.fillStyle = `rgba(${getRandom(50,220)},${getRandom(50,220)},${getRandom(50,220)},0.8)`;
        tCtx.beginPath();
        tCtx.arc(getRandom(0, cw), getRandom(0, ch), getRandom(1, 3), 0, Math.PI * 2);
        tCtx.fill();
      }
      
      const noisyImg = cvs;

      ctx.save();
      paintBrick(ctx, pX, pY);
      ctx.closePath();
      if (!isFirefox) {
        ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        ctx.shadowColor = "#000"; ctx.shadowBlur = 3;
        ctx.fill(); ctx.clip();
      } else {
        ctx.clip(); ctx.save();
        ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        ctx.shadowColor = "#000"; ctx.shadowBlur = 3;
        ctx.fill(); ctx.restore();
      }
      ctx.drawImage(noisyImg, 0, 0, cw, ch);

      ctx3.fillRect(0, 0, cw, ch);
      ctx3.drawImage(noisyImg, 0, 0, cw, ch);

      ctx.globalCompositeOperation = "source-atop";
      paintBrick(ctx, pX, pY);
      ctx.arc(pX + Math.ceil(pbs / 2), pY + Math.ceil(pbs / 2), pbs * 1.2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.shadowColor = "rgba(255,255,255,.8)";
      ctx.shadowOffsetX = -1; ctx.shadowOffsetY = -1;
      ctx.shadowBlur = Math.min(Math.ceil(8 * R.current.puzzleScale), 12);
      ctx.fillStyle = "#ffffaa"; ctx.fill();

      const imgData = ctx.getImageData(pX - 3, pY - 20, pX + pbs + 5, pY + pbs + 5);
      ctx2.putImageData(imgData, 0, pY - 20);

      ctx.restore();
      ctx.clearRect(0, 0, cw, ch);

      ctx.save();
      paintBrick(ctx, pX, pY);
      ctx.globalAlpha = 0.8; ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      paintBrick(ctx, pX, pY);
      ctx.arc(pX + Math.ceil(pbs / 2), pY + Math.ceil(pbs / 2), pbs * 1.2, 0, Math.PI * 2, true);
      ctx.shadowColor = "#000"; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 16; ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.drawImage(noisyImg, 0, 0, cw, ch);
      ctx.restore();

      setLoading(false);
      R.current.isCanSlide = true;
    };

    img.onerror = () => init(true);

    if (!withCanvas && imgList && imgList.length) {
      let rn = getRandom(0, imgList.length - 1);
      if (rn === R.current.imgIndex) rn = rn === imgList.length - 1 ? 0 : rn + 1;
      R.current.imgIndex = rn;
      img.src = imgList[rn];
    } else {
      img.src = makeImgWithCanvas();
    }
  };

  // ── reset ────────────────────────────────────────────────────────────────────
  const reset = () => {
    if (R.current.isSubmiting) return;
    resetState();
    init();
  };

  // ── submit ───────────────────────────────────────────────────────────────────
  const submit = () => {
    const {
      sliderBaseSize: sbs, puzzleBaseSize: pbs,
      canvasWidth: cw, range: rng,
      successText: st, failText: ft,
      pinX: pX,
      startWidth: sw, startX: sx, newX: nx,
    } = R.current;

    const rawW = sw + nx - sx;
    const clampedSw = rawW < sbs ? sbs : rawW > cw ? cw : rawW;
    const deviation = Math.abs(
      pX - (clampedSw - sbs) +
      (pbs - sbs) * ((clampedSw - sbs) / (cw - sbs)) - 3
    );

    R.current.isSubmiting = true;
    R.current.isCanSlide = false;

    if (deviation < rng) {
      setInfoText(st);
      setInfoFail(false);
      setInfoShow(true);
      setIsSuccess(true);
      clearTimeout(R.current.timer);
      R.current.timer = setTimeout(() => {
        R.current.isSubmiting = false;
        R.current.onSuccess && R.current.onSuccess(deviation);
      }, 800);
    } else {
      setInfoText(ft);
      setInfoFail(true);
      setInfoShow(true);
      R.current.onFail && R.current.onFail(deviation);
      clearTimeout(R.current.timer);
      R.current.timer = setTimeout(() => {
        R.current.isSubmiting = false;
        resetState(); // 重置 UI
        init();       // 重新生成拼图
      }, 800);
    }
  };

  // ── 拖拽事件（函数体只读 R.current，不捕获任何 state）───────────────────────
  const handleMouseDown = (e) => {
    if (!R.current.isCanSlide) return;
    e.stopPropagation();
    const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX;
    const { sliderBaseSize: sbs, canvasWidth: cw, startWidth: sw0, startX: sx0, newX: nx0 } = R.current;
    const curW = sw0 + nx0 - sx0;
    const curSw = curW < sbs ? sbs : curW > cw ? cw : curW;
    R.current.mouseDown = true;
    R.current.startWidth = curSw;
    R.current.startX = clientX;
    R.current.newX = clientX;
    setMouseDown(true);
    setStyleWidth(curSw);
  };

  const handleMouseMove = (e) => {
    if (!R.current.mouseDown) return;
    e.preventDefault();
    const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX;
    R.current.newX = clientX;
    const { startWidth: sw, startX: sx, sliderBaseSize: sbs, canvasWidth: cw } = R.current;
    const w = sw + clientX - sx;
    const clamped = w < sbs ? sbs : w > cw ? cw : w;
    setStyleWidth(clamped);
  };

  const handleMouseUp = () => {
    if (!R.current.mouseDown) return;
    R.current.mouseDown = false;
    setMouseDown(false);
    submit();
  };

  // ── 全局监听（空依赖，只注册一次；回调通过 R.current 读最新值，永不 stale）──
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove, false);
    document.addEventListener("mouseup", handleMouseUp, false);
    document.addEventListener("touchmove", handleMouseMove, { passive: false });
    document.addEventListener("touchend", handleMouseUp, false);
    return () => {
      clearTimeout(R.current.timer);
      document.removeEventListener("mousemove", handleMouseMove, false);
      document.removeEventListener("mouseup", handleMouseUp, false);
      document.removeEventListener("touchmove", handleMouseMove, { passive: false });
      document.removeEventListener("touchend", handleMouseUp, false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── show 变化 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (show) {
      document.body.style.overflow = "hidden";
      R.current.isSubmiting = false;
      clearTimeout(R.current.timer);
      resetState();
      init();
    } else {
      document.body.style.overflow = "";
      clearTimeout(R.current.timer);
      R.current.isSubmiting = false;
      setIsSuccess(false);
      setInfoShow(false);
    }
    return () => { document.body.style.overflow = ""; };
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 渲染 ─────────────────────────────────────────────────────────────────────
  const flashX = isSuccess
    ? `${canvasWidth + canvasHeight * 0.578}px`
    : `-${canvasHeight * 0.578}px`;

  return (
    <>
      <style>{CSS}</style>
      <div
        style={{ ...S.overlay, opacity: show ? 1 : 0, pointerEvents: show ? "auto" : "none" }}
        onMouseDown={() => { R.current._closeDown = true; }}
        onMouseUp={() => {
          if (R.current._closeDown && !R.current.mouseDown && !R.current.isSubmiting) {
            clearTimeout(R.current.timer);
            R.current.onClose && R.current.onClose();
          }
          R.current._closeDown = false;
        }}
        onTouchStart={() => { R.current._closeDown = true; }}
        onTouchEnd={() => {
          if (R.current._closeDown && !R.current.mouseDown && !R.current.isSubmiting) {
            clearTimeout(R.current.timer);
            R.current.onClose && R.current.onClose();
          }
          R.current._closeDown = false;
        }}
      >
        <div
          style={S.authBox}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div style={{ ...S.authBody, height: canvasHeight }}>
            <canvas ref={c1} width={canvasWidth} height={canvasHeight}
              style={{ width: canvasWidth, height: canvasHeight, display: "block" }} />

            <canvas ref={c3} width={canvasWidth} height={canvasHeight}
              style={{
                ...S.canvas3, width: canvasWidth, height: canvasHeight,
                opacity: isSuccess ? 1 : 0
              }} />

            <canvas ref={c2} width={puzzleBaseSize} height={canvasHeight}
              style={{
                ...S.canvas2, width: puzzleBaseSize, height: canvasHeight,
                transform: `translateX(${puzzleOffset}px)`
              }} />

            <div style={{
              ...S.loadingBox, opacity: loading ? 1 : 0,
              pointerEvents: loading ? "auto" : "none"
            }}>
              <LoadingDots />
            </div>

            <div style={{
              ...S.infoBox,
              opacity: infoShow ? 0.95 : 0,
              transform: infoShow ? "translateY(0)" : "translateY(24px)",
              backgroundColor: infoFail ? "#ce594b" : "#83ce3f"
            }}>
              {infoText}
            </div>

            <div style={{
              ...S.flash,
              transform: `translateX(${flashX}) skew(-30deg,0)`,
              transition: isSuccess ? "transform 600ms" : "none"
            }} />

            <button className="pv-reset" style={S.resetBtn} title="刷新"
              onClick={() => { if (!R.current.isSubmiting) reset(); }}>
              <ResetIcon />
            </button>
          </div>

          <div style={{ ...S.rangeBox, height: sliderBaseSize, marginTop: 20 }}>
            <div style={S.rangeText}>{sliderText}</div>
            <div style={{ ...S.rangeSlider, width: styleWidth }}>
              <div
                className={`pv-range-btn${mouseDown ? " isDown" : ""}`}
                style={{ ...S.rangeBtn, width: sliderBaseSize, height: "100%" }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
              >
                <div /><div /><div />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: "fixed", top: 0, left: 0, bottom: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.3)", zIndex: 999,
    transition: "opacity 200ms",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  authBox: {
    padding: 20, background: "#fff", userSelect: "none",
    borderRadius: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
  },
  authBody: { position: "relative", overflow: "hidden", borderRadius: 3 },
  canvas3: { position: "absolute", top: 0, left: 0, transition: "opacity 600ms", zIndex: 3 },
  canvas2: { position: "absolute", top: 0, left: 0, zIndex: 2 },
  loadingBox: {
    position: "absolute", top: 0, left: 0, bottom: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.8)", zIndex: 20,
    transition: "opacity 200ms",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  loadingGif: { display: "flex", alignItems: "center", gap: 3 },
  loadingDot: {
    display: "inline-block", width: 6, height: 6,
    borderRadius: "50%", backgroundColor: "#999",
    animation: "pvDotLoad 1.04s ease infinite",
  },
  infoBox: {
    position: "absolute", bottom: 0, left: 0,
    width: "100%", height: 24, lineHeight: "24px",
    textAlign: "center", fontSize: 13,
    transition: "all 200ms", color: "#fff", zIndex: 10,
  },
  flash: {
    position: "absolute", top: 0, left: 0, width: 30, height: "100%",
    backgroundColor: "rgba(255,255,255,0.1)", zIndex: 3,
  },
  resetBtn: {
    position: "absolute", top: 8, right: 8, width: 32, height: 32,
    zIndex: 12, cursor: "pointer", borderRadius: "50%",
    backgroundColor: "rgba(0,0,0,0.3)", padding: 0, boxSizing: "border-box",
    border: "none", display: "flex", alignItems: "center", justifyContent: "center",
  },
  rangeBox: {
    position: "relative", width: "100%", backgroundColor: "#eef1f8",
    borderRadius: 3, boxShadow: "0 0 8px rgba(230,230,230,0.8) inset",
    overflow: "hidden",
  },
  rangeText: {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%,-50%)", fontSize: 14, color: "#b7bcd1",
    whiteSpace: "nowrap", pointerEvents: "none",
  },
  rangeSlider: {
    position: "absolute", height: "100%",
    backgroundColor: "rgba(106,160,255,0.8)", borderRadius: 3,
  },
  rangeBtn: {
    position: "absolute", right: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff", borderRadius: 3,
    boxShadow: "0 0 4px #ccc", cursor: "pointer",
  },
};

const CSS = `
@keyframes pvDotLoad {
  0%   { opacity: 1; transform: scale(1.3); }
  100% { opacity: 0.2; transform: scale(0.3); }
}
.pv-reset { transition: transform 200ms !important; }
.pv-reset:hover { transform: rotate(-90deg) !important; }
.pv-range-btn > div {
  width: 0; height: 40%; border: solid 1.5px #6aa0ff; transition: all 200ms;
}
.pv-range-btn > div:nth-child(2) { margin: 0 4px; }
.pv-range-btn:hover > div:nth-child(1), .pv-range-btn.isDown > div:nth-child(1) {
  border: solid 4px transparent !important; height: 0 !important; border-right-color: #6aa0ff !important;
}
.pv-range-btn:hover > div:nth-child(2), .pv-range-btn.isDown > div:nth-child(2) {
  border-width: 3px !important; height: 0 !important; border-radius: 3px !important;
  margin: 0 6px !important; border-right-color: #6aa0ff !important;
}
.pv-range-btn:hover > div:nth-child(3), .pv-range-btn.isDown > div:nth-child(3) {
  border: solid 4px transparent !important; height: 0 !important; border-left-color: #6aa0ff !important;
}
`;

// ─── Demo（默认导出）──────────────────────────────────────────────────────────
export default function App() {
  const [show, setShow] = useState(false);
  const [result, setResult] = useState(null);

  return (
    <div style={D.page}>
      <div style={D.card}>
        <h2 style={D.title}>拼图验证码</h2>
        <p style={D.sub}>React 单文件 · SVG 图标 · 无外部依赖</p>
        {result && (
          <div style={{ ...D.badge, background: result === "ok" ? "#83ce3f" : "#ce594b" }}>
            {result === "ok" ? "✓ 验证通过" : "✗ 验证失败"}
          </div>
        )}
        <button style={D.btn} onClick={() => { setResult(null); setShow(true); }}>
          点击验证
        </button>
      </div>
      <SlideVerify
        show={show}
        onClose={() => setShow(false)}
        onSuccess={() => { setShow(false); setResult("ok"); }}
        onFail={() => setResult("fail")}
      />
    </div>
  );
}

const D = {
  page: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
    fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif",
  },
  card: {
    background: "#fff", borderRadius: 12, padding: "40px 48px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center", minWidth: 280,
  },
  title: { margin: "0 0 8px", fontSize: 24, fontWeight: 700, color: "#2d3748" },
  sub: { margin: "0 0 24px", fontSize: 13, color: "#a0aec0" },
  badge: {
    display: "inline-block", padding: "6px 16px", borderRadius: 20,
    color: "#fff", fontSize: 13, marginBottom: 16, fontWeight: 600,
  },
  btn: {
    display: "block", width: "100%", padding: "12px 0",
    background: "linear-gradient(135deg,#667eea,#764ba2)",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 15, fontWeight: 600, cursor: "pointer", letterSpacing: 1,
  },
};
