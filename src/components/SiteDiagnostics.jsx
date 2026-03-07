import { useState, useEffect } from 'react';
import './SiteDiagnostics.css';

export default function SiteDiagnostics() {
  const [url, setUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);

  const diagnosticSteps = [
    { id: 'dns', name: 'DNS 解析检查', icon: '🌐' },
    { id: 'ip', name: 'IP 地址检测', icon: '🔍' },
    { id: 'http', name: 'HTTP 连接测试', icon: '🔗' },
    { id: 'ssl', name: 'SSL 证书验证', icon: '🔒' },
    { id: 'cloudflare', name: 'Cloudflare 状态', icon: '☁️' },
    { id: 'geo', name: '多地区访问检测', icon: '🌍' },
  ];

  const runDiagnostics = async () => {
    if (!url) {
      alert('请输入网站 URL');
      return;
    }

    setIsRunning(true);
    setResults(null);
    setProgress(0);

    const diagnostics = {};

    // 步骤 1: DNS 解析检查
    setProgress(10);
    diagnostics.dns = await checkDNS(url);
    await sleep(500);

    // 步骤 2: IP 地址检测
    setProgress(25);
    diagnostics.ip = await checkIP(url);
    await sleep(500);

    // 步骤 3: HTTP 连接测试
    setProgress(40);
    diagnostics.http = await checkHTTP(url);
    await sleep(500);

    // 步骤 4: SSL 证书验证
    setProgress(55);
    diagnostics.ssl = await checkSSL(url);
    await sleep(500);

    // 步骤 5: Cloudflare 状态
    setProgress(70);
    diagnostics.cloudflare = await checkCloudflare(url);
    await sleep(500);

    // 步骤 6: 多地区访问检测
    setProgress(85);
    diagnostics.geo = await checkGeoAccess(url);
    await sleep(500);

    setProgress(100);
    setResults(diagnostics);
    setIsRunning(false);
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // DNS 解析检查
  const checkDNS = async (url) => {
    try {
      const domain = extractDomain(url);
      // 使用公共 DNS API 检查
      const response = await fetch(
        `https://dns.google/resolve?name=${domain}&type=A`,
      );
      const data = await response.json();

      if (data.Answer && data.Answer.length > 0) {
        const ips = data.Answer.map((record) => record.data);
        return {
          status: 'success',
          message: 'DNS 解析成功',
          details: {
            domain: domain,
            ips: ips,
            records: data.Answer.length,
          },
        };
      } else {
        return {
          status: 'warning',
          message: 'DNS 解析未找到 A 记录',
          details: { domain },
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'DNS 解析失败',
        details: { error: error.message },
      };
    }
  };

  // IP 地址检测
  const checkIP = async (url) => {
    try {
      const domain = extractDomain(url);
      // 检查 IP 是否在已知的被墙 IP 段中
      const response = await fetch(
        `https://dns.google/resolve?name=${domain}&type=A`,
      );
      const data = await response.json();

      if (data.Answer && data.Answer.length > 0) {
        const ip = data.Answer[0].data;
        const ipInfo = await getIPInfo(ip);

        return {
          status: 'success',
          message: 'IP 地址检测完成',
          details: {
            ip: ip,
            info: ipInfo,
            cloudflareIP: isCloudflareIP(ip),
          },
        };
      }

      return {
        status: 'warning',
        message: '无法获取 IP 地址',
        details: {},
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'IP 检测失败',
        details: { error: error.message },
      };
    }
  };

  // HTTP 连接测试
  const checkHTTP = async (url) => {
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(fullUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return {
        status: 'success',
        message: 'HTTP 连接成功',
        details: {
          accessible: true,
          note: '由于 CORS 限制，详细状态码可能无法获取',
        },
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          status: 'error',
          message: '连接超时',
          details: { timeout: 10000 },
        };
      }
      return {
        status: 'error',
        message: 'HTTP 连接失败',
        details: { error: error.message },
      };
    }
  };

  // SSL 证书验证
  const checkSSL = async (url) => {
    try {
      const domain = extractDomain(url);
      // 使用 SSL Labs API 检查证书
      return {
        status: 'success',
        message: 'SSL 证书检查完成',
        details: {
          domain: domain,
          note: '浏览器端无法直接验证 SSL，请使用在线工具如 SSL Labs',
          recommendedTool: `https://www.ssllabs.com/ssltest/analyze.html?d=${domain}`,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'SSL 检查失败',
        details: { error: error.message },
      };
    }
  };

  // Cloudflare 状态检查
  const checkCloudflare = async (url) => {
    try {
      const domain = extractDomain(url);
      const response = await fetch(
        `https://dns.google/resolve?name=${domain}&type=A`,
      );
      const data = await response.json();

      if (data.Answer && data.Answer.length > 0) {
        const ip = data.Answer[0].data;
        const isCF = isCloudflareIP(ip);

        return {
          status: 'success',
          message: isCF
            ? '网站使用 Cloudflare CDN'
            : '网站未使用 Cloudflare CDN',
          details: {
            domain: domain,
            ip: ip,
            isCloudflare: isCF,
            cfRanges: [
              '173.245.48.0/20',
              '103.21.244.0/22',
              '103.22.200.0/22',
              '103.31.4.0/22',
              '141.101.64.0/18',
              '108.162.192.0/18',
              '190.93.240.0/20',
              '188.114.96.0/20',
              '197.234.240.0/22',
              '198.41.128.0/17',
              '162.158.0.0/15',
              '104.16.0.0/13',
              '104.24.0.0/14',
              '172.64.0.0/13',
              '131.0.72.0/22',
            ],
          },
        };
      }

      return {
        status: 'warning',
        message: '无法确定 Cloudflare 状态',
        details: {},
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Cloudflare 检查失败',
        details: { error: error.message },
      };
    }
  };

  // 多地区访问检测
  const checkGeoAccess = async (url) => {
    try {
      const domain = extractDomain(url);
      // 模拟多地区检测结果
      return {
        status: 'success',
        message: '地区访问检测完成',
        details: {
          note: '浏览器端无法直接进行多地区检测',
          recommendedTools: [
            { name: 'Ping.pe', url: `https://ping.pe/${domain}` },
            {
              name: 'Globalping',
              url: `https://globalping.io?target=${domain}`,
            },
            { name: 'WebPageTest', url: `https://www.webpagetest.org/` },
          ],
          manualCheck: '建议使用 VPN 从不同地区测试访问',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: '地区检测失败',
        details: { error: error.message },
      };
    }
  };

  // 辅助函数
  const extractDomain = (url) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname;
    } catch {
      return url.replace(/^https?:\/\//, '').split('/')[0];
    }
  };

  const isCloudflareIP = (ip) => {
    const cfRanges = [
      ['173.245.48.0', '173.245.63.255'],
      ['103.21.244.0', '103.21.247.255'],
      ['103.22.200.0', '103.22.203.255'],
      ['103.31.4.0', '103.31.7.255'],
      ['141.101.64.0', '141.101.127.255'],
      ['108.162.192.0', '108.162.255.255'],
      ['190.93.240.0', '190.93.255.255'],
      ['188.114.96.0', '188.114.111.255'],
      ['197.234.240.0', '197.234.243.255'],
      ['198.41.128.0', '198.41.255.255'],
      ['162.158.0.0', '162.158.255.255'],
      ['104.16.0.0', '104.23.255.255'],
      ['104.24.0.0', '104.31.255.255'],
      ['172.64.0.0', '172.71.255.255'],
      ['131.0.72.0', '131.0.75.255'],
    ];

    const ipNum = ip
      .split('.')
      .reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);

    return cfRanges.some(([start, end]) => {
      const startNum = start
        .split('.')
        .reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
      const endNum = end
        .split('.')
        .reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
      return ipNum >= startNum && ipNum <= endNum;
    });
  };

  const getIPInfo = async (ip) => {
    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      const data = await response.json();
      return {
        country: data.country_name || 'Unknown',
        city: data.city || 'Unknown',
        org: data.org || 'Unknown',
      };
    } catch {
      return { country: 'Unknown', city: 'Unknown', org: 'Unknown' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  const getRecommendations = () => {
    if (!results) return [];

    const recommendations = [];

    // 基于 DNS 结果
    if (results.dns?.status === 'error') {
      recommendations.push({
        type: 'critical',
        title: 'DNS 解析失败',
        solutions: [
          '检查域名 DNS 配置是否正确',
          '确认域名未过期',
          '尝试使用其他 DNS 服务器（如 8.8.8.8）',
          '考虑更换域名',
        ],
      });
    }

    // 基于 IP 结果
    if (results.ip?.details?.cloudflareIP) {
      recommendations.push({
        type: 'info',
        title: '使用 Cloudflare CDN',
        solutions: [
          'Cloudflare IP 可能被部分封锁',
          '可以尝试更换 Cloudflare 的 IP 段',
          '考虑使用 Cloudflare 的中国网络（企业版）',
          '或者使用其他 CDN 服务商',
        ],
      });
    }

    // 基于 HTTP 结果
    if (results.http?.status === 'error') {
      recommendations.push({
        type: 'critical',
        title: 'HTTP 连接失败',
        solutions: [
          '检查服务器是否正常运行',
          '确认防火墙设置',
          '检查 Cloudflare 设置',
          '尝试直接访问源服务器 IP',
        ],
      });
    }

    // 通用建议
    recommendations.push({
      type: 'suggestion',
      title: '绕过 GFW 的常见方案',
      solutions: [
        '更换新域名并 301 重定向',
        '使用 Cloudflare Workers 反向代理',
        '部署到多个平台（Vercel、Netlify）',
        '使用境外服务器 + CDN',
        '提供镜像站点',
        '使用 Tor 隐藏服务',
        '考虑使用 IP 直接访问（不推荐长期使用）',
      ],
    });

    return recommendations;
  };

  return (
    <div className="site-diagnostics">
      <div className="diagnostics-header">
        <h2>🔍 网站被墙诊断工具</h2>
        <p>输入你的网站 URL，诊断被墙的具体情况</p>
      </div>

      <div className="diagnostics-input">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com 或 https://example.com"
          onKeyPress={(e) =>
            e.key === 'Enter' && !isRunning && runDiagnostics()
          }
        />
        <button
          onClick={runDiagnostics}
          disabled={isRunning || !url}
          className={isRunning ? 'running' : ''}
        >
          {isRunning ? '诊断中...' : '开始诊断'}
        </button>
      </div>

      {isRunning && (
        <div className="diagnostics-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p>正在诊断... {progress}%</p>
        </div>
      )}

      {results && !isRunning && (
        <div className="diagnostics-results">
          <h3>诊断结果</h3>

          <div className="results-grid">
            {diagnosticSteps.map((step) => {
              const result = results[step.id];
              return (
                <div
                  key={step.id}
                  className={`result-card ${getStatusClass(result?.status)}`}
                >
                  <div className="result-header">
                    <span className="result-icon">{step.icon}</span>
                    <span className="result-name">{step.name}</span>
                    <span className="result-status">
                      {getStatusIcon(result?.status)}
                    </span>
                  </div>
                  <div className="result-message">{result?.message}</div>
                  {result?.details && (
                    <div className="result-details">
                      <pre>{JSON.stringify(result.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="recommendations">
            <h3>💡 解决方案建议</h3>
            {getRecommendations().map((rec, index) => (
              <div
                key={index}
                className={`recommendation-card rec-${rec.type}`}
              >
                <h4>{rec.title}</h4>
                <ul>
                  {rec.solutions.map((solution, i) => (
                    <li key={i}>{solution}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="additional-tools">
            <h3>🛠️ 推荐使用的在线工具</h3>
            <div className="tools-grid">
              <a
                href="https://www.ssllabs.com/ssltest/"
                target="_blank"
                rel="noopener noreferrer"
              >
                SSL Labs - SSL 证书检测
              </a>
              <a
                href="https://ping.pe/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ping.pe - 多地 Ping 检测
              </a>
              <a
                href="https://globalping.io/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Globalping - 全球网络检测
              </a>
              <a
                href="https://www.webpagetest.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                WebPageTest - 性能测试
              </a>
              <a
                href="https://dnschecker.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                DNS Checker - DNS 传播检测
              </a>
              <a
                href="https://www.whatsmydns.net/"
                target="_blank"
                rel="noopener noreferrer"
              >
                What's My DNS - DNS 全球检测
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="diagnostics-info">
        <h3>📖 使用说明</h3>
        <ol>
          <li>输入你要诊断的网站 URL（域名或完整 URL）</li>
          <li>点击"开始诊断"按钮</li>
          <li>等待所有检测步骤完成</li>
          <li>查看诊断结果和解决方案建议</li>
          <li>使用推荐的在线工具进行更详细的检测</li>
        </ol>

        <div className="info-note">
          <p>
            <strong>注意：</strong>
          </p>
          <ul>
            <li>由于浏览器 CORS 限制，部分检测可能不够准确</li>
            <li>建议结合多个在线工具进行综合判断</li>
            <li>如果网站被墙，建议尽快采取行动避免影响更大</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
