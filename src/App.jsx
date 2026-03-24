import { useState, useRef, useEffect } from "react";
import { SlideVerify } from "./components/SlideVerify";

// ─── 模拟 API（实际项目中替换为真实请求）────────────────────────────────────
// 成功响应: { code: "1", message: "success", data: "{}" }
// 失败响应: { code: "0", message: "false",   data: "{}" }
const mockVerifyApi = () =>
  new Promise((resolve) =>
    setTimeout(() => {
      // 模拟 80% 概率服务端验证通过
      const pass = Math.random() > 0.2;
      resolve(
        pass
          ? { code: "1", message: "success", data: "{}" }
          : { code: "0", message: "false", data: "{}" }
      );
    }, 600)
  );

// ─── 状态常量 ────────────────────────────────────────────────────────────────
const STATUS = {
  IDLE: "idle",     // 初始：等待点击验证
  VERIFY: "verify",  // 拼图验证弹窗展示中
  LOADING: "loading", // 拼图通过，正在请求 API
  SUCCESS: "success", // API 返回 code === "1"
  FAIL: "fail",    // API 返回 code !== "1"
};

// ─── Demo 组件 ───────────────────────────────────────────────────────────────
export default function SlideVerifyDemo() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [apiMsg, setApiMsg] = useState("");   // API 返回的 message
  const [apiData, setApiData] = useState(null); // API 返回的完整响应

  const [countdown, setCountdown] = useState(60);
  const [isCounting, setIsCounting] = useState(false);
  const timerRef = useRef(null);

  const startCountdown = () => {
    setIsCounting(true);
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsCounting(false);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 点击「开始验证」按钮
  const handleStartVerify = () => {
    setStatus(STATUS.VERIFY);
    setApiMsg("");
    setApiData(null);
  };

  // 拼图验证通过 → 调用 API
  const handlePuzzleSuccess = async (deviation) => {
    setStatus(STATUS.LOADING);

    try {
      const res = await mockVerifyApi();
      setApiData(res);

      if (res.code === "1") {
        setApiMsg(res.message);
        setStatus(STATUS.SUCCESS);
        startCountdown();
      } else {
        setApiMsg(res.message);
        setStatus(STATUS.FAIL);
      }
    } catch (err) {
      setApiMsg("网络异常，请重试");
      setStatus(STATUS.FAIL);
    }
  };

  // 拼图验证失败（客户端偏差过大）
  const handlePuzzleFail = (deviation) => {
    // 失败不关闭弹窗，SlideVerify 内部会自动刷新重试
    console.log("拼图验证失败，偏差:", deviation);
  };

  // 关闭拼图弹窗（点击遮罩）
  const handleClose = () => {
    if (status === STATUS.LOADING) return; // 请求中禁止关闭
    setStatus(STATUS.IDLE);
  };

  // 重置，重新验证
  const handleReset = () => {
    setStatus(STATUS.IDLE);
    setApiMsg("");
    setApiData(null);
  };

  const showPuzzle = status === STATUS.VERIFY || status === STATUS.LOADING;

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* ── 标题 ── */}
        <div style={S.header}>
          <div style={S.logo}>🔐</div>
          <h2 style={S.title}>安全验证</h2>
          <p style={S.subtitle}>完成拼图后将调用验证接口</p>
        </div>

        {/* ── 验证码输入区 ── */}
        <div style={S.inputGroup}>
          <input type="text" placeholder="验证码" style={S.input} />
          <button
            style={{ ...S.getCodeBtn, ...(isCounting ? S.getCodeBtnDisabled : {}) }}
            disabled={isCounting}
            onClick={() => {
              if (!isCounting) handleStartVerify();
            }}
          >
            {isCounting ? `请${countdown}秒后再试` : "点击获取验证码"}
          </button>
        </div>

        {/* ── 状态展示区 ── */}
        <div style={S.statusArea}>
          {status === STATUS.IDLE && (
            <div style={S.idleHint}>
              <span>点击下方按钮开始验证</span>
            </div>
          )}

          {status === STATUS.LOADING && (
            <div style={S.loadingWrap}>
              <div style={S.spinner} />
              <span style={S.loadingText}>正在请求验证接口…</span>
            </div>
          )}

          {(status === STATUS.SUCCESS || status === STATUS.FAIL) && (
            <div style={{
              ...S.resultBox,
              borderColor: status === STATUS.SUCCESS ? "#83ce3f" : "#ce594b",
              background: status === STATUS.SUCCESS ? "#f6ffed" : "#fff2f0",
            }}>
              <div style={S.resultIcon}>
                {status === STATUS.SUCCESS ? "✅" : "❌"}
              </div>
              <div style={S.resultContent}>
                <div style={{
                  ...S.resultTitle,
                  color: status === STATUS.SUCCESS ? "#389e0d" : "#cf1322",
                }}>
                  {status === STATUS.SUCCESS ? "验证通过" : "验证失败"}
                </div>
                <div style={S.resultMsg}>message：{apiMsg}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── API 响应详情 ── */}
        {apiData && (
          <div style={S.responseWrap}>
            <div style={S.responseLabel}>API 响应</div>
            <pre style={{
              ...S.responseCode,
              borderLeftColor: apiData.code === "1" ? "#83ce3f" : "#ce594b",
            }}>
              {JSON.stringify(apiData, null, 2)}
            </pre>
          </div>
        )}

        {/* ── 操作按钮 ── */}
        <div style={S.btnGroup}>
          {(status === STATUS.IDLE || status === STATUS.SUCCESS || status === STATUS.FAIL) && (
            <>
              <button
                style={{
                  ...S.btn,
                  ...(status === STATUS.SUCCESS ? S.btnSuccess
                    : status === STATUS.FAIL ? S.btnDanger
                      : S.btnPrimary),
                }}
                onClick={
                  status === STATUS.IDLE ? handleStartVerify : handleReset
                }
              >
                {status === STATUS.IDLE ? "开始验证"
                  : status === STATUS.SUCCESS ? "重新验证"
                    : "再试一次"}
              </button>

              {status === STATUS.SUCCESS && (
                <button
                  style={{ ...S.btn, ...S.btnOutline }}
                  onClick={() => alert("已跳转至目标页面（演示）")}
                >
                  继续 →
                </button>
              )}
            </>
          )}

          {status === STATUS.LOADING && (
            <button style={{ ...S.btn, ...S.btnDisabled }} disabled>
              验证中…
            </button>
          )}
        </div>

        {/* ── 接口说明 ── */}
        <div style={S.apiNote}>
          <div style={S.apiNoteTitle}>接口约定</div>
          <div style={S.apiNoteRow}>
            <span style={{ ...S.apiNoteTag, background: "#f6ffed", color: "#389e0d", borderColor: "#b7eb8f" }}>通过</span>
            <code style={S.apiNoteCode}>{`{ "code": "1", "message": "success", "data": "{}" }`}</code>
          </div>
          <div style={S.apiNoteRow}>
            <span style={{ ...S.apiNoteTag, background: "#fff2f0", color: "#cf1322", borderColor: "#ffa39e" }}>失败</span>
            <code style={S.apiNoteCode}>{`{ "code": "0", "message": "false", "data": "{}" }`}</code>
          </div>
        </div>
      </div>

      {/* ── 拼图验证弹窗 ── */}
      <SlideVerify
        show={showPuzzle}
        onClose={handleClose}
        onSuccess={handlePuzzleSuccess}
        onFail={handlePuzzleFail}
      />

      {/* ── 全局动画 ── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
    padding: "24px 16px",
    boxSizing: "border-box",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "36px 40px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
    animation: "fadeIn 300ms ease",
  },

  // 标题
  header: { textAlign: "center", marginBottom: 28 },
  logo: { fontSize: 40, marginBottom: 8 },
  title: { margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#1a202c" },
  subtitle: { margin: 0, fontSize: 13, color: "#a0aec0" },

  // 输入区
  inputGroup: {
    display: "flex", gap: 8, marginBottom: 20, height: 44,
  },
  input: {
    flex: 1, padding: "0 14px", border: "1px solid #e2e8f0",
    borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
  },
  getCodeBtn: {
    padding: "0 16px", border: "none", borderRadius: 8,
    background: "#f0f4ff", color: "#667eea", fontSize: 13,
    fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  },
  getCodeBtnDisabled: {
    background: "#f7fafc", color: "#a0aec0", cursor: "not-allowed",
  },

  // 状态区
  statusArea: {
    minHeight: 72,
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  idleHint: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    color: "#b7bcd1", fontSize: 14,
  },
  idleIcon: { fontSize: 32 },

  loadingWrap: {
    display: "flex", alignItems: "center", gap: 12,
    color: "#667eea", fontSize: 14, fontWeight: 500,
  },
  spinner: {
    width: 22, height: 22,
    border: "3px solid #e9e9ff",
    borderTopColor: "#667eea",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  loadingText: { color: "#667eea" },

  resultBox: {
    width: "100%",
    display: "flex", alignItems: "center", gap: 14,
    padding: "14px 16px",
    borderRadius: 10,
    border: "1.5px solid",
    boxSizing: "border-box",
    animation: "fadeIn 250ms ease",
  },
  resultIcon: { fontSize: 28, flexShrink: 0 },
  resultContent: { flex: 1 },
  resultTitle: { fontWeight: 700, fontSize: 15, marginBottom: 3 },
  resultMsg: { fontSize: 12, color: "#718096" },

  // API 响应
  responseWrap: { marginBottom: 20 },
  responseLabel: {
    fontSize: 11, fontWeight: 600, color: "#a0aec0",
    textTransform: "uppercase", letterSpacing: 1,
    marginBottom: 6,
  },
  responseCode: {
    margin: 0,
    padding: "12px 14px",
    background: "#f7f8fa",
    borderRadius: 8,
    fontSize: 12,
    color: "#4a5568",
    borderLeft: "3px solid",
    overflowX: "auto",
    lineHeight: 1.7,
    fontFamily: "'SFMono-Regular', Consolas, monospace",
  },

  // 按钮
  btnGroup: {
    display: "flex", gap: 10, marginBottom: 24,
  },
  btn: {
    flex: 1, padding: "12px 0",
    border: "none", borderRadius: 10,
    fontSize: 15, fontWeight: 600,
    cursor: "pointer", letterSpacing: 0.5,
    transition: "opacity 150ms",
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
  },
  btnSuccess: {
    background: "linear-gradient(135deg, #56d07e, #38a169)",
    color: "#fff",
  },
  btnDanger: {
    background: "linear-gradient(135deg, #fc8181, #e53e3e)",
    color: "#fff",
  },
  btnOutline: {
    background: "#fff",
    color: "#667eea",
    border: "2px solid #667eea",
  },
  btnDisabled: {
    background: "#e2e8f0",
    color: "#a0aec0",
    cursor: "not-allowed",
  },

  // 接口说明
  apiNote: {
    background: "#f7f8fa",
    borderRadius: 10,
    padding: "14px 16px",
  },
  apiNoteTitle: {
    fontSize: 11, fontWeight: 600,
    color: "#a0aec0", textTransform: "uppercase",
    letterSpacing: 1, marginBottom: 10,
  },
  apiNoteRow: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
  },
  apiNoteTag: {
    fontSize: 11, fontWeight: 600,
    padding: "2px 8px", borderRadius: 4,
    border: "1px solid", flexShrink: 0,
  },
  apiNoteCode: {
    fontSize: 11, color: "#718096",
    fontFamily: "'SFMono-Regular', Consolas, monospace",
    wordBreak: "break-all",
    background: "none", border: "none", padding: 0,
  },
};
