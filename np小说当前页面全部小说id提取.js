// ==UserScript==
// @name         Novelpia小说网站id提取工具
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  扫描Novelpia网站上的小说链接和标题并支持导出
// @author       Qwen, 刘备爱好者
// @match        https://novelpia.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // 添加CSS样式
    GM_addStyle(`
        #novel-extractor-panel {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            background: white;
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: Arial, sans-serif;
            width: 400px;
            max-height: 80vh;
            overflow-y: auto;
        }
        .extractor-btn {
            background-color: #4CAF50;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
            font-size: 14px;
        }
        .extractor-btn:hover {
            background-color: #45a049;
        }
        .extractor-btn:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }
        .status-message {
            margin: 10px 0;
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .link-results {
            margin-top: 10px;
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            padding: 10px;
            background-color: #fafafa;
        }
        .link-item {
            padding: 5px 0;
            border-bottom: 1px solid #eee;
            font-size: 12px;
        }
        .link-item:last-child {
            border-bottom: none;
        }
        .link-item a {
            color: #1a73e8;
            text-decoration: none;
        }
        .link-item a:hover {
            text-decoration: underline;
        }
        .close-btn {
            float: right;
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #999;
        }
        .close-btn:hover {
            color: #333;
        }
        .title-text {
            font-weight: bold;
            color: #333;
            display: block;
            margin-bottom: 2px;
        }
        .link-href {
            color: #666;
            font-size: 11px;
        }
    `);

    // 创建控制面板
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'novel-extractor-panel';
        panel.innerHTML = `
            <button class="close-btn">&times;</button>
            <h3 style="margin-top: 0; margin-bottom: 15px;">Novelpia链接提取</h3>
            <button id="scanBtn" class="extractor-btn">扫描当前页小说！</button>
            <button id="exportBtn" class="extractor-btn" disabled>导出链接列表</button>
            <div id="statusMessage" class="status-message" style="display: none;"></div>
            <div id="linkResults" class="link-results" style="display: none;"></div>
        `;

        document.body.appendChild(panel);

        // 绑定关闭按钮事件
        panel.querySelector('.close-btn').addEventListener('click', () => {
            panel.remove();
        });

        return panel;
    }

    // 显示状态信息
    function showStatus(message, isSuccess = true) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.textContent = message;
        statusDiv.className = 'status-message ' + (isSuccess ? 'success' : 'error');
        statusDiv.style.display = 'block';

        // 3秒后自动隐藏
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }

    // 提取Novelpia网站的小说链接和标题
    function extractNovelLinks() {
        try {
            showStatus('正在扫描当前页面的小说链接...');

            // 清空之前的扫描结果
            const linkResults = document.getElementById('linkResults');
            linkResults.innerHTML = '';
            linkResults.style.display = 'none';
            document.getElementById('exportBtn').disabled = true;

            // 存储提取的链接和标题
            const extractedData = [];

            // 常见的Novelpia小说链接和标题选择器
            const selectors = [
                // 小说标题和链接组合
                '.novel-title a',       // 小说标题链接
                '.title a',             // 标题类链接
                '.subject a',           // 主题类链接
                '.content__list a',     // 内容列表链接
                '.list_item a',         // 列表项链接
                '.novel_list a',        // 小说列表链接
                '.item_title a',        // 项目标题链接

                // 单独的链接选择器
                'a[href*="/viewer/"]',  // 小说阅读页面
                'a[href*="/novel/"]',   // 小说详情页面
                'a[href^="/list/"]',    // 小说列表页面
                'a[href^="/search/"]',  // 搜索结果
            ];

            // 收集所有匹配的链接和标题
            const novelItems = new Map(); // 使用Map去重，以href为key

            selectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        const href = element.href;
                        if (href && (href.includes('/viewer/') || href.includes('/novel/') || href.includes('/list/'))) {
                            // 获取标题，优先级：元素文本 -> title属性 -> 父元素文本 -> 默认文本
                            let title = element.textContent.trim();
                            if (!title) {
                                title = element.title || '未知标题';
                            }

                            // 尝试从父元素或相邻元素获取更多信息
                            if (title === '未知标题' || title.length < 2) {
                                // 查找包含标题的父元素或兄弟元素
                                const parent = element.closest('[class*="title"], [class*="subject"], [class*="novel"]');
                                if (parent) {
                                    const titleEl = parent.querySelector('h1, h2, h3, h4, h5, h6, .title, .subject, [class*="title"], [class*="subject"]');
                                    if (titleEl) {
                                        title = titleEl.textContent.trim() || element.textContent.trim() || '未知标题';
                                    }
                                }
                            }

                            if (title.length < 2) {
                                title = element.textContent.trim() || element.title || '未知标题';
                            }

                            // 清理标题中的换行符和多余空白
                            title = title.replace(/\s+/g, ' ').trim();

                            // 保存到Map中，以href为key，避免重复
                            if (!novelItems.has(href)) {
                                novelItems.set(href, {
                                    href: href,
                                    title: title || '未知标题'
                                });
                            }
                        }
                    });
                } catch (e) {
                    // 忽略无效的选择器
                }
            });

            // 如果上面的选择器都没找到，获取所有可能的小说相关链接
            /*if (novelItems.size === 0) {
                const fallbackLinks = document.querySelectorAll('a[href]');
                fallbackLinks.forEach(link => {
                    const href = link.href;
                    if (
                        href.includes('/viewer/') ||
                        href.includes('/novel/') ||
                        href.includes('/list/') ||
                        link.textContent.toLowerCase().includes('novel') ||
                        link.textContent.includes('小说') ||
                        link.textContent.includes('小説') ||
                        link.title.toLowerCase().includes('novel') ||
                        link.title.includes('小说') ||
                        link.title.includes('小説')
                    ) {
                        const title = link.textContent.trim() || link.title || '未知标题';
                        if (!novelItems.has(href)) {
                            novelItems.set(href, {
                                href: href,
                                title: title
                            });
                        }
                    }
                });
            }
            */

            const novelData = Array.from(novelItems.values());

            if (novelData.length > 0) {
                novelData.forEach((item, index) => {
                    extractedData.push(item);

                    const linkItem = document.createElement('div');
                    linkItem.className = 'link-item';

                    const titleElement = document.createElement('span');
                    titleElement.className = 'title-text';
                    titleElement.textContent = item.title;

                    const linkElement = document.createElement('a');
                    linkElement.href = item.href;
                    linkElement.textContent = item.href;
                    linkElement.target = '_blank';
                    linkElement.className = 'link-href';

                    linkItem.appendChild(titleElement);
                    linkItem.appendChild(linkElement);
                    linkResults.appendChild(linkItem);
                });

                linkResults.style.display = 'block';
                document.getElementById('exportBtn').disabled = false;
                showStatus(`成功提取 ${novelData.length} 个小说链接`, true);
            } else {
                linkResults.innerHTML = '<div class="link-item">未找到小说相关链接</div>';
                linkResults.style.display = 'block';
                showStatus('未找到小说相关链接', false);
            }

            // 保存提取的数据到全局变量供导出使用
            window.extractedNovelData = extractedData;

        } catch (error) {
            console.error('扫描过程中发生错误:', error);
            showStatus('扫描过程中发生错误: ' + error.message, false);
        }
    }

    // 导出链接列表
    function exportLinks() {
        if (!window.extractedNovelData || window.extractedNovelData.length === 0) {
            showStatus('没有可导出的链接', false);
            return;
        }

        // 创建CSV内容
        let csvContent = '\uFEFF'; // BOM for UTF-8
        csvContent += '序号,标题,链接\n';

        window.extractedNovelData.forEach((item, index) => {
            // 转义CSV中的特殊字符
            const title = item.title.replace(/"/g, '""');
            const href = item.href.replace(/"/g, '""');
            csvContent += `"${index + 1}","${title}","${href}"\n`;
        });

        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        link.setAttribute('download', `novelpia_novels_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showStatus(`成功导出 ${window.extractedNovelData.length} 个小说链接`, true);
    }

    // 初始化脚本
    function init() {
        // 创建控制面板
        const panel = createControlPanel();

        // 绑定按钮事件
        document.getElementById('scanBtn').addEventListener('click', extractNovelLinks);
        document.getElementById('exportBtn').addEventListener('click', exportLinks);

        // 添加一个快捷键提示
        console.log('Novelpia链接提取工具已加载。点击右上角的面板按钮开始使用。');
    }

    // 等待页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
