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
  testConnection,
} from '../utils/cloudflareAPI';
import './ImageUploadSettings.css';

// 本地存储键
const SHORT_LINK_CONFIG_KEY = 'short-link-config';
const CACHED_CONTENT_KEY_PREFIX = 'cached-content-';

/**
 * 获取短链接配置
 */
export function getShortLinkConfig() {
  try {
    const stored = localStorage.getItem(SHORT_LINK_CONFIG_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      return { ttl: config.ttl || 168 };
    }
  } catch (e) {
    console.error('Failed to parse short link config:', e);
  }
  return { ttl: 168 }; // 默认7天（168小时）
}

/**
 * 保存短链接配置
 */
export function saveShortLinkConfig(config) {
  try {
    localStorage.setItem(SHORT_LINK_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save short link config:', e);
    throw e;
  }
}

/**
 * 清除短链接配置
 */
export function clearShortLinkConfig() {
  localStorage.removeItem(SHORT_LINK_CONFIG_KEY);
}

/**
 * 清除所有本地缓存的内容
 */
export function clearAllCachedContent() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHED_CONTENT_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error('Failed to clear cached content:', e);
  }
}

/**
 * 获取所有缓存内容的存储大小（字节）
 */
export function getCachedContentSize() {
  try {
    let totalSize = 0;
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHED_CONTENT_KEY_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    });
    return totalSize;
  } catch (e) {
    console.error('Failed to calculate cached content size:', e);
    return 0;
  }
}

/**
 * 缓存短链接内容到本地
 */
export function cacheShortLinkContent(code, content) {
  try {
    const key = `${CACHED_CONTENT_KEY_PREFIX}${code}`;
    const data = {
      content,
      cachedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to cache short link content:', e);
  }
}

/**
 * 从本地缓存获取短链接内容
 */
export function getCachedShortLinkContent(code) {
  try {
    const key = `${CACHED_CONTENT_KEY_PREFIX}${code}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const data = JSON.parse(stored);
      return data.content;
    }
  } catch (e) {
    console.error('Failed to get cached short link content:', e);
  }
  return null;
}

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

  // 短链接配置
  const [shortLinkTTL, setShortLinkTTL] = useState(168); // 7天（168小时）
  const [cachedContentSize, setCachedContentSize] = useState(0);

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
    // 加载短链接配置
    const shortLinkConfig = getShortLinkConfig();
    setShortLinkTTL(shortLinkConfig.ttl || 168);
    // 更新缓存内容大小
    setCachedContentSize(getCachedContentSize());
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
      // 公共图床服务，使用默认配置
      saveCloudflareConfig('https://md.ntrbiss.top');
    }
    saveImageUploadConfig(config);
    // 保存短链接配置
    saveShortLinkConfig({
      ttl: shortLinkTTL,
    });
    onConfigChange?.();
    onClose?.();
  };

  const handleClear = () => {
    clearImageUploadConfig();
    clearCloudflareConfig();
    clearShortLinkConfig();
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
    setShortLinkTTL(168);
    onConfigChange?.();
    onClose?.();
  };

  const handleClearCache = () => {
    if (
      confirm(
        '确定要清除所有本地缓存的内容吗？这将释放存储空间，但已过期的短链接内容将无法恢复。',
      )
    ) {
      clearAllCachedContent();
      setCachedContentSize(0);
      setTestResult({
        type: 'success',
        message: '已清除所有本地缓存内容',
      });
    }
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
        // 先保存配置以便测试
        saveCloudflareConfig(cfWorkerUrl);

        // 使用 testConnection 函数测试连接
        const result = await testConnection();

        if (result.success) {
          setTestResult({
            type: 'success',
            message:
              result.message ||
              '配置测试成功！Cloudflare Workers API 连接正常。',
          });
        } else {
          setTestResult({
            type: 'error',
            message: result.message || '配置测试失败',
          });
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
          <h2>设置</h2>
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
                  <span className="mode-desc">使用公共图床上传图片</span>
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
                <div className="cf-worker-info">
                  <h4>功能说明</h4>
                  <ul>
                    <li>
                      <strong>图床上传</strong>：支持上传图片到对象存储，返回
                      Markdown 格式链接
                    </li>
                    <li>
                      <strong>文件限制</strong>：最大 10MB，支持常见图片格式
                    </li>
                  </ul>
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

          {/* 短链接配置（独立于图床配置） */}
          <div className="setting-section">
            <h3>短链接设置</h3>
            <div className="short-link-config">
              <div className="config-row">
                <label>
                  过期时间：
                  <select
                    value={shortLinkTTL}
                    onChange={(e) => setShortLinkTTL(Number(e.target.value))}
                  >
                    <option value="24">1天</option>
                    <option value="72">3天</option>
                    <option value="168">7天</option>
                    <option value="720">30天</option>
                  </select>
                </label>
              </div>

              <div className="cache-info">
                <p className="cache-size">
                  本地缓存大小：{(cachedContentSize / 1024).toFixed(2)} KB
                </p>
                <div className="cache-buttons">
                  <button
                    className="btn-text"
                    onClick={handleClearCache}
                    disabled={cachedContentSize === 0}
                  >
                    清除本地缓存
                  </button>
                  <button
                    className="btn-text btn-text-danger"
                    onClick={handleClear}
                  >
                    清除配置
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={handleSave}>
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
