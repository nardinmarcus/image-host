"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { ToastContainer, toast } from "react-toastify";
import Link from "next/link";
import Footer from "@/components/Footer";
import UploadPanel from "@/components/UploadPanel";
import ResultLinks from "@/components/ResultLinks";

const actionClassName =
  "inline-flex items-center justify-center px-5 py-2 rounded-xl text-sm font-semibold bg-teal-600 text-white shadow-[0_4px_14px_rgb(13_148_136/0.25)] hover:bg-teal-700";

function isPdfFile(file) {
  const type = (file.type || "").toLowerCase();
  return type === "application/pdf" || type === "application/x-pdf" || /\.pdf$/i.test(file.name || "");
}

function isEpubFile(file) {
  const type = (file.type || "").toLowerCase();
  return type === "application/epub+zip" || type === "application/epub" || /\.epub$/i.test(file.name || "");
}

function isOfficeFile(file) {
  return /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(file.name || "");
}

function isAudioFile(file) {
  return (file.type || "").startsWith("audio/") || /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(file.name || "");
}

function fileFingerprint(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function newQueueItem(file) {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    status: "ready",
    progress: 0,
    error: "",
  };
}

function uploadWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file);

    request.open("POST", url);
    request.responseType = "json";
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("error", () => reject(new Error("网络连接中断，请重试")));
    request.addEventListener("abort", () => reject(new Error("上传已取消")));
    request.addEventListener("load", () => {
      const bodyData = request.response || {};
      if (request.status >= 200 && request.status < 300 && bodyData.url) {
        resolve(bodyData);
        return;
      }
      reject(new Error(bodyData.message || `上传失败（${request.status || "未知错误"}）`));
    });
    request.send(body);
  });
}

async function runWithConcurrency(items, worker, limit = 2) {
  const results = [];
  let nextIndex = 0;
  const run = async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      results.push(await worker(item));
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

/** 首页交互层：上传队列、存储去向确认与结果分发。 */
export default function HomeClient({
  initialTotal = "?",
  initialIp = "",
  initialRole = "",
  initialIsAuth = false,
}) {
  const [queue, setQueue] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState("viewLinks");
  const [total, setTotal] = useState(initialTotal);
  const [selectedStorage, setSelectedStorage] = useState("r2");
  const [tgConfirmed, setTgConfirmed] = useState(false);
  const [showTgConfirmation, setShowTgConfirmation] = useState(false);
  const [boxType, setBoxType] = useState("img");

  const queueRef = useRef(queue);
  const fileInputRef = useRef(null);
  const isAuth = initialIsAuth;
  const role = initialRole;

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const updateQueueItem = (id, patch) => {
    setQueue((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const known = new Set([
      ...queueRef.current.map((item) => fileFingerprint(item.file)),
      ...uploadedFiles.map((item) => item.fingerprint),
    ]);
    const uniqueFiles = incoming.filter((file) => !known.has(fileFingerprint(file)));
    if (!uniqueFiles.length) {
      toast.info("这些文件已经在队列或上传结果中");
      return;
    }
    if (uniqueFiles.length !== incoming.length) {
      toast.info("已跳过重复文件");
    }
    setQueue((items) => [...items, ...uniqueFiles.map(newQueueItem)]);
  };

  const handleFileChange = (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  };

  const handlePaste = (event) => {
    const pastedFiles = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter(Boolean);
    addFiles(pastedFiles);
  };

  const handleRemove = (id) => {
    const item = queueRef.current.find((candidate) => candidate.id === id);
    if (!item || item.status === "uploading") return;
    URL.revokeObjectURL(item.previewUrl);
    setQueue((items) => items.filter((candidate) => candidate.id !== id));
  };

  const handleClear = () => {
    const retained = queueRef.current.filter((item) => item.status === "uploading");
    queueRef.current
      .filter((item) => item.status !== "uploading")
      .forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setQueue(retained);
  };

  const uploadItem = async (id) => {
    const item = queueRef.current.find((candidate) => candidate.id === id);
    if (!item || item.status === "uploading" || item.status === "success") return false;

    updateQueueItem(id, { status: "uploading", progress: 0, error: "" });
    try {
      const result = await uploadWithProgress(
        `/api/enableauthapi/${selectedStorage}`,
        item.file,
        (progress) => updateQueueItem(id, { progress })
      );
      updateQueueItem(id, { status: "success", progress: 100, error: "" });
      setUploadedFiles((files) => [
        ...files,
        {
          id,
          name: item.file.name,
          type: item.file.type,
          url: result.url,
          fingerprint: fileFingerprint(item.file),
          storage: selectedStorage,
        },
      ]);
      setTotal((value) => {
        const number = Number(value);
        return Number.isFinite(number) ? number + 1 : value;
      });
      return true;
    } catch (error) {
      updateQueueItem(id, {
        status: "error",
        progress: 0,
        error: error.message || "上传失败，请重试",
      });
      return false;
    }
  };

  const handleUploadAll = async () => {
    const uploadable = queueRef.current.filter(
      (item) => item.status === "ready" || item.status === "error"
    );
    if (!uploadable.length) {
      toast.info("没有可上传的文件");
      return;
    }
    const results = await runWithConcurrency(uploadable, (item) => uploadItem(item.id));
    const successCount = results.filter(Boolean).length;
    if (successCount) toast.success(`${successCount} 个文件已上传`);
    if (successCount !== uploadable.length) toast.error("部分文件上传失败，可在队列中重试");
  };

  const handlePreview = (id) => {
    const item = queueRef.current.find((candidate) => candidate.id === id);
    if (!item) return;
    const file = item.file;
    if (file.type.startsWith("image/")) setBoxType("img");
    else if (file.type.startsWith("video/")) setBoxType("video");
    else if (isAudioFile(file)) setBoxType("audio");
    else if (isPdfFile(file)) setBoxType("pdf");
    else if (isEpubFile(file) || isOfficeFile(file)) setBoxType("doc");
    else setBoxType("other");
    setSelectedImage(item.previewUrl);
  };

  const requestStorageChange = (storage) => {
    if (storage === "r2" || tgConfirmed) {
      setSelectedStorage(storage);
      return;
    }
    setShowTgConfirmation(true);
  };

  const confirmTelegram = () => {
    setTgConfirmed(true);
    setSelectedStorage("tgchannel");
    setShowTgConfirmation(false);
  };

  const totalSizeMB = (queue.reduce((sum, item) => sum + item.file.size, 0) / (1024 * 1024)).toFixed(2);
  const canUpload = queue.some((item) => item.status === "ready" || item.status === "error");
  const isUploading = queue.some((item) => item.status === "uploading");

  const renderNavAction = () => {
    if (!isAuth) return <Link href="/login" className={actionClassName}>登录</Link>;
    if (role === "admin") return <Link href="/admin" className={actionClassName}>管理</Link>;
    return <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={actionClassName}>登出</button>;
  };

  return (
    <main className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-slate-200/60">
        <nav className="w-full max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-extrabold shadow-[0_2px_8px_rgb(13_148_136/0.3)]">N</div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">Namoo Pix</span>
          </div>
          {renderNavAction()}
        </nav>
      </header>

      <div className="flex-1 w-full max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <UploadPanel
          total={total}
          ip={initialIp}
          selectedStorage={selectedStorage}
          onStorageChange={requestStorageChange}
          isAuth={isAuth}
          queue={queue}
          totalSizeMB={totalSizeMB}
          canUpload={canUpload}
          isUploading={isUploading}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onDrop={handleDrop}
          onPaste={handlePaste}
          onPreview={handlePreview}
          onRemove={handleRemove}
          onRetry={uploadItem}
          onUploadAll={handleUploadAll}
          onClear={handleClear}
        />

        <ResultLinks
          uploadedFiles={uploadedFiles}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onPreviewClick={(url, type) => {
            setBoxType(type);
            setSelectedImage(url);
          }}
        />
      </div>

      {showTgConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-slate-900/60 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="tg-confirm-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold tracking-wide text-amber-700">外部发送</p>
            <h2 id="tg-confirm-title" className="mt-1 text-xl font-extrabold text-slate-900">发送到 Telegram 频道？</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">文件会发至你配置的 Telegram 频道。之后从后台删除只能让本站链接失效，不能删除频道内的原文件。</p>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button type="button" onClick={() => setShowTgConfirmation(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">继续使用可删除托管</button>
              <button type="button" onClick={confirmTelegram} className="px-4 py-2.5 rounded-xl bg-amber-600 text-sm font-semibold text-white hover:bg-amber-700">我明白，发送到频道</button>
            </div>
          </section>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setSelectedImage(null)}>
          <div className="relative flex flex-col items-center max-w-4xl max-h-[90vh]">
            <button type="button" className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl backdrop-blur-md" onClick={() => setSelectedImage(null)} aria-label="关闭预览">&times;</button>
            {boxType === "img" ? <img src={selectedImage} alt="预览" className="object-contain max-w-full max-h-[85vh] rounded-2xl shadow-2xl" /> : null}
            {boxType === "video" ? <video src={selectedImage} className="object-contain max-w-full max-h-[85vh] rounded-2xl shadow-2xl" controls /> : null}
            {boxType === "audio" ? <div className="p-8 bg-white rounded-2xl shadow-2xl" onClick={(event) => event.stopPropagation()}><audio src={selectedImage} controls className="w-80 max-w-full" /></div> : null}
            {boxType === "pdf" ? <div className="p-8 bg-white rounded-2xl shadow-2xl" onClick={(event) => event.stopPropagation()}><a href={selectedImage} target="_blank" rel="noopener noreferrer" className="text-teal-600 font-semibold underline">在新标签打开 PDF</a></div> : null}
            {boxType === "doc" ? <div className="p-8 bg-white rounded-2xl shadow-2xl" onClick={(event) => event.stopPropagation()}><a href={selectedImage} target="_blank" rel="noopener noreferrer" download className="text-teal-600 font-semibold underline">下载文档</a></div> : null}
            {boxType === "other" ? <div className="p-8 bg-white rounded-2xl shadow-2xl text-slate-900"><p>不支持预览此文件类型</p></div> : null}
          </div>
        </div>
      )}

      <ToastContainer />
      <Footer />
    </main>
  );
}
