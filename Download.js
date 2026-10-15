// ==UserScript==
// @name         超星快递侠 - 学习通资源下载器
// @namespace    https://github.com/zhuzhuxia-gaoshou
// @version      1.2.0
// @description  超星学习通资源下载器:PPT/PDF/视频批量下载,云盘文件签名直链,失败自动切换浏览器原生下载。熔核反应堆 UI,可拖动,光环实时显示派送进度。
// @author       zhuzhuxia-gaoshou
// @match        *://*/*mycourse/studentstudy*
// @match        *://*/*nodedetailcontroller/*
// @match        *://*/*mycourse/teacherstudy*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      chaoxing.com
// @connect      cldisk.com
// @connect      xueyinonline.com
// @license      MIT
// ==/UserScript==

(function () {
    "use strict";

    // --- Styles ---
    // 超星快递侠 · 熔核反应堆主题:熔金(#FFC93C)→橙(#FF7A3D)→熔红(#F5484D),只用于核心/进度/主按钮
    GM_addStyle(`
        /* --- 反应堆启动器(可拖动) --- */
        .cxd-launcher-wrap {
            position: fixed;
            left: 26px;
            top: 40%;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            touch-action: none;
        }
        .cxd-launcher {
            position: relative;
            width: 68px;
            height: 68px;
            border: none;
            border-radius: 50%;
            cursor: grab;
            font-family: inherit;
            background: radial-gradient(circle at 32% 28%, #2b2e38, #17181d 70%);
            box-shadow: 0 10px 30px rgba(12, 13, 18, 0.55), inset 0 1px 0 rgba(255, 243, 228, 0.08);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            transition: box-shadow 0.25s ease;
        }
        .cxd-launcher-wrap:hover .cxd-launcher {
            box-shadow: 0 14px 36px rgba(255, 150, 60, 0.35), inset 0 1px 0 rgba(255, 243, 228, 0.1);
        }
        .cxd-launcher-wrap.cxd-dragging .cxd-launcher {
            cursor: grabbing;
            transform: scale(1.08);
            box-shadow: 0 22px 48px rgba(255, 150, 60, 0.4);
        }
        /* 光环:待机彗星弧 / 下载进度弧 */
        .cxd-orb-ring {
            position: absolute;
            inset: -4px;
            width: calc(100% + 8px);
            height: calc(100% + 8px);
            transform: rotate(-90deg);
            pointer-events: none;
        }
        .cxd-orb-ring .ring-track {
            fill: none;
            stroke: rgba(255, 243, 228, 0.12);
            stroke-width: 2.5;
        }
        .cxd-orb-ring .ring-comet {
            fill: none;
            stroke: url(#cxd-grad);
            stroke-width: 3;
            stroke-linecap: round;
            stroke-dasharray: 40 149;
            animation: cxd-orbit 4s linear infinite;
            filter: drop-shadow(0 0 4px rgba(255, 160, 60, 0.8));
        }
        .cxd-launcher-wrap.cxd-busy .cxd-orb-ring .ring-comet { animation: none; opacity: 0; }
        .cxd-orb-ring .ring-progress {
            fill: none;
            stroke: url(#cxd-grad);
            stroke-width: 3.5;
            stroke-linecap: round;
            stroke-dasharray: 189;
            stroke-dashoffset: 189;
            filter: drop-shadow(0 0 5px rgba(255, 160, 60, 0.85));
            opacity: 0;
            transition: stroke-dashoffset 0.15s linear, opacity 0.2s ease;
        }
        .cxd-launcher-wrap.cxd-busy .cxd-orb-ring .ring-progress { opacity: 1; }
        .cxd-launcher svg.cxd-orb-icon { width: 22px; height: 22px; filter: drop-shadow(0 0 5px rgba(255, 160, 60, 0.6)); }
        .cxd-launcher .cxd-orb-brand {
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.8px;
            color: rgba(255, 243, 228, 0.85);
        }
        .cxd-launcher .cxd-orb-pct {
            position: absolute;
            inset: 0;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            font-weight: 800;
            color: #ffd28a;
            text-shadow: 0 0 12px rgba(255, 160, 60, 0.6);
        }
        .cxd-launcher-wrap.cxd-busy .cxd-launcher .cxd-orb-pct { display: flex; }
        .cxd-launcher-wrap.cxd-busy .cxd-launcher .cxd-orb-icon,
        .cxd-launcher-wrap.cxd-busy .cxd-launcher .cxd-orb-brand { visibility: hidden; }
        @keyframes cxd-orbit { to { transform: rotate(1turn); } }
        /* 标签胶囊 */
        .cxd-launcher-tag {
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 11px;
            letter-spacing: 2px;
            color: rgba(255, 243, 228, 0.75);
            background: rgba(23, 24, 30, 0.88);
            border: 1px solid rgba(255, 170, 60, 0.3);
            cursor: grab;
            user-select: none;
            transition: border-color 0.2s ease;
        }
        .cxd-launcher-wrap:hover .cxd-launcher-tag {
            border-color: rgba(255, 170, 60, 0.55);
            color: #ffd28a;
        }

        /* --- 右上角提示浮窗 --- */
        .cxd-tips {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            width: 360px;
            padding: 14px 16px;
            text-align: left;
            font-size: 13px;
            color: #fff3e4;
            background: rgba(23, 24, 30, 0.94);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border: 1px solid rgba(255, 170, 60, 0.3);
            border-radius: 14px;
            box-shadow: 0 12px 40px rgba(20, 12, 4, 0.5);
            transition: opacity 0.35s ease, transform 0.3s ease;
        }
        .cxd-tips.cxd-hidden {
            opacity: 0;
            transform: translateX(16px);
            pointer-events: none;
        }
        .cxd-tips i { font-style: normal; display: block; }
        .cxd-tips a { color: #ffb84d; }
        .cxd-tips .tips-head {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            font-size: 12px;
            color: rgba(255, 243, 228, 0.65);
            letter-spacing: 1px;
        }
        .cxd-tips .tips-head::before {
            content: "";
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #ffb84d;
            box-shadow: 0 0 8px #ff9f43;
            animation: cxd-blink 1.2s ease-in-out infinite;
        }
        @keyframes cxd-blink { 50% { opacity: 0.35; } }
        .cxd-tips .cxd-progress-wrap { margin-top: 10px; }
        .cxd-tips .cxd-progress-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            margin-bottom: 7px;
            font-size: 12.5px;
        }
        .cxd-tips .cxd-progress-name {
            font-weight: 600;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .cxd-tips .cxd-progress-size {
            color: rgba(255, 243, 228, 0.55);
            font-size: 11.5px;
            flex-shrink: 0;
        }
        .cxd-tips progress {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            overflow: hidden;
            -webkit-appearance: none;
            appearance: none;
            border: none;
            background: rgba(255, 243, 228, 0.12);
        }
        .cxd-tips progress::-webkit-progress-bar { background: rgba(255, 243, 228, 0.12); }
        .cxd-tips progress::-webkit-progress-value {
            background: linear-gradient(90deg, #ffc93c, #ff7a3d, #f5484d);
            border-radius: 3px;
            transition: width 0.15s linear;
        }
        .cxd-tips progress::-moz-progress-bar {
            background: linear-gradient(90deg, #ffc93c, #ff7a3d, #f5484d);
            border-radius: 3px;
            transition: width 0.15s linear;
        }
        .cxd-tips .cxd-status-icon { margin-right: 5px; font-weight: 700; }
        .cxd-tips .cxd-ok { color: #3ddc97; }
        .cxd-tips .cxd-err { color: #ff5d73; }

        /* --- 资源选择弹窗(按住头部可拖动) --- */
        .cxd-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10010;
            display: flex;
            justify-content: center;
            align-items: center;
            background: rgba(10, 8, 4, 0.55);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }
        .cxd-modal-content {
            display: flex;
            flex-direction: column;
            width: 560px;
            max-width: 92vw;
            max-height: 82vh;
            border-radius: 20px;
            color: #fff3e4;
            background: linear-gradient(180deg, rgba(30, 29, 34, 0.99), rgba(21, 21, 25, 0.99));
            border: 1px solid rgba(255, 170, 60, 0.35);
            box-shadow: 0 32px 80px rgba(15, 8, 2, 0.65), 0 0 60px rgba(255, 170, 60, 0.06);
            overflow: hidden;
            animation: cxd-pop 0.22s cubic-bezier(.34, 1.4, .64, 1);
        }
        @keyframes cxd-pop {
            from { opacity: 0; transform: scale(0.94) translateY(10px); }
        }
        .cxd-modal-head {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 16px 20px 14px;
            border-bottom: 1px solid rgba(255, 243, 228, 0.08);
            cursor: grab;
            user-select: none;
            touch-action: none;
        }
        .cxd-modal-head:active { cursor: grabbing; }
        .cxd-modal-logo {
            width: 34px;
            height: 34px;
            border-radius: 11px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #ffc93c, #ff7a3d);
            box-shadow: 0 4px 14px rgba(255, 150, 60, 0.4);
        }
        .cxd-modal-logo svg { width: 17px; height: 17px; }
        .cxd-modal-title-group { flex: 1; min-width: 0; }
        .cxd-modal-title { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
        .cxd-modal-subtitle { font-size: 12px; color: rgba(255, 243, 228, 0.5); margin-top: 2px; }
        .cxd-select-all {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
            padding: 5px 10px;
            font-size: 12px;
            font-family: inherit;
            color: rgba(255, 243, 228, 0.7);
            border: 1px solid rgba(255, 243, 228, 0.14);
            border-radius: 8px;
            cursor: pointer;
            user-select: none;
            transition: background 0.15s ease;
        }
        .cxd-select-all:hover { background: rgba(255, 243, 228, 0.08); }
        .cxd-select-all input { accent-color: #ff7a3d; cursor: pointer; }
        .cxd-modal-close {
            width: 30px;
            height: 30px;
            flex-shrink: 0;
            border: none;
            border-radius: 9px;
            background: rgba(255, 243, 228, 0.06);
            color: rgba(255, 243, 228, 0.6);
            font-size: 16px;
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease;
        }
        .cxd-modal-close:hover { background: rgba(255, 93, 115, 0.15); color: #ff5d73; }
        .cxd-modal-list { overflow-y: auto; flex-grow: 1; padding: 8px 12px; }
        .cxd-modal-list ul { list-style: none; padding: 0; margin: 0; }
        .cxd-modal-list li {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            border-radius: 12px;
            cursor: pointer;
            transition: background-color 0.15s ease;
        }
        .cxd-modal-list li + li { margin-top: 2px; }
        .cxd-modal-list li:hover { background: rgba(255, 170, 60, 0.07); }
        .cxd-modal-list li.cxd-checked { background: rgba(255, 150, 60, 0.12); }
        .cxd-modal-list input[type="checkbox"] {
            width: 17px;
            height: 17px;
            flex-shrink: 0;
            accent-color: #ff7a3d;
            cursor: pointer;
        }
        .cxd-file-chip {
            width: 38px;
            height: 38px;
            border-radius: 11px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10.5px;
            font-weight: 800;
            letter-spacing: 0.5px;
        }
        .cxd-file-chip.pdf   { color: #ff6b5e; background: rgba(255, 107, 94, 0.12);  border: 1px solid rgba(255, 107, 94, 0.3); }
        .cxd-file-chip.ppt   { color: #ffd166; background: rgba(255, 209, 102, 0.1);  border: 1px solid rgba(255, 209, 102, 0.3); }
        .cxd-file-chip.video { color: #9b7bff; background: rgba(155, 123, 255, 0.12); border: 1px solid rgba(155, 123, 255, 0.3); }
        .cxd-file-chip.doc   { color: #4dabf7; background: rgba(77, 171, 247, 0.12);  border: 1px solid rgba(77, 171, 247, 0.3); }
        .cxd-modal-list .cxd-file-name {
            flex: 1;
            min-width: 0;
            font-size: 13.5px;
            color: #fff3e4;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .cxd-modal-list .cxd-file-size { flex-shrink: 0; font-size: 11.5px; color: rgba(255, 243, 228, 0.4); }
        .cxd-modal-list .cxd-file-error {
            flex-shrink: 0;
            margin-left: 8px;
            font-size: 11px;
            font-style: italic;
            color: #ff5d73;
        }
        .cxd-modal-list .cxd-retry {
            display: none;
            flex-shrink: 0;
            margin-left: 8px;
            padding: 3px 10px;
            font-family: inherit;
            font-size: 11px;
            color: #ff5d73;
            background: rgba(255, 93, 115, 0.1);
            border: 1px solid rgba(255, 93, 115, 0.4);
            border-radius: 7px;
            cursor: pointer;
            transition: background 0.15s ease;
        }
        .cxd-modal-list .cxd-retry:hover { background: rgba(255, 93, 115, 0.22); }
        .cxd-modal-list li.cxd-failed .cxd-retry { display: inline-block; }
        .cxd-modal-list li.cxd-failed .cxd-file-name { color: #ff8a97; }
        .cxd-modal-foot {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 20px 16px;
            border-top: 1px solid rgba(255, 243, 228, 0.08);
        }
        .cxd-modal-count { flex: 1; font-size: 12.5px; color: rgba(255, 243, 228, 0.55); }
        .cxd-modal-count b { color: #ffb84d; font-weight: 700; }
        .cxd-modal-button {
            padding: 10px 20px;
            border: none;
            border-radius: 11px;
            cursor: pointer;
            font-family: inherit;
            font-size: 13.5px;
            font-weight: 600;
            letter-spacing: 1px;
            transition: transform 0.12s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .cxd-modal-button:active { transform: scale(0.96); }
        .cxd-modal-button-primary {
            color: #221302;
            background: linear-gradient(135deg, #ffc93c, #ff7a3d);
            box-shadow: 0 4px 18px rgba(255, 150, 60, 0.4);
        }
        .cxd-modal-button-primary:hover {
            filter: brightness(1.08);
            box-shadow: 0 6px 24px rgba(245, 72, 77, 0.45);
        }
        .cxd-modal-button-secondary {
            color: rgba(255, 243, 228, 0.8);
            background: rgba(255, 243, 228, 0.08);
            border: 1px solid rgba(255, 243, 228, 0.16);
        }
        .cxd-modal-button-secondary:hover {
            background: rgba(255, 243, 228, 0.14);
            color: #fff;
        }

        @media (prefers-reduced-motion: reduce) {
            .cxd-orb-ring .ring-comet, .cxd-tips .tips-head::before { animation: none; }
            .cxd-modal-content { animation: none; }
        }
    `);

    // --- Globals ---
    let tipsDiv = null;
    let tipTimeout = null;
    let modalInstance = null;

    // --- Helper Functions ---
    function get_objectids() {
        let objectids = [];
        let ans_classes = document.getElementsByClassName("ans-attach-ct");
        // 兼容旧版页面结构(ans-cc 容器)
        if (ans_classes.length === 0) {
            ans_classes = document.getElementsByClassName("ans-cc");
        }

        if (ans_classes.length > 0) {
            // console.log("模式1: 找到资源容器数量：", ans_classes.length);
            for (let j = 0; j < ans_classes.length; j++) {
                const iframe = ans_classes[j].getElementsByTagName("iframe")[0];
                if (iframe && iframe.getAttribute("objectid") != undefined) {
                    objectids.push(iframe.getAttribute("objectid"));
                }
            }
        } else {
            // Try finding objectid in the main iframe content (common case)
            const mainIframe = document.getElementsByTagName("iframe")[0];
            if (mainIframe && mainIframe.contentDocument) {
                 try {
                    ans_classes = mainIframe.contentDocument.body.getElementsByClassName("ans-attach-ct");
                     if (ans_classes.length === 0) {
                         ans_classes = mainIframe.contentDocument.body.getElementsByClassName("ans-cc");
                     }
                    // console.log("模式2: Iframe内找到资源容器数量：", ans_classes.length);
                    for (let j = 0; j < ans_classes.length; j++) {
                        const iframe = ans_classes[j].getElementsByTagName("iframe")[0];
                        if (iframe && iframe.getAttribute("objectid") != undefined) {
                            objectids.push(iframe.getAttribute("objectid"));
                        }
                    }
                 } catch(e) {
                     console.warn("访问iframe内容时出错 (可能是跨域限制):", e);
                     if (mainIframe.getAttribute("objectid") != undefined) {
                         objectids.push(mainIframe.getAttribute("objectid"));
                         // console.log("模式3: 直接在主iframe上找到objectid");
                     }
                 }
            }
        }
        // Remove duplicates
        objectids = [...new Set(objectids)];
        console.log("找到的所有任务对象IDs:", objectids);
        return objectids;
    }

    function getTipsDiv() {
        if (!tipsDiv) {
            tipsDiv = document.createElement('div');
            tipsDiv.className = 'cxd-tips cxd-hidden'; // Start hidden
            document.body.appendChild(tipsDiv);
        }
        return tipsDiv;
    }

    function showTip(message, duration = 3000, isError = false, isSuccess = false) {
        const div = getTipsDiv();
        clearTimeout(tipTimeout); // Clear any existing hide timeout

        let icon = '';
        if (isSuccess) icon = '<span class="cxd-status-icon cxd-ok">✔</span>';
        if (isError) icon = '<span class="cxd-status-icon cxd-err">✘</span>';

        div.innerHTML = `<i>${icon}${message}</i>`;
        div.classList.remove('cxd-hidden'); // Make visible

        if (duration > 0) {
            tipTimeout = setTimeout(hideTipsDiv, duration);
        }
    }

    function hideTipsDiv() {
        const div = getTipsDiv();
        clearTimeout(tipTimeout);
        div.classList.add('cxd-hidden');
    }

    function cleanFilename(filename) {
         return filename.replace(/[\/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ');
    }

    /**
     * Fetches details for a single resource object ID.
     * @param {string} objectid
     * @returns {Promise<object>} Resource details object
     */
    async function fetchResourceDetails(objectid) {
        const protocolStr = document.location.protocol;
        const domain = window.location.href.includes("xueyinonline") ? "xueyinonline" : "chaoxing";
        const url = `${protocolStr}//mooc1.${domain}.com/ananas/status/${objectid}?flag=normal`;
        let resource = {
            objectid: objectid,
            filename: `未知资源_${objectid}`,
            downloadUrl: null,
            type: '未知',
            size: null,
            error: null,
            openDirectly: false
        };

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const json = await response.json();
            resource.size = typeof json.size === 'number' ? json.size : null;
            // console.log("Fetched info for", objectid, json);

            let fileUrl = null;
            let fileExtension = 'bin';
            let filename = json.filename || `资源_${objectid}`;

            // Determine type and URL priority
            if (json.pdf) {
                resource.type = 'PDF';
                fileUrl = json.pdf;
                fileExtension = 'pdf';
            } else if (json.http && (json.filename?.toLowerCase().endsWith('.mp4') || json.http.includes('.mp4') || json.mimetype?.includes('video'))) {
                resource.type = '视频';
                fileUrl = json.http;
                fileExtension = json.filename?.split('.').pop() || 'mp4';
            } else if (json.filename?.toLowerCase().includes(".ppt") && json.download) {
                resource.type = 'PPT'; // Special PPT case handled differently (opening link)
                fileUrl = json.download.startsWith('http') ? json.download : 'https://' + json.download;
                fileExtension = json.filename?.split('.').pop() || 'ppt'; // Use original ext
                 // Mark this as needing direct open, not XHR download
                 resource.openDirectly = true;
            } else if (json.download) {
                resource.type = '文件'; // General file
                fileUrl = json.download;
                fileExtension = json.filename?.split('.').pop() || 'bin';
                if (fileExtension.match(/ppt|pptx/i)) resource.type = 'PPT';
                else if (fileExtension.match(/doc|docx/i)) resource.type = '文档';
                else if (fileExtension.match(/xls|xlsx/i)) resource.type = '表格';
                else if (fileExtension.match(/zip|rar|7z/i)) resource.type = '压缩包';
            } else if (json.http) {
                // Treat other http links as potential downloads, but maybe less reliable
                resource.type = '链接/其他';
                fileUrl = json.http;
                fileExtension = json.filename?.split('.').pop() || 'bin';
            }

            // Construct final filename
            let baseName = filename.replace(/\.[^.]+$/, '');
            const prevTitleElement = document.querySelector('.prev_title') || document.querySelector('.tab_highlight');
            const prevTitle = prevTitleElement?.textContent?.trim() || document.title.split(/[ \-_]/)[0] || '课程文件';
            resource.filename = cleanFilename(`${prevTitle}_${baseName}.${fileExtension}`);

            // Ensure protocol for non-direct links
            if (fileUrl && !resource.openDirectly && !fileUrl.startsWith('http')) {
                fileUrl = protocolStr + fileUrl;
            }
             resource.downloadUrl = fileUrl;


        } catch (error) {
            console.error(`获取资源 ${objectid} 信息失败:`, error);
            resource.error = `获取失败 (${error.message})`;
        }
        return resource;
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    // --- Core Download Logic ---
    /**
     * Downloads a file using XMLHttpRequest. Can show progress or run silently.
     * @param {string} fileUrl The URL of the file to download.
     * @param {string} fullFileName The desired filename for the download.
     * @param {boolean} [showProgress=true] Whether to display detailed progress in the tips div.
     */
    function downloadFile(fileUrl, fullFileName, showProgress = true, referer = null) {
        const div = getTipsDiv();
        if (showProgress) {
            clearTimeout(tipTimeout); // Prevent auto-hide during download
            div.innerHTML = ''; // Clear previous content for detailed progress
            div.classList.remove('cxd-hidden'); // Ensure visible

            console.log(`开始下载 (带进度): ${fullFileName} from ${fileUrl}`);

            // Create progress UI elements
            const head = document.createElement('div');
            head.className = 'tips-head';
            head.textContent = '快递侠正在派送';
            div.appendChild(head);
            const container = document.createElement('div');
            container.className = 'cxd-progress-wrap';
            const infoDiv = document.createElement('div');
            infoDiv.className = 'cxd-progress-info';
            const fileNameSpan = document.createElement('span');
            fileNameSpan.className = 'cxd-progress-name';
            fileNameSpan.textContent = fullFileName;
            fileNameSpan.title = fullFileName;
            const fileSizeSpan = document.createElement('span');
            fileSizeSpan.className = 'cxd-progress-size';
            fileSizeSpan.textContent = '(准备中...)';
            infoDiv.appendChild(fileNameSpan);
            infoDiv.appendChild(fileSizeSpan);
            const progressBar = document.createElement('progress');
            progressBar.value = 0;
            progressBar.max = 100;
            container.appendChild(infoDiv);
            container.appendChild(progressBar);
            div.appendChild(container);
        } else {
            // For batch downloads, maybe just log or show a brief starting message if needed
            console.log(`开始下载 (批量): ${fullFileName} from ${fileUrl}`);
            // Optionally: showTip(`正在尝试下载: ${fullFileName}`, 1500); // Very brief message
        }

        let lastLoaded = 0;
        let lastTime = Date.now();
        return gmFetchBlob(fileUrl, (loaded, total) => {
            if (showProgress) {
                 // 每 200ms 采样一次,估算实时速度
                 const now = Date.now();
                 const dt = (now - lastTime) / 1000;
                 let speedText = '';
                 if (dt >= 0.2) {
                     const speed = Math.max(0, loaded - lastLoaded) / dt;
                     if (speed > 0) speedText = ` · ${(speed / 1048576).toFixed(1)} MB/s`;
                     lastLoaded = loaded;
                     lastTime = now;
                 }
                 const progressBar = div.querySelector('progress'); // Find progress bar within the tips div
                 const fileSizeSpan = div.querySelector('.cxd-progress-size');
                 if (total) {
                     if(progressBar) progressBar.value = (loaded / total) * 100;
                     const pct = Math.round((loaded / total) * 100);
                     if (fileSizeSpan) fileSizeSpan.textContent = `${pct}% · ${(loaded / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB${speedText}`;
                 } else {
                     // Handle indeterminate progress if needed
                     if(progressBar) progressBar.removeAttribute('value');
                     if(fileSizeSpan) fileSizeSpan.textContent = `${(loaded / 1048576).toFixed(1)} MB / 未知${speedText}`;
                 }
            }
            // 反应堆光环对批量(静默)下载同样生效;无总长时显示待命点
            setOrbProgress(total ? (loaded / total) * 100 : NaN);
        }, referer).then(blob => {
            if (showProgress) {
                 const progressBar = div.querySelector('progress');
                 if(progressBar) progressBar.value = 100; // Ensure 100% on success
            }
            setTimeout(() => setOrbProgress(null), 600); // 光环满格停留一瞬再回待机

            let finalFileName = fullFileName;

            // Mime type check and correction (especially for PDF)
            if (blob.type === 'application/pdf' && !finalFileName.toLowerCase().endsWith('.pdf')) {
                console.log(`Blob type is PDF, correcting filename: ${finalFileName}`);
                finalFileName = finalFileName.replace(/\.[^.]+$/, '') + '.pdf';
            }

            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = finalFileName;
            document.body.appendChild(a);
            a.click(); // This triggers the download
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);

            console.log(`下载成功: ${finalFileName}`);
            if (showProgress) {
                showTip(`下载完成: ${finalFileName}`, 4000, false, true);
            }
        }).catch(err => {
            if (showProgress) {
                 const progressBar = div.querySelector('progress');
                 if(progressBar) progressBar.value = 0; // Reset progress on error
            }
            setOrbProgress(null);
            console.error(`下载失败: ${fullFileName}`, err);
            showTip(`下载失败 (${err.message}): ${fullFileName}`, 6000, true, false);
            throw err; // 上抛给 downloadResource 做下一层兜底(如浏览器原生下载)
        });
    }

    // --- Cross-origin fetch & signed-URL helpers (v1.16) ---
    /**
     * Fetches a URL and resolves with the response Blob.
     * Uses GM_xmlhttpRequest when available (bypasses CORS, works for cldisk.com),
     * falls back to plain XHR for same-origin files otherwise.
     * A watchdog aborts the request if the server never sends any data.
     * @param {string} fileUrl
     * @param {Function} [onProgress] (loaded, total) => void
     * @param {string} [referer] 可选 Referer 头(cldisk CDN 校验防盗链时必须带对)
     * @returns {Promise<Blob>}
     */
    function gmFetchBlob(fileUrl, onProgress, referer) {
        return new Promise((resolve, reject) => {
            let gotData = false;
            let request;
            let watchdog = null;

            // Clear the watchdog whenever the request settles (success or failure)
            const settle = (fn) => (arg) => {
                if (watchdog) clearTimeout(watchdog);
                fn(arg);
            };
            const onDoneResolve = settle(resolve);
            const onDoneReject = settle(reject);

            const handleProgress = (loaded, total) => {
                gotData = true;
                if (onProgress) onProgress(loaded, total);
            };

            if (typeof GM_xmlhttpRequest !== "undefined") {
                const gmOptions = {
                    method: "GET",
                    url: fileUrl,
                    responseType: "blob",
                    headers: referer ? { "Referer": referer } : undefined,
                    onprogress: (e) => handleProgress(e.loaded, e.total),
                    onload: (r) => {
                        if (r.status === 200 || r.status === 206) onDoneResolve(r.response);
                        else onDoneReject(new Error("HTTP " + r.status));
                    },
                    onerror: () => onDoneReject(new Error("网络错误或跨域被拦截")),
                    ontimeout: () => onDoneReject(new Error("请求超时"))
                };
                request = GM_xmlhttpRequest(gmOptions);
            } else {
                // Fallback: plain XHR (same-origin only)
                const xhr = new XMLHttpRequest();
                xhr.open("GET", fileUrl, true);
                xhr.responseType = "blob";
                xhr.onprogress = (e) => handleProgress(e.loaded, e.lengthComputable ? e.total : 0);
                xhr.onload = () => {
                    if (xhr.status === 200 || xhr.status === 206) onDoneResolve(xhr.response);
                    else onDoneReject(new Error("HTTP " + xhr.status));
                };
                xhr.onerror = () => onDoneReject(new Error("网络错误"));
                xhr.send();
                request = { abort: () => xhr.abort() };
            }

            // If the server accepts the connection but never answers (云盘预览地址的典型行为),
            // abort after 30s instead of hanging forever.
            watchdog = setTimeout(() => {
                if (!gotData) {
                    try { request.abort(); } catch (e) { /* ignore */ }
                    onDoneReject(new Error("服务器长时间无响应"));
                }
            }, 30000);
        });
    }

    /**
     * 走官方 screen/file 跳转链换取带签名的下载直链。
     * 链路: mooc1.chaoxing.com/mooc-ans/screen/file?objectid=xxx
     *   → 302 → pan-yz.chaoxing.com/screen/v2/file_xxx(页面内含签名下载地址)
     *   → 提取 https://dX.cldisk.com/download/xxx?at_=..&ak_=..&ad_=..&fn=真实文件名
     * 该链路无需登录态,对云盘(cldisk)文件有效;签名有时效,需即取即用。
     * @param {string} objectid
     * @returns {Promise<string>} 签名下载直链
     */
    function getSignedDownloadUrl(objectid) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === "undefined") {
                return reject(new Error("缺少 GM_xmlhttpRequest 权限"));
            }
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://mooc1.chaoxing.com/mooc-ans/screen/file?objectid=${objectid}`,
                headers: { "Referer": "https://mooc1.chaoxing.com/" },
                timeout: 20000,
                onload: (r) => {
                    if (r.status !== 200) return reject(new Error("HTTP " + r.status));
                    const re = new RegExp("https://[a-z0-9.-]+\\.(?:cldisk|chaoxing|xueyinonline)\\.com/download/" + objectid + "\\?[^'\"\\s<>]+", "i");
                    const m = r.responseText.match(re);
                    if (!m) return reject(new Error("跳转页面中没有下载直链"));
                    resolve(m[0].replace(/&amp;/g, "&"));
                },
                onerror: () => reject(new Error("网络错误")),
                ontimeout: () => reject(new Error("获取签名地址超时"))
            });
        });
    }

    /** 从签名直链的 fn= 参数里还原真实文件名,如 "W1章软件工程学概述.ppt" */
    function filenameFromSignedUrl(url) {
        const m = url.match(/[?&]fn=([^&'\s]+)/);
        if (!m) return null;
        try {
            return cleanFilename(decodeURIComponent(m[1]));
        } catch (e) {
            return null;
        }
    }

    /**
     * 统一下载入口:优先走官方签名直链(云盘文件可下、PPT 可直下),
     * 失败后回退 status 接口地址,最后给出手动下载页链接并明确报错。
     * @param {object} resource fetchResourceDetails 的返回值
     * @param {boolean} [showProgress=true]
     * @returns {Promise<boolean>} 是否成功启动下载
     */
    /**
     * 用隐藏 iframe 触发浏览器原生下载。
     * 签名直链的响应带 Content-Disposition: attachment,导航即下载、当前页不跳转;
     * 即使 CDN 拒绝(403)也只渲染在隐藏 iframe 里,不会影响课程页。
     * 浏览器原生请求自带完整 Referer/UA 上下文,不受插件层 Referer 限制 —— 这是用户手动
     * 操作能成功而 GM 通道 403 时的关键兜底通道。
     */
    function triggerNativeDownload(url) {
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = url;
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 120000); // 2 分钟后清理,足够浏览器接管下载
    }

    /**
     * @param {HTMLElement} [itemEl] 弹窗中对应的列表项,失败时标记失败态并显示"重试"
     */
    async function downloadResource(resource, showProgress = true, itemEl = null) {
        // 云盘/预览类地址(如 s3.cldisk.com/sv-w7/doc/...)不带签名,XHR 必挂起,直接走签名直链,
        // 避免白等 30 秒看门狗;普通文件的 status 地址是老通道,优先沿用(与原版行为一致)。
        const looksLikePreviewUrl = (url) => /cldisk\.com\/(sv-|doc\/)|\/sv-w[0-9]\//i.test(url || "");
        const oldPathUsable = resource.downloadUrl && !looksLikePreviewUrl(resource.downloadUrl);

        // 1) status 接口地址:普通课程文件的常规通道
        if (oldPathUsable) {
            try {
                await downloadFile(resource.downloadUrl, resource.filename, showProgress, "https://mooc1.chaoxing.com/");
                return true;
            } catch (e) {
                console.warn("status 接口地址下载失败,回退签名直链:", e.message);
            }
        }
        // 2) 官方签名直链:云盘文件的主通道,普通文件的备用通道
        //    签名即时取即时用;获取失败时退避重试一次,避免触发频率风控
        if (resource.objectid) {
            let signedUrl = null;
            let lastErr = null;
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    signedUrl = await getSignedDownloadUrl(resource.objectid);
                    break;
                } catch (e) {
                    lastErr = e;
                    if (attempt < 2) {
                        console.warn(`获取签名直链失败(${e.message}),3 秒后退避重试一次...`);
                        if (showProgress) showTip(`获取签名地址失败(${e.message}),3 秒后重试...`, 3000, true, false);
                        await delay(3000);
                    }
                }
            }
            if (signedUrl) {
                const realName = filenameFromSignedUrl(signedUrl) || resource.filename;
                try {
                    console.log(`签名直链获取成功: ${realName}`);
                    await downloadFile(signedUrl, realName, showProgress, "https://pan-yz.chaoxing.com/");
                    return true;
                } catch (e) {
                    // GM 通道被 CDN 拒(典型如 Referer 校验)→ 改用浏览器原生下载
                    console.warn("GM 下载签名直链失败,改用浏览器原生下载:", e.message);
                    triggerNativeDownload(signedUrl);
                    showTip(`已启动浏览器直接下载: ${realName}(如未开始请稍候或重试)`, 8000, false, true);
                    return true;
                }
            } else {
                console.warn("签名直链获取失败:", lastErr && lastErr.message);
                showTip(`获取签名地址失败(${lastErr && lastErr.message}),可能触发了风控,建议等几分钟再试`, 8000, true, false);
            }
        }
        // 3) 全部失败:给出手动下载页(浏览官方浏览页,页面右上角有下载按钮)
        console.error(`全部下载方式失败: ${resource.filename}`);
        if (itemEl) itemEl.classList.add('cxd-failed');
        const manualUrl = `https://mooc1.chaoxing.com/ueditorupload/read?objectId=${resource.objectid}`;
        showTip(`下载失败: ${resource.filename}。<a href="${manualUrl}" target="_blank">点此打开手动下载页</a>`, 10000, true, false);
        return false;
    }

    // --- Modal Logic ---
    // 弹窗按住头部拖动(复选框/按钮/全选标签除外)
    function enableModalDrag(headEl, contentEl) {
        let sx, sy, ox, oy, dragging = false;
        headEl.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'LABEL') return;
            dragging = true;
            sx = e.clientX; sy = e.clientY;
            const r = contentEl.getBoundingClientRect();
            ox = r.left; oy = r.top;
            try { headEl.setPointerCapture(e.pointerId); } catch (err) {}
        });
        headEl.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            contentEl.style.position = 'fixed';
            contentEl.style.margin = '0';
            contentEl.style.left = Math.max(0, Math.min(window.innerWidth - contentEl.offsetWidth, ox + e.clientX - sx)) + 'px';
            contentEl.style.top = Math.max(0, Math.min(window.innerHeight - contentEl.offsetHeight, oy + e.clientY - sy)) + 'px';
        });
        headEl.addEventListener('pointerup', () => dragging = false);
    }

    // 文件大小人性化显示
    function fmtSize(bytes) {
        if (!bytes || bytes <= 0) return '';
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
        return bytes + ' B';
    }

    // 底部"已选 n 项"计数与全选框状态联动
    function updateSelectedCount() {
        if (!modalInstance) return;
        const boxes = [...modalInstance.list.querySelectorAll('input[type="checkbox"]')];
        const n = boxes.filter(cb => cb.checked).length;
        modalInstance.countEl.innerHTML = `已选 <b>${n}</b> / ${boxes.length} 个文件`;
        modalInstance.selectAllBox.checked = n > 0 && n === boxes.length;
        modalInstance.selectAllBox.indeterminate = n > 0 && n < boxes.length;
    }

    function createModalElement() {
        // If modal already exists, just return it
        if (modalInstance) return modalInstance;

        const overlay = document.createElement('div');
        overlay.className = 'cxd-modal-overlay';
        overlay.style.display = 'none'; // Start hidden

        const content = document.createElement('div');
        content.className = 'cxd-modal-content';

        // 头部:品牌图标 + 标题/副标题 + 全选 + 关闭
        const head = document.createElement('div');
        head.className = 'cxd-modal-head';
        head.innerHTML =
            '<div class="cxd-modal-logo"><svg viewBox="0 0 24 24" fill="none" stroke="#0b0e22" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M4 19h16"/></svg></div>' +
            '<div class="cxd-modal-title-group"><div class="cxd-modal-title">下载资源</div><div class="cxd-modal-subtitle"></div></div>' +
            '<label class="cxd-select-all"><input type="checkbox"> 全选</label>' +
            '<button class="cxd-modal-close" title="关闭 (Esc)">✕</button>';

        const listContainer = document.createElement('div');
        listContainer.className = 'cxd-modal-list';
        const list = document.createElement('ul');
        listContainer.appendChild(list);

        // 底部:已选计数 + 操作按钮
        const foot = document.createElement('div');
        foot.className = 'cxd-modal-foot';
        const countEl = document.createElement('span');
        countEl.className = 'cxd-modal-count';
        const cancelButton = document.createElement('button');
        cancelButton.className = 'cxd-modal-button cxd-modal-button-secondary';
        cancelButton.textContent = '关闭';
        const downloadButton = document.createElement('button');
        downloadButton.className = 'cxd-modal-button cxd-modal-button-primary';
        downloadButton.textContent = '下载选中';
        foot.appendChild(countEl);
        foot.appendChild(cancelButton);
        foot.appendChild(downloadButton);

        content.appendChild(head);
        content.appendChild(listContainer);
        content.appendChild(foot);
        overlay.appendChild(content);

        const selectAllBox = head.querySelector('.cxd-select-all input');
        selectAllBox.onchange = () => {
            list.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = selectAllBox.checked; });
            list.querySelectorAll('li').forEach(li => li.classList.toggle('cxd-checked', selectAllBox.checked));
            updateSelectedCount();
        };

        // Close modal listeners
        cancelButton.onclick = () => overlay.style.display = 'none';
        head.querySelector('.cxd-modal-close').onclick = () => overlay.style.display = 'none';
        overlay.onclick = (e) => {
            if (e.target === overlay) { // Only close if clicking the overlay itself
                overlay.style.display = 'none';
            }
        };

        document.body.appendChild(overlay);
        enableModalDrag(head, content);
        modalInstance = { overlay, list, downloadButton, countEl, selectAllBox, subtitle: head.querySelector('.cxd-modal-subtitle') };
        return modalInstance;
    }

    function populateModalList(listElement, resources, preselectPdf = false) {
        listElement.innerHTML = ''; // Clear previous items
        if (resources.length === 0) {
             listElement.innerHTML = '<li><i>未找到可识别的资源。</i></li>';
             return;
        }

        // 类型 → 徽章样式与文案
        const CHIP = {
            'PDF':   ['pdf', 'PDF'],
            'PPT':   ['ppt', 'PPT'],
            '视频':  ['video', '视频'],
            '文档':  ['doc', 'DOC'],
            '表格':  ['doc', 'XLS'],
            '压缩包': ['doc', 'ZIP']
        };

        resources.forEach((res, index) => {
            const li = document.createElement('li');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `cxd-res-${index}`;
            checkbox.value = index; // Store index to retrieve resource data later
            checkbox.checked = (preselectPdf && res.type === 'PDF' && !res.error); // Preselect PDFs if requested and valid

            const chip = document.createElement('span');
            const [chipCls, chipText] = CHIP[res.type] || ['doc', '文件'];
            chip.className = `cxd-file-chip ${chipCls}`;
            chip.textContent = chipText;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'cxd-file-name';
            nameSpan.textContent = res.filename || '未知文件';
            nameSpan.title = res.filename || '未知文件'; // Full name on hover

            li.appendChild(checkbox);
            li.appendChild(chip);
            li.appendChild(nameSpan);

            if (res.error) {
                const errorSpan = document.createElement('span');
                errorSpan.className = 'cxd-file-error';
                errorSpan.textContent = `(${res.error})`;
                li.appendChild(errorSpan);
                checkbox.disabled = true; // Disable checkbox for errored items
                li.style.opacity = '0.55';
                li.style.cursor = 'not-allowed';
            } else {
                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'cxd-file-size';
                sizeSpan.textContent = fmtSize(res.size);
                li.appendChild(sizeSpan);

                // 失败后显示"重试",点击仅重下这一条
                const retryBtn = document.createElement('button');
                retryBtn.className = 'cxd-retry';
                retryBtn.textContent = '重试';
                retryBtn.onclick = (e) => {
                    e.stopPropagation();
                    li.classList.remove('cxd-failed');
                    downloadResource(res, true, li);
                };
                li.appendChild(retryBtn);
            }

            // 点击整行切换勾选;直接点复选框时由 change 事件处理,避免重复翻转
            li.onclick = (e) => {
                if (e.target.tagName === 'INPUT') return;
                if (e.target.classList.contains('cxd-file-error')) return;
                if (!checkbox.disabled) {
                    checkbox.checked = !checkbox.checked;
                    li.classList.toggle('cxd-checked', checkbox.checked);
                    updateSelectedCount();
                }
            };
            checkbox.addEventListener('change', () => {
                li.classList.toggle('cxd-checked', checkbox.checked);
                updateSelectedCount();
            });
            if (checkbox.checked) li.classList.add('cxd-checked');
            listElement.appendChild(li);
        });
        updateSelectedCount();
    }

    async function showResourceSelectionModal(preselectPdf = false) {
        showTip("正在查找资源列表...", 0);

        const objectids = get_objectids();
        if (objectids.length === 0) {
            hideTipsDiv();
            showTip("未找到任何资源对象ID。", 3000, true);
            return;
        }

        const resourcePromises = objectids.map(id => fetchResourceDetails(id));
        const resources = await Promise.all(resourcePromises);

        hideTipsDiv();

        const validResources = resources.filter(res => !res.error && (res.downloadUrl || res.openDirectly));

        if (validResources.length === 0) {
            showTip("未找到可下载的资源。", 3000, true);
            return;
        }

        const modal = createModalElement();
        populateModalList(modal.list, validResources, preselectPdf);
        modal.subtitle.textContent = `本节共找到 ${validResources.length} 个资源`;

        // 下载按钮:逐个启动下载,每个间隔 500ms
        modal.downloadButton.onclick = async () => {
            const selectedIndices = Array.from(modal.list.querySelectorAll('input[type="checkbox"]:checked'))
                                       .map(cb => parseInt(cb.value, 10));

            if (selectedIndices.length === 0) {
                alert("请至少选择一个要下载的资源。");
                return;
            }

            modal.overlay.style.display = 'none';

            if (selectedIndices.length === 1) {
                // Single download: signed-URL first, with progress UI
                const resource = validResources[selectedIndices[0]];
                downloadResource(resource, true, modal.list.children[selectedIndices[0]]);
            } else {
                // Multiple downloads: sequential, signed-URL first, with visible result summary
                const selected = selectedIndices.map(index => validResources[index]);
                showTip(`准备下载 ${selected.length} 个文件...`, 0);
                let okCount = 0, failCount = 0;
                for (let i = 0; i < selected.length; i++) {
                    const li = modal.list.children[selectedIndices[i]];
                    const success = await downloadResource(selected[i], false, li);
                    if (success) okCount++; else failCount++;
                    await delay(500); // Wait 500ms between downloads
                }
                setTimeout(() => showTip(`处理完成: ${okCount} 个成功${failCount ? `, ${failCount} 个失败(见上方红色提示)` : ""}`, 6000), 500);
            }
        };

        modal.overlay.style.display = 'flex';
    }


    // --- 快捷下载:按 D 键直接下载全部 PDF ---
    async function downloadAllPdfsDirectly() {
        showTip("正在查找并下载所有PDF...", 0);

        const objectids = get_objectids();
        if (objectids.length === 0) {
            hideTipsDiv();
            showTip("未找到任何资源对象ID。", 3000, true);
            return;
        }

        const resourcePromises = objectids.map(id => fetchResourceDetails(id));
        const resources = await Promise.all(resourcePromises);

        const pdfResources = resources.filter(res => res.type === 'PDF' && !res.error && res.downloadUrl);

        if (pdfResources.length === 0) {
            hideTipsDiv();
            showTip("未找到可下载的PDF文件。", 3000);
            return;
        }

        hideTipsDiv();
        showTip(`开始下载 ${pdfResources.length} 个PDF文件...`, 0);
        let downloadCount = 0;
        for (const res of pdfResources) {
             const success = await downloadResource(res, false);
             if (success) downloadCount++;
             await delay(300); // Keep a small delay
        }

        setTimeout(() => showTip(`已尝试启动 ${downloadCount} 个PDF文件的下载。`, 5000), 500);
    }


    // --- UI 与事件监听 ---
    // 超星快递侠 反应堆启动器(可拖动,位置自动记忆)
    var buttonContainer = document.createElement('div');
    buttonContainer.className = 'cxd-launcher-wrap';

    var downloadButton = document.createElement('button');
    downloadButton.className = 'cxd-launcher';
    downloadButton.title = '超星快递侠 · 点击选择要下载的文件,按住可拖动';
    downloadButton.innerHTML =
        '<svg class="cxd-orb-ring" viewBox="0 0 76 76">' +
        '<circle class="ring-track" cx="38" cy="38" r="34"></circle>' +
        '<circle class="ring-comet" cx="38" cy="38" r="34"></circle>' +
        '<circle class="ring-progress" cx="38" cy="38" r="34"></circle></svg>' +
        '<svg class="cxd-orb-icon" viewBox="0 0 24 24" fill="none" stroke="url(#cxd-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<defs><linearGradient id="cxd-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">' +
        '<stop stop-color="#ffc93c"/><stop offset="0.55" stop-color="#ff7a3d"/><stop offset="1" stop-color="#f5484d"/></linearGradient></defs>' +
        '<path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M4 19h16"/></svg>' +
        '<span class="cxd-orb-brand">快递侠</span>' +
        '<span class="cxd-orb-pct">0%</span>';

    var launcherTag = document.createElement('div');
    launcherTag.className = 'cxd-launcher-tag';
    launcherTag.textContent = '下载资源';

    buttonContainer.appendChild(downloadButton);
    buttonContainer.appendChild(launcherTag);
    document.body.appendChild(buttonContainer);

    // 反应堆光环:显示当前下载进度(null = 回到待机彗星弧)
    function setOrbProgress(pct) {
        const bar = buttonContainer.querySelector('.ring-progress');
        const pctText = buttonContainer.querySelector('.cxd-orb-pct');
        if (!bar || !pctText) return;
        const C = 2 * Math.PI * 34;
        if (pct == null) {
            buttonContainer.classList.remove('cxd-busy');
            bar.style.strokeDashoffset = C;
        } else {
            buttonContainer.classList.add('cxd-busy');
            bar.style.strokeDashoffset = C * (1 - pct / 100);
            pctText.textContent = Number.isFinite(pct) ? Math.round(pct) + '%' : '…';
        }
    }

    // 启动器拖动:拖动/点击智能区分,靠边吸附,位置记忆
    (function initLauncherDrag() {
        let sx, sy, ox, oy, dragging = false;
        const SNAP = 28;
        function clampPos(x, y) {
            const w = buttonContainer.offsetWidth, h = buttonContainer.offsetHeight;
            let nx = Math.max(6, Math.min(window.innerWidth - w - 6, x));
            let ny = Math.max(6, Math.min(window.innerHeight - h - 6, y));
            if (nx < SNAP) nx = 6;                                            // 吸左
            if (nx > window.innerWidth - w - SNAP) nx = window.innerWidth - w - 6; // 吸右
            if (ny < SNAP) ny = 6;                                            // 吸顶
            if (ny > window.innerHeight - h - SNAP) ny = window.innerHeight - h - 6; // 吸底
            return [nx, ny];
        }
        buttonContainer.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            dragging = true;
            sx = e.clientX; sy = e.clientY;
            const r = buttonContainer.getBoundingClientRect();
            ox = r.left; oy = r.top;
            try { buttonContainer.setPointerCapture(e.pointerId); } catch (err) {}
            e.preventDefault();
        });
        buttonContainer.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - sx, dy = e.clientY - sy;
            if (Math.hypot(dx, dy) < 5) return; // 小于 5px 视为点击前摇
            buttonContainer.classList.add('cxd-dragging');
            const [nx, ny] = clampPos(ox + dx, oy + dy);
            buttonContainer.style.left = nx + 'px';
            buttonContainer.style.top = ny + 'px';
        });
        buttonContainer.addEventListener('pointerup', (e) => {
            if (!dragging) return;
            dragging = false;
            const moved = Math.hypot(e.clientX - sx, e.clientY - sy) >= 5;
            buttonContainer.classList.remove('cxd-dragging');
            if (moved) {
                buttonContainer.dataset.suppressClick = '1';
                setTimeout(() => { delete buttonContainer.dataset.suppressClick; }, 0);
                try {
                    GM_setValue('cxd_launcher_pos', JSON.stringify({
                        x: parseInt(buttonContainer.style.left, 10),
                        y: parseInt(buttonContainer.style.top, 10)
                    }));
                } catch (err) {}
            }
        });
        // 点击(非拖动)打开资源选择
        buttonContainer.addEventListener('click', () => {
            if (buttonContainer.dataset.suppressClick) return;
            showResourceSelectionModal(false);
        });
        // 恢复上次位置(并夹回可视区域)
        try {
            const savedPos = GM_getValue('cxd_launcher_pos');
            if (savedPos) {
                const pos = JSON.parse(savedPos);
                if (typeof pos.x === 'number' && typeof pos.y === 'number') {
                    const w = buttonContainer.offsetWidth || 80;
                    const h = buttonContainer.offsetHeight || 110;
                    buttonContainer.style.left = Math.max(6, Math.min(window.innerWidth - w - 6, pos.x)) + 'px';
                    buttonContainer.style.top = Math.max(6, Math.min(window.innerHeight - h - 6, pos.y)) + 'px';
                }
            }
        } catch (err) {}
    })();

    // Keyboard shortcut (D key for downloading all PDFs directly, Esc to close modal)
    document.addEventListener('keydown', function (e) {
        // Esc 关闭资源选择弹窗
        if (e.key === 'Escape') {
            const modalOverlay = document.querySelector('.cxd-modal-overlay');
            if (modalOverlay && modalOverlay.style.display !== 'none') {
                modalOverlay.style.display = 'none';
            }
            return;
        }
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }
        // Check if modal is open, if so, don't trigger D key shortcut
        const modalOverlay = document.querySelector('.cxd-modal-overlay');
        if (modalOverlay && modalOverlay.style.display !== 'none') {
            return;
        }

        if (e.key === 'd' || e.key === 'D' || e.keyCode === 68) {
            console.log("检测到 'D' 键按下，开始直接下载所有PDF...");
            e.preventDefault();
            downloadAllPdfsDirectly(); // Call the direct download function
        }
    });


    console.log("超星快递侠 v1.2.0 — 学习通资源下载器已加载");

})();
