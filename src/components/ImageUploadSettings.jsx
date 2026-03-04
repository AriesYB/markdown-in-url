import { useState, useEffect } from 'react';
import {
  getImageUploadConfig,
  saveImageUploadConfig,
  clearImageUploadConfig,
  isPublicConfigAvailable,
  getPublicConfigRemainingDays,
  uploadToR2,
  getSecurityInfo,
} from '../utils/imageUpload';
import { getRateLimitStatus } from '../utils/secureUpload';
import {
  getCloudflareConfig,
  saveCloudflareConfig,
  clearCloudflareConfig,
  isCloudflareConfigured,
} from '../utils/cloudflareAPI';
import './ImageUploadSettings.css';

export default function ImageUploadSettings({
  isOpen,
  onClose,
  onConfigChange,
}) {
  const [mode, setMode] = useState(null);
  const [customConfig, setCustomConfig] = useState({
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucket: '',
    publicUrl: '',
    region: 'auto',
  });
  const [cfWorkerUrl, setCfWorkerUrl] = useState('https://md.ntrbiss.top');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [publicRemainingDays, setPublicRemainingDays] = useState(0);
  const [rateLimitStatus, setRateLimitStatus] = useState(null);

  // 加载当前配置
  useEffect(() => {
    const config = getImageUploadConfig();
    if (config.mode) {
      setMode(config.mode);
      if (config.customConfig) {
        setCustomConfig(config.customConfig);
      }
    }
    // 加载 Cloudflare Workers API 配置
    const cfConfig = getCloudflareConfig();
    setCfWorkerUrl(cfConfig.baseUrl);
    // 更新公共图床剩余天数
    setPublicRemainingDays(getPublicConfigRemainingDays());
    // 更新频率限制状态
    setRateLimitStatus(getRateLimitStatus());
  }, [isOpen]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setTestResult(null);
  };

  const handleCustomConfigChange = (field, value) => {
    setCustomConfig((prev) => ({ ...prev, [field]: value }));
    setTestResult(null);
  };

  const handleSave = () => {
    const config = { mode };
    if (mode === 'custom') {
      // 验证自定义配置
      const { endpoint, accessKeyId, secretAccessKey, bucket, publicUrl } =
        customConfig;
      if (
        !endpoint ||
        !accessKeyId ||
        !secretAccessKey ||
        !bucket ||
        !publicUrl
      ) {
        setTestResult({
          type: 'error',
          message: '请填写所有必填字段',
        });
        return;
      }
      config.customConfig = customConfig;
    }
    if (mode === 'cf-worker') {
      // 保存 Cloudflare Workers API 配置
      if (!cfWorkerUrl || cfWorkerUrl === 'https://your-worker.workers.dev') {
        setTestResult({
          type: 'error',
          message: '请输入有效的 Cloudflare Workers API 地址',
        });
        return;
      }
      saveCloudflareConfig(cfWorkerUrl);
    }
    saveImageUploadConfig(config);
    onConfigChange?.();
    onClose?.();
  };

  const handleClear = () => {
    clearImageUploadConfig();
    clearCloudflareConfig();
    setMode(null);
    setCustomConfig({
      endpoint: '',
      accessKeyId: '',
      secretAccessKey: '',
      bucket: '',
      publicUrl: '',
      region: 'auto',
    });
    setCfWorkerUrl('https://md.ntrbiss.top');
    onConfigChange?.();
    onClose?.();
  };

  const handleTest = async () => {
    if (mode === 'custom') {
      const { endpoint, accessKeyId, secretAccessKey, bucket, publicUrl } =
        customConfig;
      if (
        !endpoint ||
        !accessKeyId ||
        !secretAccessKey ||
        !bucket ||
        !publicUrl
      ) {
        setTestResult({
          type: 'error',
          message: '请填写所有必填字段',
        });
        return;
      }

      setIsTesting(true);
      setTestResult(null);

      try {
        // 创建一个测试文件
        const testFile = new Blob(['test'], { type: 'text/plain' });

        // 尝试上传测试文件
        await uploadToR2(testFile, customConfig);

        setTestResult({
          type: 'success',
          message: '配置测试成功！图床连接正常。',
        });
      } catch (error) {
        setTestResult({
          type: 'error',
          message: `配置测试失败：${error.message}`,
        });
      } finally {
        setIsTesting(false);
      }
    } else if (mode === 'cf-worker') {
      if (!cfWorkerUrl || cfWorkerUrl === 'https://your-worker.workers.dev') {
        setTestResult({
          type: 'error',
          message: '请输入有效的 Cloudflare Workers API 地址',
        });
        return;
      }

      setIsTesting(true);
      setTestResult(null);

      try {
        // 测试创建短链接
        const testUrl = 'https://example.com/test';
        const response = await fetch(`${cfWorkerUrl}/shorten`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: testUrl, ttl: 1 }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          setTestResult({
            type: 'success',
            message: '配置测试成功！Cloudflare Workers API 连接正常。',
          });
        } else {
          throw new Error(result.message || 'API 返回错误');
        }
      } catch (error) {
        setTestResult({
          type: 'error',
          message: `配置测试失败：${error.message}`,
        });
      } finally {
        setIsTesting(false);
      }
    }
  };

  const isPublicAvailable = isPublicConfigAvailable();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content image-upload-settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>图床设置</h2>
          <button className="modal-close" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* 图床模式选择 */}
          <div className="setting-section">
            <h3>选择图床模式</h3>
            <div className="mode-selector">
              <label
                className={`mode-option ${mode === 'cf-worker' ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="mode"
                  value="cf-worker"
                  checked={mode === 'cf-worker'}
                  onChange={() => handleModeChange('cf-worker')}
                />
                <div className="mode-option-content">
                  <span className="mode-title">公共图床服务</span>
                  <span className="mode-desc">
                    使用公共图床上传图片，支持短链接分享
                  </span>
                </div>
              </label>

              <label
                className={`mode-option ${mode === 'base64' ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="mode"
                  value="base64"
                  checked={mode === 'base64'}
                  onChange={() => handleModeChange('base64')}
                />
                <div className="mode-option-content">
                  <span className="mode-title">Base64 编码</span>
                  <span className="mode-desc">
                    图片直接嵌入 Markdown（不推荐大图）
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* 公共图床服务配置 */}
          {mode === 'cf-worker' && (
            <div className="setting-section">
              <h3>公共图床服务</h3>
              <div className="config-form">
                <div className="form-group">
                  <label>
                    API 地址 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://md.ntrbiss.top"
                    value={cfWorkerUrl}
                    onChange={(e) => setCfWorkerUrl(e.target.value)}
                  />
                  <small>
                    公共图床服务的 API 地址，用于图床上传和短链接服务
                  </small>
                </div>

                <button
                  className="btn-test"
                  onClick={handleTest}
                  disabled={isTesting}
                >
                  {isTesting ? '测试中...' : '测试连接'}
                </button>

                {testResult && (
                  <div className={`test-result ${testResult.type}`}>
                    {testResult.message}
                  </div>
                )}

                <div className="cf-worker-info">
                  <h4>功能说明</h4>
                  <ul>
                    <li>
                      <strong>图床上传</strong>：支持上传图片到 R2 存储，返回
                      Markdown 格式链接
                    </li>
                    <li>
                      <strong>短链接</strong>：将长 URL 转换为短码，便于分享
                    </li>
                    <li>
                      <strong>无需认证</strong>：使用 Referer
                      防盗链，无需配置密钥
                    </li>
                    <li>
                      <strong>文件限制</strong>：最大 10MB，支持常见图片格式
                    </li>
                  </ul>
                  <p className="info-note">
                    注意：请确保你的域名在服务白名单中
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Base64 说明 */}
          {mode === 'base64' && (
            <div className="setting-section">
              <h3>Base64 模式说明</h3>
              <div className="base64-info">
                <p>图片将以 Base64 编码直接嵌入到 Markdown 文档中。</p>
                <p className="info-warning">
                  ⚠ 不推荐用于大图片，会导致文档体积增大。
                </p>
                <p className="info-note">适合小图标或临时分享场景。</p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClear}>
            清除配置
          </button>
          <button className="btn-primary" onClick={handleSave}>
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
